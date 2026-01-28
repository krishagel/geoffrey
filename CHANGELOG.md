# Changelog

All notable changes to Geoffrey will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.18.6] - 2026-01-27

### Changed
- **Morning Briefing** - Email query now filters to inbox-only (`in:inbox`)
  - Excludes emails already labeled/processed
  - Still includes SaneCC and SaneLater emails (worth knowing about)

## [0.18.5] - 2026-01-27

### Added
- **Morning Briefing** - Pronunciation guide for TTS name corrections
  - `pronunciation_guide.json` maps names to phonetic spellings (e.g., "Jaden" → "Jayden")
  - `apply_pronunciations.js` script applies substitutions before TTS generation
  - Initial names: Jaden, Hans, Loesch, Bahr, Winget

## [0.18.4] - 2026-01-27

### Fixed
- **Morning Briefing** - Email now uses HTML formatting instead of plain markdown
  - Infographic displays INLINE at top of email (not just as attachment)
  - Professional styling that renders nicely in Gmail
  - HTML template at `skills/morning-briefing/templates/email.html`
- **Morning Briefing** - Infographic generation marked as MANDATORY (was being skipped)

### Added
- `--inline-image` option for `send_with_attachments.js` - Embeds images inline in HTML emails
  - Use `<img src="cid:briefing_image">` in HTML to reference the image
  - Image displays in email body AND is downloadable

## [0.18.3] - 2026-01-27

### Added
- **Morning Briefing** - Legislative activity section integrated into daily briefing
  - Phase 1.14: Gather legislative activity since last business day
  - Template section: Bills grouped by HIGH/MEDIUM/LOW priority
  - Podcast script section 9: ~150 word legislative update
  - Quick stats includes legislative bills with activity count
  - On Mondays, includes all weekend activity (Friday→Monday)
- `get_recent_bill_activity.js` - Returns bill IDs to check with date range and WebFetch instructions

## [0.18.2] - 2026-01-27

### Changed
- **Legislative Tracker** - Complete rewrite to use committee-based discovery via SOAP API
  - Queries education committees directly to get ALL bills (no keyword filtering that misses bills)
  - Tier 1: House Education + Senate Early Learning & K-12 Education → `confirmed_bills`
  - Tier 2: Appropriations, Ways & Means, etc. → `tier2_candidates` (Geoffrey WebFetches each to filter)
  - Tier 3: WebSearch fallback if SOAP fails
- SKILL.md updated with new 4-phase workflow documentation
- topics.yaml simplified - removed discovery keywords, kept analysis keywords

### Added
- `get_committees.js` - Fetch active committee names via SOAP API
- `get_committee_bills.js` - Fetch all bills in a specific committee via SOAP
- Committee configuration in topics.yaml with validated committee names
- XML escaping for committee names with ampersands (e.g., "Early Learning & K-12 Education")

### Fixed
- Previous keyword-based discovery missed bills with unexpected wording
- Bills now discovered by committee membership, not keyword matching
- Tier 2 now properly outputs candidates for WebFetch filtering (was incorrectly trying to filter without descriptions)

## [0.18.1] - 2026-01-27

### Fixed
- **Legislative Tracker** - Default year changed from 2025 to 2026
- **Legislative Tracker** - Simplified to use WebFetch as primary data source (SOAP API unreliable for current session)
- Scripts now output WebFetch instructions instead of failing when SOAP returns empty

### Changed
- Removed SOAP dependency for bill lookups - WebFetch is more reliable for 2025-26 session
- `get_bill_info.js` returns bill URL and prompt for WebFetch
- `get_bills.js` returns search queries for WebSearch discovery

## [0.18.0] - 2026-01-27

### Added
- **Legislative Tracker skill** - Track WA State K-12 education legislation from leg.wa.gov
  - Topic-based keyword filtering (Finance, Operations, Staffing, Technology, Governance, Special Programs)
  - Priority analysis framework (HIGH/MEDIUM/LOW with fiscal impact indicators)
  - District-specific config (Peninsula SD, 26th Legislative District legislators)
  - Two output formats: full Markdown report and briefing JSON
  - Morning briefing integration ready
  - Obsidian storage support (`Work/PSD/Legislative/[YYYY-MM-DD].md`)
  - Scripts: `get_bills.js`, `get_bill_info.js`
  - Config: `topics.yaml` with keyword categories and district settings

## [0.17.1] - 2026-01-27

### Fixed
- Stop hook path now uses `${CLAUDE_PLUGIN_ROOT}` for portability

## [0.17.0] - 2026-01-27

### Added
- **Red Rover Manager skill** - Staff absence management integration for PSD
  - `get_organization.js` - Validate credentials and get org info
  - `get_absences.js` - Raw absence/vacancy data for date ranges
  - `get_daily_summary.js` - Daily absence summary (all staff)
  - `get_certificated_summary.js` - Daily summary for certificated staff only (most common report)
  - `get_weekly_summary.js` - Weekly trends and patterns
  - Uses `/api/v1/{orgId}/Vacancy/details` endpoint for rich absence data
  - Includes fill rate, by-school, by-reason, unfilled positions breakdowns

### Changed
- Added Red Rover credentials to secrets.js vault map

## [0.16.0] - 2026-01-26

### Added
- **Strategic Planning Manager skill (K-12/Organizational)** - Comprehensive 7-phase strategic planning framework for school districts
  - Hybrid CoSN + research-backed methodology (ThoughtExchange, Education Elements, Hanover Research, AASA)
  - 4 skill modes: Full Process Guide, Phase-Specific Entry, Data Analysis Only, Plan Update
  - **4 Python scripts** for AI-assisted data analysis:
    - `analyze_surveys.py` - Survey data analysis with TextBlob sentiment/theme extraction
    - `process_transcripts.py` - Focus group transcript NLP processing
    - `generate_swot.py` - SWOT synthesis from discovery data
    - `synthesize_plan.py` - Complete plan document generation
  - **9 templates** matching CoSN output format:
    - Discovery report, SWOT, Practical Vision, Contradictions, Strategic Directions
    - Focused Implementation (3-column), First-Year Timeline, Full Plan, Executive Summary
  - **8 facilitator guides** for human sessions:
    - Phase 1-6 guides with timings, activities, prompts, materials
    - 2-day retreat agenda (comprehensive)
    - 1-day condensed retreat agenda
  - **3 config files** with K-12 domain knowledge:
    - `k12-themes.yaml` - Common themes with prevalence, aliases, goals, metrics
    - `facilitation-prompts.yaml` - AI-ready prompts for each phase
    - `metrics-library.yaml` - Success indicators with baselines/targets
  - Obsidian storage integration (Geoffrey/Strategic-Plans/{District-Name}/)

### Changed
- **Renamed personal planning skill** from `strategic-planning-manager` to `personal-strategic-planning`
  - Updated triggers to avoid conflict with new organizational skill
  - Added note pointing to organizational skill
  - Version bumped to 1.1.0

## [0.15.0] - 2026-01-26

### Added
- **PAI-inspired improvements** - Adopted 4 high-value patterns from Personal AI Infrastructure v2.4.0
  - **ISC (Ideal State Criteria)** - Binary success criteria for plans (added to global CLAUDE.md)
  - **Effort Classification** - Right-size responses to task complexity (TRIVIAL → DETERMINED scale)
  - **Permission to Fail** - Explicit uncertainty guidance (added to global CLAUDE.md)
  - **Stop Hook** - Automatic learning capture reminder on session end

### Changed
- **hooks/hooks.json** - Now registers Stop event hook for capture-learnings.sh
- **CLAUDE.md** - Added Effort Classification table after Extended Thinking section

### New Files
- `hooks/Stop/capture-learnings.sh` - Lightweight session end hook suggesting /compound for substantial sessions

## [0.14.0] - 2026-01-26

### Added
- **Clawdbot Monitor skill** - Monitor Clawdbot repo for updates and identify improvement opportunities
  - Compares Geoffrey against Clawdbot's patterns, skills, and features
  - 4-phase analysis workflow (fetch, analyze, gap analysis, report)
  - Focus areas: skills, hooks, extensions, memory
  - Generates actionable improvement recommendations
  - Includes reference documentation for key Clawdbot areas

## [0.13.0] - 2026-01-26

### Added
- **Local TTS skill** - Local text-to-speech using MLX and Kokoro-82M model
  - No API keys or recurring costs
  - Apple Silicon optimized (~3-4x realtime on M3 Pro)
  - Supports MP3, WAV, M4A, OGG output formats
  - 20+ voice presets (American and British English)
  - Auto-chunking for long text with seamless concatenation
  - Works on Mac Mini (M1/M2 8GB+)

### Changed
- **Morning Briefing** now uses local-tts instead of ElevenLabs API
  - Voice changed from "Rachel" to "af_heart" (warm, friendly)
  - Eliminates API costs for daily briefings

### Technical
- Uses `uv run --with mlx-audio --with pydub` pattern (not PEP 723 inline deps)
- Model: mlx-community/Kokoro-82M-bf16 (~200MB, cached)
- Documented exception in CLAUDE.md runtime rules

## [0.12.0] - 2026-01-26

### Added
- **Morning Briefing enhancements** - Comprehensive daily intelligence briefing

  **Team Activity (Detailed)**
  - Team EOD messages from Google Chat with FULL details extracted
  - Each team member's location, accomplishments, notable projects, issues
  - Last business day calculator with US federal holidays
  - Team completed tickets summary grouped by agent
  - Ticket trend analysis (volume, categories, patterns)

  **News with Synopses (3 sections)**
  - EdTech News: 3-5 articles with 2-3 sentence synopses
  - AI News: 3-5 articles on latest AI developments
  - K-12 Leadership News: 2-3 articles on policy and leadership

  **Extended Podcast Format**
  - Increased from 2-3 minutes to 10-15 minutes (~1500-2000 words)
  - Detailed team member highlights by name
  - Article synopses narrated
  - Structured sections with smooth transitions

  **Infographic & Email**
  - Visual dashboard infographic (Phase 3.5)
  - Multi-attachment email (infographic + podcast)
  - Body from file for long content
  - Software Development workspace tickets (workspace_id: 13)

  **New Scripts**
  - `chat/get_eod_messages.js` - Google Chat date filtering
  - `morning-briefing/scripts/get_last_business_day.js` - Holiday-aware calculation
  - `gmail/send_with_attachments.js` - Multiple email attachments
  - Fixed `image-gen/scripts/generate.py` - Import conflict with Python secrets module

## [0.11.0] - 2026-01-26

### Added
- **Morning Briefing skill** - Comprehensive daily briefing workflow
  - Gathers calendar, tasks, tickets, weather, and news
  - OmniFocus integration for due/flagged tasks via new `get_due_flagged.js` script
  - Freshservice integration for open tickets and pending approvals
  - Generates conversational podcast script for ElevenLabs TTS
  - Saves full briefing to Obsidian daily note
  - Email delivery with audio podcast attachment
  - Podcast script template with voice guidelines

- **Google Workspace Gmail scripts**
  - `gmail/get_unread_summary.js` - Get unread count plus message previews with sender analysis
  - `gmail/send_with_attachment.js` - Send emails with file attachments (MP3, PDF, images, etc.)

## [0.10.0] - 2026-01-26

### Added
- **Skill locations registry in CLAUDE.md** - Explicit skill paths for direct access by subagents
  - Pattern: `./skills/{skill-name}/SKILL.md`
  - Complete table of 23 available skills
  - Eliminates filesystem searches by Explore agents

- **Auto-registration in init_skill.py** - New skills automatically added to CLAUDE.md's skill table
  - Finds CLAUDE.md by walking up directory tree
  - Inserts new skill in alphabetical order
  - Maintains table format

### Changed
- **skill-creator SKILL.md** - Added "Register in CLAUDE.md" step after skill initialization
  - Documents manual registration process
  - Notes that init_skill.py handles this automatically

## [0.9.0] - 2026-01-26

### Added
- **1Password CLI integration** for secure secrets management
  - Centralized secrets modules (`scripts/secrets.js`, `scripts/secrets.py`)
  - Setup documentation at `docs/1password-setup.md`
  - Support for 10 secrets across 6 skills

### Changed
- **All skills now load secrets from 1Password** instead of `.env` file
  - freshservice-manager: 13 scripts updated
  - elevenlabs-tts: 2 scripts updated
  - image-gen: 3 scripts updated
  - multi-model-research: 1 script updated
  - research: 1 script updated
  - google-workspace: 2 auth scripts + package.json updated

### Removed
- `python-dotenv` dependency from Python scripts
- `dotenv` dependency from google-workspace package.json
- iCloud `.env` file requirement

### Security
- Secrets no longer stored as plaintext in iCloud
- Leverages 1Password's security and biometric authentication
- Secrets never written to disk by scripts

## [0.8.0] - 2026-01-24

### Added
- **Assistant Architect field libraries** - Pre-built option sets for common dropdown fields
  - Common Field Libraries: Grade Levels, Subjects, US States, Standards Frameworks, Writing Tone, Output Format, Length, Audience, Language
  - K-12 District-Specific Libraries: ELA/Math/Science Standards Domains, Grade Bands, Student Population, Instructional Models, Assessment Types, Lesson Duration, Bloom's/DOK Levels, Educator Roles, School Levels, Communication Types, Grading Periods
  - Collapsed dropdown detection and resolution workflow
  - Decision framework for making reasonable assumptions on education assistants
  - PSD Instructional Essentials alignment guidance for educational tools

### Changed
- **Assistant Architect SKILL.md** - Enhanced with comprehensive field libraries and workflow improvements
  - New "Handling Collapsed Dropdowns" section with resolution order
  - New "1.5 Resolve All Dropdown Options" workflow step (required before JSON generation)
  - Strengthened validation checklist to ensure all select fields have proper choices
  - Scoped K-12 libraries to educational/instructional assistants only

## [0.7.0] - 2026-01-23

### Added
- **PSD Instructional Vision skill** - Peninsula School District's instructional framework for graphics, AI assistants, and external systems
  - 4 Instructional Essentials: Rigor & Inclusion, Data-Driven Decisions, Continuous Growth, Innovation
  - 8 Tier 1 Practices with definitions, examples, indicators
  - System prompt injection template for AI assistants
  - Full playbook reference (495 lines) converted from PDF to markdown
  - Role-based responsibilities for teachers, principals, central office

### Changed
- **CLAUDE.md** - Added git tagging step to version bump process (step 5: `git tag vX.Y.Z && git push origin vX.Y.Z`)

## [0.6.0] - 2026-01-23

### Added
- **PAI Monitor skill** - Monitor Personal AI Infrastructure repo for updates and identify improvement opportunities for Geoffrey
  - 4-phase workflow: Fetch PAI state → Analyze Geoffrey → Gap analysis → Generate report
  - Focus area options: packs, hooks, skills, patterns
  - Detailed report template with prioritized recommendations
- **Assistant Architect skill** - Create AI Studio Assistant Architect JSON import files
  - Screenshot input mode: Extract fields, types, and instructions from UI images
  - Description input mode: Parse unstructured dictation for requirements
  - Smart defaults for models and field types
  - Quick patterns: Q&A, chained analysis, transform with options
  - Validation checklist and complete JSON spec reference

### Fixed
- **quick_validate.py** - Added PEP 723 inline dependency for pyyaml, expanded allowed frontmatter properties to include all valid skill properties (triggers, version, model, context, agent, extended-thinking, argument-hint)

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
