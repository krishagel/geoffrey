#!/usr/bin/env python3
# /// script
# dependencies = ["python-frontmatter"]
# ///

"""
Generate annual review markdown file in Obsidian from interview JSON data.

Usage:
    uv run scripts/generate_annual_review.py '{json_data}' --year 2026

Input: JSON with interview responses (all domains, goals, indicators)
Output: Markdown file at Personal_Notes/Reviews/Annual/{YEAR}-Annual-Review.md
"""

import sys
import json
import argparse
from pathlib import Path
from datetime import datetime
import re

# Obsidian vault path
OBSIDIAN_VAULT = Path.home() / "Library/Mobile Documents/iCloud~md~obsidian/Documents/Personal_Notes"
REVIEWS_PATH = OBSIDIAN_VAULT / "Reviews" / "Annual"


def sanitize_filename(name: str) -> str:
    """Sanitize filename by removing special characters."""
    return re.sub(r'[^\w\s-]', '', name).strip().replace(' ', '-')


def format_domain_review(domain_data: dict, year: int) -> str:
    """Format a single domain's review section."""

    domain_name = domain_data.get("name", "Unknown Domain")
    prev_year = year - 1

    # Year-in-Review section
    review_section = f"## Domain: {domain_name}\n\n"
    review_section += f"### {prev_year} Review\n\n"

    # Top 3 Priorities
    review_section += "**Top 3 Priorities:**\n"
    priorities = domain_data.get("review", {}).get("priorities", [])
    for i, priority in enumerate(priorities[:3], 1):
        review_section += f'{i}. **{priority.get("name", "Priority")}** - *Outcome:* {priority.get("outcome", "N/A")}\n'
    review_section += "\n"

    # What Worked Well
    review_section += "**What Worked Exceptionally Well:**\n"
    successes = domain_data.get("review", {}).get("successes", [])
    for success in successes:
        review_section += f'- **{success.get("title", "")}:** {success.get("evidence", "")}\n'
    review_section += f'- **Root Causes:** {domain_data.get("review", {}).get("success_causes", "N/A")}\n\n'

    # What Underperformed
    review_section += "**What Underperformed:**\n"
    gaps = domain_data.get("review", {}).get("gaps", [])
    for gap in gaps:
        review_section += f'- **{gap.get("title", "")}:** {gap.get("description", "")}\n'
    review_section += f'- **Root Causes:** {domain_data.get("review", {}).get("gap_causes", "N/A")}\n\n'

    # Surprises
    review_section += "**Surprises (Positive & Negative):**\n"
    surprises = domain_data.get("review", {}).get("surprises", [])
    for surprise in surprises:
        emoji = "➕" if surprise.get("type") == "positive" else "➖"
        review_section += f'- {emoji} {surprise.get("description", "")}\n'
    review_section += "\n---\n\n"

    # Strategic Direction section
    review_section += f"### {year} Strategic Direction\n\n"

    strategy = domain_data.get("strategy", {})

    review_section += "**Vision of Success:**\n\n"
    review_section += f'{strategy.get("vision", "N/A")}\n\n'

    # Stakeholders table
    review_section += "**Primary Stakeholders & Impact:**\n\n"
    review_section += "| Stakeholder Group | What Changes for Them if We Succeed |\n"
    review_section += "|-------------------|-------------------------------------|\n"
    stakeholders = strategy.get("stakeholders", [])
    for stakeholder in stakeholders:
        review_section += f'| {stakeholder.get("group", "")} | {stakeholder.get("change", "")} |\n'
    review_section += "\n"

    review_section += "**Alignment with Core Mission:**\n\n"
    review_section += f'{strategy.get("alignment", "N/A")}\n\n'

    review_section += "**Major Initiatives (2-3):**\n\n"
    initiatives = strategy.get("initiatives", [])
    for i, initiative in enumerate(initiatives[:3], 1):
        review_section += f'{i}. **{initiative.get("title", "")}:** {initiative.get("description", "")}\n'
    review_section += "\n"

    review_section += "**What We Will NOT Do:**\n\n"
    exclusions = strategy.get("exclusions", [])
    for exclusion in exclusions:
        review_section += f'- ❌ {exclusion.get("item", "")} - *Reason:* {exclusion.get("reason", "")}\n'
    review_section += "\n"

    review_section += f'**Biggest Barrier to Success:**\n\n{strategy.get("barrier", "N/A")}\n\n'
    review_section += f'**What Needs to Be True:** {strategy.get("conditions", "N/A")}\n\n'

    review_section += "**Resources/Support Needed:**\n\n"
    resources = strategy.get("resources", [])
    for resource in resources:
        review_section += f'- {resource.get("item", "")}: {resource.get("reason", "")}\n'
    review_section += "\n---\n\n"

    # Priority Goals section
    review_section += f"### {year} Priority Goals\n\n"

    goals = domain_data.get("goals", [])
    for goal_num, goal in enumerate(goals[:3], 1):
        review_section += f'#### Goal {goal_num}: {goal.get("statement", "Goal")}\n\n'

        # Success Indicators table
        review_section += "**Success Indicators:**\n\n"
        review_section += "| Indicator | Current (Baseline) | Target (EOY {}) | Measurement Method |\n".format(year)
        review_section += "|-----------|-------------------|---------------------|-------------------|\n"
        indicators = goal.get("indicators", [])
        for indicator in indicators[:3]:
            review_section += f'| {indicator.get("name", "")} | {indicator.get("current", "")} | {indicator.get("target", "")} | {indicator.get("measurement", "")} |\n'
        review_section += "\n"

        # Key Actions table
        review_section += "**Key Actions:**\n\n"
        review_section += "| Action/Project | Owner | Dependencies | Timeline |\n"
        review_section += "|----------------|-------|--------------|----------|\n"
        actions = goal.get("actions", [])
        for action in actions:
            review_section += f'| {action.get("action", "")} | {action.get("owner", "")} | {action.get("dependencies", "")} | {action.get("timeline", "")} |\n'
        review_section += "\n"

        # Quarterly Milestones
        review_section += "**Quarterly Milestones:**\n\n"
        milestones = goal.get("milestones", {})
        review_section += f'- **Q1 (Mar 31):** {milestones.get("Q1", "TBD")}\n'
        review_section += f'- **Q2 (Jun 30):** {milestones.get("Q2", "TBD")}\n'
        review_section += f'- **Q3 (Sep 30):** {milestones.get("Q3", "TBD")}\n'
        review_section += f'- **Q4 (Dec 31):** {milestones.get("Q4", "TBD")}\n\n'

        # System/Habit Support
        review_section += "**System/Habit Support (James Clear):**\n\n"
        review_section += f'{goal.get("system", "N/A")}\n\n'

        review_section += "---\n\n"

    return review_section


def generate_annual_review(data: dict, year: int) -> str:
    """Generate complete annual review markdown from interview data."""

    date = datetime.now().strftime("%Y-%m-%d")
    next_year = year + 1

    # Start with frontmatter
    content = f"""---
created: {date}
year: {year}
domains: [CIO, Consulting, Product, RealEstate, Financial]
status: Draft
quarterly_reviews:
  - Q1: null
  - Q2: null
  - Q3: null
  - Q4: null
---

# {year} Annual Strategic Review

> **Mission Integration:** This review aligns with TELOS definition and Personal Constitution principles: advancing equity through innovation, achieving mastery + legacy + freedom.

## Year-in-Review Summary

### Cross-Domain Patterns

**Recurring Themes Across Domains:**
"""

    # Cross-domain patterns
    patterns = data.get("cross_domain", {}).get("patterns", [])
    for pattern in patterns:
        content += f"- {pattern}\n"
    content += "\n"

    # Strengths leveraged
    content += "**Strengths Consistently Leveraged:**\n"
    strengths = data.get("cross_domain", {}).get("strengths_leveraged", {})
    content += f'- Input: {strengths.get("input", "N/A")}\n'
    content += f'- Analytical: {strengths.get("analytical", "N/A")}\n'
    content += f'- Learner: {strengths.get("learner", "N/A")}\n\n'

    # Blind spots
    content += "**Blind Spots Identified:**\n"
    blind_spots = data.get("cross_domain", {}).get("blind_spots", [])
    for blind_spot in blind_spots:
        content += f"- {blind_spot}\n"
    content += "\n"

    # Key Lessons
    content += f"### Key Lessons for {next_year}\n\n"
    lessons = data.get("cross_domain", {}).get("lessons", [])
    for i, lesson in enumerate(lessons, 1):
        content += f'{i}. **{lesson.get("title", "")}:** {lesson.get("description", "")}\n'
    content += "\n---\n\n"

    # Domain-specific sections
    domains = data.get("domains", [])
    for domain in domains:
        content += format_domain_review(domain, year)

    # Cross-Domain Integration section
    content += "## Cross-Domain Integration\n\n"

    integration = data.get("integration", {})

    content += "### Portfolio Story for {}\n\n".format(year)
    content += "**The Narrative:**\n\n"
    content += f'{integration.get("narrative", "N/A")}\n\n'
    content += "**Connection to 6-Year Vision:**\n\n"
    content += f'{integration.get("vision_connection", "N/A")}\n\n'
    content += "---\n\n"

    # Trade-offs table
    content += "### Trade-Offs & Prioritization\n\n"
    content += "| Domain | Priority Level | Energy Allocation | Rationale |\n"
    content += "|--------|----------------|-------------------|-----------|\ n"
    tradeoffs = integration.get("tradeoffs", [])
    for tradeoff in tradeoffs:
        content += f'| {tradeoff.get("domain", "")} | {tradeoff.get("priority", "")} | {tradeoff.get("energy", "")} | {tradeoff.get("rationale", "")} |\n'
    content += "\n"

    content += f'**Over-Commitment Risk:**\n\n{integration.get("overcommitment", "N/A")}\n\n'
    content += f'**Maintenance Mode Domain:**\n\n{integration.get("maintenance_mode", "N/A")}\n\n'
    content += "---\n\n"

    # Personal Board of Directors
    content += "### Personal Board of Directors\n\n"
    content += "| Name | Domain Expertise | What They Help With | Last Consulted | Next Consultation |\n"
    content += "|------|-----------------|---------------------|----------------|-------------------|\n"
    advisors = integration.get("advisors", [])
    for advisor in advisors:
        content += f'| {advisor.get("name", "")} | {advisor.get("domain", "")} | {advisor.get("helps_with", "")} | {advisor.get("last_consulted", "")} | {advisor.get("next", "")} |\n'
    content += "\n"

    gaps = integration.get("advisor_gaps", [])
    if gaps:
        content += "**Gaps in Advisory Board:**\n\n"
        for gap in gaps:
            content += f'- Missing: {gap.get("role", "")}\n'
            content += f'- Potential advisor: {gap.get("candidate", "")}\n'
        content += "\n"
    content += "---\n\n"

    # Alignment Assessment
    content += "### Alignment Assessment\n\n"
    content += "#### Strengths Leverage Analysis\n\n"

    alignment = integration.get("alignment", {})

    for strength in ["Input", "Significance", "Analytical", "Achiever", "Learner"]:
        key = strength.lower()
        strength_data = alignment.get(key, {})
        content += f"**{strength}:**\n"
        content += f'- Goals that leverage: {strength_data.get("goals", "N/A")}\n'
        content += f'- Application: {strength_data.get("application", "N/A")}\n\n'

    content += "#### Growth Edges & Risks\n\n"

    growth = alignment.get("growth_edges", {})

    content += "**Relationship Building (0% Blue - Blind Spot):**\n"
    content += f'- Goals requiring relationship focus: {growth.get("relationship_goals", "N/A")}\n'
    content += f'- Mitigation strategy: {growth.get("relationship_mitigation", "N/A")}\n\n'

    content += "**Type 3 Stress Pattern (Push Harder):**\n"
    content += f'- High-risk scenarios: {growth.get("stress_scenarios", "N/A")}\n'
    content += "- PAUSE triggers:\n"
    triggers = growth.get("pause_triggers", [])
    for trigger in triggers:
        content += f'  - Trigger: {trigger.get("signal", "")}\n'
    content += f'  - Response: {growth.get("pause_response", "N/A")}\n\n'

    content += "**Green-Orange Directness:**\n"
    content += f'- Potential friction points: {growth.get("directness_friction", "N/A")}\n'
    content += f'- Sensitivity checkpoint: {growth.get("directness_checkpoint", "N/A")}\n\n'

    content += "---\n\n"

    # Overall Success Definition
    content += "### Overall Success Definition\n\n"
    success_def = integration.get("success_definition", {})
    content += f'**Mastery (Competence & Excellence):**\n\n{success_def.get("mastery", "N/A")}\n\n'
    content += f'**Legacy (Lasting Contribution):**\n\n{success_def.get("legacy", "N/A")}\n\n'
    content += f'**Freedom (Financial Independence):**\n\n{success_def.get("freedom", "N/A")}\n\n'
    content += f'**Integration Check:**\n\n{success_def.get("integration_check", "N/A")}\n\n'
    content += "---\n\n"

    # Potential Misalignments
    misalignments = integration.get("misalignments", [])
    if misalignments:
        content += "## Potential Misalignments (If Any)\n\n"
        content += "⚠️ **Flagged Concerns:**\n\n"
        for misalignment in misalignments:
            content += f'- {misalignment.get("concern", "")}\n'
            content += f'- *Discussion needed:* {misalignment.get("action", "")}\n\n'
        content += "---\n\n"

    # Next Steps
    content += f"""## Next Steps

### Immediate Actions

- [ ] Review this document and finalize status (change to "Final" when approved)
- [ ] Share relevant sections with Personal Board of Directors advisors
- [ ] Schedule quarterly reviews in calendar:
  - Q1: March 31, {year}
  - Q2: June 30, {year}
  - Q3: September 30, {year}
  - Q4: December 31, {year}
- [ ] Create OmniFocus projects for all Priority Goals
- [ ] Schedule mid-year strategic adjustment session (July {year})

### Quarterly Review Reminders

**Purpose:** Track progress, make adjustments, maintain alignment

**Format:** 15-20 min check-in per domain
- Progress status (on track / at risk / off track)
- Evidence vs. milestones
- What's working / what's stalled
- Adjustments for next quarter

**Links to Quarterly Reviews:**
- [[{year}-Q1-Review|Q1 Review (Mar 31)]]
- [[{year}-Q2-Review|Q2 Review (Jun 30)]]
- [[{year}-Q3-Review|Q3 Review (Sep 30)]]
- [[{year}-Q4-Review|Q4 Review (Dec 31)]]

---

## Appendix: Framework References

**James Clear (Systems > Goals):**
"You don't rise to the level of your goals, you fall to the level of your systems."

**Personal Board of Directors Roles:**
- **Connector:** Network access, introductions, reputation building
- **Accountability Partner:** Keeps commitments, challenges excuses
- **Futurist:** Trends, emerging opportunities, strategic foresight
- **Subject Matter Expert:** Deep domain expertise, technical guidance

**Life Map Domains (Alex Lieberman):**
- Career, Relationships, Health, Meaning, Finances, Fun

**Enneagram Type 3w4 (The Professional):**
- Core desire: Meaningful achievement through competence
- Growth: Integration to Type 6 (analytical, prepared)
- Stress: Type 3 → Type 9 (push harder, work more)

---

*Generated by Geoffrey Strategic Planning Manager v1.0.0*
*Last updated: {date}*
"""

    return content


def main():
    parser = argparse.ArgumentParser(description="Generate annual review markdown file")
    parser.add_argument("json_data", help="JSON data from interview")
    parser.add_argument("--year", type=int, required=True, help="Year for review (e.g., 2026)")

    args = parser.parse_args()

    # Parse JSON input
    try:
        data = json.loads(args.json_data)
    except json.JSONDecodeError as e:
        print(json.dumps({"success": False, "error": f"Invalid JSON: {e}"}))
        sys.exit(1)

    # Generate markdown content
    content = generate_annual_review(data, args.year)

    # Ensure directory exists
    REVIEWS_PATH.mkdir(parents=True, exist_ok=True)

    # Write file
    filename = f"{args.year}-Annual-Review.md"
    filepath = REVIEWS_PATH / filename

    try:
        filepath.write_text(content)
        result = {
            "success": True,
            "file_path": str(filepath),
            "filename": filename,
            "year": args.year,
            "domains_count": len(data.get("domains", [])),
            "message": f"Annual review generated successfully at {filepath}"
        }
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Failed to write file: {e}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
