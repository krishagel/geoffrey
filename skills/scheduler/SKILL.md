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

### create-schedule.js

**Purpose**: Create new scheduled task

**Usage**: `bun create-schedule.js [options]`

**Options**:
- `--name` - Schedule name
- `--description` - What this schedule does
- `--prompt` - Full prompt text to execute
- `--schedule` - When to run (e.g., "6:00 Mon-Fri", "8:00 daily", "9:00 Sat")
- `--tools` - Comma-separated allowed tools
- `--missed-run` - Policy: skip|catch-up|retry
- `--enabled` - Enable immediately (default: true)

**Output**: Schedule ID, next run time, plist location

**Use when**: User wants to schedule something

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
2. Check if enabled
3. Execute `claude -p` with prompt + allowed tools
4. Log execution to JSONL
5. Update last_run in schedules.json
6. Update dashboard

**Use when**: Never called directly - launchd invokes this

## User Workflows

### Create Schedule

**User**: "Schedule AI research every morning at 6am on weekdays"

**Geoffrey**:
1. Parse request: time=6:00, days=Mon-Fri, task=research AI
2. Ask clarifying questions:
   - What prompt should I run?
   - Where should results be saved?
   - What tools are needed?
   - What if computer is asleep? (skip/catch-up/retry)
3. Run create-schedule.js
4. Show confirmation with next run time
5. Show link to dashboard

### View Schedules

**User**: "Show my scheduled tasks"

**Geoffrey**:
1. Run list-schedules.js
2. Format as table
3. Show link to Obsidian dashboard

### Check Execution

**User**: "Did my AI research run this morning?"

**Geoffrey**:
1. Find matching schedule
2. Check last_run timestamp
3. Read execution log if available
4. Report status + link to output

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

- Schedules use system time (Pacific)
- launchd only runs when user logged in
- Requires `claude -p` to work (test once manually first)
- Dashboard auto-updates after every schedule operation
- Logs rotate monthly to prevent file bloat
