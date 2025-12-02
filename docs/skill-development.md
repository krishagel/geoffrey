# Skill Development Guide

## Skills as Self-Contained Modules

Each skill should:
- Have its own SKILL.md
- Include any scripts it needs
- Fetch data on-demand
- Not bloat the main context

## Skill Routing Metadata

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

## SKILL.md Validation Checklist

**CRITICAL:** Every SKILL.md must pass these checks before commit:

1. **Frontmatter must be FIRST** - No text before the opening `---`
2. **Required fields:**
   - `name` - skill identifier (matches directory name)
   - `description` - one-line description
   - `triggers` - array of natural language phrases
   - `allowed-tools` - comma-separated tool list
   - `version` - semantic version

### Valid Format

```yaml
---
name: skill-name
description: Brief description of what this skill does
triggers:
  - "trigger phrase one"
  - "trigger phrase two"
allowed-tools: Read, Bash
version: 0.1.0
---

# Skill Title
```

### Invalid Format

```yaml
# Title Here    <-- ERROR: text before frontmatter

---
name: skill-name
---
```

### Validation Command

```bash
# Check all skills have valid frontmatter
for f in skills/*/SKILL.md; do head -1 "$f" | grep -q "^---$" || echo "INVALID: $f"; done
```

## SKILL.md Content Guidelines

SKILL.md should explain:
- When the skill activates
- What scripts it can call
- How to interpret results
- Error handling guidance

## Scripts

- Use JXA (JavaScript for Automation) over AppleScript for OmniFocus
- Return JSON for easy parsing
- Include error handling
- Document expected output format

## Contributing New Skills

When adding new skills:
1. Create skill directory with SKILL.md
2. Add scripts inside skill directory
3. Keep behavioral preferences lean
4. Test with real data
5. Update CLAUDE.md if architectural decisions change

## Four-Step Reasoning (for new features)

When building new capabilities, always ask:
1. Can this be a deterministic CLI tool/script?
2. Will this be called repeatedly (>10 times)?
3. Should AI orchestrate rather than implement?
4. What's the natural language routing trigger?
