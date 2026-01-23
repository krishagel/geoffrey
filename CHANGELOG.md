# Changelog

All notable changes to Geoffrey will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-01-23

### Added
- **Eleven Labs TTS skill** - Generate high-quality audio from text using the Eleven Labs API
  - `generate_audio.py` - Main TTS generation with auto-chunking for long text and MP3 concatenation
  - `list_voices.py` - Fetch and display available voices from API
  - 6 curated voices (Rachel, Bella, Elli, Josh, Adam, Antoni) for variety
  - Support for multiple models (Multilingual v2, Flash v2.5, Turbo v2.5, Eleven v3)
  - JSON output with metadata (file path, voice, model, character count, chunks)
  - Ideal for podcast-style daily summaries and narration

## [0.4.1] - 2026-01-16

### Fixed
- **Brand validator false positives** - Validator no longer blocks "design decisions", "Peninsula School District", or other legitimate terms
  - Patterns now only match explicit logo/emblem generation requests (e.g., "create a PSD logo")
  - District name and design terminology are fully allowed in prompts

### Added
- **--logo flag for generate.py** - Automatically composite brand logo onto generated images
  - Usage: `uv run generate.py "prompt" out.png --brand psd --logo bottom-right`
  - Positions: bottom-right, bottom-left, top-right, top-left
  - Logo scaled to 12% of image width with 3% margin
- **New tests** for allowed prompts (district name, design decisions)

### Changed
- Validation error messages now suggest using `--logo` flag instead of manual logo file handling

## [0.4.0] - 2026-01-14

### Added
- **Brand system infrastructure** for PSD brand guidelines
  - `brand-config.json` - Machine-readable brand data (colors, fonts, logos, forbidden patterns)
  - `brand.py` - Python utilities for logo selection (`get_logo_path`), color access (`get_colors`), and prompt validation (`validate_prompt`)
  - `test_brand.py` - 25 unit tests for brand utilities
- **Image generation brand validation** - `generate.py` now accepts `--brand psd` parameter
  - Validates prompts against brand rules before generation
  - Blocks attempts to generate logos/emblems with helpful error messages pointing to actual logo files
- **Branded image workflow** - `image-gen/workflows/branded.md` documenting brand-aware image generation
- **PPTX adapter brand integration** - `pptx-adapter.js` now imports colors from `brand-config.json`
  - Added `getLogoPath()` and `addLogoElement()` functions for programmatic logo insertion
  - Added `--add-logo` CLI flag
- **DOCX brand integration** - Added "Brand Integration (PSD)" section to `docx-js.md`
  - Examples for loading brand config, adding logos to headers, applying brand styles

### Changed
- **CLAUDE.md** - Made runtime rules (uv/bun) more prominent with dedicated section at top of file
- **psd-brand-guidelines/SKILL.md** - Added enforcement rules section
  - Explicit "NEVER Generate" rules for logos/emblems
  - Programmatic API documentation
  - Version bumped to 0.2.0

### Fixed
- **Hardcoded brand colors** in `pptx-adapter.js` now loaded from `brand-config.json`
- **Logo files were orphaned** - 19 PNG logo files now accessible via `get_logo_path()` function

## [0.3.1] - 2026-01-09

### Fixed
- **hooks.json invalid event names** - Removed placeholder hooks using invalid kebab-case event names (`post-conversation`, `pre-command`, `session-start`) that caused plugin load errors. Claude Code expects PascalCase event names like `SessionStart`, `PostToolUse`, etc.

## [0.3.0] - 2026-01-04

### Fixed
- **MS Office skills (xlsx, docx, pptx, pdf) now work on fresh machines** without pre-installed Python packages
  - All Python scripts use `uv run` with inline PEP 723 dependencies for automatic dependency management
  - Scripts auto-install required packages (openpyxl, pandas, python-pptx, Pillow, pypdf, defusedxml, lxml, etc.) on first run
  - Added LibreOffice installation check in xlsx recalc.py with helpful error message
  - Zero-friction setup: skills "just work" without manual pip installs

### Changed
- **All Python scripts in MS Office skills** now use `#!/usr/bin/env -S uv run` shebang
- **SKILL.md examples updated** to invoke scripts directly instead of via `python3`
  - Old: `python recalc.py output.xlsx`
  - New: `skills/xlsx/recalc.py output.xlsx`
- **Python Runtime section added to CLAUDE.md** documenting the inline dependency pattern
- **All Python scripts made executable** (`chmod +x`) for direct invocation

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
