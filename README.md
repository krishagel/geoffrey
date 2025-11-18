# Geoffrey - Personal AI Infrastructure

Your intelligent assistant, built as a Claude Code plugin. Geoffrey learns your preferences and patterns over time, providing personalized assistance across work, travel, and personal tasks.

Named after Geoffrey Hinton (godfather of AI) and Geoffrey from Fresh Prince of Bel-Air.

## Current Status: Phase 1 (Foundation)

**Version:** 0.1.0
**Status:** In Development

### What Works Now
- ✅ Plugin structure
- ✅ Knowledge management skill
- ✅ /preferences command
- ✅ iCloud knowledge storage
- ⏳ Local installation and testing

### Coming Soon
- 🔜 Travel planning skill (Phase 2)
- 🔜 Team management skill (Phase 3)
- 🔜 Automatic learning from conversations (Phase 4)

## Philosophy

- **Learning-enabled**: Remembers your preferences with confidence scoring
- **Skills-based**: Capabilities activate automatically based on context
- **Privacy-first**: Your data in iCloud, code in GitHub
- **Multi-machine**: Same Geoffrey, same preferences, different devices
- **Open source**: MIT licensed, community contributions welcome

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

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for details (coming soon).

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

*Current status: Phase 1 implementation*
*Last updated: November 17, 2025*
