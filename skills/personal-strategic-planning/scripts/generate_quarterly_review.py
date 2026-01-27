#!/usr/bin/env python3
# /// script
# dependencies = ["python-frontmatter"]
# ///

"""
Generate quarterly review markdown file in Obsidian from check-in JSON data.

Usage:
    uv run scripts/generate_quarterly_review.py '{json_data}' --year 2026 --quarter Q1

Input: JSON with progress data per domain
Output: Markdown file at Personal_Notes/Reviews/Quarterly/{YEAR}-Q{N}-Review.md
"""

import sys
import json
import argparse
from pathlib import Path
from datetime import datetime

# Obsidian vault path
OBSIDIAN_VAULT = Path.home() / "Library/Mobile Documents/iCloud~md~obsidian/Documents/Personal_Notes"
REVIEWS_PATH = OBSIDIAN_VAULT / "Reviews" / "Quarterly"
ANNUAL_REVIEWS_PATH = OBSIDIAN_VAULT / "Reviews" / "Annual"


def get_quarter_dates(year: int, quarter: str) -> tuple:
    """Get start and end dates for a quarter."""
    quarter_dates = {
        "Q1": (f"Jan 1, {year}", f"Mar 31, {year}"),
        "Q2": (f"Apr 1, {year}", f"Jun 30, {year}"),
        "Q3": (f"Jul 1, {year}", f"Sep 30, {year}"),
        "Q4": (f"Oct 1, {year}", f"Dec 31, {year}")
    }
    return quarter_dates.get(quarter, ("", ""))


def get_next_quarter(quarter: str) -> str:
    """Get next quarter identifier."""
    quarters = {"Q1": "Q2", "Q2": "Q3", "Q3": "Q4", "Q4": "Q1"}
    return quarters.get(quarter, "")


def get_previous_quarter(quarter: str) -> str:
    """Get previous quarter identifier."""
    quarters = {"Q1": "Q4", "Q2": "Q1", "Q3": "Q2", "Q4": "Q3"}
    return quarters.get(quarter, "")


def format_goal_progress(goal_data: dict, quarter: str, year: int) -> str:
    """Format a single goal's progress section."""

    goal_name = goal_data.get("name", "Goal")

    section = f"### Priority Goal: {goal_name}\n\n"

    # Progress Status
    status = goal_data.get("status", "unknown")
    status_icons = {
        "on_track": "✅ **On track** - will hit target",
        "at_risk": "⚠️ **At risk** - may miss target without intervention",
        "off_track": "❌ **Off track** - unlikely to hit target"
    }
    section += "**Progress Status:**\n"
    section += f"{status_icons.get(status, '❓ Unknown')}\n\n"

    # Evidence of Progress table
    section += "**Evidence of Progress:**\n\n"
    section += f"| Success Indicator | Target (EOY {year}) | Current State | {quarter} Milestone | Status |\n"
    section += "|-------------------|-------------------|---------------|----------------|--------|\n"

    indicators = goal_data.get("indicators", [])
    for indicator in indicators:
        section += f"| {indicator.get('name', '')} | {indicator.get('target', '')} | {indicator.get('current', '')} | {indicator.get('milestone', '')} | {indicator.get('milestone_status', '')} |\n"
    section += "\n"

    # What Happened This Quarter
    section += "**What Happened This Quarter:**\n\n"
    section += f"{goal_data.get('what_happened', 'N/A')}\n\n"

    # What's Working Well
    section += "**What's Working Well:**\n\n"
    working_well = goal_data.get("working_well", [])
    for item in working_well:
        section += f"- **{item.get('factor', '')}:** {item.get('why', '')}\n"
    section += "\n"

    # What's Stalled
    section += "**What's Stalled:**\n\n"
    stalled = goal_data.get("stalled", [])
    for item in stalled:
        section += f"- **{item.get('blocker', '')}:** {item.get('root_cause', '')}\n"
    section += "\n"

    # Do Success Indicators Still Make Sense?
    section += "**Do Success Indicators Still Make Sense?**\n\n"
    section += f"- {goal_data.get('indicators_valid', 'Yes')}: {goal_data.get('indicators_rationale', '')}\n"
    adjustments = goal_data.get("indicator_adjustments", "")
    if adjustments:
        section += f"- Adjustments: {adjustments}\n"
    section += "\n"

    # Changes for Next Quarter
    section += f"**Changes for {get_next_quarter(quarter)}:**\n\n"

    section += "**Actions to Add:**\n"
    actions_to_add = goal_data.get("actions_to_add", [])
    for action in actions_to_add:
        section += f"- {action.get('action', '')}: {action.get('owner_timeline', '')}\n"
    section += "\n"

    section += "**Actions to Drop/Defer:**\n"
    actions_to_drop = goal_data.get("actions_to_drop", [])
    for action in actions_to_drop:
        section += f"- {action.get('action', '')}: {action.get('reason', '')}\n"
    section += "\n"

    section += "**Resources/Support Needed:**\n"
    resources = goal_data.get("resources_needed", [])
    for resource in resources:
        section += f"- {resource}\n"
    section += "\n"

    section += "**Trade-offs with Other Domains:**\n"
    section += f"- {goal_data.get('tradeoffs', 'None identified')}\n\n"

    section += "---\n\n"

    return section


def generate_quarterly_review(data: dict, year: int, quarter: str) -> str:
    """Generate complete quarterly review markdown from check-in data."""

    date = datetime.now().strftime("%Y-%m-%d")
    start_date, end_date = get_quarter_dates(year, quarter)
    next_quarter = get_next_quarter(quarter)
    prev_quarter = get_previous_quarter(quarter)

    # Determine next quarter date based on quarter
    next_quarter_dates = {
        "Q1": "Jun 30",
        "Q2": "Sep 30",
        "Q3": "Dec 31",
        "Q4": "Mar 31"
    }
    next_quarter_date = f"{next_quarter_dates.get(quarter, '')} {year if quarter != 'Q4' else year + 1}"

    # Build domains reviewed list
    domains_reviewed = [domain.get("name", "") for domain in data.get("domains", [])]
    domains_str = ", ".join(domains_reviewed)

    # Start with frontmatter
    content = f"""---
created: {date}
year: {year}
quarter: {quarter}
domains_reviewed: [{domains_str}]
status: Draft
annual_review: [[{year}-Annual-Review]]
previous_quarter: [[{year}-{prev_quarter}-Review]]
next_quarter: [[{year if quarter != 'Q4' else year + 1}-{next_quarter}-Review]]
---

# {year} {quarter} Review

> **Quick Check-In:** 15-20 min progress assessment and course correction

**Review Period:** {start_date} to {end_date}
**Linked to:** [[{year}-Annual-Review|{year} Annual Strategic Review]]

---

## Summary

**Overall Portfolio Health:** {data.get('summary', {}).get('portfolio_health', 'N/A')}

**Key Wins This Quarter:**
"""

    # Key Wins
    wins = data.get("summary", {}).get("wins", [])
    for win in wins:
        content += f"- {win}\n"
    content += "\n"

    # Key Challenges
    content += "**Key Challenges This Quarter:**\n"
    challenges = data.get("summary", {}).get("challenges", [])
    for challenge in challenges:
        content += f"- {challenge}\n"
    content += "\n"

    # Major Adjustments
    content += "**Major Adjustments Needed:**\n"
    adjustments = data.get("summary", {}).get("adjustments", [])
    for adjustment in adjustments:
        content += f"- {adjustment}\n"
    content += "\n---\n\n"

    # Domain sections
    domains = data.get("domains", [])
    for domain in domains:
        domain_name = domain.get("name", "Unknown Domain")
        content += f"## Domain: {domain_name}\n\n"

        goals = domain.get("goals", [])
        for goal in goals:
            content += format_goal_progress(goal, quarter, year)

    # Cross-Domain Portfolio Health
    content += "## Cross-Domain Portfolio Health\n\n"
    content += "### Energy Distribution This Quarter\n\n"
    content += "| Domain | Energy Invested | Results Achieved | ROI Assessment |\n"
    content += "|--------|----------------|------------------|----------------|\n"

    portfolio = data.get("portfolio", {})
    energy_dist = portfolio.get("energy_distribution", [])
    for domain_energy in energy_dist:
        content += f"| {domain_energy.get('domain', '')} | {domain_energy.get('energy', '')} | {domain_energy.get('results', '')} | {domain_energy.get('roi', '')} |\n"
    content += "\n"

    content += f"**Over-Committed Anywhere?**\n\n{portfolio.get('overcommitted', 'No')}\n\n"
    content += f"**Under-Invested Anywhere?**\n\n{portfolio.get('underinvested', 'No')}\n\n"
    content += "---\n\n"

    # Mid-Course Corrections
    content += "### Mid-Course Corrections\n\n"
    content += "**Strategic Adjustments:**\n\n"

    corrections = portfolio.get("corrections", [])
    for i, correction in enumerate(corrections, 1):
        content += f"{i}. **{correction.get('title', 'Adjustment')}**\n"
        content += f"   - Reason: {correction.get('reason', '')}\n"
        content += f"   - Impact: {correction.get('impact', '')}\n"
        content += f"   - Timeline: {correction.get('timeline', '')}\n\n"

    content += "**Alignment Check:**\n\n"
    alignment = portfolio.get("alignment", {})
    content += f"- Goals still aligned with annual vision? {alignment.get('vision_aligned', 'Yes')}\n"
    content += f"- Type 3 stress check: {alignment.get('type3_stress', 'No stress observed')}\n"
    content += f"- PAUSE triggered? {alignment.get('pause_triggered', 'No')}\n\n"
    content += "---\n\n"

    # Lessons Learned
    content += f"### Lessons Learned ({quarter})\n\n"
    lessons = data.get("lessons", {})
    content += "**What I'd Repeat:**\n\n"
    content += f"- {lessons.get('repeat', 'N/A')}\n\n"
    content += "**What I'd Change:**\n\n"
    content += f"- {lessons.get('change', 'N/A')}\n\n"
    content += f"**Insight for Next Quarter:**\n\n{lessons.get('insight', 'N/A')}\n\n"
    content += "---\n\n"

    # Next Steps
    content += "## Next Steps\n\n"
    content += "### Immediate Actions (Next 2 Weeks)\n\n"

    next_steps = data.get("next_steps", {})
    immediate = next_steps.get("immediate", [])
    for action in immediate:
        content += f"- [ ] {action}\n"
    content += "\n"

    content += "### Update Annual Review\n\n"
    content += f"- [ ] Update quarterly_reviews frontmatter in [[{year}-Annual-Review]]\n"
    content += f"- [ ] Link this {quarter} review to annual document\n\n"

    content += "### Update OmniFocus\n\n"
    content += "- [ ] Adjust milestones for goals with changed timelines\n"
    content += "- [ ] Add new actions identified in this review\n"
    content += "- [ ] Mark completed milestones as done\n\n"

    content += f"### Prepare for {next_quarter}\n\n"
    content += "**Focus Areas:**\n"
    focus_areas = next_steps.get("focus_areas", [])
    for area in focus_areas:
        content += f"- {area}\n"
    content += "\n"

    content += f"**Key Milestones (End of {next_quarter}):**\n"
    milestones = next_steps.get("milestones", [])
    for milestone in milestones:
        content += f"- {milestone}\n"
    content += "\n"

    content += f"**Quarterly Review Date:**\n- {next_quarter_date}\n\n"
    content += "---\n\n"

    # Quick Stats
    stats = data.get("stats", {})
    content += "## Quick Stats\n\n"
    content += f"**Goals Reviewed:** {stats.get('total', 0)}\n"
    content += f"**On Track:** {stats.get('on_track', 0)} ({stats.get('on_track_pct', '0%')})\n"
    content += f"**At Risk:** {stats.get('at_risk', 0)} ({stats.get('at_risk_pct', '0%')})\n"
    content += f"**Off Track:** {stats.get('off_track', 0)} ({stats.get('off_track_pct', '0%')})\n\n"
    content += f"**Adjustments Made:** {stats.get('adjustments', 0)}\n"
    content += f"**New Actions Added:** {stats.get('actions_added', 0)}\n"
    content += f"**Actions Dropped:** {stats.get('actions_dropped', 0)}\n\n"
    content += "---\n\n"

    content += f"*Generated by Geoffrey Strategic Planning Manager v1.0.0*\n"
    content += f"*Review completed: {date}*\n"
    content += f"*Next review: {next_quarter_date}*\n"

    return content


def update_annual_review_frontmatter(year: int, quarter: str, quarterly_filename: str) -> bool:
    """Update the annual review frontmatter to link quarterly review."""

    annual_file = ANNUAL_REVIEWS_PATH / f"{year}-Annual-Review.md"

    if not annual_file.exists():
        return False

    try:
        content = annual_file.read_text()

        # Simple frontmatter update - replace null with link
        quarter_map = {"Q1": 0, "Q2": 1, "Q3": 2, "Q4": 3}
        quarter_index = quarter_map.get(quarter, 0)

        # This is a simple string replacement approach
        # Could use python-frontmatter for more robust parsing
        quarter_key = f"  - {quarter}: null"
        quarter_value = f"  - {quarter}: [[{quarterly_filename}]]"

        updated_content = content.replace(quarter_key, quarter_value)
        annual_file.write_text(updated_content)

        return True
    except Exception:
        return False


def main():
    parser = argparse.ArgumentParser(description="Generate quarterly review markdown file")
    parser.add_argument("json_data", help="JSON data from check-in interview")
    parser.add_argument("--year", type=int, required=True, help="Year for review (e.g., 2026)")
    parser.add_argument("--quarter", required=True, choices=["Q1", "Q2", "Q3", "Q4"], help="Quarter (Q1, Q2, Q3, Q4)")

    args = parser.parse_args()

    # Parse JSON input
    try:
        data = json.loads(args.json_data)
    except json.JSONDecodeError as e:
        print(json.dumps({"success": False, "error": f"Invalid JSON: {e}"}))
        sys.exit(1)

    # Generate markdown content
    content = generate_quarterly_review(data, args.year, args.quarter)

    # Ensure directory exists
    REVIEWS_PATH.mkdir(parents=True, exist_ok=True)

    # Write file
    filename = f"{args.year}-{args.quarter}-Review.md"
    filepath = REVIEWS_PATH / filename

    try:
        filepath.write_text(content)

        # Try to update annual review frontmatter
        annual_updated = update_annual_review_frontmatter(args.year, args.quarter, filename)

        result = {
            "success": True,
            "file_path": str(filepath),
            "filename": filename,
            "year": args.year,
            "quarter": args.quarter,
            "domains_count": len(data.get("domains", [])),
            "annual_review_updated": annual_updated,
            "message": f"Quarterly review generated successfully at {filepath}"
        }
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Failed to write file: {e}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
