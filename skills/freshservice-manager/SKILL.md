---
name: freshservice-manager
description: Manage Freshservice tickets, view status, create and update tickets across workspaces
triggers:
  - "freshservice"
  - "check tickets"
  - "create ticket"
  - "ticket status"
  - "my tickets"
  - "open tickets"
  - "freshservice summary"
  - "assign ticket"
allowed-tools: Read, Bash
version: 0.1.0
---

# Freshservice Manager Skill

Manage Freshservice tickets across all workspaces with querying, creation, and updates.

## When to Activate

Use this skill when user wants to:
- Check ticket status or list tickets
- Create new tickets (from OmniFocus tasks, emails, etc.)
- Update tickets (assign, change status, add notes)
- Get daily summaries of ticket activity
- View tickets assigned to them or their team

## Configuration

**API Key Location:** `~/Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/secrets/.env`

```env
FRESHSERVICE_DOMAIN=psd401.freshservice.com
FRESHSERVICE_API_KEY=your_key_here
```

**Agent Info:**
- Agent ID: 6000130414
- Email: hagelk@psd401.net

## Workspaces

| ID | Name | Primary |
|----|------|---------|
| 2 | Technology | ✓ |
| 3 | Employee Support Services | |
| 4 | Business Services | |
| 5 | Teaching & Learning | |
| 6 | Maintenance | |
| 8 | Investigations | |
| 9 | Transportation | |
| 10 | Safety & Security | |
| 11 | Communications | |
| 13 | Software Development | |

**Note:** Use `workspace_id: 0` to query across all workspaces.

## Available Scripts

Scripts are in `./scripts/` directory. Run via:
```bash
bun ./scripts/script-name.js [args]
```

### get_agent.js
Get agent info by email.

**Usage:** `bun get_agent.js [email]`

**Returns:** Agent profile including ID, workspaces, roles

### get_workspaces.js
Get workspace details.

**Usage:** `bun get_workspaces.js [workspace_id]`

**Returns:** Workspace names, IDs, and state

### list_tickets.js
List tickets with filters.

**Usage:** `bun list_tickets.js '<json>'`

**Options:**
```json
{
  "workspace_id": 2,
  "filter": "new_and_my_open",
  "per_page": 30,
  "page": 1,
  "updated_since": "2025-01-01"
}
```

**Predefined filters:** `new_and_my_open`, `watching`, `spam`, `deleted`

### get_ticket.js
Get ticket details by ID.

**Usage:** `bun get_ticket.js <ticket_id> [include]`

**Include options:** `conversations`, `requester`, `problem`, `stats`, `assets`, `change`, `related_tickets`

### create_ticket.js
Create a new ticket.

**Usage:** `bun create_ticket.js '<json>'`

**Required fields:** `subject`, `description`, `email`

**Example:**
```json
{
  "subject": "New equipment request",
  "description": "Need a new monitor for office",
  "email": "requester@psd401.net",
  "priority": 2,
  "status": 2,
  "workspace_id": 2
}
```

### update_ticket.js
Update an existing ticket.

**Usage:** `bun update_ticket.js <ticket_id> '<json>'`

**Example:**
```json
{
  "status": 4,
  "priority": 3,
  "responder_id": 6000130414
}
```

## Status and Priority Values

**Status:**
- 2 = Open
- 3 = Pending
- 4 = Resolved
- 5 = Closed

**Priority:**
- 1 = Low
- 2 = Medium
- 3 = High
- 4 = Urgent

## Common Workflows

### Check My Open Tickets

```bash
bun list_tickets.js '{"filter": "new_and_my_open", "workspace_id": 2}'
```

### Create Ticket from OmniFocus Task

1. Extract task details (subject, notes)
2. Determine workspace based on content
3. Create ticket:
```bash
bun create_ticket.js '{"subject": "Task subject", "description": "Task notes", "email": "requester@psd401.net", "workspace_id": 2}'
```

### Daily Summary

1. List recent tickets across all workspaces:
```bash
bun list_tickets.js '{"workspace_id": 0, "updated_since": "2025-11-21", "per_page": 50}'
```

2. Summarize by workspace and status

### Assign Ticket to Agent

```bash
bun update_ticket.js 151900 '{"responder_id": 6000130414}'
```

## Output Format

When presenting ticket information, use this format:

```markdown
## Tickets Summary

**Technology (Workspace 2):**
- #151900: Principal Phone Discovery (Open, Medium)
- #151899: New Student Enrollee (Open, Medium)

**Total:** X open, Y pending, Z resolved
```

## Future Enhancements

- [ ] Search tickets with query strings
- [ ] Get my pending approvals
- [ ] Add notes/replies to tickets
- [ ] Get ticket conversations
- [ ] Agent workload summary
- [ ] Custom field support
- [ ] Bulk ticket operations

## API Reference

- **Base URL:** `https://psd401.freshservice.com/api/v2`
- **Auth:** Basic auth with API key as username, X as password
- **Rate Limits:** Higher limits than v1
- **Docs:** https://api.freshservice.com/

## Known Limitations

1. **No "List Workspaces" endpoint** - workspace IDs must be known
2. **Agent filtering has pagination bugs** - counts may be incorrect
3. **No "My Approvals" endpoint** - need to query tickets/changes
4. **30-day default window** - use `updated_since` for older tickets
