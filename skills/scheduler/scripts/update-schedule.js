#!/usr/bin/env bun

// Update an existing schedule
// Usage: bun update-schedule.js <schedule-id> [--name "..."] [--prompt "..."] [--schedule "..."] [--tools "..."] [--enabled true|false] [--missed-run skip|catch-up|retry]

import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { spawnSync } from 'child_process';

const schedulesPath = join(homedir(), 'Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/knowledge/schedules.json');
const plistDir = join(homedir(), 'Library/LaunchAgents');
const scriptsDir = '/Users/hagelk/non-ic-code/geoffrey/skills/scheduler/scripts';

// Parse arguments
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    throw new Error('Usage: bun update-schedule.js <schedule-id> [options]');
  }

  const scheduleId = args[0];
  const options = { id: scheduleId };

  for (let i = 1; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1];
    options[key] = value;
  }

  return options;
}

// Parse schedule string (same as create-schedule.js)
function parseSchedule(scheduleStr) {
  const parts = scheduleStr.trim().split(/\s+/);
  const timePart = parts[0];
  const timeMatch = timePart.match(/^(\d{1,2}):(\d{2})$/);

  if (!timeMatch) throw new Error('Invalid time format. Use HH:MM');

  const hour = parseInt(timeMatch[1]);
  const minute = parseInt(timeMatch[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error('Invalid time. Hour must be 0-23, minute 0-59');
  }

  const interval = { Hour: hour, Minute: minute };

  if (parts.length > 1) {
    const dayPart = parts[1].toLowerCase();

    if (dayPart === 'weekdays' || dayPart === 'mon-fri') {
      interval.Weekday = [1, 2, 3, 4, 5];
    } else if (dayPart === 'weekends' || dayPart === 'sat-sun') {
      interval.Weekday = [0, 6];
    } else if (dayPart !== 'daily') {
      const dayMap = {
        'mon': 1, 'monday': 1,
        'tue': 2, 'tuesday': 2,
        'wed': 3, 'wednesday': 3,
        'thu': 4, 'thursday': 4,
        'fri': 5, 'friday': 5,
        'sat': 6, 'saturday': 6,
        'sun': 0, 'sunday': 0
      };

      if (dayMap[dayPart] !== undefined) {
        interval.Weekday = [dayMap[dayPart]];
      } else {
        throw new Error(`Unknown day pattern: ${dayPart}`);
      }
    }
  }

  return { type: 'calendar', interval };
}

// Generate plist (same as create-schedule.js)
function generatePlist(scheduleId, schedule) {
  const label = `com.geoffrey.schedule.${scheduleId}`;
  const scriptPath = join(scriptsDir, 'run-scheduled-task.js');

  let intervalXml = '';

  if (schedule.schedule.interval.Weekday && schedule.schedule.interval.Weekday.length > 0) {
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
  const scheduleId = options.id;

  // Read schedules
  const data = JSON.parse(readFileSync(schedulesPath, 'utf-8'));
  const schedule = data.schedules.find(s => s.id === scheduleId);

  if (!schedule) {
    throw new Error(`Schedule not found: ${scheduleId}`);
  }

  const wasEnabled = schedule.enabled;
  let scheduleChanged = false;

  // Update fields
  if (options.name) {
    schedule.name = options.name;
  }

  if (options.description) {
    schedule.description = options.description;
  }

  if (options.prompt) {
    schedule.task.prompt = options.prompt;
  }

  if (options.schedule) {
    schedule.schedule = parseSchedule(options.schedule);
    scheduleChanged = true;
  }

  if (options.tools) {
    schedule.task.allowed_tools = options.tools.split(',').map(t => t.trim());
  }

  if (options['missed-run']) {
    const action = options['missed-run'];
    if (!['skip', 'catch-up', 'retry'].includes(action)) {
      throw new Error('--missed-run must be skip, catch-up, or retry');
    }
    schedule.missed_run_policy.action = action;
  }

  if (options.enabled !== undefined) {
    schedule.enabled = options.enabled === 'true';
  }

  schedule.last_modified = new Date().toISOString();
  data.last_updated = new Date().toISOString();

  // Save schedules.json
  writeFileSync(schedulesPath, JSON.stringify(data, null, 2), 'utf-8');

  // Handle plist updates
  const plistPath = join(plistDir, `com.geoffrey.schedule.${scheduleId}.plist`);

  if (scheduleChanged || schedule.enabled !== wasEnabled) {
    // Unload old plist if it was loaded
    if (wasEnabled) {
      spawnSync('launchctl', ['unload', plistPath], { encoding: 'utf-8' });
    }

    // Regenerate plist
    const plist = generatePlist(scheduleId, schedule);
    writeFileSync(plistPath, plist, 'utf-8');

    // Validate
    const validateResult = spawnSync('plutil', ['-lint', plistPath], { encoding: 'utf-8' });
    if (validateResult.status !== 0) {
      throw new Error(`Plist validation failed: ${validateResult.stderr}`);
    }

    // Load if enabled
    if (schedule.enabled) {
      const loadResult = spawnSync('launchctl', ['load', plistPath], { encoding: 'utf-8' });
      if (loadResult.status !== 0) {
        console.error(`Warning: launchctl load failed: ${loadResult.stderr}`);
      }
    }
  }

  // Update dashboard
  spawnSync('bun', [join(scriptsDir, 'update-dashboard.js')], { encoding: 'utf-8' });

  console.log(JSON.stringify({
    success: true,
    schedule: {
      id: scheduleId,
      name: schedule.name,
      enabled: schedule.enabled,
      updated_fields: Object.keys(options).filter(k => k !== 'id')
    }
  }, null, 2));

} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}
