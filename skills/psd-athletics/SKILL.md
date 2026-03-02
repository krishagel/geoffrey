---
name: psd-athletics
description: Retrieve PSD high school athletics schedules for Gig Harbor High School (GHHS/Tides) and Peninsula High School (PHS/Seahawks). Use when asked about upcoming games, matches, meets, athletic events, sports schedules, or "what's happening in athletics" for Peninsula School District. Triggers on requests mentioning PSD athletics, GHHS, PHS, Tides, Seahawks, high school sports schedule, or game schedules.
---

# PSD Athletics Schedule

Retrieve and present athletics schedules for Peninsula School District's two high schools.

| School | Mascot | Abbreviation | Official Site |
|--------|--------|-------------|---------------|
| Gig Harbor High School | Tides | GHHS | tidesathletics.com |
| Peninsula High School | Seahawks | PHS | peninsulaathletics.com |

## Data Source

Official sites (PlayOn/Next.js) are JavaScript-rendered and **unreadable via web search**. Use **MaxPreps** schedule pages instead — they embed JSON-LD structured data in server-rendered HTML.

Data pipeline: ArbiterSports (scheduling) → PlayOn Sites → MaxPreps

Base URLs:
- GHHS: `https://www.maxpreps.com/wa/gig-harbor/gig-harbor-tides/`
- PHS: `https://www.maxpreps.com/wa/gig-harbor/peninsula-seahawks/`

Sport-specific schedule URLs are in `references/sport-urls.md`.

## Workflow

### 1. Parse the Request

Determine from the user's request:

| Parameter | Default | Examples |
|-----------|---------|---------|
| **Date range** | Next 7 days | "today", "this week", "next two weeks", "March schedule" |
| **School filter** | Both | "GHHS only", "Peninsula games", "Tides baseball" |
| **Sport filter** | All in-season | "baseball", "soccer", "track" |

### 2. Determine Active Season

Only fetch sports currently in season. Overlap periods check both seasons.

| Season | Months | Sports |
|--------|--------|--------|
| **Fall** | Sep–Nov | Football, Volleyball, Cross Country, Girls Swimming, Water Polo, Girls Soccer (Fall) |
| **Winter** | Dec–Feb | Basketball, Boys Swimming, Wrestling, Bowling, Flag Football |
| **Spring** | Mar–Jun | Baseball, Softball, Soccer, Tennis, Golf, Track & Field, Lacrosse, Water Polo (Girls), Dance |

If the user asks for a specific sport that's out of season, check it anyway — schedules may be posted early.

### 3. Fetch Schedule Data

Read `references/sport-urls.md` to get the MaxPreps schedule URLs for the active season.

For each relevant sport URL:
1. Use web search to visit the MaxPreps schedule page
2. Extract events within the requested date range
3. For each event, capture: date, time, sport/level, opponent, home/away, link
4. Skip pages that 404 or have no data — move on

**Parsing rules:**
- "vs" prefix = Home game
- "@" prefix = Away game
- Times are Pacific Time
- If cancelled/postponed, note in output

### 4. Present Results

Combine all events into a single markdown table sorted by date/time:

```
| Date | Time | School | Sport | Opponent | Home/Away | Details |
```

**Formatting rules:**
- Group by date with bold date headers
- School column: "GHHS" or "PHS"
- Details column: `[View](maxpreps-url)` link
- Footer: event counts per school + total
- Footer: "Schedule data sourced from MaxPreps. For official schedules: [tidesathletics.com](https://www.tidesathletics.com/schedule?year=2025-2026) | [peninsulaathletics.com](https://www.peninsulaathletics.com/schedule?year=2025-2026)"

If no events found for the date range, state that clearly and link to official sites.
