#!/usr/bin/env bun

// Delete a schedule
// Usage: bun delete-schedule.js <schedule-id> [--keep-logs]

import { readFileSync, writeFileSync, unlinkSync, existsSync, rmSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { spawnSync } from 'child_process';

const schedulesPath = join(homedir(), 'Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/knowledge/schedules.json');
const logsDir = join(homedir(), 'Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/knowledge/execution-logs');
const plistDir = join(homedir(), 'Library/LaunchAgents');
const scriptsDir = '/Users/hagelk/non-ic-code/geoffrey/skills/scheduler/scripts';

// Parse arguments
const scheduleId = process.argv[2];
const keepLogs = process.argv.includes('--keep-logs');

if (!scheduleId) {
  console.error('Usage: bun delete-schedule.js <schedule-id> [--keep-logs]');
  process.exit(1);
}

try {
  // Read schedules
  const data = JSON.parse(readFileSync(schedulesPath, 'utf-8'));
  const schedule = data.schedules.find(s => s.id === scheduleId);

  if (!schedule) {
    throw new Error(`Schedule not found: ${scheduleId}`);
  }

  const scheduleName = schedule.name;

  // Unload plist
  const plistPath = join(plistDir, `com.geoffrey.schedule.${scheduleId}.plist`);

  if (existsSync(plistPath)) {
    const unloadResult = spawnSync('launchctl', ['unload', plistPath], { encoding: 'utf-8' });
    // Ignore errors - plist might not be loaded

    // Delete plist
    unlinkSync(plistPath);
  }

  // Remove from schedules.json
  data.schedules = data.schedules.filter(s => s.id !== scheduleId);
  data.last_updated = new Date().toISOString();

  writeFileSync(schedulesPath, JSON.stringify(data, null, 2), 'utf-8');

  // Delete logs if requested
  let logsDeleted = 0;
  if (!keepLogs && existsSync(logsDir)) {
    // Find all log files for this schedule
    const fs = require('fs');
    const path = require('path');

    function findLogFiles(dir, scheduleId) {
      let files = [];
      if (!fs.existsSync(dir)) return files;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files = files.concat(findLogFiles(fullPath, scheduleId));
        } else if (entry.name.includes(scheduleId) && entry.name.endsWith('.jsonl')) {
          files.push(fullPath);
        }
      }
      return files;
    }

    const logFiles = findLogFiles(logsDir, scheduleId);
    for (const logFile of logFiles) {
      unlinkSync(logFile);
      logsDeleted++;
    }
  }

  // Update dashboard
  spawnSync('bun', [join(scriptsDir, 'update-dashboard.js')], { encoding: 'utf-8' });

  console.log(JSON.stringify({
    success: true,
    deleted: {
      id: scheduleId,
      name: scheduleName,
      plist_removed: existsSync(plistPath) ? false : true,
      logs_deleted: logsDeleted
    }
  }, null, 2));

} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}
