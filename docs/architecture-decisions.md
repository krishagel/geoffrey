# Architecture Decisions

## Why No MCP Server for OmniFocus?

**Decision:** Write our own AppleScript/JXA scripts instead of using existing MCP servers.

**Rationale:**
- Existing MCP servers truncate tag names
- Can't get full tag hierarchy with groupings
- We need exactly what we need, nothing more
- Scripts live inside skills for portability

## Preferences Must Stay Lean

**Decision:** preferences.json contains only behavioral rules, not data.

**Wrong:**
```json
{
  "omnifocus": {
    "all_129_tags": [...huge array...]
  }
}
```

**Right:**
```json
{
  "omnifocus_philosophy": {
    "task_creation": "Always assign to project + due date"
  }
}
```

**Rationale:** Prevents context window bloat as Geoffrey learns more.

## Skills Fetch Data On-Demand

**Decision:** Scripts query external systems (OmniFocus, etc.) at runtime.

**Rationale:**
- Data is always current
- No stale caches
- Context stays lean
- Performance when needed, not always

## When to Cache

Only cache if:
- Data rarely changes
- Fetching is very slow (>5 seconds)
- Multiple skills need same data frequently

Even then, keep cache separate from preferences.

## Monitoring PAI Updates

Regularly check https://github.com/danielmiessler/Personal_AI_Infrastructure for:
- New skills to adapt
- Architectural patterns
- Best practices updates

## OmniFocus Tag System

User has 129 tags organized hierarchically:
- **Activity**: Creative, Leisure, Bills, Writing, Reading, Research, Health, Organization, Chores, Coding
- **Energy**: Low, High, Brain Dead, Full Focus, Short Dashes, Routines, Hanging Around
- **Location**: Grocery Stores, PSD Sites, Home, Other Shopping
- **People**: Personal (family), PSD (Tech, DCRC, Comms, ESC, SSOs)
- **Groups**: DLI Admin, FLT, MTSS Core Team, Engineering Team, etc.
- **Time**: Morning, Afternoon, Evening
- **Standalone**: Follow Up, Waiting For, Waiting, Kiwanis

## Task Creation Philosophy

- Always assign to a project (never leave in Inbox)
- Always set expected completion date
- Tag with person + "Follow Up" for 1:1 discussions
- Use location tags for shopping tasks
