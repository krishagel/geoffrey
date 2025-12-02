# Development Workflows

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
├── docs/                     # Task-specific documentation
│   ├── obsidian-integration.md
│   ├── skill-development.md
│   ├── architecture-decisions.md
│   └── development-workflows.md
└── CLAUDE.md                 # Core principles only

iCloud (synced knowledge):
└── Geoffrey/knowledge/
    └── preferences.json      # LEAN - behavioral only
```

## Coding Standards

### Preferences

- Keep entries small (1-3 lines each)
- Use confidence scores (0.0-1.0)
- Only behavioral rules
- No data structures

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

## Standardized Output Format

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

## Contributing

When adding new skills:
1. Create skill directory with SKILL.md
2. Add scripts inside skill directory
3. Keep behavioral preferences lean
4. Test with real data
5. Update this documentation if architectural decisions change

## Extended Thinking Modes

Claude Code supports progressive thinking levels:
- "think" - Basic extended thinking
- "think hard" - Moderate extended thinking
- "think harder" - Deep extended thinking
- "ultrathink" - Maximum extended thinking budget

Use higher levels for complex architectural decisions or multi-step planning.

## Auto-Updating CLAUDE.md

Press the `#` key during Claude Code sessions to have Claude automatically incorporate new guidelines into the relevant CLAUDE.md or documentation file.

## CLAUDE.local.md Option

For personal notes not committed to git, create `CLAUDE.local.md` and add to `.gitignore`. This file loads alongside `CLAUDE.md`.
