#!/usr/bin/env bun

// List all scheduled tasks
// Usage: bun list-schedules.js [--json] [--enabled-only]

import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const schedulesPath = join(homedir(), 'Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/knowledge/schedules.json');

// Parse command line args
const args = process.argv.slice(2);
const outputJson = args.includes('--json');
const enabledOnly = args.includes('--enabled-only');

try {
  // Read schedules
  const data = JSON.parse(readFileSync(schedulesPath, 'utf-8'));
  let schedules = data.schedules || [];

  // Filter if needed
  if (enabledOnly) {
    schedules = schedules.filter(s => s.enabled);
  }

  if (outputJson) {
    console.log(JSON.stringify({ schedules, count: schedules.length }, null, 2));
    process.exit(0);
  }

  // Format as table
  if (schedules.length === 0) {
    console.log('No scheduled tasks found.');
    process.exit(0);
  }

  console.log('');
  console.log('Scheduled Tasks:');
  console.log('─'.repeat(100));
  console.log(
    'ID'.padEnd(25) +
    'Name'.padEnd(25) +
    'Enabled'.padEnd(10) +
    'Last Run'.padEnd(20) +
    'Status'.padEnd(10)
  );
  console.log('─'.repeat(100));

  for (const schedule of schedules) {
    const id = schedule.id.substring(0, 23);
    const name = schedule.name.substring(0, 23);
    const enabled = schedule.enabled ? '✓' : '✗';
    const lastRun = schedule.last_run?.timestamp
      ? new Date(schedule.last_run.timestamp).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })
      : 'Never';
    const status = schedule.last_run?.status === 'success' ? '✓ Success' :
                   schedule.last_run?.status === 'failed' ? '✗ Failed' :
                   '-';

    console.log(
      id.padEnd(25) +
      name.padEnd(25) +
      enabled.padEnd(10) +
      lastRun.padEnd(20) +
      status.padEnd(10)
    );
  }

  console.log('─'.repeat(100));
  console.log(`Total: ${schedules.length} ${enabledOnly ? 'enabled ' : ''}schedule(s)`);
  console.log('');

} catch (e) {
  console.error(JSON.stringify({ error: e.message, path: schedulesPath }));
  process.exit(1);
}
