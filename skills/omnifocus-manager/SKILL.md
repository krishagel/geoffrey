---
name: omnifocus-manager
description: Manage OmniFocus tasks, projects, and inbox with proper tagging and organization
triggers:
  - "add task"
  - "create task"
  - "new task"
  - "follow up with"
  - "triage omnifocus"
  - "triage my omnifocus"
  - "omnifocus inbox"
  - "clean up omnifocus"
  - "check omnifocus"
  - "show tasks"
  - "what's due"
  - "omnifocus review"
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

### get_inbox.js
Returns remaining inbox tasks (matches OmniFocus Inbox perspective).

**Filter logic:** Tasks with no project + not completed + not dropped + not deferred to future

**Output:** JSON with count and task array (id, name, note, tags, dueDate)

**Use when:** Starting inbox triage

### get_tags.js
Returns full tag hierarchy with groupings.

**Output:** JSON with all 129 tags organized by parent/children

**Use when:** Need to find correct tags for a task

### get_projects.js
Returns full project/folder structure.

**Output:** JSON with projects and folder paths

**Use when:** Need to find correct project for a task

### add_task.js
Creates a new task with proper tags and project.

**Parameters:** name, project, tags[], dueDate, deferDate, note, flagged

**Use when:** Creating new tasks

### update_task.js
Updates any existing task (not just inbox).

**Parameters:** name or id, project, tags[], dueDate, deferDate

**Use when:** Triaging/moving tasks, adding tags

### create_tag.js
Creates a new tag, optionally under a parent.

**Parameters:** name, parent (optional)

**Use when:** Tag doesn't exist for a person or category

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
- ESC: Ashley, John Y, Patrick, Krestin, James, Wendy, Janna, etc.
- SSOs: Moose, Brent

**Special tags:**
- Geoffrey - tasks that AI can assist with
- Full Focus - requires dedicated focus time

## Task Routing Rules

### By Task Type → Project

| Task Type | Project | Default Due |
|-----------|---------|-------------|
| Discussions with people | Meetings | 7 days |
| Phone calls | Meetings | 7 days |
| CoSN-related | CoSN Work | 7 days |
| Digital Promise work | Digital Promise | 7 days |
| AI/automation projects | AI Studio | 7 days |
| Coding/development | Coding Projects | 7 days |
| Research/learning | Research for Future Plans | 7 days |
| SOP/process development | Standard Operating Procedures | 14 days |
| Form/procedure updates | Department Procedures | 7 days |
| District reimbursements | Purchasing & Acquisitions | 7 days |
| Travel approvals | (appropriate project) | 14 days |
| Data governance | Data Governance | 14 days |
| Tech support issues | → Freshservice ticket | N/A |

### By Task Type → Tags

| Task Type | Tags |
|-----------|------|
| Discussion with person | [Person name], Follow Up |
| Phone call | Phone, Follow Up |
| Research tasks | Research |
| AI-assistable tasks | Geoffrey |
| Focus time needed | Full Focus |
| Admin/organizational | Organization |
| Safety/security related | (relevant ESC person) |

### Routing Signals

**Goes to Meetings project:**
- "talk to [person]"
- "discuss with"
- "follow up with"
- "check with"
- "call [person/org]"
- "get [thing] to [person]"

**Goes to Research for Future Plans:**
- "look at/into"
- "what about"
- CISA resources
- Training to consider
- External resources to review

**Goes to Coding Projects or AI Studio:**
- AI/automation ideas
- "build a program"
- Geoffrey capabilities
- Technical tools to explore

**Needs Freshservice (skip for now):**
- User-reported issues
- Equipment requests
- "doesn't work/load"
- Form rebuild requests

## Common Workflows

### Add a Task

1. Parse user request for: task name, person (if any), context clues

2. Apply routing rules above to determine:
   - **Project** - based on task type
   - **Tags** - person + communication method + activity type
   - **Due date** - based on task type timing

3. If tag doesn't exist, create it with `create_tag.js`

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

1. **Get inbox tasks:**
   ```bash
   osascript -l JavaScript ./scripts/get_inbox.js
   ```
   This returns only remaining tasks (no project, not completed, not dropped, not deferred)

2. **Present assumptions in batches (10-15 tasks):**
   - Read task notes for context clues
   - Apply routing rules to suggest project, tags, due date
   - Flag unclear tasks that need user input

3. **Ask clarifying questions:**
   - Who is [person/acronym]?
   - Which project for [ambiguous task]?
   - Should this be skipped (needs email context)?

4. **Batch update confirmed tasks:**
   ```bash
   osascript -l JavaScript ./scripts/update_task.js '{"name":"...", "project":"...", "tags":[...], "dueDate":"..."}'
   ```

5. **Create missing tags/projects as needed:**
   ```bash
   osascript -l JavaScript ./scripts/create_tag.js '{"name":"PersonName", "parent":"ESC"}'
   ```

6. **Skip tasks that need:**
   - Email context (user needs to read first)
   - Freshservice ticket creation
   - More information to route properly

**Triage output format:**
```markdown
## My assumptions on remaining tasks:

| # | Task | Project | Tags | Notes |
|---|------|---------|------|-------|
| 1 | task name | Meetings | Person, Follow Up | context |

**Questions:**
- #X: Who is [person]?
- #Y: Which project for this?

Which numbers need correction?
```

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
