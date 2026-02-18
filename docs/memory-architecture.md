# Geoffrey Memory Architecture

## Overview

Geoffrey uses a 2-tier memory system for session continuity and knowledge persistence.

## Tiers

### Tier 1: Hot Memory (Working State)

**Location:** `~/.geoffrey/state/current-work.json`
**Purpose:** Cross-session continuity for active work
**Lifecycle:** Updated at session end, loaded at session start, stale after 24h

Contains:
- Active task description and status
- Files being modified
- Last skill used
- Pending actions / next steps
- Project context (from cwd)

**Hooks:**
- `SessionStart/load-context.ts` — Reads state, displays to Claude if fresh (<24h)
- `SessionEnd/save-state.ts` — Extracts task context from transcript, writes state

### Tier 2: Cold Memory (Persistent Knowledge)

**Location:** Obsidian vault + iCloud knowledge directory
**Purpose:** Long-term knowledge storage and retrieval
**Lifecycle:** Accumulates over time, manually curated

Contains:
- **Obsidian vault** — Research notes, decisions, daily logs (routed by classifier)
- **iCloud knowledge** — Learned preferences, raw session history (JSONL), identity docs
- **Claude auto-memory** — `~/.claude/projects/.../memory/MEMORY.md` for cross-session patterns

**Hooks:**
- `SessionEnd/extract-learnings.ts` — Extracts user preferences to `learned-preferences.json`
- `SessionEnd/route-to-obsidian.ts` — Routes content to Research/Decisions/Daily-Logs
- `SessionEnd/capture-history.ts` — Raw JSONL to `knowledge/history/raw/`
- `SessionEnd/create-daily-log.ts` — Daily log entries + raw JSONL

## Data Flow

```
Session Start
    │
    ▼
load-context.ts ─── reads ──▶ ~/.geoffrey/state/current-work.json
    │                              (if fresh <24h)
    ▼
[Session runs...]
    │
    ▼
Session End
    │
    ├── save-state.ts ──── writes ──▶ ~/.geoffrey/state/current-work.json
    ├── extract-learnings.ts ─────▶ iCloud/knowledge/learned-preferences.json
    ├── route-to-obsidian.ts ─────▶ Obsidian vault (Research/Decisions/Daily-Logs)
    ├── capture-history.ts ───────▶ iCloud/knowledge/history/raw/YYYY-MM/
    └── create-daily-log.ts ──────▶ Obsidian Daily-Logs/ + raw JSONL
```

## Paths

| What | Path |
|------|------|
| Working state | `~/.geoffrey/state/current-work.json` |
| Learned preferences | `~/Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/knowledge/learned-preferences.json` |
| Raw history | `~/Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/knowledge/history/raw/` |
| Obsidian vault | `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Geoffrey/` |
| Identity docs | `~/Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/knowledge/identity-core.json` |

## Design Decisions

1. **Why `~/.geoffrey/state/` instead of Obsidian?**
   - Hot memory needs fast local read/write without iCloud sync latency
   - Stale after 24h, so no archival value
   - Obsidian is for human-readable persistent knowledge

2. **Why 24h staleness?**
   - After a day, the task context is likely outdated
   - Prevents stale context from misleading new sessions
   - User can always reference Obsidian for historical context

3. **Why separate from Claude's auto-memory?**
   - Claude's `MEMORY.md` is for stable patterns (always loaded)
   - Working state is ephemeral (loaded only if fresh)
   - Different retention policies: auto-memory is permanent, working state expires
