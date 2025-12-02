#!/usr/bin/env bun

// Execute a scheduled task (invoked by launchd)
// Usage: bun run-scheduled-task.js <schedule-id>

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { spawn } from 'child_process';

const schedulesPath = join(homedir(), 'Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/knowledge/schedules.json');
const logsDir = join(homedir(), 'Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/knowledge/execution-logs');
const scriptsDir = '/Users/hagelk/non-ic-code/geoffrey/skills/scheduler/scripts';

// Write log entry (JSONL)
function log(logFile, event, data = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    ...data
  };

  appendFileSync(logFile, JSON.stringify(entry) + '\n', 'utf-8');
}

// Update schedule's last_run field
function updateLastRun(scheduleId, status, duration) {
  try {
    const data = JSON.parse(readFileSync(schedulesPath, 'utf-8'));
    const schedule = data.schedules.find(s => s.id === scheduleId);

    if (schedule) {
      schedule.last_run = {
        timestamp: new Date().toISOString(),
        status,
        duration_seconds: duration
      };

      data.last_updated = new Date().toISOString();
      writeFileSync(schedulesPath, JSON.stringify(data, null, 2), 'utf-8');
    }
  } catch (e) {
    console.error(`Failed to update last_run: ${e.message}`);
  }
}

// Execute claude in headless mode
async function runClaude(prompt, allowedTools) {
  return new Promise((resolve, reject) => {
    const toolsArg = allowedTools.join(',');
    const args = [
      '-p',
      prompt,
      '--allowed-tools',
      toolsArg
    ];

    const child = spawn('claude', args, {
      cwd: '/Users/hagelk/non-ic-code/geoffrey',
      env: {
        ...process.env,
        PATH: '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin'
      }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        exitCode: code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        pid: child.pid
      });
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  const scheduleId = process.argv[2];

  if (!scheduleId) {
    console.error('Usage: bun run-scheduled-task.js <schedule-id>');
    process.exit(1);
  }

  const startTime = Date.now();

  // Setup log file
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const day = String(now.getDate()).padStart(2, '0');
  const logDir = join(logsDir, yearMonth);

  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  const logFile = join(logDir, `${day}-${scheduleId}.jsonl`);

  try {
    // Read schedule
    const data = JSON.parse(readFileSync(schedulesPath, 'utf-8'));
    const schedule = data.schedules.find(s => s.id === scheduleId);

    if (!schedule) {
      log(logFile, 'error', { error: 'Schedule not found', schedule_id: scheduleId });
      process.exit(1);
    }

    // Check if enabled
    if (!schedule.enabled) {
      log(logFile, 'skipped', { reason: 'Schedule disabled', schedule_id: scheduleId });
      process.exit(0);
    }

    // Log start
    log(logFile, 'started', { schedule_id: scheduleId, name: schedule.name });

    // Execute claude
    const prompt = schedule.task.prompt;
    const allowedTools = schedule.task.allowed_tools;

    log(logFile, 'claude_invoked', {
      prompt: prompt.substring(0, 100) + '...',
      allowed_tools: allowedTools
    });

    const result = await runClaude(prompt, allowedTools);

    log(logFile, 'claude_completed', {
      exit_code: result.exitCode,
      pid: result.pid
    });

    const duration = Math.floor((Date.now() - startTime) / 1000);

    if (result.exitCode === 0) {
      // Success
      log(logFile, 'completed', {
        status: 'success',
        duration_seconds: duration
      });

      updateLastRun(scheduleId, 'success', duration);

      // Update dashboard
      spawn('bun', [join(scriptsDir, 'update-dashboard.js')], {
        detached: true,
        stdio: 'ignore'
      }).unref();

      console.log(`Schedule ${scheduleId} completed successfully`);
      process.exit(0);
    } else {
      // Failed
      log(logFile, 'failed', {
        exit_code: result.exitCode,
        stderr: result.stderr.substring(0, 500),
        duration_seconds: duration
      });

      updateLastRun(scheduleId, 'failed', duration);

      // Update dashboard
      spawn('bun', [join(scriptsDir, 'update-dashboard.js')], {
        detached: true,
        stdio: 'ignore'
      }).unref();

      console.error(`Schedule ${scheduleId} failed with exit code ${result.exitCode}`);
      console.error(`stderr: ${result.stderr}`);
      process.exit(1);
    }

  } catch (e) {
    const duration = Math.floor((Date.now() - startTime) / 1000);

    log(logFile, 'error', {
      error: e.message,
      stack: e.stack,
      duration_seconds: duration
    });

    updateLastRun(scheduleId, 'failed', duration);

    console.error(`Error executing schedule ${scheduleId}: ${e.message}`);
    process.exit(1);
  }
}

main();
