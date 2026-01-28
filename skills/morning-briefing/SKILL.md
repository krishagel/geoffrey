---
name: morning-briefing
description: Generate comprehensive morning briefing with calendar, tasks, tickets, news, and weather. Saves to Obsidian, sends email with audio podcast attached.
triggers:
  - "morning briefing"
  - "daily briefing"
  - "start my day"
  - "what's on today"
disable-model-invocation: true
allowed-tools: Read, Write, Bash, WebSearch, mcp__obsidian-vault__*
version: 1.3.0
---

# Morning Briefing Workflow

## Overview

Generates a daily morning briefing and delivers it three ways:
1. **Terminal**: Summary displayed immediately
2. **Obsidian**: Full briefing saved to daily note
3. **Email**: Briefing text + audio podcast attachment

## Location

- **Gig Harbor, WA** - Use for weather queries

## Phase 1: Gather Data

Execute these data gathering steps:

### 1.1 Calendar (Today's Events)

```bash
cd /Users/hagelk/non-ic-code/geoffrey/skills/google-workspace && bun calendar/list_events.js psd --today
```

Returns JSON with today's events including:
- Event summary, location, start/end times
- Attendees and response status
- Hangout/meet links

**Account**: Use `psd` for work calendar

### 1.2 OmniFocus Tasks (Due & Flagged)

```bash
osascript -l JavaScript /Users/hagelk/non-ic-code/geoffrey/skills/morning-briefing/scripts/get_due_flagged.js
```

Returns tasks that are:
- Due today or overdue
- Flagged
- Available (not blocked, not deferred to future)

### 1.3 Recent Emails (Last 24 Hours)

```bash
# Get yesterday's date in Gmail query format
YESTERDAY=$(date -v-1d +%Y/%m/%d)
cd /Users/hagelk/non-ic-code/geoffrey/skills/google-workspace && bun gmail/list_messages.js psd --query "after:$YESTERDAY" --max 15
```

Returns recent inbox messages with:
- From, subject, date, snippet
- Whether read or unread
- Thread ID for context

**Philosophy**: Any email still in inbox from last 24 hours needs attention, read or not.

**Account**: Use `psd` for work email

### 1.4 Open Freshservice Tickets

```bash
bun /Users/hagelk/non-ic-code/geoffrey/skills/freshservice-manager/scripts/list_tickets.js '{"workspace_id": 2, "filter": "new_and_my_open"}'
```

Returns open tickets assigned to or created by user in Technology workspace.

### 1.5 Pending Approvals

```bash
bun /Users/hagelk/non-ic-code/geoffrey/skills/freshservice-manager/scripts/get_approvals.js requested
```

Returns service requests awaiting approval.

### 1.6 Weather

Use WebSearch:
```
Gig Harbor WA weather today forecast
```

Extract:
- Current conditions
- High/low temperature
- Precipitation chance
- Any alerts

### 1.7 EdTech News (with Synopses)

Use WebSearch:
```
K-12 education technology news today 2026
```

For each article found (3-5 articles):
1. Use WebFetch to read the full article
2. Extract a 2-3 sentence synopsis covering:
   - What happened / what's new
   - Why it matters for K-12 education
   - Key takeaway or action item

**Topics to cover:**
- EdTech product launches and updates
- School technology policy changes
- Cybersecurity in schools
- Digital learning trends

### 1.8 AI News (with Synopses)

Use WebSearch:
```
artificial intelligence news today 2026 latest developments
```

For each article found (3-5 articles):
1. Use WebFetch to read the full article
2. Extract a 2-3 sentence synopsis covering:
   - What's the development
   - Industry impact
   - Relevance to education/work

**Topics to cover:**
- Major AI model releases and capabilities
- AI policy and regulation
- Enterprise AI adoption
- AI research breakthroughs

### 1.9 K-12 Leadership News (with Synopses)

Use WebSearch:
```
K-12 school leadership superintendent education policy news 2026
```

For each article found (2-3 articles):
1. Use WebFetch to read the full article
2. Extract a 2-3 sentence synopsis covering:
   - Policy or leadership development
   - Impact on districts/schools
   - Relevance to CIO/technology leadership

**Topics to cover:**
- State and federal education policy
- Superintendent and board news
- School funding and budgets
- Workforce and staffing trends

### 1.10 Team EOD Messages (Last Business Day) - DETAILED

Get end-of-day check-in messages from the Technology Staff space:

```bash
cd /Users/hagelk/non-ic-code/geoffrey/skills/google-workspace && bun chat/get_eod_messages.js psd spaces/AAAAxOtpv10 last-business-day
```

**CRITICAL**: Extract FULL details from each team member's EOD message. Look for messages that contain "Today:" prefix - these are the detailed EOD summaries.

For each team member who posted an EOD summary:
1. **Name**: Who posted
2. **Location(s)**: Where they worked (WFH, DCRC, school sites)
3. **Key accomplishments**: Specific tasks completed (not just "tickets")
4. **Notable items**: Interesting problems solved, projects worked on
5. **Issues/blockers**: Any problems mentioned

**Example extraction from raw message:**
```
Brad White:
- Location: TSD (Tech Services)
- Accomplished: Packaged Cinema 4D plugin for deployment, fixed OAuth blocking for Maxon App sign-in, created SwiftDialog notification for plugin installs, used Claude Code for first time to create Installomator label for Godot game engine
- Notable: Working on Unity deployment troubleshooting, burning comp time leaving early
```

**Note**: If today is Monday, "last business day" = Friday (or Thursday if Friday was a holiday).

### 1.11 Team Completed Tickets (Last Business Day)

Get tickets closed by the Technology team on the last business day:

```bash
# First get the last business day
LAST_BIZ_DAY=$(bun /Users/hagelk/non-ic-code/geoffrey/skills/morning-briefing/scripts/get_last_business_day.js | jq -r '.date')

# Then get daily summary for that date
bun /Users/hagelk/non-ic-code/geoffrey/skills/freshservice-manager/scripts/get_daily_summary.js "$LAST_BIZ_DAY"
```

Returns:
- Total tickets closed
- Breakdown by agent
- Breakdown by category (Password Reset, Chromebook, etc.)
- Automated vs agent-resolved

**Workspace**: Technology (workspace_id: 2)

### 1.12 Ticket Trends Analysis

Compare last business day to previous days for trends:

```bash
# Get last 5 business days of summaries for trend analysis
# The get_daily_summary.js script supports date parsing
bun /Users/hagelk/non-ic-code/geoffrey/skills/freshservice-manager/scripts/get_daily_summary.js "last monday"
bun /Users/hagelk/non-ic-code/geoffrey/skills/freshservice-manager/scripts/get_daily_summary.js "last tuesday"
# etc.
```

Analyze for:
- Volume trends (increasing/decreasing)
- Category spikes (sudden increase in specific issue types)
- Agent workload distribution
- Unusual patterns

### 1.13 Software Development Workspace Tickets

Get open tickets in the Software Development workspace:

```bash
bun /Users/hagelk/non-ic-code/geoffrey/skills/freshservice-manager/scripts/search_tickets.js "status:2 OR status:3" 13
```

Returns all open (status:2) and pending (status:3) tickets in the Software Development workspace.

**Workspace ID**: 13 (Software Development)
**Note**: This is the user's internal software development bug tracker for AI Studio and other PSD applications.

### 1.14 Legislative Activity (Last Business Day)

Get K-12 education bills with activity since the last business day:

```bash
# Get lookback info and bills to check
bun /Users/hagelk/non-ic-code/geoffrey/skills/legislative-tracker/scripts/get_recent_bill_activity.js --last-business-day
```

This returns:
- Date range to check (last business day → today)
- List of ~143 confirmed education bill IDs
- WebFetch instructions for each bill

**Workflow:**
1. Get the output from `get_recent_bill_activity.js`
2. WebFetch each bill URL (batch 5-6 in parallel for speed)
3. Extract latest action date from each bill page
4. Filter to bills where latest_action_date >= lookback_start
5. Apply priority framework (HIGH/MEDIUM/LOW based on district impact)
6. Include summary of what each bill does

**On Monday**: Lookback starts on Friday (or earlier if Friday was a holiday), so includes all weekend activity (hearings, votes, committee actions).

**Example URLs to WebFetch:**
- `https://app.leg.wa.gov/billsummary?BillNumber=1020&Year=2025`
- `https://app.leg.wa.gov/billsummary?BillNumber=5038&Year=2025`

**Note**: Only include bills that actually had activity. If no bills moved, output "No legislative activity since [date]".

## Phase 2: Generate Briefing

### 2.1 Analyze & Prioritize

Review gathered data and identify:
- **Conflicts**: Overlapping calendar events
- **Urgencies**: Overdue tasks, high-priority tickets
- **Themes**: Patterns across data sources

### 2.2 Format Markdown Briefing

Use this structure:

```markdown
# Daily Briefing - [DATE]

## Weather
[Current conditions, high/low, precipitation]

## Today's Calendar
| Time | Event | Location |
|------|-------|----------|
| ... | ... | ... |

**Conflicts/Notes**: [any issues]

## Priority Tasks
### Due Today
- [ ] Task 1
- [ ] Task 2

### Flagged
- [ ] Task 3

### Overdue
- [ ] Task 4 (due [date])

## Recent Emails (Last 24h)
[X emails in inbox from last 24 hours]

### Needs Response
- From: [sender] - [subject] (snippet)
- From: [sender] - [subject] (snippet)

### FYI/Notifications
- [sender] - [subject]

## Freshservice
### Technology Tickets: [count] open
[Top 3-5 tickets by priority/age]

### Software Development Tickets: [count] open
[List tickets in Software Dev workspace]

### Pending Approvals: [count]
[List with ticket #, requester, summary]

## Team Activity (Last Business Day: [DAY, DATE])

### Team EOD Summaries

**[Name 1]** - [Location(s)]
- [Key accomplishment 1 - be specific about what they did]
- [Key accomplishment 2]
- [Notable: any interesting problems solved or projects]

**[Name 2]** - [Location(s)]
- [Key accomplishment 1]
- [Key accomplishment 2]
- [Issues: any blockers or problems mentioned]

*[Continue for each team member who posted an EOD summary]*

### Tickets Completed by Team: [count]
| Agent | Tickets | Top Categories |
|-------|---------|----------------|
| [Name] | X | Password Reset (Y), Chromebook (Z) |

### Ticket Trends
- Volume: [up/down/stable] vs previous days
- Notable patterns: [any spikes or anomalies]

## EdTech News

### [Article Title 1] - [Source]
[2-3 sentence synopsis: what happened, why it matters, key takeaway]

### [Article Title 2] - [Source]
[2-3 sentence synopsis]

### [Article Title 3] - [Source]
[2-3 sentence synopsis]

## AI News

### [Article Title 1] - [Source]
[2-3 sentence synopsis: what's the development, industry impact, relevance]

### [Article Title 2] - [Source]
[2-3 sentence synopsis]

### [Article Title 3] - [Source]
[2-3 sentence synopsis]

## K-12 Leadership News

### [Article Title 1] - [Source]
[2-3 sentence synopsis: policy/leadership development, impact, relevance to tech leadership]

### [Article Title 2] - [Source]
[2-3 sentence synopsis]

## Legislative Activity ([Last Biz Day] - Today)

[X] education bills had movement:

### 🔴 HIGH Priority

#### [Bill ID] - [Short Title]
**Action**: [What happened - hearing, vote, committee action, etc.]
**Summary**: [1-2 sentences: what the bill does, potential district impact]

### 🟡 MEDIUM Priority

#### [Bill ID] - [Short Title]
**Action**: [What happened]
**Summary**: [1-2 sentences]

### 🟢 LOW Priority
- [Bill ID]: [Action type] - [One line summary]

*No legislative activity since [date]* - if no bills moved

## Quick Stats
- Calendar events: X
- Tasks overdue: X | Due today: X | Flagged: X
- Open tickets (Tech): X
- Open tickets (Software Dev): X
- Pending approvals: X
- Recent emails (24h): X
- Team tickets closed [last biz day]: X
- News articles: EdTech (X) | AI (X) | Leadership (X)
- Legislative bills with activity: X
```

### 2.3 Generate Podcast Script (Extended Format)

Transform the briefing into a comprehensive conversational audio script:
- First person, casual professional tone
- **10-15 minutes speaking time (~1500-2000 words)**
- Address listener directly ("Here's what you need to know today...")

**Required Sections (in order):**

1. **Opening** (~100 words)
   - Day, date, weather summary
   - Quick preview of key items

2. **Calendar & Schedule** (~150 words)
   - Today's events with context
   - Highlight key meetings/events
   - Note any conflicts or prep needed

3. **Tasks & Priorities** (~150 words)
   - Overdue items that need attention
   - Due today items
   - Flagged priorities

4. **Tickets & Service Desk** (~150 words)
   - Open Technology tickets
   - Software Development tickets
   - Pending approvals

5. **Team Activity - DETAILED** (~400 words)
   - What the team accomplished on last business day
   - Highlight 3-5 team members by name with specifics
   - Notable projects, interesting problems solved
   - Overall ticket closure stats

6. **EdTech News** (~200 words)
   - 2-3 articles with synopses
   - Why each matters for K-12

7. **AI News** (~200 words)
   - 2-3 articles with synopses
   - Industry impact and relevance

8. **K-12 Leadership News** (~150 words)
   - 1-2 articles with synopses
   - Policy/leadership implications

9. **Legislative Update** (~150 words)
   - Bills that had hearings, votes, or readings since last business day
   - Highlight any with direct district impact (fiscal, operational, staffing)
   - Note upcoming hearing dates if relevant
   - On Mondays, include weekend activity summary

10. **Closing** (~100 words)
    - Top 3 priorities for the day
    - Sign off

**Style Guidelines:**
- Use team members' first names when discussing their work
- Include specific details (not "worked on tickets" but "resolved 34 Chromebook repairs")
- Transition smoothly between sections
- Add brief commentary/analysis on news items

Save to `/tmp/morning_briefing_podcast.txt`

## Phase 3: Create Podcast

```bash
uv run --with mlx-audio --with pydub /Users/hagelk/non-ic-code/geoffrey/skills/local-tts/scripts/generate_audio.py \
  --file /tmp/morning_briefing_podcast.txt \
  --voice af_heart \
  --output ~/Desktop/morning_briefing_[DATE].mp3
```

**Voice Selection**: af_heart (warm, friendly - good for morning briefing)
**Note**: Uses local MLX TTS (Kokoro model) - no API costs

## Phase 3.5: Generate Infographic

Create a visual summary infographic using the image-gen skill.

### 3.5.1 Build Infographic Prompt

Based on gathered data, construct a prompt for the infographic:

```
Create an infographic summarizing a daily work briefing for [DATE].

Visual concept: A clean dashboard layout with distinct sections for different data categories.

Key data to display:
- Weather: [conditions], High [X]°F, Low [Y]°F
- Calendar: [X] events today, highlight: [key meeting]
- Tasks: [X] overdue, [Y] due today, [Z] flagged
- Tickets: [X] Technology open, [Y] Software Dev open
- Team Activity: [X] tickets closed by team yesterday
- Emails: [X] in inbox from last 24h

Style: Professional, clean design with PSD brand colors (navy blue #003366, gold accent #FFD700).
Flat design, clear sections, modern sans-serif typography.

Layout: Horizontal 16:9, organized as a dashboard with weather top-left, calendar top-right,
tasks and tickets in middle row, team stats at bottom.

Title: "Daily Briefing - [DATE]"
Subtitle: "Gig Harbor, WA"
```

### 3.5.2 Generate Image

```bash
uv run /Users/hagelk/non-ic-code/geoffrey/skills/image-gen/scripts/generate.py \
  "[infographic prompt]" \
  ~/Desktop/morning_briefing_[DATE].png \
  16:9 \
  2K
```

**Settings:**
- Aspect ratio: 16:9 (landscape dashboard)
- Size: 2K (ensures text readability)
- Output: `~/Desktop/morning_briefing_[DATE].png`

## Phase 4: Save to Obsidian

### 4.1 Copy Infographic to Obsidian Assets

```bash
cp ~/Desktop/morning_briefing_[DATE].png \
  ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/Personal_Notes/Geoffrey/Daily\ Briefings/assets/
```

### 4.2 Add Infographic to Briefing Markdown

At the top of the briefing (after the title), add:

```markdown
![Daily Briefing Infographic](assets/morning_briefing_[DATE].png)
```

### 4.3 Save Briefing File

Use Obsidian MCP tools:

1. **Check if daily note exists**:
   ```
   mcp__obsidian-vault__get_vault_file
   filename: "Geoffrey/Daily Briefings/[YYYY-MM-DD].md"
   ```

2. **Create or update**:
   ```
   mcp__obsidian-vault__create_vault_file
   filename: "Geoffrey/Daily Briefings/[YYYY-MM-DD].md"
   content: [full briefing markdown with infographic embed]
   ```

**File path pattern**: `Geoffrey/Daily Briefings/YYYY-MM-DD.md`

**Fallback** (if MCP unavailable): Write directly to iCloud path:
```bash
/Users/hagelk/Library/Mobile Documents/iCloud~md~obsidian/Documents/Personal_Notes/Geoffrey/Daily Briefings/[YYYY-MM-DD].md
```

## Phase 5: Send Email

### 5.1 Save Email Body to File

Save the full briefing markdown to a temp file (avoids CLI argument length issues):

```bash
# Write briefing to temp file
cat > /tmp/morning_briefing_email.md << 'EOF'
Good morning,

Here's your daily briefing for [DATE].

[Include full briefing markdown - same content as Obsidian note]

---
📊 Infographic and 🎧 Audio podcast attached.
Listen time: ~3 minutes.
Full briefing also saved to Obsidian: Geoffrey/Daily Briefings/[DATE].md
EOF
```

### 5.2 Send with Multiple Attachments

```bash
cd /Users/hagelk/non-ic-code/geoffrey/skills/google-workspace && bun gmail/send_with_attachments.js psd \
  --to "hagelk@psd401.net" \
  --subject "Daily Briefing - [DATE]" \
  --body-file /tmp/morning_briefing_email.md \
  --attachments "~/Desktop/morning_briefing_[DATE].png,~/Desktop/morning_briefing_[DATE].mp3"
```

**Note**: The `send_with_attachments.js` script supports:
- Multiple attachments (comma-separated paths)
- Body from file (`--body-file`) for long content
- MP3, PNG, PDF, images, Office documents
- Plain text or HTML body (use `--html` flag)
- CC/BCC recipients

**Attachments sent:**
1. `morning_briefing_[DATE].png` - Visual infographic summary
2. `morning_briefing_[DATE].mp3` - Audio podcast (~3 min)

## Output

Return standardized summary:

```markdown
## Summary
Generated daily briefing for [DATE]

## Actions
- Gathered calendar events: X
- Gathered tasks: X (Y due today, Z flagged)
- Gathered Technology tickets: X open, Y approvals pending
- Gathered Software Dev tickets: X open
- Gathered team EOD messages: X from [last business day]
- Gathered team completed tickets: X from [last business day]
- Weather: [conditions]
- News: X headlines
- Generated podcast: ~/Desktop/morning_briefing_[DATE].mp3
- Saved to Obsidian: Geoffrey/Daily Briefings/[DATE].md
- Email: [sent/skipped - reason]

## Status
[Status emoji] [Complete/Partial]

## Quick View
[2-3 line summary of most important items]
```

## Error Handling

### Missing Google Workspace Scripts
If calendar/email scripts don't exist:
- Skip those sections
- Note "Integration pending" in output
- Continue with available data sources

### OmniFocus Not Running
```
Status: Partial
Note: OmniFocus not running - task data unavailable
```

### Freshservice API Error
```
Status: Partial
Note: Freshservice API error - ticket data unavailable
```

### Local TTS Generation Failed
```
Status: Partial
Note: Audio generation failed - check mlx-audio setup
Briefing saved to Obsidian without podcast
```

## Dependencies

| Skill/Tool | Required For | Fallback |
|------------|--------------|----------|
| google-workspace | Calendar, email, team EOD | Skip sections |
| omnifocus-manager | Tasks | Skip section |
| freshservice-manager | Tickets, approvals, team stats | Skip section |
| local-tts | Audio podcast | Text-only briefing |
| obsidian-vault (MCP) | Save briefing | Display only |
| WebSearch | News, weather | Skip sections |

## Configuration

### User Preferences
- **Location**: Gig Harbor, WA (weather)
- **Work Email**: psd account
- **Technology Workspace**: workspace_id: 2
- **Software Dev Workspace**: workspace_id: 13
- **Team EOD Chat Space**: spaces/AAAAxOtpv10 (Technology Staff Check-Ins & Logs)
- **Voice**: af_heart (warm, friendly - local Kokoro TTS)
- **Podcast Length**: 10-15 minutes (~1500-2000 words)

### Customization
Users can request:
- "Skip news" - omit news section
- "No podcast" - text only
- "Just calendar and tasks" - minimal briefing
