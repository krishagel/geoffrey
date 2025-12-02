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

// Update schedule's last_run field and retry count
function updateLastRun(scheduleId, status, duration, logFile = null) {
  try {
    const data = JSON.parse(readFileSync(schedulesPath, 'utf-8'));
    const schedule = data.schedules.find(s => s.id === scheduleId);

    if (schedule) {
      schedule.last_run = {
        timestamp: new Date().toISOString(),
        status,
        duration_seconds: duration,
        log_file: logFile
      };

      // Reset retry count on success
      if (status === 'success') {
        delete schedule.retry_count;
      }

      data.last_updated = new Date().toISOString();
      writeFileSync(schedulesPath, JSON.stringify(data, null, 2), 'utf-8');
    }
  } catch (e) {
    console.error(`Failed to update last_run: ${e.message}`);
  }
}

// Increment retry count
function incrementRetryCount(scheduleId) {
  try {
    const data = JSON.parse(readFileSync(schedulesPath, 'utf-8'));
    const schedule = data.schedules.find(s => s.id === scheduleId);

    if (schedule) {
      schedule.retry_count = (schedule.retry_count || 0) + 1;
      data.last_updated = new Date().toISOString();
      writeFileSync(schedulesPath, JSON.stringify(data, null, 2), 'utf-8');
      return schedule.retry_count;
    }
  } catch (e) {
    console.error(`Failed to increment retry count: ${e.message}`);
  }
  return 0;
}

// Create OmniFocus task for failure notification
async function notifyOmniFocusFailure(scheduleName, scheduleId, errorMessage, logFile) {
  try {
    const omniFocusScript = join(homedir(), 'non-ic-code/geoffrey/skills/omnifocus-manager/scripts/add_task.js');

    // Create task with link to log file
    const taskData = {
      name: `Scheduled task failed: ${scheduleName}`,
      project: 'Geoffrey System',
      tags: ['Geoffrey', 'Alert', 'Automation'],
      note: `Schedule ID: ${scheduleId}\n\nError: ${errorMessage}\n\nLog file: ${logFile}\n\nCheck the log file for details and fix the issue.`,
      flagged: true,
      dueDate: new Date().toISOString()
    };

    const result = spawn('osascript', ['-l', 'JavaScript', omniFocusScript, JSON.stringify(taskData)], {
      encoding: 'utf-8'
    });

    return new Promise((resolve) => {
      result.on('close', (code) => {
        resolve(code === 0);
      });
    });
  } catch (e) {
    console.error(`Failed to create OmniFocus notification: ${e.message}`);
    return false;
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

      updateLastRun(scheduleId, 'success', duration, logFile);

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

      // Handle retry logic
      const missedRunPolicy = schedule.missed_run_policy;
      const retryCount = schedule.retry_count || 0;

      if (missedRunPolicy.action === 'retry' && retryCount < missedRunPolicy.max_retries) {
        // Schedule retry
        const newRetryCount = incrementRetryCount(scheduleId);
        log(logFile, 'retry_scheduled', {
          retry_count: newRetryCount,
          max_retries: missedRunPolicy.max_retries,
          retry_in_minutes: missedRunPolicy.retry_interval_minutes
        });

        console.log(`Scheduling retry ${newRetryCount}/${missedRunPolicy.max_retries} in ${missedRunPolicy.retry_interval_minutes} minutes`);

        // Schedule retry using 'at' command or setTimeout
        setTimeout(async () => {
          console.log(`Retrying schedule ${scheduleId}...`);
          await main();
        }, missedRunPolicy.retry_interval_minutes * 60 * 1000);

        return;
      }

      // Update last_run as failed (no more retries)
      updateLastRun(scheduleId, 'failed', duration, logFile);

      // Send OmniFocus notification if configured
      if (schedule.output.notify_on_failure) {
        log(logFile, 'notification_sent', { type: 'omnifocus' });
        await notifyOmniFocusFailure(
          schedule.name,
          scheduleId,
          result.stderr || `Exit code ${result.exitCode}`,
          logFile
        );
      }

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

    updateLastRun(scheduleId, 'failed', duration, logFile);

    // Try to send OmniFocus notification for fatal errors
    try {
      const data = JSON.parse(readFileSync(schedulesPath, 'utf-8'));
      const schedule = data.schedules.find(s => s.id === scheduleId);

      if (schedule && schedule.output.notify_on_failure) {
        await notifyOmniFocusFailure(
          schedule.name,
          scheduleId,
          e.message,
          logFile
        );
      }
    } catch (notifyError) {
      console.error(`Failed to send notification: ${notifyError.message}`);
    }

    console.error(`Error executing schedule ${scheduleId}: ${e.message}`);
    process.exit(1);
  }
}

main();
