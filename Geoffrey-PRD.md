# Geoffrey - Personal AI Infrastructure
## Product Requirements Document v2.0

**Project Name:** Geoffrey
**Tagline:** Your intelligent assistant, built as a Claude Code plugin
**Repository:** geoffrey-ai (open source, MIT License)
**Author:** Kris Hagel
**Date:** November 17, 2025 (Updated)
**Inspiration:** [Personal AI Infrastructure by Daniel Miessler](https://github.com/danielmiessler/Personal_AI_Infrastructure)

---

## Executive Summary

Geoffrey is a Claude Code plugin that provides intelligent, learning-enabled assistance across work, travel, and personal domains. Named after Geoffrey Hinton (godfather of AI) and Geoffrey from Fresh Prince of Bel-Air, it learns your preferences and patterns over time.

**Core Philosophy:**
- Single plugin, globally available (works from any directory)
- Skills-based architecture (auto-activate based on intent)
- Learning-enabled: Remembers preferences and patterns
- Open source: Structure public, knowledge private
- Multi-machine: Code in GitHub, knowledge syncs via iCloud/Obsidian

**Key Innovation:**
Geoffrey learns from conversations and automatically builds structured knowledge about your preferences (Marriott loyalty, Alaska Airlines, communication style) while integrating with your existing tools (OmniFocus, Gmail, Freshservice, Obsidian) through MCP servers.

---

## Architecture Overview

### High-Level Structure

```
Geoffrey Plugin
├── Skills (auto-activate based on context)
│   ├── travel-planning (trips, hotels, flights)
│   ├── team-management (Freshservice, employee support)
│   ├── knowledge-manager (preference learning)
│   └── learning-engine (pattern detection)
├── Commands (explicit user actions)
│   ├── /preferences - view/edit stored knowledge
│   ├── /learn - teach Geoffrey something
│   └── /forget - remove learned data
├── Agents (specialized workers)
│   ├── travel-planner
│   └── team-manager
└── Hooks (automation triggers)
    └── post-conversation (extract learnings)

External Integrations (via MCP)
├── omnifocus (task management)
├── obsidian (notes)
├── gmail (email)
└── freshservice (IT tickets)
```

### Storage Architecture

```
GITHUB (Public - Code/Structure)
└── geoffrey-ai/
    └── plugins/geoffrey/
        ├── .claude-plugin/
        │   ├── plugin.json
        │   └── marketplace.json
        ├── skills/
        │   ├── travel-planning/
        │   ├── team-management/
        │   ├── knowledge-manager/
        │   └── learning-engine/
        ├── commands/
        │   ├── preferences.md
        │   ├── learn.md
        │   └── forget.md
        ├── agents/
        │   ├── travel-planner/
        │   └── team-manager/
        ├── hooks/
        │   └── hooks.json
        ├── .gitignore
        └── README.md

LOCAL (Installation)
└── ~/.claude/plugins/marketplaces/geoffrey/
    (Installed via /plugin marketplace add)

iCLOUD (Knowledge - Private, Synced)
└── ~/Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/
    └── knowledge/
        ├── preferences.json      # User preferences
        ├── memory.jsonl         # Conversation history
        └── patterns.json        # Detected patterns
```

### How It Works

**No Manual Context Switching:**
Geoffrey's skills automatically activate based on natural language intent:

```
User: "Plan my trip to Seattle for the conference"
→ travel-planning skill activates
→ Queries preferences.json for hotel/airline preferences
→ Checks calendar via MCP
→ Suggests options based on learned preferences

User: "How is my team doing?"
→ team-management skill activates
→ Queries Freshservice via MCP
→ Analyzes ticket patterns
→ Suggests follow-ups
```

**Learning System:**
After each conversation, hooks extract learnings and update knowledge files:

```
Conversation → Extract Patterns → Update Preferences → Increase Confidence
```

**Multi-Machine Sync:**
- Code: Pull from GitHub on each machine
- Knowledge: Syncs via iCloud automatically
- Same Geoffrey, same preferences, different locations

---

## Phase 1: Foundation (Weeks 1-2)

### Goals
1. Create working Geoffrey plugin
2. Basic knowledge storage in iCloud
3. First skill: knowledge-manager
4. Install and test locally

### Phase 1 Tasks

#### 1.1: Repository Setup

**Create structure:**
```bash
cd /Users/hagelk/non-ic-code/geoffrey
mkdir -p .claude-plugin
mkdir -p skills/knowledge-manager
mkdir -p commands
mkdir -p agents
mkdir -p hooks
touch .gitignore README.md
```

**Files to create:**
- `.claude-plugin/plugin.json` - Plugin manifest
- `.claude-plugin/marketplace.json` - Marketplace config
- `skills/knowledge-manager/SKILL.md` - First skill
- `commands/preferences.md` - First command
- `hooks/hooks.json` - Hook definitions
- `.gitignore` - Ignore secrets and local files
- `README.md` - Documentation

#### 1.2: Plugin Manifest

**`.claude-plugin/plugin.json`:**
```json
{
  "name": "geoffrey",
  "version": "0.1.0",
  "description": "Personal AI infrastructure with learning-enabled assistance for work, travel, and personal tasks",
  "author": {
    "name": "Kris Hagel",
    "email": "hagelk@psd401.net"
  },
  "repository": "https://github.com/yourusername/geoffrey-ai",
  "keywords": ["personal-ai", "learning", "preferences", "assistant"],
  "license": "MIT"
}
```

#### 1.3: Knowledge Manager Skill

**`skills/knowledge-manager/SKILL.md`:**
- Purpose: Manage user preferences and learned knowledge
- Auto-activates when: User asks about preferences, teaches Geoffrey something
- Capabilities:
  - Read/write preferences.json
  - Extract learnings from conversations
  - Update confidence scores
  - Validate data before storage

#### 1.4: Preferences Command

**`commands/preferences.md`:**
- Command: `/preferences`
- Shows current learned preferences
- Allows editing/updating
- Displays confidence scores

#### 1.5: iCloud Knowledge Directory

**Setup:**
```bash
mkdir -p ~/Library/Mobile\ Documents/com~apple~CloudDocs/Geoffrey/knowledge
```

**Initial `preferences.json`:**
```json
{
  "version": "1.0",
  "last_updated": "2025-11-17T00:00:00Z",
  "preferences": {}
}
```

#### 1.6: Installation & Testing

**Install locally:**
```bash
cd ~/.claude
/plugin marketplace add ~/non-ic-code/geoffrey
/plugin install geoffrey@geoffrey
```

**Test:**
- Verify plugin loads
- Test /preferences command
- Test knowledge-manager skill activation
- Verify iCloud file access

---

## Phase 2: Travel Assistant (Weeks 3-4)

### Goals
1. Build travel-planning skill
2. Integrate with OmniFocus MCP
3. Test preference learning
4. Create travel-planner agent

### Components

**`skills/travel-planning/SKILL.md`:**
- Plan trips based on learned preferences
- Search for hotels (prioritize Marriott)
- Search for flights (prioritize Alaska)
- Calculate points optimization
- Create OmniFocus tasks

**Preference Categories:**
```json
{
  "travel": {
    "hotels": {
      "primary_chain": "Marriott",
      "tier": "Platinum Elite",
      "room_preferences": ["high floor", "away from elevator"],
      "confidence": 1.0
    },
    "airlines": {
      "primary": "Alaska Airlines",
      "tier": "MVP Gold",
      "seat_preference": "aisle",
      "confidence": 1.0
    }
  }
}
```

---

## Phase 3: Team Management (Weeks 5-6)

### Goals
1. Build team-management skill
2. Integrate Freshservice MCP
3. Create employee assistance workflows
4. Test work-related learning

### Components

**`skills/team-management/SKILL.md`:**
- Check employee ticket status
- Identify overdue items
- Suggest follow-up actions
- Create OmniFocus tasks for management

---

## Phase 4: Learning & Self-Improvement (Weeks 7-8)

### Goals
1. Implement post-conversation hook
2. Build pattern detection
3. Create confidence scoring system
4. Enable self-improvement suggestions

### Learning Pipeline

```
Conversation → Hook Triggers → Extract Preferences → Confidence Check → Update Storage
```

**Confidence Scoring:**
- 1.0 = Explicitly stated by user
- 0.8-0.9 = Strong pattern (5+ observations)
- 0.6-0.7 = Moderate pattern (3-4 observations)
- 0.4-0.5 = Weak pattern (1-2 observations)
- <0.4 = Insufficient data

---

## Technical Specifications

### Context Management Architecture

**CRITICAL:** Keep context lean using three-tier progressive disclosure.

| Tier | What | When Loaded | Size Guideline |
|------|------|-------------|----------------|
| **Tier 1** | preferences.json | Always active | 50-100 lines max |
| **Tier 2** | SKILL.md | Skill activates | Comprehensive |
| **Tier 3** | Scripts/data | Just-in-time | Fetch on-demand |

**Why this matters:** As Geoffrey learns more, preferences could bloat and fill context windows. By keeping preferences lean (behavioral rules only) and fetching data on-demand via scripts, we maintain performance regardless of how much Geoffrey knows.

**Preferences = Behavioral rules only:**
```json
{
  "omnifocus_philosophy": {
    "task_creation": "Always assign to project + due date"
  }
}
```

**NOT data dumps:**
```json
// WRONG - don't do this
{
  "all_129_tags": [...huge array...]
}
```

**Code over prompts:** Build deterministic scripts, wrap with AI orchestration. Code is cheaper, faster, and more reliable than prompts.

### Plugin Format (Claude Code Standard)

Geoffrey uses Claude Code's standard plugin format:

```
geoffrey/
├── .claude-plugin/
│   ├── plugin.json          # Required: metadata
│   └── marketplace.json     # Required: distribution
├── skills/                  # Auto-activated capabilities
├── commands/                # Explicit user commands
├── agents/                  # Specialized workers
└── hooks/                   # Event triggers
```

### Skills vs Commands

**Skills** (auto-activate):
- Claude decides when to use based on context
- User doesn't explicitly invoke
- Example: travel-planning activates when user mentions trips

**Commands** (user-invoked):
- User explicitly calls via `/command`
- Example: `/preferences` to view settings

### Knowledge Storage

**Format:** JSON files in iCloud
**Location:** `~/Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/knowledge/`
**Sync:** Automatic via iCloud
**Encryption:** Consider for sensitive data (loyalty numbers, etc.)

**preferences.json structure:**
```json
{
  "version": "1.0",
  "last_updated": "ISO-8601 timestamp",
  "preferences": {
    "category": {
      "key": "value",
      "confidence": 0.0-1.0,
      "learned_from": ["source1", "source2"]
    }
  }
}
```

**memory.jsonl structure:**
```jsonl
{"timestamp":"ISO-8601","query":"...","learned":["preference1"],"confidence_updates":{}}
```

### External Integrations

Geoffrey uses a hybrid approach for integrations:

**Custom Scripts (preferred for control):**
- OmniFocus - JXA scripts in skills for full tag hierarchy access
- Rationale: Existing MCP servers truncate data, can't get tag groupings

**MCP Servers (where they work well):**
- Obsidian MCP
- Gmail MCP
- Freshservice MCP (may need to build)

**Design principle:** If MCP server gives what we need, use it. If not, write our own scripts inside skills for full control.

---

## Installation & Setup

### Prerequisites
- macOS (for iCloud sync)
- Claude Code 2.0+
- iCloud Drive enabled
- Git

### Installation

```bash
# 1. Clone Geoffrey
git clone https://github.com/yourusername/geoffrey-ai.git
cd geoffrey-ai

# 2. Set up iCloud directory
mkdir -p ~/Library/Mobile\ Documents/com~apple~CloudDocs/Geoffrey/knowledge

# 3. Add as local marketplace (development)
/plugin marketplace add ~/path/to/geoffrey-ai

# 4. Install plugin
/plugin install geoffrey@geoffrey-ai

# 5. Initialize preferences
/preferences init
```

### Initial Configuration

**Tell Geoffrey about yourself:**
```
> "I'm Marriott Platinum Elite #12345678. Always prefer Marriott properties
   when available. I'm also Alaska Airlines MVP Gold #87654321. I prefer aisle
   seats and morning flights. My strategy is to maximize elite nights first,
   then points."
```

Geoffrey will:
1. Extract preferences
2. Store in preferences.json
3. Set confidence to 1.0 (explicitly stated)
4. Use for all future suggestions

---

## Development Workflow

### Local Development

```bash
# Edit Geoffrey files
cd ~/non-ic-code/geoffrey
# Make changes to skills, commands, etc.

# Reload plugin
/plugin reload geoffrey

# Test changes
> "Test the new feature"
```

### Using Geoffrey to Build Geoffrey

Geoffrey can help build itself:
- Track Geoffrey issues in OmniFocus
- Learn your development preferences
- Suggest improvements via meta-learning
- Document changes in Obsidian

---

## Success Metrics

### Phase 1 Success
- ✅ Plugin installs successfully
- ✅ /preferences command works
- ✅ knowledge-manager skill activates
- ✅ iCloud files read/write correctly
- ✅ Can teach Geoffrey a preference

### Phase 2 Success
- ✅ Travel planning works end-to-end
- ✅ Preferences auto-apply to suggestions
- ✅ OmniFocus tasks created correctly
- ✅ Points optimization suggestions accurate

### Phase 3 Success
- ✅ Team management queries work
- ✅ Freshservice integration functional
- ✅ Follow-up suggestions helpful
- ✅ Work patterns learned

### Phase 4 Success
- ✅ Learning system extracts preferences automatically
- ✅ Confidence scores update correctly
- ✅ 10+ learned preferences with >0.8 confidence
- ✅ Self-improvement suggestions actionable

---

## Example Workflows

### Workflow 1: Teaching Geoffrey

```
User: "I always prefer Marriott properties when traveling. I'm Platinum Elite."

Geoffrey (knowledge-manager skill activates):
"I've learned your hotel preferences:
- Primary chain: Marriott
- Loyalty tier: Platinum Elite
- Confidence: 1.0 (explicitly stated)

Stored in preferences. I'll use this for all future travel planning."
```

### Workflow 2: Trip Planning

```
User: "I'm speaking at a conference in Seattle, December 5-7"

Geoffrey (travel-planning skill activates):
"Planning your Seattle trip (Dec 5-7):

🏨 Hotels (prioritizing Marriott):
- Marriott Downtown: $189/night or 40k points
  Your Platinum benefits: Breakfast, lounge, upgrade
  Recommendation: Use 120k points (saves $567)

✈️ Flights (prioritizing Alaska):
- AS 342: SEA 6:30am (morning - your preference)
  Cost: $185 or 12,500 miles

Created OmniFocus project with:
- Book flight
- Book hotel
- Prepare presentation
- Pack

Should I proceed with bookings? (requires approval)"
```

### Workflow 3: Team Check

```
User: "How's my team doing?"

Geoffrey (team-management skill activates):
"Team Status (Freshservice):

⚠️ Sarah Johnson:
- 3 open tickets (1 overdue)
- TICKET-1234: VPN access (overdue 2 days)
- Suggested action: Check blocker with Sarah

✅ Mike Chen:
- 5 open tickets (all on track)

Created OmniFocus task: 'Follow up on Sarah's VPN ticket'"
```

---

## Future Phases

### Phase 5: Advanced Learning
- Pattern detection across domains
- Predictive suggestions
- Proactive task creation

### Phase 6: Mobile Access
- iOS shortcut integration
- Voice interface
- Push notifications

### Phase 7: Multi-User
- Family/team shared preferences
- Privacy controls
- Delegation workflows

---

## Summary

Geoffrey is a learning-enabled Claude Code plugin that:
- **Adapts** to your preferences over time
- **Learns** from conversations automatically
- **Integrates** with existing tools via MCP
- **Improves** through self-analysis
- **Syncs** across machines seamlessly

Built on Claude Code's solid plugin foundation and inspired by Personal AI Infrastructure, Geoffrey makes AI assistance truly personal and continuously improving.

**Start small, iterate fast, learn constantly.**

---

**Ready to build Geoffrey?** Start with Phase 1 - create the plugin structure and get basic knowledge management working.

Questions? Open an issue on GitHub.

**Let's build! 🚀**
