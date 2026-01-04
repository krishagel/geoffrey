# Installation Guide

Complete setup instructions for Geoffrey, your personal AI infrastructure.

## Prerequisites

### Required Software

1. **Claude Code CLI** - [Install from claude.com/code](https://claude.com/code)
   ```bash
   # Verify installation
   claude --version
   ```

2. **Bun** - Fast JavaScript runtime ([bun.sh](https://bun.sh))
   ```bash
   # Install Bun
   curl -fsSL https://bun.sh/install | bash

   # Verify installation
   bun --version
   ```

3. **Python 3.11+** with `uv` - Fast Python package manager
   ```bash
   # Install uv
   curl -LsSf https://astral.sh/uv/install.sh | sh

   # Verify installation
   uv --version
   ```

### Optional Software (Skill-Specific)

- **OmniFocus** (macOS) - For omnifocus-manager and strategic-planning-manager skills
- **Obsidian** - For obsidian-manager skill and knowledge storage
- **Drafts** (macOS/iOS) - For drafts-manager skill

## Installation

### 1. Install Geoffrey Plugin

**Option A: From GitHub (Recommended)**

```bash
# Add Geoffrey's marketplace
claude plugin marketplace add krishagel/geoffrey

# Install Geoffrey
claude plugin install geoffrey@geoffrey

# Verify installation
claude plugin list
```

**Option B: Local Development**

```bash
# Clone the repository
git clone https://github.com/krishagel/geoffrey.git
cd geoffrey

# Create a symlink in Claude Code plugins directory
mkdir -p ~/.claude/plugins
ln -s $(pwd) ~/.claude/plugins/geoffrey

# Install skill dependencies
cd skills/browser-control && bun install && cd ../..
cd skills/google-workspace && bun install && cd ../..
cd skills/pptx && bun install && cd ../..
cd skills/presentation-master && bun install && cd ../..
```

### 2. Set Up iCloud Storage

Geoffrey uses iCloud for cross-device knowledge sync. Create the required folder structure:

```bash
# Navigate to iCloud Drive
cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/

# Create Geoffrey directory structure
mkdir -p Geoffrey/knowledge
mkdir -p Geoffrey/secrets
mkdir -p Geoffrey/images
```

### 3. Configure API Keys

Geoffrey integrates with multiple AI providers and services. Set up the ones you'll use:

#### Create Secrets File

```bash
# Create .env file in iCloud (gitignored, syncs across your devices)
touch ~/Library/Mobile\ Documents/com~apple~CloudDocs/Geoffrey/secrets/.env
```

#### Add Your API Keys

Edit `~/Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/secrets/.env`:

```bash
# Required for multi-model research skill
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AI...
PERPLEXITY_API_KEY=pplx-...
XAI_API_KEY=xai-...

# Required for image-gen skill
GEMINI_API_KEY=AI...

# Required for freshservice-manager skill
FRESHSERVICE_API_KEY=...
FRESHSERVICE_DOMAIN=yourcompany.freshservice.com
FRESHSERVICE_WORKSPACE_IDS=1,2,3

# Required for google-workspace skill
# (OAuth credentials, see Google Workspace setup below)
```

**Where to get API keys:**
- OpenAI: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Anthropic: [console.anthropic.com](https://console.anthropic.com)
- Google AI: [ai.google.dev](https://ai.google.dev)
- Perplexity: [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)
- xAI (Grok): [x.ai/api](https://x.ai/api)
- Freshservice: Your company's Freshservice admin

### 4. Set Up Obsidian (Optional)

If using obsidian-manager skill:

1. **Install Obsidian** from [obsidian.md](https://obsidian.md)

2. **Create Personal_Notes vault:**
   ```bash
   # Obsidian will create this in iCloud when you set it up
   # Use this path: ~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Personal_Notes
   ```

3. **Enable Obsidian Local REST API plugin** (for mcp__obsidian-vault__* tools)
   - Install "Local REST API" community plugin in Obsidian
   - Enable in Settings → Community Plugins
   - Configure API key in plugin settings

4. **Create folder structure:**
   ```
   Personal_Notes/
   ├── Geoffrey/
   │   ├── Identity/
   │   ├── Research/
   │   └── Inbox/
   ├── Reviews/
   │   ├── Annual/
   │   └── Quarterly/
   └── Work/
   ```

### 5. Initialize Knowledge Base

Create your identity core file (used by strategic-planning-manager):

```bash
# Create identity-core.json
cat > ~/Library/Mobile\ Documents/com~apple~CloudDocs/Geoffrey/knowledge/identity-core.json << 'EOF'
{
  "telos": {
    "summary": "Your core mission and purpose (customize this)",
    "technology": "Your technology goals",
    "communications": "Your communication goals",
    "safety": "Your safety/security goals"
  },
  "constitution": {
    "values": ["equity", "excellence", "empathy", "learning", "innovation", "integrity"],
    "principles": "Your guiding principles"
  },
  "strengths": {
    "top5": ["Input", "Significance", "Analytical", "Achiever", "Learner"]
  },
  "personality": {
    "enneagram": "Type 3w4",
    "spiral_dynamics": "Green-Orange",
    "description": "Analytical Action-Taker"
  }
}
EOF
```

**Customize this file** with your actual values, strengths, and personality type for personalized assistance.

### 6. Verify Installation

Test that Geoffrey is working:

```bash
# Start Claude Code
claude

# Inside Claude Code REPL:
# Type: /preferences
# Should show your learned preferences (empty at first)

# Test a skill:
# Type: "What's my Strengths Finder profile?"
# Geoffrey should read from your identity-core.json
```

## Skill-Specific Setup

### Google Workspace Skill

Requires OAuth credentials:

1. Create a Google Cloud project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable Gmail API, Calendar API, Drive API
3. Create OAuth 2.0 credentials (Desktop app)
4. Download credentials as `credentials.json`
5. Save to: `~/Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/secrets/google-credentials.json`
6. First run will open browser for OAuth consent

### Browser Control Skill

Requires Chrome browser with automation enabled:

```bash
# The skill will automatically download Chromium on first use
# Or install Chrome manually from google.com/chrome
```

### OmniFocus Manager Skill

Requires OmniFocus for macOS:

1. Install OmniFocus from [omnigroup.com/omnifocus](https://www.omnigroup.com/omnifocus)
2. Grant automation permissions:
   - System Settings → Privacy & Security → Automation
   - Allow Claude Code to control OmniFocus
3. Scripts use AppleScript/JXA - no additional setup needed

### Freshservice Manager Skill

Configure workspace access:

1. Get API key from your Freshservice admin
2. Find workspace IDs:
   ```bash
   bun skills/freshservice-manager/scripts/get_workspaces.js
   ```
3. Add to `.env` file (see step 3 above)

## Updating Geoffrey

### Check for Updates

```bash
# Check current version
claude plugin list

# Update to latest version
claude plugin update geoffrey@geoffrey
```

### Update Process

Geoffrey does not auto-update. When a new version is released:

1. Run `/plugin update geoffrey@geoffrey`
2. Review the [CHANGELOG.md](CHANGELOG.md) for breaking changes
3. Update any skill-specific configurations if needed

## Troubleshooting

### "Command not found: claude"

Claude Code CLI not installed or not in PATH.
- Install from [claude.com/code](https://claude.com/code)
- Add to PATH: `export PATH="$HOME/.claude/bin:$PATH"`

### "Permission denied" errors with OmniFocus scripts

Grant automation permissions:
- System Settings → Privacy & Security → Automation
- Enable Claude Code → OmniFocus

### Skills not loading

Check plugin installation:
```bash
# List installed plugins
claude plugin list

# Reinstall if needed
claude plugin uninstall geoffrey@geoffrey
claude plugin install geoffrey@geoffrey
```

### API errors (401, 403)

Check API keys in `.env` file:
```bash
# Verify file exists
ls -la ~/Library/Mobile\ Documents/com~apple~CloudDocs/Geoffrey/secrets/.env

# Check environment variables are loading
source ~/Library/Mobile\ Documents/com~apple~CloudDocs/Geoffrey/secrets/.env
echo $OPENAI_API_KEY
```

### iCloud sync not working

Ensure iCloud Drive is enabled:
- System Settings → Apple ID → iCloud → iCloud Drive → ON
- Wait for initial sync (can take several minutes)

## Next Steps

Once installed:

1. **Read the [README.md](README.md)** for an overview of Geoffrey's capabilities
2. **Explore skills** in the `skills/` directory - each has its own SKILL.md documentation
3. **Try the `/preferences` command** to see Geoffrey learn your preferences
4. **Run an annual review** using the strategic-planning-manager skill
5. **Set up OmniFocus integration** for task management workflows

## Getting Help

- **Documentation**: Check `docs/` folder for detailed guides
- **Issues**: Report bugs at [github.com/krishagel/geoffrey/issues](https://github.com/krishagel/geoffrey/issues)
- **Discussions**: Ask questions in GitHub Discussions

## Privacy & Security

- **Your data stays local**: Knowledge stored in iCloud, not sent to third parties
- **API keys in iCloud**: Secrets sync across your devices via iCloud, never in git
- **Open source**: Audit the code at [github.com/krishagel/geoffrey](https://github.com/krishagel/geoffrey)
- **MIT licensed**: Free to use, modify, and distribute

---

**Welcome to Geoffrey!** Your personal AI infrastructure is ready.
