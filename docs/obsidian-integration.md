# Obsidian Integration

Obsidian is the user's persistent second brain. All significant work should be saved there.

**Vault Path:** `/Users/$USER/Library/Mobile Documents/iCloud~md~obsidian/Documents/Personal_Notes/`

**Note:** The vault path is dynamic based on the current user. Use the environment or determine the active username programmatically - do not hardcode a specific username.

## When to Read from Obsidian

- **Before research tasks:** Check Readwise for existing highlights on the topic
- **When people mentioned:** Look up context in `People/` folder
- **For meeting prep:** Find past meetings and related notes
- **For podcast context:** Search Snipd transcripts

## When to Write to Obsidian

| Content Type | Destination | When |
|--------------|-------------|------|
| Research results | `Geoffrey/Research/{Project}/` | After completing research tasks |
| Learnings | `Geoffrey/Learnings/` | When patterns or insights emerge |
| Decisions | `Geoffrey/Decisions/` | Major decisions with rationale |
| Meeting notes | `Meetings/` | After meetings (if requested) |
| Daily session logs | `Geoffrey/Daily-Logs/` | End of conversation (automated) |
| Generated reports | `Geoffrey/Reports/{Org}/{Topic}/` | After creating reports |

**Write Mode:** Auto-create new files, confirm before updating existing files.

## Organizational Rules

**CRITICAL**: Always follow this folder structure when creating Obsidian content in the Geoffrey folder.

### Folder Structure (Strict)

```
Geoffrey/
├── Mission Control.md          # Dashboard (uses Dataview, auto-updates)
├── Scheduled Tasks.md           # Scheduler dashboard (auto-updated)
├── Reports Dashboard.md         # Reports index (auto-updated)
├── Research/
│   ├── Daily AI Briefings/      # Automated daily research
│   ├── [Project Name]/          # Other research projects (subfolder per project)
│   └── attachments/             # Images for research notes
├── Reports/
│   └── {Organization}/          # PSD, HRG, Personal, etc.
│       └── {Topic}/             # Specific report topic
│           ├── *.md             # Report content
│           └── *.png            # Associated images
├── Daily-Logs/
│   └── YYYY-MM-DD.md            # Session summaries (auto-created)
├── Learnings/
│   └── YYYY-MM-DD-topic.md      # Extracted insights (prompted)
└── Decisions/
    └── YYYY-MM-DD-topic.md      # Major decisions (prompted)
```

### File Naming Conventions

**Research**: `YYYY-MM-DD-topic.md` or descriptive names with dates
**Reports**: Descriptive with dates (e.g., "Peninsula HS - Weekly Discipline Report Nov 17-20 2025.md")
**Images**: Must include dates (e.g., "Descriptive Name YYYY-MM-DD.png")
**Daily-Logs**: `YYYY-MM-DD.md` (date only)
**Learnings**: `YYYY-MM-DD-brief-topic.md`
**Decisions**: `YYYY-MM-DD-decision-topic.md`

### Routing Rules (ENFORCE THESE)

| Content Type | Destination | Example |
|--------------|-------------|---------|
| Research outputs | `Geoffrey/Research/{Project}/` | `Geoffrey/Research/Daily AI Briefings/2025-12-01-ai-briefing.md` |
| Generated reports | `Geoffrey/Reports/{Org}/{Topic}/` | `Geoffrey/Reports/PSD/Tech Support/Tech Support Dashboard Nov 2025.md` |
| Session summary | `Geoffrey/Daily-Logs/YYYY-MM-DD.md` | `Geoffrey/Daily-Logs/2025-12-01.md` |
| Extracted learning | `Geoffrey/Learnings/YYYY-MM-DD-topic.md` | `Geoffrey/Learnings/2025-12-01-browser-control-patterns.md` |
| Major decision | `Geoffrey/Decisions/YYYY-MM-DD-topic.md` | `Geoffrey/Decisions/2025-12-01-obsidian-organization.md` |

### Automation Triggers

**Daily-Logs (end of conversation):**
- Summarize conversation highlights
- Note skills used, tasks completed
- Save to `Daily-Logs/YYYY-MM-DD.md`
- Append if file exists (multiple sessions per day)
- **Manual for now** - prompt at end of significant conversations

**Learnings (after significant insight):**
- Extract patterns, preferences, or process improvements
- Save to `Learnings/YYYY-MM-DD-topic.md`
- Tag with confidence score and source
- **Manual for now** - prompt when important learnings emerge

**Decisions (when making major choice):**
- Document architectural decisions, approach changes
- Save to `Decisions/YYYY-MM-DD-topic.md`
- Include rationale, alternatives considered, outcome
- **Manual for now** - prompt when making significant decisions

### Validation Before Writing

Before creating any Obsidian note in Geoffrey folder:
1. Verify correct folder based on content type (use routing table above)
2. Check naming convention matches pattern
3. Search for existing notes on same topic (avoid duplicates)
4. Include proper frontmatter (created, tags, source, related)
5. If creating research in new project, use subfolder: `Research/{Project Name}/`
6. If creating report, use org/topic structure: `Reports/{Org}/{Topic}/`
7. Images MUST be saved in same folder as the associated report/research

## Knowledge Sources

**Readwise (368 articles, 34 books):**
- Years of curated highlights
- Search by topic, author, or category
- Path: `Readwise/Articles/`, `Readwise/Books/`

**Snipd (58+ episodes):**
- Podcast transcripts and snips
- Rich metadata including timestamps
- Path: `Snipd/Data/`

## Creating Backlinks

Always create connections to existing content:

1. Search vault before creating new notes
2. Use `[[wiki-links]]` to reference existing notes
3. Add related notes to frontmatter
4. Reference Readwise/Snipd sources when relevant

## Frontmatter Standard

```yaml
---
created: 2025-11-23
tags: [geoffrey, research]
source: geoffrey
related:
  - "[[Related Note]]"
---
```

## Dashboard

The user's dashboard is at `Geoffrey Mission Control.md` - shows recent activity, Readwise highlights, Snipd episodes, and vault stats.
