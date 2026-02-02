# Stage 1: Engage & Assess
## Facilitator Guide

---

## Overview

**Key Question:** Where are we now?

**Purpose:** Gather comprehensive data about the current state of the district, engage stakeholders across the community, and synthesize findings into a prioritized environmental analysis.

**Duration:** 2-6 weeks for data collection; 2-3 hours for SWOT workshop

**AI Role:** Data analysis, synthesis, draft preparation
**Human Role:** Data collection, stakeholder engagement, validation, prioritization

---

## Part A: Discovery & Data Collection

### Data Inventory Checklist

Before starting, identify what data is already available:

- [ ] Existing strategic plan documents
- [ ] Recent survey data (climate, satisfaction, etc.)
- [ ] Board meeting minutes (last 12 months)
- [ ] Budget documents
- [ ] Enrollment/demographic data
- [ ] Assessment results
- [ ] Staff turnover data
- [ ] Community feedback compilations
- [ ] Previous planning documents
- [ ] Accreditation reports

### Stakeholder Engagement Methods

| Stakeholder Group | Target # | Method | Lead | Status |
|-------------------|----------|--------|------|--------|
| Students (HS) | 50-100 | Survey + Focus Group | | |
| Students (MS) | 50-100 | Survey + Focus Group | | |
| Parents/Families | 200+ | Survey | | |
| Teachers | All | Survey + Focus Group | | |
| Classified Staff | All | Survey + Focus Group | | |
| Administrators | All | Survey + Interviews | | |
| Community Members | 50+ | Survey + Town Hall | | |
| Board Members | All | Interviews | | |

### Survey Design Guidelines

**Core Question Categories:**

1. **Satisfaction/Climate** — Overall satisfaction, school climate, communication effectiveness
2. **Strengths & Successes** — "What does our district do well?" / "What should we keep doing?"
3. **Areas for Improvement** — "What concerns you?" / "What should we do differently?"
4. **Future Vision** — "In 3 years, what do you hope our district looks like?"
5. **Priorities** — Ranking of priority areas, resource allocation preferences

**Tips:**
- Keep surveys under 15 minutes
- Mix quantitative (ratings) with qualitative (open-ended)
- Offer multiple languages if needed
- Provide online and paper options
- Allow anonymous responses
- Include demographic questions for cross-group analysis

### Focus Group Protocol (90 minutes)

| Time | Activity | Purpose |
|------|----------|---------|
| 0:00-0:10 | Welcome & Ground Rules | Set context |
| 0:10-0:30 | Warm-Up: Successes | Build positive energy |
| 0:30-0:60 | Core Discussion | Gather insights |
| 0:60-0:80 | Future Vision | Forward thinking |
| 0:80-0:90 | Closing & Next Steps | Thank participants |

**Ground Rules:**
1. All perspectives are valued
2. Speak from your own experience
3. Respect confidentiality
4. One person speaks at a time
5. It's okay to disagree respectfully
6. No "right" answers—we want honest input

**Facilitator Prompts:**

*Opening:*
"Thank you for being here. Your voice matters in shaping our district's future. We're gathering insights from across our community to inform strategic planning."

*Successes:*
"Let's start with what's working. Think about the past year—what has gone well in our district? What are you proud of?"
*Follow-up:* "What made that successful? Why did that work?"

*Concerns:*
"Now let's talk about challenges. What concerns you about our district? What's not working as well as it could?"
*Follow-up:* "What impact does that have? Who is affected?"

*Vision:*
"Imagine it's three years from now. What would you love to see in our district? What would be different?"
*Follow-up:* "What would that look like for students? For families? For staff?"

*Priority:*
"If you could change ONE thing about our district, what would it be? Why?"

**Recording Tips:**
- Designate a note-taker (not the facilitator)
- Capture key quotes verbatim when possible
- Note speaker type (parent, teacher, etc.) not names
- Record themes as they emerge
- Ask permission before audio recording

### Interview Protocol (Board/Administrators, 45-60 minutes)

**Opening (5 min):**
"Thank you for your time. I'm gathering input for our strategic planning process. Your leadership perspective is essential. This conversation is confidential—I'll share themes, not attributions."

**Questions:**
1. "What are the district's greatest strengths right now?"
2. "What keeps you up at night about our district?"
3. "Where do you see the biggest opportunities for improvement?"
4. "What should we absolutely protect or continue?"
5. "If we're wildly successful in 3 years, what will be different?"
6. "What barriers or challenges will we need to overcome?"
7. "Is there anything else you want me to know as we plan?"

### Data Analysis Process

1. **Data Cleaning:** Remove incomplete responses, check for duplicates, standardize formats
2. **Quantitative Analysis:** Response rates, means/distributions, cross-group comparisons
3. **Qualitative Analysis:** Theme coding, frequency counts, representative quotes, sentiment
4. **Synthesis:** Cross-reference findings across sources, identify patterns, flag gaps

**Available Scripts:**
```bash
# Analyze survey data
uv run skills/strategic-planning-manager/scripts/analyze_surveys.py \
  --input survey_results.csv \
  --output-dir ./discovery

# Process focus group transcripts
uv run skills/strategic-planning-manager/scripts/process_transcripts.py \
  --input-dir ./transcripts \
  --output ./discovery/transcript-themes.json
```

---

## Part B: Environmental Analysis (SWOT Workshop)

### Pre-Session Preparation

**Materials Needed:**
- [ ] Discovery Report summary (copies for all)
- [ ] Draft SWOT from AI analysis
- [ ] Large post-its or chart paper
- [ ] Markers
- [ ] Dot stickers for voting
- [ ] SWOT template handouts
- [ ] Laptop/projector for display

**Room Setup:**
- Tables arranged for small groups (4-6 per table)
- Wall space for posting charts
- Visible timer
- Flip chart at front

**Pre-Work for Participants (send 2-3 days before):**
- Discovery Report summary
- Draft SWOT for review
- Request: "Come prepared with additions/edits"

### Session Agenda (2.5 hours)

| Time | Activity | Duration | Notes |
|------|----------|----------|-------|
| 0:00 | Welcome & Context | 10 min | |
| 0:10 | Review Discovery Findings | 15 min | |
| 0:25 | SWOT Validation - Small Groups | 40 min | |
| 1:05 | Break | 10 min | |
| 1:15 | SWOT Synthesis - Large Group | 30 min | |
| 1:45 | Investment & Barriers Analysis | 30 min | |
| 2:15 | Next Steps & Close | 15 min | |
| 2:30 | End | | |

### Facilitation Script

**Welcome & Context (10 min):**

"Welcome to our environmental analysis session. Today we're taking everything we learned during discovery and organizing it into a strategic framework.

SWOT stands for Strengths, Weaknesses, Opportunities, and Threats:
- **Strengths** are internal, positive—what we do well
- **Weaknesses** are internal, negative—where we're limited
- **Opportunities** are external, positive—factors we can leverage
- **Threats** are external, negative—risks we need to navigate

Our goal today is to validate the draft SWOT, add your expertise, prioritize, and identify where we'll invest our energy."

**Review Discovery Findings (15 min):**

Walk through:
- Participation summary (who we heard from)
- Top 3-5 themes that emerged
- Areas of strong agreement
- Areas of divergence

Ask: "Any surprises? Anything missing from what you've heard in our community?"

**SWOT Validation - Small Groups (40 min):**

"At your tables, you have the draft SWOT. Your job is to:
1. Review each quadrant (10 min each)
2. Add anything missing from your knowledge
3. Flag anything that doesn't belong
4. Star the 3 most important items in each quadrant

Work through all four quadrants. I'll keep time."

Circulate and prompt:
- "What about [specific area]?"
- "Is there evidence for that?"
- "How significant is this?"

**SWOT Synthesis - Large Group (30 min):**

1. Each table reports top 3 per quadrant (5 min each)
2. Facilitator captures on chart paper
3. Look for patterns across tables
4. Discuss contested items
5. Dot voting on priorities (3 dots per person per quadrant)

**"Where Will We Invest?" (15 min):**

"Let's look at strategic opportunities. What strengths can we leverage to capture opportunities?

Example: If our strength is 'Strong teacher professional learning culture' and our opportunity is 'Growing interest in personalized learning'—we might invest in 'Teacher-led innovation in personalization.'"

Small group activity: "Identify 2-3 investment opportunities by pairing S+O."

**"What's Holding Us Back?" (15 min):**

"Now let's identify our biggest barriers—the weaknesses that most limit our ability to achieve our vision. Which 3-5 are most critical to address?"

Dot vote or discuss to prioritize.

**Next Steps & Close (15 min):**

"Here's what happens next:
1. I'll compile our SWOT into a clean document
2. You'll receive it for final review
3. At our next session, we'll set our strategic direction
4. Today's investment priorities and barriers will inform that work"

### SWOT Facilitation Tips

| Quadrant | Push For | Common Pitfall |
|----------|----------|----------------|
| Strengths | Specificity ("98% of teachers in PLCs" not "great teachers") | Vague, generic claims |
| Weaknesses | Systemic focus (not individuals), psychological safety | Blame, defensiveness |
| Opportunities | External focus (trends, funding, policy, demographics) | Listing internal wishes |
| Threats | Realistic assessment with timelines | Alarmism or denial |

---

## Outputs

By end of Stage 1:
- [ ] Discovery Report completed
- [ ] Stakeholder input summary with representative quotes
- [ ] Validated SWOT matrix with prioritized items
- [ ] 3-5 investment opportunities identified (S×O)
- [ ] 3-5 critical barriers identified
- [ ] Key findings validated with leadership
- [ ] Planning team briefed on findings

---

## Common Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| Low survey response | Multiple reminders, incentives, shorter survey |
| Dominant voices in focus groups | Round-robin, small groups first, written before verbal |
| Contradictory data | Note both perspectives, explore further in Stage 2 |
| Missing stakeholder groups | Targeted outreach, alternative methods |
| S/W vs O/T confusion | "Is this about us (internal) or our environment (external)?" |
| Everything seems like a weakness | "Pause—what ARE we doing well? What would we protect?" |

---

## Handoff to Stage 2

Before moving to Set Direction:
- [ ] Discovery Report completed and validated
- [ ] SWOT analysis finalized with priorities
- [ ] Key findings shared with planning team
- [ ] Data organized for reference in direction-setting

---

*Stage 1 Guide - Strategic Planning Manager v2.0.0*
