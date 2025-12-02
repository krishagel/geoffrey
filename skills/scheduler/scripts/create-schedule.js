#!/usr/bin/env bun

// Create a new scheduled task
// Usage: bun create-schedule.js --name "..." --prompt "..." --schedule "..." --tools "..." [--missed-run skip|catch-up|retry] [--enabled true|false]

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { spawnSync } from 'child_process';

const schedulesPath = join(homedir(), 'Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/knowledge/schedules.json');
const plistDir = join(homedir(), 'Library/LaunchAgents');
const scriptsDir = '/Users/hagelk/non-ic-code/geoffrey/skills/scheduler/scripts';

// Parse arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1];
    options[key] = value;
  }

  return options;
}

// Generate unique ID from name
function generateId(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const random = Math.random().toString(36).substring(2, 6);
  return `${slug}-${random}`;
}

// Parse schedule string (e.g., "6:00 Mon-Fri", "8:00 daily", "9:00 Sat")
function parseSchedule(scheduleStr) {
  const parts = scheduleStr.trim().split(/\s+/);

  if (parts.length < 1) {
    throw new Error('Invalid schedule format');
  }

  // Parse time (HH:MM or H:MM)
  const timePart = parts[0];
  const timeMatch = timePart.match(/^(\d{1,2}):(\d{2})$/);

  if (!timeMatch) {
    throw new Error('Invalid time format. Use HH:MM (e.g., 6:00, 14:30)');
  }

  const hour = parseInt(timeMatch[1]);
  const minute = parseInt(timeMatch[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error('Invalid time. Hour must be 0-23, minute 0-59');
  }

  const interval = { Hour: hour, Minute: minute };

  // Parse days if specified
  if (parts.length > 1) {
    const dayPart = parts[1].toLowerCase();

    if (dayPart === 'daily') {
      // Daily - no weekday filter
    } else if (dayPart === 'weekdays' || dayPart === 'mon-fri') {
      interval.Weekday = [1, 2, 3, 4, 5];
    } else if (dayPart === 'weekends' || dayPart === 'sat-sun') {
      interval.Weekday = [0, 6];
    } else if (dayPart === 'mon' || dayPart === 'monday') {
      interval.Weekday = [1];
    } else if (dayPart === 'tue' || dayPart === 'tuesday') {
      interval.Weekday = [2];
    } else if (dayPart === 'wed' || dayPart === 'wednesday') {
      interval.Weekday = [3];
    } else if (dayPart === 'thu' || dayPart === 'thursday') {
      interval.Weekday = [4];
    } else if (dayPart === 'fri' || dayPart === 'friday') {
      interval.Weekday = [5];
    } else if (dayPart === 'sat' || dayPart === 'saturday') {
      interval.Weekday = [6];
    } else if (dayPart === 'sun' || dayPart === 'sunday') {
      interval.Weekday = [0];
    } else {
      throw new Error(`Unknown day pattern: ${dayPart}`);
    }
  }

  return { type: 'calendar', interval };
}

// Generate launchd plist XML
function generatePlist(scheduleId, schedule) {
  const label = `com.geoffrey.schedule.${scheduleId}`;
  const scriptPath = join(scriptsDir, 'run-scheduled-task.js');

  let intervalXml = '';

  if (schedule.schedule.interval.Weekday && schedule.schedule.interval.Weekday.length > 0) {
    // Multiple weekday entries
    intervalXml = '    <key>StartCalendarInterval</key>\n    <array>\n';
    for (const weekday of schedule.schedule.interval.Weekday) {
      intervalXml += `        <dict>
            <key>Hour</key>
            <integer>${schedule.schedule.interval.Hour}</integer>
            <key>Minute</key>
            <integer>${schedule.schedule.interval.Minute}</integer>
            <key>Weekday</key>
            <integer>${weekday}</integer>
        </dict>\n`;
    }
    intervalXml += '    </array>';
  } else {
    // Daily
    intervalXml = `    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>${schedule.schedule.interval.Hour}</integer>
        <key>Minute</key>
        <integer>${schedule.schedule.interval.Minute}</integer>
    </dict>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${label}</string>

    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/bun</string>
        <string>${scriptPath}</string>
        <string>${scheduleId}</string>
    </array>

${intervalXml}

    <key>StandardOutPath</key>
    <string>/tmp/${label}.stdout</string>

    <key>StandardErrorPath</key>
    <string>/tmp/${label}.stderr</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>
`;
}

try {
  const options = parseArgs();

  // Validate required options
  if (!options.name) throw new Error('--name is required');
  if (!options.prompt) throw new Error('--prompt is required');
  if (!options.schedule) throw new Error('--schedule is required');
  if (!options.tools) throw new Error('--tools is required');

  const scheduleId = generateId(options.name);
  const enabled = options.enabled !== 'false';
  const missedRunAction = options['missed-run'] || 'skip';

  if (!['skip', 'catch-up', 'retry'].includes(missedRunAction)) {
    throw new Error('--missed-run must be skip, catch-up, or retry');
  }

  // Parse schedule
  const scheduleData = parseSchedule(options.schedule);

  // Parse tools
  const tools = options.tools.split(',').map(t => t.trim());

  // Create schedule object
  const schedule = {
    id: scheduleId,
    name: options.name,
    description: options.description || options.name,
    enabled,
    created: new Date().toISOString(),
    last_modified: new Date().toISOString(),
    schedule: scheduleData,
    task: {
      prompt: options.prompt,
      allowed_tools: tools
    },
    missed_run_policy: {
      action: missedRunAction,
      max_retries: 3,
      retry_interval_minutes: 15
    },
    output: {
      save_to_obsidian: true,
      obsidian_folder: options['obsidian-folder'] || 'Geoffrey/Scheduled Tasks/Output',
      notify_on_failure: true
    }
  };

  // Read existing schedules
  const data = existsSync(schedulesPath)
    ? JSON.parse(readFileSync(schedulesPath, 'utf-8'))
    : { version: '1.0', schedules: [] };

  // Add schedule
  data.schedules.push(schedule);
  data.last_updated = new Date().toISOString();

  // Save schedules.json
  writeFileSync(schedulesPath, JSON.stringify(data, null, 2), 'utf-8');

  // Generate plist
  const plist = generatePlist(scheduleId, schedule);
  const plistPath = join(plistDir, `com.geoffrey.schedule.${scheduleId}.plist`);
  writeFileSync(plistPath, plist, 'utf-8');

  // Validate plist
  const validateResult = spawnSync('plutil', ['-lint', plistPath], { encoding: 'utf-8' });
  if (validateResult.status !== 0) {
    throw new Error(`Plist validation failed: ${validateResult.stderr}`);
  }

  // Load plist with launchctl (if enabled)
  if (enabled) {
    const loadResult = spawnSync('launchctl', ['load', plistPath], { encoding: 'utf-8' });
    if (loadResult.status !== 0) {
      console.error(`Warning: launchctl load failed: ${loadResult.stderr}`);
    }
  }

  // Update dashboard
  const updateDashboard = spawnSync('bun', [join(scriptsDir, 'update-dashboard.js')], {
    encoding: 'utf-8'
  });

  console.log(JSON.stringify({
    success: true,
    schedule: {
      id: scheduleId,
      name: options.name,
      enabled,
      plist: plistPath,
      next_run: 'Check dashboard for next run time'
    }
  }, null, 2));

} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}
