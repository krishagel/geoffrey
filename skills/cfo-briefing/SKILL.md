---
name: cfo-briefing
description: Generate daily CFO briefing for Ashley Murphy covering absence stats, department tickets, legislative fiscal updates, and K-12 finance news. Delivered via HTML email with absence infographic and podcast attachment.
triggers:
  - "cfo briefing"
  - "cfo daily briefing"
  - "ashley's briefing"
  - "ashley briefing"
  - "finance briefing"
disable-model-invocation: true
allowed-tools: Read, Write, Bash, WebSearch, WebFetch
version: 1.0.0
---

# CFO Daily Briefing Workflow

## Overview

Generates a daily briefing for CFO Ashley Murphy and delivers it via:
1. **Terminal**: Summary displayed immediately
2. **Email**: HTML briefing with inline absence infographic + podcast attachment

**No Obsidian vault writing.** This skill produces email-only output.

## Location

- **Gig Harbor, WA** - Use for weather queries

## Audience

- **Ashley Murphy** - Chief Financial Officer, Peninsula School District
- Framing: Financial impact, staffing costs, departmental operations, fiscal legislation

---

## Phase 1: Gather Data

Execute these data gathering steps:

### 1.1 Red Rover - All Staff Absences

```bash
bun /Users/hagelk/non-ic-code/geoffrey/skills/redrover-manager/scripts/get_daily_summary.js today
```

Returns: `total_absences`, `filled`, `unfilled`, `fill_rate`, `by_school`, `by_reason`, `by_position_type`, `unfilled_positions[]`

### 1.2 Red Rover - Certificated Only

```bash
bun /Users/hagelk/non-ic-code/geoffrey/skills/redrover-manager/scripts/get_certificated_summary.js today
```

Returns: same shape as 1.1 but filtered to Teacher, ESA - Certificated, CTE - Teacher position types.

### 1.3 Classified (Derived)

**Do not run a script.** Subtract certificated values from all-staff values in the orchestration layer:
- `classified_absences = all_absences - cert_absences`
- `classified_filled = all_filled - cert_filled`
- `classified_unfilled = all_unfilled - cert_unfilled`
- `classified_fill_rate = classified_filled / classified_absences * 100` (handle divide-by-zero)

### 1.3b Red Rover - Weekly Trends

```bash
bun /Users/hagelk/non-ic-code/geoffrey/skills/redrover-manager/scripts/get_weekly_summary.js 0
```

Provides 5-day trend context: daily averages, peak/slow days, fill rate trends. Used for "compared to this week's average" framing in the briefing.

### 1.4 FreshService - Transportation Tickets

```bash
bun /Users/hagelk/non-ic-code/geoffrey/skills/freshservice-manager/scripts/search_tickets.js "status:2 OR status:3" 9
```

**Workspace ID**: 9 (Transportation)
Returns: `count`, `tickets[]` (id, subject, status, priority, created_at, due_by)

### 1.5 FreshService - Maintenance Tickets

```bash
bun /Users/hagelk/non-ic-code/geoffrey/skills/freshservice-manager/scripts/search_tickets.js "status:2 OR status:3" 6
```

**Workspace ID**: 6 (Maintenance)
Returns: same shape as 1.4

### 1.6 FreshService - Employee Support Services Tickets

```bash
bun /Users/hagelk/non-ic-code/geoffrey/skills/freshservice-manager/scripts/search_tickets.js "status:2 OR status:3" 3
```

**Workspace ID**: 3 (Employee Support Services)
Returns: same shape as 1.4

### 1.7 Legislative - Fiscal Focus

```bash
bun /Users/hagelk/non-ic-code/geoffrey/skills/legislative-tracker/scripts/get_recent_bill_activity.js --last-business-day
```

**Workflow:**
1. Get the output from `get_recent_bill_activity.js`
2. WebFetch each bill URL (batch 5-6 in parallel for speed)
3. Extract latest action date from each bill page
4. Filter to bills where latest_action_date >= lookback_start
5. **Prioritize bills with FISCAL impact type** - these get detailed treatment
6. Other bill types get brief mention only

Also pull Tier 2 finance committee bills:
```bash
bun /Users/hagelk/non-ic-code/geoffrey/skills/legislative-tracker/scripts/get_bills.js --tier 2 --format briefing
```

**On Monday**: Lookback starts on Friday (or earlier if Friday was a holiday), so includes all weekend activity.

### 1.8 K-12 Financial News

Use WebSearch with these queries (replace [MONTH YEAR] with current month/year):

1. `K-12 school district finance budget funding news past 24 hours [MONTH YEAR]`
2. `Washington state education funding levy bond news [MONTH YEAR]`
3. `WASBO Washington school business officials news [MONTH YEAR]`
4. `OSPI fiscal budget allocation Washington state [MONTH YEAR]`

WebFetch top 3-4 articles. Extract 2-3 sentence synopses for each:
- What happened / what's new
- Why it matters for K-12 finance
- Key takeaway for a CFO

**Freshness check**: Verify article dates. Only include articles published within the last 48 hours. Skip older articles even if they appear in results.

### 1.9 Weather

Use WebSearch:
```
Gig Harbor WA weather today forecast
```

Extract:
- Current conditions
- High/low temperature
- Precipitation chance
- Any alerts

### 1.10 Calendar/Email (Simulated)

**No API calls.** This is a placeholder for future integration.

Display in the briefing:
```
Calendar and email integration pending. Check Outlook/Google Calendar directly.
```

---

## Phase 2: Generate Content

### 2.1 Markdown Briefing

Build the briefing with these sections in order:

```markdown
# CFO Daily Briefing - [DATE]

## Weather
[Current conditions, high/low, precipitation]

## CFO Calendar
*Calendar integration pending. Check Outlook/Google Calendar directly.*

## Staff Absences Dashboard

| Metric | All Staff | Certificated | Classified |
|--------|-----------|--------------|------------|
| Total Absences | X | Y | Z |
| Filled | X | Y | Z |
| Unfilled | X | Y | Z |
| Fill Rate | X% | Y% | Z% |

## Weekly Absence Trends
- This week's daily average: X absences
- Today vs average: [above/below/at average]
- Peak day this week: [day] with X absences
- Fill rate trend: [improving/declining/stable] (X% avg this week)

## Unfilled Positions
[If unfilled > 5, display attention alert]
[List unfilled positions with school, position type, and reason]

## Absences by School
| School | Total | Filled | Unfilled |
|--------|-------|--------|----------|
| ... | ... | ... | ... |

## Absences by Reason
| Reason | Count |
|--------|-------|
| ... | ... |

## Absences by Position Type
| Position Type | Count |
|---------------|-------|
| ... | ... |

## Department Tickets

### Transportation (Workspace 9) - [count] open
[List top tickets by priority with subject, status, created date]

### Maintenance (Workspace 6) - [count] open
[List top tickets by priority]

### Employee Support Services (Workspace 3) - [count] open
[List top tickets by priority]

## Legislative Fiscal Update

### FISCAL Impact Bills (Detailed)
[For each FISCAL bill with recent activity:]
**[Bill ID] - [Short Title]**
Action: [What happened]
Fiscal Impact: [Budget/funding implications]
Summary: [1-2 sentences]

### Other Education Bills (Brief)
- [Bill ID]: [Action] - [One line]

### Finance Committee Bills (Tier 2)
[Tier 2 bills from finance committees]

## K-12 Finance & WASBO/OSPI News

### [Article Title] - [Source]
[2-3 sentence synopsis with financial framing]

## Quick Stats
- Total absences: X (Cert: Y, Classified: Z)
- Fill rate: X% (Cert: Y%, Classified: Z%)
- Unfilled positions: X
- Department tickets: Transportation (X), Maintenance (Y), ESS (Z)
- Legislative bills with activity: X (Y fiscal impact)
- Finance articles: X
```

### 2.2 Podcast Script (~1400 words, ~9 min)

Transform the briefing into a conversational audio script. Address Ashley directly.

**Required Sections (in order):**

1. **Opening** (~80 words)
   - "Good morning, Ashley."
   - Day, date, weather summary
   - Quick preview: "Today we have X absences with a Y% fill rate, Z department tickets, and some legislative movement on education funding."

2. **Absences Dashboard** (~350 words)
   - Total absences, fill rate, unfilled count
   - Certificated vs classified breakdown
   - Weekly trend context: "Compared to this week's average of X, today is [above/below]..."
   - Schools with highest absence counts
   - Top absence reasons
   - Any unfilled positions requiring attention
   - Financial framing: "X unfilled positions means Y classrooms without coverage today"

3. **Department Tickets** (~200 words)
   - Transportation: count + any urgent items
   - Maintenance: count + any urgent items
   - Employee Support Services: count + any urgent items
   - Highlight anything overdue or high-priority

4. **Legislative Fiscal Update** (~300 words)
   - Bills with FISCAL impact that had recent activity
   - Budget implications for the district
   - Upcoming hearings or votes to watch
   - Finance committee bill highlights

5. **Finance/WASBO/OSPI News** (~200 words)
   - 2-3 articles with financial relevance
   - Why each matters for PSD's budget or operations

6. **Closing** (~100 words)
   - Top 3 items requiring CFO attention today
   - "Have a productive day, Ashley."

**Tone Guidelines:**
- Professional, data-forward, financial framing
- Use specific numbers, not vague language
- "Your fill rate is 78%" not "fill rates are somewhat low"
- Connect absence data to operational/financial impact
- Reference trends: "up from yesterday" or "below this week's average"

**CRITICAL - NO HALLUCINATION:**
- Use ONLY data from the scripts executed in Phase 1
- Never invent absence numbers, ticket counts, or bill details
- If a data source returned no results, say "No data available from [source]"

Save to `/tmp/cfo_briefing_podcast.txt`

---

## Phase 3: Create Podcast

### 3.1 Apply Pronunciations

```bash
bun /Users/hagelk/non-ic-code/geoffrey/skills/morning-briefing/scripts/apply_pronunciations.js \
  --file /tmp/cfo_briefing_podcast.txt \
  --guide /Users/hagelk/non-ic-code/geoffrey/skills/cfo-briefing/pronunciation_guide.json
```

### 3.2 Generate Audio

```bash
uv run --with mlx-audio --with pydub /Users/hagelk/non-ic-code/geoffrey/skills/local-tts/scripts/generate_audio.py \
  --file /tmp/cfo_briefing_podcast.txt \
  --voice af_heart \
  --output ~/Desktop/cfo_briefing_[DATE].mp3
```

**Voice**: af_heart (warm, professional)
**Note**: Replace `[DATE]` with YYYY-MM-DD format (e.g., `cfo_briefing_2026-02-03.mp3`)

---

## Phase 3.5: Generate Absence Infographic

Build a dynamic prompt from Red Rover data and generate an infographic.

### 3.5.1 Build Infographic Prompt

Using the data gathered in Phase 1, construct a prompt:

```
Create a data dashboard infographic titled "PSD Staff Absences - [DATE]".

Main section - three large gauge/donut charts:
1. Total Absences: [X] (large number, navy background)
2. Fill Rate: [Y]% (color-coded: green if >=80%, gold if 70-79%, red if <70%)
3. Unfilled: [Z] (red accent if >5, gold if 3-5, green if <3)

Two-column comparison below the gauges:
Left column - "Certificated":
- Absences: [X]
- Filled: [Y]
- Unfilled: [Z]
- Fill Rate: [X]%

Right column - "Classified":
- Absences: [X]
- Filled: [Y]
- Unfilled: [Z]
- Fill Rate: [X]%

Bottom section - horizontal bar chart "Top 5 Schools by Absence Count":
[School 1]: [X] absences (filled portion in green, unfilled in red)
[School 2]: [X] absences
[School 3]: [X] absences
[School 4]: [X] absences
[School 5]: [X] absences

Style: Professional dashboard with PSD brand colors - navy (#003366) primary,
gold (#FFD700) accent, green (#28a745) for filled/positive, red (#dc3545) for
unfilled/negative. White background. Clean sans-serif typography. 16:9 aspect ratio.
Subtitle: "Prepared for Ashley Murphy, CFO"
```

### 3.5.2 Generate Image

```bash
uv run /Users/hagelk/non-ic-code/geoffrey/skills/image-gen/scripts/generate.py \
  "[infographic prompt]" \
  ~/Desktop/cfo_briefing_[DATE].png \
  16:9 \
  2K
```

**Settings:**
- Aspect ratio: 16:9 (landscape dashboard)
- Size: 2K (ensures text readability)
- Output: `~/Desktop/cfo_briefing_[DATE].png`

---

## Phase 4: Send Email

### 4.1 Generate HTML Email

Using the template at `skills/cfo-briefing/templates/email.html`, generate the HTML email body by replacing all `{{PLACEHOLDER}}` values with actual data.

**Template placeholders:**
- `{{DATE}}` - YYYY-MM-DD
- `{{DAY_OF_WEEK}}` - Monday, Tuesday, etc.
- `{{DATE_FORMATTED}}` - February 3, 2026
- `{{WEATHER_TEMP}}` - e.g., 45°F
- `{{WEATHER_CONDITIONS}}` - e.g., Partly Cloudy, High 48°F / Low 38°F
- `{{TOTAL_ABSENCES}}` - total all-staff absences
- `{{FILL_RATE}}` - all-staff fill rate percentage
- `{{FILL_RATE_CLASS}}` - "green" if >=80%, "gold" if 70-79%, "red" if <70%
- `{{UNFILLED_COUNT}}` - total unfilled
- `{{DEPT_TICKETS}}` - combined ticket count across all 3 departments
- `{{ALL_ABSENCES}}`, `{{CERT_ABSENCES}}`, `{{CLASS_ABSENCES}}` - breakdown totals
- `{{ALL_FILLED}}`, `{{CERT_FILLED}}`, `{{CLASS_FILLED}}` - filled counts
- `{{ALL_UNFILLED}}`, `{{CERT_UNFILLED}}`, `{{CLASS_UNFILLED}}` - unfilled counts
- `{{ALL_FILL_RATE}}`, `{{CERT_FILL_RATE}}`, `{{CLASS_FILL_RATE}}` - fill rate %
- `{{TRANSPORT_COUNT}}`, `{{MAINT_COUNT}}`, `{{ESS_COUNT}}` - per-department ticket counts
- `{{TRANSPORT_TICKETS}}`, `{{MAINT_TICKETS}}`, `{{ESS_TICKETS}}` - ticket HTML lists
- `{{LEGISLATIVE_ITEMS}}` - legislative section HTML
- `{{FINANCE_NEWS_ITEMS}}` - news section HTML
- `{{WEEKLY_TRENDS_CONTENT}}` - weekly trend summary HTML
- `{{UNFILLED_POSITIONS_LIST}}` - list of unfilled positions HTML
- `{{CALENDAR_ITEMS}}` - calendar items HTML (placeholder text for now)

**Conditional sections** (remove block including wrapper if condition not met):
- `{{#IF_ABSENCE_WARNING}}...{{/IF_ABSENCE_WARNING}}` - show if fill rate <70% OR unfilled >5
- `{{ABSENCE_WARNING_TEXT}}` - e.g., "Fill rate is 65% with 8 unfilled positions"
- `{{#IF_CALENDAR}}...{{/IF_CALENDAR}}` - show if calendar data available
- `{{#IF_WEEKLY_TRENDS}}...{{/IF_WEEKLY_TRENDS}}` - show if weekly data available
- `{{#IF_UNFILLED_ALERT}}...{{/IF_UNFILLED_ALERT}}` - show if unfilled >5
- `{{#IF_LEGISLATIVE}}...{{/IF_LEGISLATIVE}}` - show if legislative activity found
- `{{#IF_FINANCE_NEWS}}...{{/IF_FINANCE_NEWS}}` - show if finance news found

Save generated HTML to `/tmp/cfo_briefing_email.html`

### 4.2 Send Email

```bash
cd /Users/hagelk/non-ic-code/geoffrey/skills/google-workspace && bun gmail/send_with_attachments.js psd \
  --to "hagelk@psd401.net" \
  --subject "CFO Daily Briefing - [DATE]" \
  --body-file /tmp/cfo_briefing_email.html \
  --html \
  --inline-image "~/Desktop/cfo_briefing_[DATE].png" \
  --attachments "~/Desktop/cfo_briefing_[DATE].mp3"
```

**Options:**
- `--html` - Treat body as HTML
- `--inline-image` - Embeds infographic at top of email (referenced as `cid:briefing_image`)
- `--attachments` - Podcast MP3 attached for download

**Production recipient**: `murphya@psd401.net` (change `--to` when ready for production)
**Testing recipient**: `hagelk@psd401.net`

---

## Phase 5: Output Summary

Return standardized summary:

```markdown
## Summary
Generated CFO daily briefing for [DATE]

## Actions
- Red Rover all-staff absences: X total, Y filled, Z unfilled (W% fill rate)
- Red Rover certificated: X total, Y filled, Z unfilled (W% fill rate)
- Derived classified: X total, Y filled, Z unfilled (W% fill rate)
- Weekly trends: X daily avg, peak [day] with Y absences
- Transportation tickets: X open
- Maintenance tickets: X open
- Employee Support tickets: X open
- Legislative bills with activity: X (Y with fiscal impact)
- Finance news articles: X
- Generated podcast: ~/Desktop/cfo_briefing_[DATE].mp3
- Generated infographic: ~/Desktop/cfo_briefing_[DATE].png
- Email sent to: hagelk@psd401.net

## Status
[Status emoji] [Complete/Partial]

## CFO Attention Items
1. [Most important item]
2. [Second most important]
3. [Third most important]
```

---

## Error Handling

### Red Rover API Error
```
Status: Partial
Note: Red Rover data unavailable - absence section skipped
```

### FreshService API Error
```
Status: Partial
Note: FreshService workspace [ID] error - [department] tickets unavailable
```

### Legislative Tracker Error
```
Status: Partial
Note: Legislative data unavailable - section skipped
```

### Local TTS Generation Failed
```
Status: Partial
Note: Audio generation failed - check mlx-audio setup
Briefing sent without podcast attachment
```

### Image Generation Failed
```
Status: Partial
Note: Infographic generation failed - email sent without inline image
```

---

## Dependencies

| Skill/Tool | Required For | Fallback |
|------------|--------------|----------|
| redrover-manager | Absence data | Skip absence sections |
| freshservice-manager | Department tickets | Skip ticket sections |
| legislative-tracker | Fiscal legislation | Skip legislative section |
| local-tts | Audio podcast | Email without attachment |
| image-gen | Absence infographic | Email without inline image |
| google-workspace | Email delivery | Display summary in terminal only |
| WebSearch | Weather, finance news | Skip sections |

---

## Configuration

### Recipients
- **Testing**: `hagelk@psd401.net`
- **Production**: `murphya@psd401.net`

### FreshService Workspaces
- **Transportation**: workspace_id 9
- **Maintenance**: workspace_id 6
- **Employee Support Services**: workspace_id 3

### Red Rover
- All staff: `get_daily_summary.js today`
- Certificated only: `get_certificated_summary.js today`
- Weekly trends: `get_weekly_summary.js 0`

### Voice
- **Model**: Kokoro (local MLX TTS)
- **Voice**: af_heart (warm, professional)
- **Target length**: ~1400 words (~9 minutes)

### Customization
Users can request:
- "Skip news" - omit finance news section
- "No podcast" - email without audio attachment
- "Just absences" - minimal briefing with absence data only
- "Send to Ashley" - use production recipient (murphya@psd401.net)
