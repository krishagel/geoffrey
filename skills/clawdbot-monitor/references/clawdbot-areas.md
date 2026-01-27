# Clawdbot Key Areas Reference

Quick reference for monitoring Clawdbot's architecture and identifying adoption opportunities for Geoffrey.

## Architecture Overview

Clawdbot is a **multi-channel messaging hub** that runs as a daemon, unlike Geoffrey which is a Claude Code plugin. Key architectural differences to consider when evaluating patterns.

## Primary Monitoring Areas

### 1. Skill Metadata System

**Location:** `skills/*/skill.json`

**Key Properties:**
- `requires.bins` - CLI dependencies (e.g., `["ffmpeg", "imagemagick"]`)
- `requires.config` - Configuration keys needed
- `install` - Auto-installation commands
- `category` - Skill categorization

**Geoffrey Comparison:**
- SKILL.md frontmatter is more prompt-focused
- No formal dependency declaration system
- No auto-install mechanism

**Adoption Opportunity:** Add `requires` section to SKILL.md frontmatter for dependency validation.

---

### 2. Hook System

**Event Types:**
- `session:start` / `session:end` - Session lifecycle
- `command:before` / `command:after` - Command execution
- `boot` / `shutdown` - Daemon lifecycle
- `message:receive` / `message:send` - Messaging events

**Handler Pattern:**
```typescript
// TypeScript event handlers
export const onSessionEnd = async (context) => {
  // Extract patterns, update memory
};
```

**Geoffrey Comparison:**
- hooks.json declarative config
- Limited event types
- No TypeScript handlers

**Adoption Opportunity:** Consider TypeScript hook handlers for complex logic.

---

### 3. Extension Architecture

**Key Patterns:**
- Plugin isolation (each extension runs separately)
- Multi-provider support (swap LLM backends)
- Channel abstraction (WhatsApp, Discord share same interface)

**Geoffrey Comparison:**
- Single-process plugin
- Claude-only (no provider swapping)
- No channel abstraction needed

**Adoption Opportunity:** Provider abstraction could enable multi-model research improvements.

---

### 4. Memory System

**Clawdbot Stack:**
- SQLite-vec for vector storage
- BM25 for keyword search
- Hybrid retrieval combining both
- Embeddings via local models or API

**Geoffrey Comparison:**
- Obsidian vault (Markdown files)
- Smart search via MCP
- No vector embeddings
- File-based persistence

**Adoption Opportunity:** Hybrid search could improve knowledge retrieval.

---

### 5. Skill Categories

**Clawdbot Categories:**
- CLI wrappers (ffmpeg, imagemagick, etc.)
- Platform integrations (Slack, Discord, etc.)
- AI utilities (summarize, translate, etc.)
- Development tools (git, docker, etc.)

**Geoffrey Equivalents:**
- Workflow orchestration (omnifocus-manager)
- Platform integrations (google-workspace, freshservice)
- AI utilities (multi-model-research, writer)
- Productivity (pdf, xlsx, docx)

**Gap Areas:**
- CLI wrappers (Geoffrey has few)
- Development tools (limited)
- Media processing (basic via image-gen)

---

## Skills to Watch

High-value Clawdbot skills for potential Geoffrey adoption:

| Clawdbot Skill | Purpose | Geoffrey Value |
|----------------|---------|----------------|
| `transcribe` | Audio transcription | High - morning briefing |
| `screenshot` | Screen capture | Medium - browser-control covers |
| `calendar` | Calendar management | High - google-workspace expansion |
| `git` | Git operations | Medium - development workflow |
| `docker` | Container management | Low - not core use case |

---

## Release Monitoring

**Clawdbot Release Pattern:**
- Weekly releases (v2026.1.x)
- CHANGELOG.md updates
- GitHub releases page

**Check Points:**
1. New skills added
2. Hook system changes
3. Memory system updates
4. Breaking changes
5. Performance improvements

---

## URLs to Monitor

- **Repository:** https://github.com/clawdbot/clawdbot
- **Releases:** https://github.com/clawdbot/clawdbot/releases
- **Skills Index:** https://github.com/clawdbot/clawdbot/tree/main/skills
- **Docs:** https://clawdbot.dev (if exists)
