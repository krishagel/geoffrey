---
name: omnifocus-manager
description: Manage OmniFocus tasks, projects, and inbox with proper tagging and organization
triggers:
  - "add task"
  - "create task"
  - "new task"
  - "follow up with"
  - "triage inbox"
  - "clean up tasks"
  - "check omnifocus"
  - "show tasks"
  - "what's due"
  - "inbox review"
allowed-tools: Read, Bash
version: 0.1.0
---

# OmniFocus Manager Skill

Manage OmniFocus tasks with proper project assignment, tagging, and organization based on user preferences.

## When to Activate

Use this skill when user wants to:
- Add/create tasks
- Follow up with someone
- Triage or review inbox
- Clean up or organize tasks
- Check what's due or available
- Query task status

## User Preferences

**Task Creation Philosophy:**
- Always assign to a project (never leave in Inbox)
- Always set expected completion date
- Tag with person + "Follow Up" for 1:1 discussions
- Use location tags for shopping tasks

## Available Scripts

Scripts are in `./scripts/` directory. Run via:
```bash
osascript -l JavaScript ./scripts/script-name.js
```

**IMPORTANT:** Always use pure JXA, NOT Omni Automation URL scheme. The URL scheme triggers security popups for every unique script. JXA runs silently.

Key JXA patterns:
- `doc.inboxTasks.push(task)` - create new tasks
- `app.add(tag, {to: task.tags})` - add existing tags (not push!)
- `task.assignedContainer = project` - move to project

### get_tags.js
Returns full tag hierarchy with groupings.

**Output:** JSON with all 129 tags organized by parent/children

**Use when:** Need to find correct tags for a task

### get_projects.js (TODO)
Returns full project/folder structure.

**Use when:** Need to find correct project for a task

### add_task.js (TODO)
Creates a task with proper tags and project.

**Parameters:** name, project, tags, dueDate, notes

## Tag Hierarchy Reference

**Top-level categories:**
- **Activity** - What type of work (Creative, Coding, Writing, Reading, Research, etc.)
- **Energy** - Required mental state (Full Focus, Short Dashes, Brain Dead, Low, High)
- **Location** - Where to do it (Home, Grocery Stores, PSD Sites, Other Shopping)
- **People** - Who's involved (Personal family, PSD staff by department)
- **Groups** - Team meetings (Cabinet, Engineering Team, DLI Admin, etc.)
- **Time** - When to do it (Morning, Afternoon, Evening)
- **Communications** - How to communicate (Email, Phone, In Person, etc.)
- **Online** - Online tools (Freshservice, Github, Google Docs)
- **Standalone** - Follow Up, Waiting For, Waiting, Kiwanis

**People → PSD breakdown:**
- Tech: Mel, Bill, Reese, Mark, Brad, Mason, Jordan, etc.
- DCRC: Jodi, Terri, Laura
- Comms: Danielle, Jake, Shana
- ESC: Ashley, John Y, Patrick, Krestin, James, Wendy, etc.
- SSOs: Moose, Brent

## Common Workflows

### Add a Task

1. Parse user request for: task name, person (if any), context clues
2. Run `get_tags.js` to fetch current tag hierarchy
3. Determine appropriate:
   - **Project** - based on domain (PSD work, Personal, etc.)
   - **Tags** - person, activity type, energy level
   - **Due date** - default to reasonable timeframe
4. Run `add_task.js` with parameters
5. Return standardized output

**Example:**
```
User: "Follow up with Mel about the drone program"

Actions:
- Task: "Follow up with Mel about the drone program"
- Project: PSD > General Technology > Digital Innovation Leads
- Tags: Mel, Follow Up
- Due: Next 1:1 date or 7 days
```

### Triage Inbox

1. Run script to get inbox tasks
2. For each task, suggest:
   - Appropriate project
   - Tags based on content
   - Due date
3. Present recommendations
4. User approves or modifies
5. Move tasks to projects

### Clean Up Tasks

1. Find tasks that are:
   - Overdue
   - Stale (no activity)
   - Missing tags
   - In wrong project
2. Suggest actions:
   - Complete
   - Defer
   - Delete
   - Re-tag
   - Move

## Error Handling

**If OmniFocus not running:**
```
Status: ❌ Failed
Error: OmniFocus is not running. Please open OmniFocus and try again.
```

**If tag not found:**
- Check for similar tags (fuzzy match)
- Suggest creating new tag
- Ask user to clarify

**If project not found:**
- List available projects in that domain
- Suggest closest match
- Ask user to specify

## Output Format

Always use standardized format:

```markdown
## Summary
Created task with proper tags and project assignment

## Actions
- Created task: "[task name]"
- Project: [full project path]
- Tags: [tag1, tag2, tag3]
- Due: [date]
- Notes: [if any]

## Status
✅ Complete

## Next Steps
- Task appears in [relevant perspective]
- Follow up scheduled for [date if applicable]
```

## Future Enhancements

- [ ] Batch task creation
- [ ] Smart project suggestion based on content
- [ ] Calendar integration for due dates
- [ ] Recurring task patterns
- [ ] Perspective queries
- [ ] Task completion tracking
