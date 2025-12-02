---
name: scheduler
description: Schedule Claude Code tasks to run automatically on a schedule using macOS launchd
triggers:
  - "schedule"
  - "scheduled tasks"
  - "schedule a task"
  - "run every"
  - "run at"
  - "automate"
  - "recurring task"
  - "show scheduled"
  - "list schedules"
allowed-tools: Read, Bash, Write, Skill
version: 0.1.0
---

# Scheduler Skill

Schedule Claude Code tasks to run automatically using macOS launchd. Tasks can invoke any Geoffrey skill or run simple prompts on a recurring schedule.

## When to Activate

Use this skill when the user wants to:
- Schedule a task to run automatically
- View existing scheduled tasks
- Modify or delete schedules
- Check if a scheduled task ran successfully
- Automate recurring workflows

## Architecture

**Scheduler**: macOS launchd (native, reliable)
**Storage**: schedules.json (iCloud) + Obsidian dashboard
**Invocation**: `claude -p` headless mode
**Logs**: JSONL format, partitioned by month

## Available Scripts

All scripts in `./scripts/` directory. Run via `bun <script> [args]`.

### list-schedules.js

**Purpose**: Show all scheduled tasks

**Usage**: `bun list-schedules.js [--json]`

**Output**: Table of schedules with status, next run, last run

**Use when**: User asks "what's scheduled?" or "show my scheduled tasks"

### parse-schedule-request.js

**Purpose**: Parse natural language schedule requests

**Usage**: `bun parse-schedule-request.js "<natural language request>"`

**Examples**:
- "Schedule AI research every morning at 6am on weekdays"
- "Run daily backups at 2am"
- "Check email at 9am Monday through Friday"

**Output**: JSON with parsed time, days, task, and suggested settings

**Use when**: Converting user's natural language to create-schedule parameters

### create-schedule.js

**Purpose**: Create new scheduled task

**Usage**: `bun create-schedule.js [options]`

**Options**:
- `--name` - Schedule name
- `--description` - What this schedule does
- `--prompt` - Full prompt text to execute
- `--schedule` - When to run (e.g., "6:00 Mon-Fri", "8:00 daily", "9:00 Sat")
- `--tools` - Comma-separated allowed tools (always include "Skill" for skill invocation)
- `--missed-run` - Policy: skip|catch-up|retry (default: skip)
- `--enabled` - Enable immediately (default: true)
- `--obsidian-folder` - Where to save results (default: Geoffrey/Scheduled Tasks/Output)

**Output**: Schedule ID, next run time, plist location

**Use when**: User wants to schedule something (after parsing natural language)

### update-dashboard.js

**Purpose**: Generate/update Obsidian dashboard

**Usage**: `bun update-dashboard.js`

**Output**: Updates `Geoffrey/Scheduled Tasks.md` in Obsidian

**Use when**: After any schedule changes

### run-scheduled-task.js

**Purpose**: Execute scheduled task (called by launchd)

**Usage**: `bun run-scheduled-task.js <schedule-id>`

**Logic**:
1. Read schedule from schedules.json
2. Check if enabled (exit if disabled)
3. Log execution start to JSONL
4. Execute `claude -p "<prompt>" --allowed-tools Tools,Skill`
5. Capture output and exit code
6. If failed and retry policy: retry up to max_retries times
7. If failed with notify_on_failure: create OmniFocus task with log file link
8. Update last_run in schedules.json
9. Update dashboard

**Error handling**:
- Retry logic respects missed_run_policy.action and max_retries
- OmniFocus notifications include schedule name, error, and log file path
- All errors logged to JSONL with stack traces

**Use when**: Never called directly - launchd invokes this

### rotate-logs.js

**Purpose**: Clean up old execution logs

**Usage**: `bun rotate-logs.js [--keep-months 6] [--dry-run]`

**Logic**: Deletes log files older than specified months (default: 6)

**Use when**: Monthly maintenance to prevent log bloat

## User Workflows

### Create Schedule (Natural Language)

**User**: "Schedule AI research every morning at 6am on weekdays"

**Geoffrey workflow**:
1. Use parse-schedule-request.js to extract:
   - Time: 6:00
   - Days: weekdays (Mon-Fri)
   - Task: "AI research"
2. Ask clarifying questions:
   - "What specific prompt should I run for AI research?"
   - "Which tools are needed? (e.g., WebSearch, Read, Write, Skill)"
   - "Where should I save results in Obsidian?"
   - "What if computer is asleep? (skip/catch-up/retry)"
3. Run create-schedule.js with parsed + clarified parameters
4. Show confirmation:
   ```
   ✅ Created schedule: AI research
   - Runs: Mon-Fri at 6:00 AM
   - Next run: Tomorrow at 6:00 AM
   - Dashboard: [[Geoffrey/Scheduled Tasks]]
   ```

**Example prompts**:
- "Schedule daily backup at 2am with catch-up if computer asleep"
- "Run email check every weekday at 9am"
- "Generate weekly report every Friday at 5pm"

### View Schedules

**User**: "Show my scheduled tasks" or "What's scheduled?"

**Geoffrey**:
1. Run list-schedules.js
2. Format as table:
   ```
   ID              Name            Enabled  Last Run      Status
   ai-research-x7k Daily AI        ✓        Dec 1 06:00  ✓ Success
   backup-2k8f     Daily Backup    ✓        Never        -
   ```
3. Show link to Obsidian dashboard

### Modify Schedule

**User**: "Change AI research to 7am" or "Disable the backup schedule"

**Geoffrey**:
1. Find matching schedule (fuzzy match by name)
2. Confirm change
3. Run update-schedule.js with new parameters
4. Reload plist if schedule time changed

### Delete Schedule

**User**: "Remove the AI research schedule"

**Geoffrey**:
1. Find matching schedule
2. Confirm deletion
3. Run delete-schedule.js
4. Unload plist, remove from schedules.json
5. Ask: "Keep execution logs?" (default: yes)

### Check Execution

**User**: "Did my AI research run this morning?"

**Geoffrey**:
1. Find schedule by name
2. Check last_run timestamp
3. Read JSONL log if available
4. Report:
   ```
   ✅ AI research ran at 6:00 AM (succeeded in 32s)

   Results saved to: [[Geoffrey/Research/2025-12-01-ai-news.md]]
   Log file: execution-logs/2025-12/01-ai-research-x7k.jsonl
   ```

### Handle Failures

**Automatic on failure with notify_on_failure: true**:
1. run-scheduled-task.js fails (exit code != 0)
2. Checks retry policy:
   - If retry: Retry up to max_retries times
   - If retry exhausted or skip: Continue to notification
3. Creates OmniFocus task:
   ```
   Name: "Scheduled task failed: Daily AI Research"
   Project: Geoffrey System
   Tags: Geoffrey, Alert, Automation
   Note:
     Schedule ID: ai-research-x7k

     Error: claude exited with code 1

     Log file: /Users/.../execution-logs/2025-12/01-ai-research-x7k.jsonl

     Check the log file for details and fix the issue.
   Flagged: Yes
   Due: Today
   ```
4. User investigates log file, fixes issue
5. Can disable/modify/delete schedule as needed

## Data Storage

**schedules.json** (iCloud):
```json
{
  "version": "1.0",
  "schedules": [
    {
      "id": "unique-id",
      "name": "Display name",
      "enabled": true,
      "schedule": {"type": "calendar", "interval": {...}},
      "task": {"prompt": "...", "allowed_tools": [...]},
      "missed_run_policy": {"action": "skip|catch-up|retry"},
      "last_run": {"timestamp": "...", "status": "success|failed"}
    }
  ]
}
```

**Execution logs** (iCloud):
`execution-logs/YYYY-MM/DD-schedule-id.jsonl`

**Obsidian dashboard**:
`Geoffrey/Scheduled Tasks.md` - auto-generated, shows all schedules

## Launchd Integration

Each schedule creates a plist file:
`~/Library/LaunchAgents/com.geoffrey.schedule.<id>.plist`

**Load**: `launchctl load <plist>`
**Unload**: `launchctl unload <plist>`
**Status**: `launchctl list | grep geoffrey`

## Missed Run Policies

**skip**: Don't run if computer asleep (e.g., daily news)
**catch-up**: Run once when computer wakes (e.g., backups)
**retry**: Retry up to N times with interval (e.g., critical tasks)

## Error Handling

- If claude fails: Log error, retry if configured
- If schedules.json corrupt: Backup, alert user
- If plist invalid: Validate before loading with `plutil -lint`
- Execution errors logged to JSONL + dashboard

## Important Notes

**System Requirements:**
- macOS with launchd (user-level agents)
- User must be logged in for schedules to run
- Claude Code installed and `claude -p` working
- OmniFocus installed (for failure notifications)

**Timing:**
- All schedules use system time (Pacific)
- launchd may delay up to 60 seconds for calendar intervals
- Missed runs handled per missed_run_policy

**Storage:**
- schedules.json syncs via iCloud
- Logs stored in iCloud knowledge folder
- Dashboard auto-updates after any change
- Run rotate-logs.js monthly to prevent bloat (keeps 6 months by default)

**Best Practices:**
1. Always include "Skill" in allowed-tools for skill invocation
2. Use descriptive schedule names for easy management
3. Set notify_on_failure: true for critical schedules
4. Use retry policy for important tasks (backups, reports)
5. Use skip policy for time-sensitive tasks (daily news)
6. Test prompt manually first with `claude -p "<prompt>"` before scheduling
7. Check dashboard weekly to verify schedules are running

**Troubleshooting:**
- Check launchd status: `launchctl list | grep geoffrey`
- View plist: `cat ~/Library/LaunchAgents/com.geoffrey.schedule.*.plist`
- Check logs: `tail ~/Library/Mobile\ Documents/.../execution-logs/YYYY-MM/DD-*.jsonl`
- Test manually: `bun run-scheduled-task.js <schedule-id>`
- Reload plist: `launchctl unload <plist> && launchctl load <plist>`
