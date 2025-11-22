# Geoffrey Development Guidelines

## Project Overview

Geoffrey is a personal AI infrastructure built as a Claude Code plugin. It learns preferences and provides assistance across work, travel, and personal domains.

**Your name is Geoffrey.** When the user refers to you as Geoffrey, they mean you - the AI assistant.

**Inspiration:** [Personal AI Infrastructure by Daniel Miessler](https://github.com/danielmiessler/Personal_AI_Infrastructure)

## Core Architectural Principles

### Three-Tier Progressive Disclosure

**CRITICAL:** Keep context lean. Load only what's needed.

| Tier | What | When | Example |
|------|------|------|---------|
| **Tier 1** | System/preferences | Always | Behavioral rules (50-100 lines max) |
| **Tier 2** | SKILL.md | Skill activates | How to use OmniFocus |
| **Tier 3** | Data/scripts | Just-in-time | Fetch tags when creating task |

### Founding Principles

Adapted from PAI's Constitution:

| Principle | Meaning |
|-----------|---------|
| **Scaffolding > Model** | Architecture matters more than AI capability |
| **Code Before Prompts** | Write deterministic tools, wrap with AI |
| **Deterministic Output** | Favor predictable, repeatable outcomes |
| **Goal → Code → CLI → Prompts** | Proper development pipeline |
| **Test First** | Spec and test before implementation |

### Code Over Prompts

> "Build deterministic CLI tools, then wrap them with AI orchestration. Code is cheaper, faster, and more reliable than prompts."

- Use scripts for data fetching (AppleScript/JXA for OmniFocus)
- Skills orchestrate scripts, not store data
- Preferences = behavioral rules, not data dumps

### Four-Step Reasoning (for new features)

When building new capabilities, always ask:
1. Can this be a deterministic CLI tool/script?
2. Will this be called repeatedly (>10 times)?
3. Should AI orchestrate rather than implement?
4. What's the natural language routing trigger?

### Skill Routing Metadata

Skills should include trigger phrases for natural language activation:

```markdown
---
name: omnifocus-manager
triggers:
  - "add task"
  - "create task"
  - "follow up with"
  - "triage inbox"
  - "clean up tasks"
  - "check omnifocus"
---
```

**Learn from usage:** Add new triggers as you discover how you naturally phrase requests.

### Standardized Output Format

When completing tasks, use this structure for consistency:

```markdown
## Summary
What was done (1-2 sentences)

## Actions
- Specific steps taken
- What was created/modified

## Status
✅ Complete / ⚠️ Partial / ❌ Failed

## Next Steps
- Recommended follow-ups (if any)
```

**Benefits:**
- Scannable, predictable output
- Easy to verify what happened
- Clear next actions

### Skills as Self-Contained Modules

Each skill should:
- Have its own SKILL.md
- Include any scripts it needs
- Fetch data on-demand
- Not bloat the main context

## File Structure

```
geoffrey/
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json
├── skills/
│   └── skill-name/
│       ├── SKILL.md          # Tier 2 - detailed instructions
│       └── scripts/          # Tier 3 - on-demand data
├── commands/
│   └── command.md
├── agents/
├── hooks/
└── CLAUDE.md                 # This file

iCloud (synced knowledge):
└── Geoffrey/knowledge/
    └── preferences.json      # LEAN - behavioral only
```

## Development Decisions

### Why No MCP Server for OmniFocus?

**Decision:** Write our own AppleScript/JXA scripts instead of using existing MCP servers.

**Rationale:**
- Existing MCP servers truncate tag names
- Can't get full tag hierarchy with groupings
- We need exactly what we need, nothing more
- Scripts live inside skills for portability

### Preferences Must Stay Lean

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

### Skills Fetch Data On-Demand

**Decision:** Scripts query external systems (OmniFocus, etc.) at runtime.

**Rationale:**
- Data is always current
- No stale caches
- Context stays lean
- Performance when needed, not always

## Coding Standards

### Scripts

- Use JXA (JavaScript for Automation) over AppleScript for OmniFocus
- Return JSON for easy parsing
- Include error handling
- Document expected output format

### Skills

- SKILL.md should explain:
  - When the skill activates
  - What scripts it can call
  - How to interpret results
  - Error handling guidance

### Preferences

- Keep entries small (1-3 lines each)
- Use confidence scores (0.0-1.0)
- Only behavioral rules
- No data structures

## Key Learnings

### OmniFocus Tag System

User has 129 tags organized hierarchically:
- **Activity**: Creative, Leisure, Bills, Writing, Reading, Research, Health, Organization, Chores, Coding
- **Energy**: Low, High, Brain Dead, Full Focus, Short Dashes, Routines, Hanging Around
- **Location**: Grocery Stores, PSD Sites, Home, Other Shopping
- **People**: Personal (family), PSD (Tech, DCRC, Comms, ESC, SSOs)
- **Groups**: DLI Admin, FLT, MTSS Core Team, Engineering Team, etc.
- **Time**: Morning, Afternoon, Evening
- **Standalone**: Follow Up, Waiting For, Waiting, Kiwanis

### Task Creation Philosophy

- Always assign to a project (never leave in Inbox)
- Always set expected completion date
- Tag with person + "Follow Up" for 1:1 discussions
- Use location tags for shopping tasks

## Future Considerations

### When to Cache

Only cache if:
- Data rarely changes
- Fetching is very slow (>5 seconds)
- Multiple skills need same data frequently

Even then, keep cache separate from preferences.

### Monitoring PAI Updates

Regularly check https://github.com/danielmiessler/Personal_AI_Infrastructure for:
- New skills to adapt
- Architectural patterns
- Best practices updates

## Contributing

When adding new skills:
1. Create skill directory with SKILL.md
2. Add scripts inside skill directory
3. Keep behavioral preferences lean
4. Test with real data
5. Update this CLAUDE.md if architectural decisions change

---

**Remember:** Context is precious. Keep it lean. Fetch on-demand.
