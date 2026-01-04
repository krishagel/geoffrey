# Changelog

All notable changes to Geoffrey will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2026-01-04

### Added
- **INSTALL.md** - Comprehensive installation guide with step-by-step instructions
- **LICENSE** - MIT License file for open source distribution
- **Quick Start** section in README with installation commands
- **Badges** to README (version, license, Claude Code plugin)

### Changed
- **README.md** enhanced for open source presentation
  - Added Quick Start section with one-command install
  - Expanded Contributing section with clear guidelines
  - Added "Areas we need help" to encourage contributions
  - Updated footer with current version and date
  - Added Installation section linking to INSTALL.md
- **Removed hardcoded username** (`/Users/hagelk/`) from all paths
  - skills/obsidian-manager/SKILL.md → `~/Library/...`
  - skills/presentation-master/README.md → `/path/to/geoffrey/...`
  - skills/drafts-manager/actions/geoffrey-process-draft.js → Removed unused vault path
  - skills/drafts-manager/actions/README.md → Clarified URL scheme usage
  - Geoffrey-PRD.md → Generic paths

### Fixed
- Path portability across different user accounts
- Documentation now works for any user, not just original developer

### Security
- Verified .gitignore properly excludes secrets (.env, *.key, credentials.json)
- No API keys in repository
- All sensitive data stays in iCloud

## [0.2.0] - 2026-01-04

### Added

**Strategic Planning Manager Skill:**
- Comprehensive annual strategic review system with 6-phase interview workflow
- Coverage of 5 life/work domains: CIO Role, Consulting/Speaking, Product Development, Real Estate, Financial Planning
- Progressive challenge mechanisms to push beyond vague goals to concrete outcomes
- Success indicators with baselines and targets for all priority goals
- Quarterly check-in workflow for progress tracking (Q1/Q2/Q3/Q4 milestones)
- Cross-domain integration with Personal Board of Directors framework
- Identity alignment checks using TELOS mission and Type 3w4 personality patterns
- User Guide review integration to keep preferences documentation current
- Templates for annual and quarterly reviews with Obsidian frontmatter linking
- Python scripts for generating structured markdown files in Obsidian vault
- JXA script to auto-create OmniFocus projects from strategic goals
- Framework integration: James Clear systems thinking, Life Map (Alex Lieberman), Ideal Lifestyle Costing (Tim Ferriss)

**OmniFocus Manager Enhancements:**
- Comprehensive JXA vs AppleScript usage guide with critical distinctions
- Common Pitfalls & Solutions table for folder/project creation
- Verification patterns: always verify structure modifications, never trust script return values
- Error Recovery Workflow: STOP → VERIFY → CLEAN UP → FIX → VERIFY AGAIN
- `create_projects_in_folder.applescript` for reliable folder-based project creation
- Documented WRONG PATTERNS to avoid (project.parentFolder, folder.projects.push(), etc.)
- Interface for Other Skills section showing cross-skill script integration
- Best Practices for Folder/Project Creation with complete working examples

**CLAUDE.md Documentation:**
- Critical Identity Documents section with paths to identity-core.json and Personal-Constitution.md
- "NEVER Make Up Facts" principle for organization-specific details
- Positioned identity documents for annual reviews, goal planning, major decisions

**Plugin Distribution:**
- Changed plugin source from local (`./`) to GitHub (`krishagel/geoffrey`)
- Added CHANGELOG.md for version tracking
- Updated keywords to include "strategic-planning" and "omnifocus"

### Changed
- Plugin version bumped from 0.1.0 to 0.2.0
- Marketplace version bumped from 0.1.0 to 0.2.0

## [0.1.0] - 2024-11-18

### Added
- Initial plugin structure with `.claude-plugin/` configuration
- Knowledge management skill with preference learning and confidence scoring
- OmniFocus manager skill for task creation and inbox triage
- Freshservice manager skill for ticket handling
- Google Workspace skill for email and calendar management
- Browser control skill for automated web interactions
- Image generation skill using Google's Gemini 3 Pro Image
- Multi-model research skill orchestrating Claude, GPT, Gemini, Perplexity, Grok
- Preferences command (`/preferences`) for viewing learned knowledge
- iCloud knowledge storage for cross-device sync
- Three-tier progressive disclosure architecture (Tier 1: always loaded, Tier 2: skill activation, Tier 3: just-in-time)
- Founding Principles documentation based on Personal AI Infrastructure
- MIT license

### Foundation
- Repository structure: `skills/`, `commands/`, `agents/`, `hooks/`, `docs/`
- GitHub repository at `krishagel/geoffrey`
- Local installation workflow established
- Development guidelines in CLAUDE.md

---

## Version Numbering

Geoffrey follows [Semantic Versioning](https://semver.org/):

**MAJOR.MINOR.PATCH**

- **MAJOR** (X.0.0): Breaking changes to skills, commands, or core architecture
- **MINOR** (0.X.0): New skills, features, or significant enhancements (backward-compatible)
- **PATCH** (0.0.X): Bug fixes, documentation updates, minor improvements

See CLAUDE.md for detailed versioning guidelines.
