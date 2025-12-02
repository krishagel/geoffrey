#!/usr/bin/env bun

// Generate/update Obsidian dashboard for scheduled tasks
// Usage: bun update-dashboard.js

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const schedulesPath = join(homedir(), 'Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/knowledge/schedules.json');
const dashboardPath = join(homedir(), 'Library/Mobile Documents/iCloud~md~obsidian/Documents/Personal_Notes/Geoffrey/Scheduled Tasks.md');

// Calculate next run time from schedule interval
function getNextRunTime(schedule) {
  if (!schedule.enabled) return 'Disabled';

  const interval = schedule.schedule.interval;
  const now = new Date();

  if (!interval.Hour && !interval.Minute) return 'Invalid schedule';

  const hour = interval.Hour || 0;
  const minute = interval.Minute || 0;

  // Handle weekdays
  if (interval.Weekday && Array.isArray(interval.Weekday)) {
    const today = now.getDay();
    const targetDays = interval.Weekday;

    // Find next occurrence
    for (let daysAhead = 0; daysAhead <= 7; daysAhead++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() + daysAhead);
      const checkDay = checkDate.getDay();

      if (targetDays.includes(checkDay)) {
        const runTime = new Date(checkDate);
        runTime.setHours(hour, minute, 0, 0);

        // If it's today but past the time, skip to next week
        if (daysAhead === 0 && runTime <= now) continue;

        return runTime.toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        });
      }
    }
  }

  // Daily schedule
  const nextRun = new Date(now);
  nextRun.setHours(hour, minute, 0, 0);

  // If past today's time, move to tomorrow
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  return nextRun.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

// Get schedule display (e.g., "Mon-Fri 6:00 AM", "Daily 8:00 AM")
function getScheduleDisplay(schedule) {
  const interval = schedule.schedule.interval;
  const hour = interval.Hour || 0;
  const minute = interval.Minute || 0;

  const time = new Date();
  time.setHours(hour, minute);
  const timeStr = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  if (interval.Weekday && Array.isArray(interval.Weekday)) {
    const days = interval.Weekday.sort();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Check if it's weekdays (Mon-Fri)
    if (JSON.stringify(days) === JSON.stringify([1, 2, 3, 4, 5])) {
      return `Mon-Fri ${timeStr}`;
    }

    // Check if it's weekends
    if (JSON.stringify(days) === JSON.stringify([0, 6])) {
      return `Sat-Sun ${timeStr}`;
    }

    // Custom days
    const dayStr = days.map(d => dayNames[d]).join(', ');
    return `${dayStr} ${timeStr}`;
  }

  return `Daily ${timeStr}`;
}

try {
  // Read schedules
  const data = JSON.parse(readFileSync(schedulesPath, 'utf-8'));
  const schedules = data.schedules || [];

  // Build dashboard content
  const now = new Date().toISOString();
  let content = `---
created: ${now}
tags: [geoffrey, scheduler, automation]
source: geoffrey
---

# Scheduled Tasks

Auto-generated dashboard showing all scheduled tasks managed by Geoffrey.

Last updated: ${new Date().toLocaleString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
})}

---

## Active Schedules

`;

  const activeSchedules = schedules.filter(s => s.enabled);

  if (activeSchedules.length === 0) {
    content += '_No active schedules_\n\n';
  } else {
    content += '| Name | Schedule | Next Run | Last Run | Status |\n';
    content += '|------|----------|----------|----------|--------|\n';

    for (const schedule of activeSchedules) {
      const name = schedule.name;
      const scheduleStr = getScheduleDisplay(schedule);
      const nextRun = getNextRunTime(schedule);
      const lastRun = schedule.last_run?.timestamp
        ? new Date(schedule.last_run.timestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })
        : 'Never';
      const status = schedule.last_run?.status === 'success' ? '✅' :
                     schedule.last_run?.status === 'failed' ? '❌' :
                     '—';

      content += `| ${name} | ${scheduleStr} | ${nextRun} | ${lastRun} | ${status} |\n`;
    }
    content += '\n';
  }

  content += `## Disabled Schedules\n\n`;

  const disabledSchedules = schedules.filter(s => !s.enabled);

  if (disabledSchedules.length === 0) {
    content += '_No disabled schedules_\n\n';
  } else {
    content += '| Name | Schedule | Last Run |\n';
    content += '|------|----------|----------|\n';

    for (const schedule of disabledSchedules) {
      const name = schedule.name;
      const scheduleStr = getScheduleDisplay(schedule);
      const lastRun = schedule.last_run?.timestamp
        ? new Date(schedule.last_run.timestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })
        : 'Never';

      content += `| ${name} | ${scheduleStr} | ${lastRun} |\n`;
    }
    content += '\n';
  }

  content += `## Recent Execution History\n\n`;

  // Get schedules with recent runs
  const recentRuns = schedules
    .filter(s => s.last_run?.timestamp)
    .sort((a, b) => new Date(b.last_run.timestamp) - new Date(a.last_run.timestamp))
    .slice(0, 10);

  if (recentRuns.length === 0) {
    content += '_No execution history yet_\n\n';
  } else {
    content += '| Time | Schedule | Status | Duration |\n';
    content += '|------|----------|--------|----------|\n';

    for (const schedule of recentRuns) {
      const time = new Date(schedule.last_run.timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
      const name = schedule.name;
      const status = schedule.last_run.status === 'success' ? '✅ Success' :
                     schedule.last_run.status === 'failed' ? '❌ Failed' :
                     '⏸️ Unknown';
      const duration = schedule.last_run.duration_seconds
        ? `${schedule.last_run.duration_seconds}s`
        : '—';

      content += `| ${time} | ${name} | ${status} | ${duration} |\n`;
    }
    content += '\n';
  }

  content += `## Management

To manage schedules, use natural language with Geoffrey:

- **Create**: "Schedule AI research every morning at 6am on weekdays"
- **View**: "Show my scheduled tasks" or "What's scheduled?"
- **Modify**: "Change AI research to 7am" or "Disable the daily briefing"
- **Delete**: "Remove the AI research schedule"
- **Check**: "Did my research run this morning?"

### Technical Details

- **Scheduler**: macOS launchd
- **Config**: \`~/Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/knowledge/schedules.json\`
- **Logs**: \`~/Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/knowledge/execution-logs/\`
- **Plists**: \`~/Library/LaunchAgents/com.geoffrey.schedule.*.plist\`

Total schedules: ${schedules.length} (${activeSchedules.length} active, ${disabledSchedules.length} disabled)
`;

  // Write dashboard
  writeFileSync(dashboardPath, content, 'utf-8');

  console.log(JSON.stringify({
    success: true,
    dashboard: dashboardPath,
    schedules: schedules.length,
    active: activeSchedules.length,
    disabled: disabledSchedules.length
  }, null, 2));

} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}
