# Geoffrey - Personal AI Infrastructure

[![Version](https://img.shields.io/badge/version-0.10.0-blue.svg)](https://github.com/krishagel/geoffrey/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude_Code-plugin-purple.svg)](https://claude.com/code)

Your intelligent assistant, built as a Claude Code plugin. Geoffrey learns your preferences and patterns over time, providing personalized assistance across work, travel, and personal tasks.

Named after Geoffrey Hinton (godfather of AI) and Geoffrey from Fresh Prince of Bel-Air.

## 🚀 Quick Start

```bash
# Install via Claude Code
claude plugin marketplace add krishagel/geoffrey
claude plugin install geoffrey@geoffrey

# For detailed setup, see INSTALL.md
```

## Current Status: Phase 2 (Core Skills)

**Version:** 0.10.0
**Status:** In Active Development

### What Works Now
- ✅ Plugin structure with GitHub distribution
- ✅ Knowledge management skill
- ✅ OmniFocus manager skill with AppleScript/JXA integration
- ✅ Strategic planning manager skill (annual reviews + quarterly check-ins)
- ✅ Freshservice manager skill
- ✅ Google Workspace integration
- ✅ Browser control skill
- ✅ Multi-model research skill
- ✅ Image generation skill
- ✅ /preferences command
- ✅ iCloud knowledge storage
- ✅ Versioning and CHANGELOG tracking

### Coming Soon
- 🔜 Travel planning skill (Phase 2 expansion)
- 🔜 Team management skill (Phase 3)
- 🔜 Automatic learning from conversations (Phase 4)

## Philosophy

- **Learning-enabled**: Remembers your preferences with confidence scoring
- **Skills-based**: Capabilities activate automatically based on context
- **Privacy-first**: Your data in iCloud, code in GitHub
- **Multi-machine**: Same Geoffrey, same preferences, different devices
- **Open source**: MIT licensed, community contributions welcome

## Founding Principles

Geoffrey's architecture follows principles inspired by [Personal AI Infrastructure v2.0](https://github.com/danielmiessler/Personal_AI_Infrastructure). These guide all development decisions.

### 1. Scaffolding Over Model
**Architecture matters more than AI capability.**

The structure around the AI—skills, hooks, knowledge storage—determines what's possible. A well-designed scaffold makes the AI more effective; a poor one limits even the best model.

*Example:* Three-tier progressive disclosure (Tier 1: always loaded, Tier 2: on activation, Tier 3: just-in-time) keeps context lean while enabling rich capabilities.

### 2. Code Before AI
**Build deterministic CLI tools, then wrap with AI orchestration.**

Code is cheaper, faster, and more reliable than prompts. Scripts handle data fetching and processing; AI handles orchestration and natural language.

*Example:* `omnifocus-manager/scripts/get_tags.js` fetches tags deterministically. Geoffrey orchestrates when and how to use that data.

### 3. Deterministic Systems
**Favor predictable, repeatable outcomes over probabilistic behavior.**

When possible, use deterministic code paths. Reserve AI judgment for tasks that require it. Runtime data fetching ensures always-current information without stale caches.

*Example:* Fetching OmniFocus tags at runtime instead of hardcoding 129 tags that could change.

### 4. Progressive Disclosure
**Load only what's needed, when it's needed.**

Context is precious. Tier 1 stays under 100 lines. Tier 2 loads when skills activate. Tier 3 fetches data just-in-time.

*Example:* OmniFocus skill loads SKILL.md on activation, fetches tags only when creating a task.

### 5. UNIX Philosophy
**Modular, composable, single responsibility.**

Each skill does one thing well. Skills compose to handle complex workflows. Clear boundaries between concerns.

*Example:* `knowledge-manager` learns preferences, `omnifocus-manager` manages tasks, `freshservice-manager` handles tickets—each focused and independent.

### 6. Self-Modifying Systems
**Infrastructure learns and improves from experience.**

Hooks extract patterns automatically. History enables preference detection. The system gets smarter over time without manual updates.

*Example:* SessionEnd hooks analyze conversations, update `learned-preferences.json`, and route summaries to Obsidian by content type.

### 7. Skill Management
**Dynamic routing with modular loading.**

SKILL.md frontmatter defines triggers. Skills activate automatically based on context. No manual switching required.

*Example:* "Add a task to OmniFocus" → `omnifocus-manager` activates. "What are my travel preferences?" → `knowledge-manager` activates.

### 8. CLI Interfaces
**Command-line tools over GUIs.**

All scripts are CLI-based for automation and composability. Use `bun` runtime for JavaScript. Standard input/output for integration.

*Example:* `bun scripts/add_task.js` creates tasks programmatically, avoiding GUI dependencies.

### 9. Identity-First Design
**Consistent personality and decision framework.**

Tier 1 identity always loaded: strengths, values, decision style. Enables personalized assistance aligned with user's cognitive patterns.

*Example:* Understanding "Green-Orange Analytical Action-Taker" profile shapes how Geoffrey presents options and makes recommendations.

### 10. Evidence-Driven Development
**Validate against code, never assume behavior.**

Always inspect before claiming. Use conservative language ("functionally validated" vs "production-ready"). Question all claims with "What evidence supports this?"

*Example:* Before saying tests pass, actually run them. Before claiming a feature works, verify in the codebase.

### Principles In Progress

- **Specification-First**: Test before implementation (improving)
- **History Systems**: Session capture and categorization (implemented in #4)
- **Science as Cognitive Loop**: Hypothesis → Experiment → Measure (future)

See [PAI v2.0's 14 Founding Principles](https://github.com/danielmiessler/Personal_AI_Infrastructure#founding-principles) for the full original framework.

## Installation

### Prerequisites
- macOS (for iCloud sync)
- Claude Code 2.0+
- iCloud Drive enabled
- Git

### Setup

```bash
# 1. Clone repository
git clone https://github.com/krishagel/geoffrey.git
cd geoffrey

# 2. Set up iCloud knowledge directory
mkdir -p ~/Library/Mobile\ Documents/com~apple~CloudDocs/Geoffrey/knowledge

# 3. Add as local marketplace (for development)
/plugin marketplace add ~/non-ic-code/geoffrey

# 4. Install plugin
/plugin install geoffrey@geoffrey

# 5. Verify installation
/preferences
```

## Usage

### Teaching Geoffrey

Just tell Geoffrey your preferences in natural language:

```
> "I always prefer Marriott hotels. I'm Platinum Elite."

Geoffrey: "I've learned your hotel preferences:
- Primary chain: Marriott
- Loyalty tier: Platinum Elite
- Confidence: 1.0 (explicitly stated)

Stored in knowledge base."
```

### Viewing Preferences

```
/preferences              # View all preferences
/preferences travel       # View travel preferences only
```

### Updating Preferences

```
> "Actually, I prefer aisle seats on flights"

Geoffrey: "Updated your airline preferences:
- Seat preference: Aisle (was: Window)
- Confidence: 1.0"
```

## Architecture

```
Geoffrey Plugin
├── Skills (auto-activate)
│   └── knowledge-manager    ← Phase 1
├── Commands (user-invoked)
│   └── /preferences         ← Phase 1
├── Agents (specialized workers)
│   └── (coming in Phase 2+)
└── Hooks (automation)
    └── (coming in Phase 4)

Knowledge Storage (iCloud)
└── ~/Library/.../Geoffrey/knowledge/
    ├── preferences.json     ← Phase 1
    ├── memory.jsonl        ← Phase 4
    └── patterns.json       ← Phase 4
```

## Development

### Local Development Workflow

```bash
# 1. Make changes to Geoffrey files
cd ~/non-ic-code/geoffrey
# Edit skills, commands, etc.

# 2. Reload plugin
/plugin reload geoffrey

# 3. Test changes
> "Test the feature"
```

### Directory Structure

```
geoffrey/
├── .claude-plugin/
│   ├── plugin.json           # Plugin metadata
│   └── marketplace.json      # Marketplace config
├── skills/
│   └── knowledge-manager/    # Knowledge management skill
│       └── SKILL.md
├── commands/
│   └── preferences.md        # /preferences command
├── agents/                   # (Future)
├── hooks/
│   └── hooks.json           # Hook definitions
├── .gitignore
└── README.md                # This file
```

### Knowledge File Format

**preferences.json:**
```json
{
  "version": "1.0",
  "last_updated": "2025-11-17T10:30:00Z",
  "preferences": {
    "travel": {
      "hotels": {
        "primary_chain": "Marriott",
        "loyalty_tier": "Platinum Elite",
        "confidence": 1.0,
        "learned_from": ["explicit:2025-11-17"],
        "last_updated": "2025-11-17T10:30:00Z"
      }
    }
  }
}
```

## Roadmap

### Phase 1: Foundation ✅ (Current)
- Basic plugin structure
- Knowledge management skill
- /preferences command
- iCloud storage

### Phase 2: Travel Assistant (Weeks 3-4)
- Travel planning skill
- Trip planning based on preferences
- OmniFocus integration
- Points optimization

### Phase 3: Team Management (Weeks 5-6)
- Team management skill
- Freshservice integration
- Employee support workflows

### Phase 4: Learning & Self-Improvement (Weeks 7-8)
- Post-conversation hooks
- Automatic preference extraction
- Pattern detection
- Confidence scoring refinement

## How It Works

### Skills Auto-Activate

Geoffrey's skills activate automatically based on what you say:

```
> "Plan my trip to Seattle"
→ travel-planning skill activates (Phase 2)

> "How is my team doing?"
→ team-management skill activates (Phase 3)

> "I prefer Marriott hotels"
→ knowledge-manager skill activates (Phase 1)
```

### Confidence Scoring

Geoffrey tracks how confident it is about each preference:

- **1.0** = You explicitly told Geoffrey
- **0.8-0.9** = Strong pattern (5+ observations)
- **0.6-0.7** = Moderate pattern (3-4 observations)
- **0.4-0.5** = Weak pattern (1-2 observations)
- **<0.4** = Insufficient data

Higher confidence preferences take priority in suggestions.

## Privacy & Security

- **Local storage**: All data in your iCloud Drive
- **No tracking**: Geoffrey doesn't send data anywhere
- **You own it**: Edit or delete knowledge files anytime
- **Open source**: Audit the code yourself
- **Encrypted**: Consider encrypting sensitive data (loyalty numbers)

## Installation

**Quick Install:**
```bash
claude plugin marketplace add krishagel/geoffrey
claude plugin install geoffrey@geoffrey
```

**Full Setup Guide:** See [INSTALL.md](INSTALL.md) for complete installation instructions including:
- Prerequisites (Bun, Python, uv)
- API key configuration
- iCloud setup
- Skill-specific setup (OmniFocus, Obsidian, etc.)

## Contributing

Contributions welcome! Geoffrey is open source and we'd love your help.

**How to contribute:**

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-skill`)
3. **Make** your changes following our coding standards
4. **Test** thoroughly (all skills must work)
5. **Commit** with clear messages (`v0.X.Y: Description`)
6. **Push** to your fork
7. **Open** a pull request

**Areas we need help:**
- New skills (travel planning, health tracking, etc.)
- Documentation improvements
- Bug fixes
- Performance optimizations
- Testing and QA

**Development setup:** See [INSTALL.md](INSTALL.md#option-b-local-development)

## Inspiration

Geoffrey is inspired by:
- [Personal AI Infrastructure by Daniel Miessler](https://github.com/danielmiessler/Personal_AI_Infrastructure)
- Claude Code's plugin system
- Personal assistant paradigm

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/krishagel/geoffrey/issues)
- **Discussions**: [GitHub Discussions](https://github.com/krishagel/geoffrey/discussions)
- **Email**: kris@krishagel.com

## Acknowledgments

- Anthropic for Claude Code
- Daniel Miessler for Personal AI Infrastructure inspiration
- The open source community

---

**Built with ❤️ using Claude Code**

*Version: 0.10.0 | Phase 2 (Core Skills)*
*Last updated: January 24, 2026*
