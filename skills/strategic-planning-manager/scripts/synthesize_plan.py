#!/usr/bin/env python3
# /// script
# dependencies = ["pyyaml"]
# ///

"""
Synthesize strategic plan document from all planning stages.

Compiles outputs from all 4 stages into cohesive plan documents:
- Full strategic plan (comprehensive)
- Executive summary (board-ready)
- Staff communication version
- Community-facing summary

Usage:
    uv run scripts/synthesize_plan.py --work-dir ./planning --output ./outputs/strategic-plan.md
    uv run scripts/synthesize_plan.py --work-dir ./planning --output ./plan.md --format executive
    uv run scripts/synthesize_plan.py --work-dir ./planning --output ./plan.md --format all

Output: Markdown strategic plan document(s)
"""

import argparse
import json
import sys
from pathlib import Path
from datetime import datetime


def load_file(path: Path) -> str | dict | None:
    """Load file content, detecting JSON or markdown."""
    if not path.exists():
        return None

    content = path.read_text()

    if path.suffix == ".json":
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return None

    return content


def extract_section(markdown: str, heading: str) -> str:
    """Extract a section from markdown by heading."""
    lines = markdown.split("\n")
    in_section = False
    section_lines = []
    heading_level = 0

    for line in lines:
        if line.startswith("#"):
            level = len(line) - len(line.lstrip("#"))
            heading_text = line.lstrip("#").strip()

            if heading.lower() in heading_text.lower():
                in_section = True
                heading_level = level
                continue
            elif in_section and level <= heading_level:
                break

        if in_section:
            section_lines.append(line)

    return "\n".join(section_lines).strip()


def generate_full_plan(work_dir: Path, district: str, year: int) -> str:
    """Generate the complete strategic plan document."""
    date = datetime.now().strftime("%Y-%m-%d")

    # Load all phase outputs
    discovery = load_file(work_dir / "discovery-report.md") or ""
    swot = load_file(work_dir / "swot-analysis.md") or ""
    vision = load_file(work_dir / "practical-vision.md") or ""
    contradictions = load_file(work_dir / "contradictions.md") or ""
    directions = load_file(work_dir / "strategic-directions.md") or ""
    implementation = load_file(work_dir / "focused-implementation.md") or ""
    timeline = load_file(work_dir / "first-year-timeline.md") or ""

    plan = f"""---
type: strategic-plan
district: {district}
year: {year}
status: draft
created: {date}
plan_horizon: {year} - {year + 3}
---

# {district} Strategic Plan {year}-{year + 3}

> A three-year strategic plan developed through collaborative community engagement using a 4-stage research-backed planning process.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Planning Process](#planning-process)
3. [Discovery Findings](#discovery-findings)
4. [Environmental Analysis (SWOT)](#environmental-analysis)
5. [Practical Vision](#practical-vision)
6. [Underlying Contradictions](#underlying-contradictions)
7. [Strategic Directions](#strategic-directions)
8. [Implementation Plan](#implementation-plan)
9. [Year One Timeline](#year-one-timeline)
10. [Monitoring & Evaluation](#monitoring-and-evaluation)
11. [Appendices](#appendices)

---

## Executive Summary

This strategic plan represents the collective vision of {district}'s stakeholders—students, families, staff, and community members. Through extensive engagement and collaborative planning, we have identified a clear path forward for the next three years.

### Our Vision

[Summary of practical vision - to be refined from vision document]

### Strategic Priorities

[Summary of 4-6 strategic directions - to be refined from directions document]

### Key Outcomes by {year + 3}

[Summary of 3-year outcomes from implementation plan]

---

## Planning Process

### Methodology

This plan was developed using a 4-stage collaborative strategic planning process, informed by research-backed practices from education planning literature.

**Planning Phases:**

1. **Discovery & Data Collection** - Surveys, focus groups, document analysis
2. **Environmental Analysis** - SWOT synthesis and prioritization
3. **Practical Vision** - Collaborative visioning for {year + 3}
4. **Underlying Contradictions** - Identifying tensions to resolve
5. **Strategic Directions** - Defining innovative approaches
6. **Focused Implementation** - Current reality to outcomes mapping
7. **Plan Synthesis** - Document generation and approval

### Stakeholder Engagement

[To be populated from discovery report]

**Participants included:**
- Students
- Parents and Families
- Teachers and Staff
- Administrators
- Community Partners
- Board Members

---

## Discovery Findings

{discovery if discovery else "[Discovery findings to be added]"}

---

## Environmental Analysis

{swot if swot else "[SWOT analysis to be added]"}

---

## Practical Vision

{vision if vision else "[Practical vision to be added]"}

Our vision describes what we want to see in {year + 3}—the concrete, observable outcomes that will indicate our success.

---

## Underlying Contradictions

{contradictions if contradictions else "[Underlying contradictions to be added]"}

These are not simply barriers to overcome, but tensions that must be resolved to achieve our vision.

---

## Strategic Directions

{directions if directions else "[Strategic directions to be added]"}

Our strategic directions are the innovative actions we will take to resolve contradictions and achieve our vision.

---

## Implementation Plan

{implementation if implementation else "[Implementation plan to be added]"}

### Three-Year Roadmap

For each strategic direction, we have mapped:
- **Current Reality:** Where we are today
- **1-Year Accomplishments:** What will be true by {year + 1}
- **3-Year Outcomes:** What will be true by {year + 3}

---

## Year One Timeline

{timeline if timeline else "[Year one timeline to be added]"}

### Quarterly Focus Areas

| Quarter | Focus |
|---------|-------|
| Q1 (Jul-Sep {year}) | Foundation and launch |
| Q2 (Oct-Dec {year}) | Implementation ramp-up |
| Q3 (Jan-Mar {year + 1}) | Mid-year assessment and adjustment |
| Q4 (Apr-Jun {year + 1}) | Year-end evaluation and planning |

---

## Monitoring & Evaluation

### Progress Monitoring

The district will monitor progress toward strategic goals through:

1. **Quarterly Check-Ins** - Cabinet review of progress indicators
2. **Board Updates** - Regular reporting to the Board of Education
3. **Annual Assessment** - Comprehensive year-end evaluation
4. **Community Reporting** - Transparent sharing of progress

### Success Indicators

Each strategic direction includes specific success indicators with:
- Baseline measurements (current state)
- Year 1 targets
- Year 3 targets
- Data sources and measurement methods

### Adjustment Process

This is a living document. The district will:
- Review progress quarterly
- Adjust tactics as needed while maintaining strategic focus
- Update timelines based on actual progress
- Communicate changes to stakeholders

---

## Appendices

### A. Planning Participants
[List of committee members, focus group participants, etc.]

### B. Data Sources
[Survey instruments, focus group protocols, documents reviewed]

### C. Detailed Data Analysis
[Additional charts, graphs, response distributions]

### D. Glossary
[Definition of terms used in this plan]

---

## Acknowledgments

This plan represents the collaborative work of hundreds of stakeholders who contributed their time, insights, and aspirations for {district}. We thank everyone who participated in surveys, focus groups, planning sessions, and community meetings.

---

*{district} Strategic Plan {year}-{year + 3}*
*Adopted: [Date]*
*Board Resolution: [Number]*

*Generated with assistance from Geoffrey Strategic Planning Manager*
"""

    return plan


def generate_executive_summary(work_dir: Path, district: str, year: int) -> str:
    """Generate a board-ready executive summary."""
    date = datetime.now().strftime("%Y-%m-%d")

    # Load key outputs
    swot_json = load_file(work_dir / "swot-analysis.json") or {}
    directions = load_file(work_dir / "strategic-directions.md") or ""
    implementation = load_file(work_dir / "focused-implementation.md") or ""

    summary = f"""---
type: executive-summary
district: {district}
year: {year}
created: {date}
---

# {district} Strategic Plan {year}-{year + 3}
## Executive Summary for Board of Education

---

### Purpose

This executive summary presents the key elements of {district}'s three-year strategic plan, developed through extensive community engagement using a collaborative 4-stage planning process.

---

### Planning at a Glance

| Element | Summary |
|---------|---------|
| **Plan Horizon** | {year} - {year + 3} |
| **Strategic Directions** | 4-6 major focus areas |
| **Planning Method** | 4-Stage Collaborative Process |
| **Stakeholders Engaged** | [Number] participants |

---

### Key Findings from Discovery

**Strengths Identified:**
"""

    swot = swot_json.get("swot", {})
    for s in swot.get("strengths", [])[:3]:
        summary += f"- {s.get('finding', '')[:80]}\n"

    summary += "\n**Areas for Improvement:**\n"
    for w in swot.get("weaknesses", [])[:3]:
        summary += f"- {w.get('finding', '')[:80]}\n"

    summary += f"""

---

### Our Vision for {year + 3}

[Key vision statement - 2-3 sentences summarizing practical vision]

---

### Strategic Directions

[List of 4-6 strategic directions with brief descriptions]

---

### Year One Priorities

[Key actions for Year 1 with timeline]

---

### Resource Implications

[Summary of budget and resource needs]

---

### Recommended Board Action

The administration recommends that the Board of Education:

1. Approve the {district} Strategic Plan {year}-{year + 3} as presented
2. Direct the Superintendent to implement Year One activities
3. Schedule quarterly progress reports
4. Authorize communication of the plan to stakeholders

---

### Next Steps

Upon approval:
1. Launch communication campaign
2. Establish implementation teams
3. Baseline data collection
4. Q1 action plan execution

---

*Presented to the Board of Education on [Date]*
*Prepared by [Name], Superintendent*
"""

    return summary


def generate_staff_version(work_dir: Path, district: str, year: int) -> str:
    """Generate a staff-focused communication version."""
    date = datetime.now().strftime("%Y-%m-%d")

    version = f"""# {district} Strategic Plan {year}-{year + 3}
## What It Means for Our Work

*A summary for {district} staff members*

---

### Why This Plan Matters

This strategic plan reflects the collective voice of our community—including you! Hundreds of stakeholders shared their hopes, concerns, and ideas for {district}'s future.

Your input shaped this plan, and your work will bring it to life.

---

### Our Shared Vision

By {year + 3}, we envision a district where:

[Key vision statements relevant to staff]

---

### Strategic Priorities

Here's what we're focusing on:

[List of strategic directions with staff-relevant context]

---

### What This Means for Your Role

**For Classroom Teachers:**
- [Specific implications]

**For Support Staff:**
- [Specific implications]

**For Administrators:**
- [Specific implications]

---

### Year One: What to Expect

| Quarter | What's Happening |
|---------|------------------|
| Q1 | Launch and orientation |
| Q2 | Implementation begins |
| Q3 | Check-in and adjustments |
| Q4 | Year-end review |

---

### How You Can Contribute

1. **Engage** - Participate in implementation activities
2. **Provide Feedback** - Share what's working and what's not
3. **Collaborate** - Work across teams toward shared goals
4. **Celebrate** - Recognize progress along the way

---

### Questions?

Contact: [Contact information]
Resources: [Link to full plan and resources]

---

*Thank you for your commitment to {district} students!*
"""

    return version


def generate_community_version(work_dir: Path, district: str, year: int) -> str:
    """Generate a community-facing summary."""
    date = datetime.now().strftime("%Y-%m-%d")

    version = f"""# {district} Strategic Plan {year}-{year + 3}
## Our Path Forward Together

*A summary for families and community members*

---

### Thank You for Your Voice

This plan reflects the input of hundreds of community members who shared their hopes and concerns for our schools. Your voice matters, and we heard you.

---

### What We Learned

Through surveys, focus groups, and community meetings, key themes emerged:

**What's Working:**
- [Key strengths identified]

**Where We Can Improve:**
- [Key areas for growth]

---

### Our Vision for {year + 3}

In three years, we envision:

[Key vision statements in accessible language]

---

### Our Priorities

**Priority 1:** [Title]
What this means for students: [Brief explanation]

**Priority 2:** [Title]
What this means for students: [Brief explanation]

**Priority 3:** [Title]
What this means for students: [Brief explanation]

---

### What You'll See This Year

- [Key visible changes/initiatives for Year 1]

---

### Stay Involved

**Stay Informed:**
- [Newsletter signup]
- [Website link]
- [Social media]

**Provide Feedback:**
- [Feedback mechanism]

**Get Involved:**
- [Volunteer opportunities]
- [Committee participation]

---

### Questions?

Contact: [Contact information]
Full Plan: [Link to complete document]

---

*Together, we are building the future of {district}.*
"""

    return version


def main():
    parser = argparse.ArgumentParser(
        description="Synthesize strategic plan documents from planning phases"
    )
    parser.add_argument("--work-dir", "-w", required=True,
                        help="Directory containing phase outputs")
    parser.add_argument("--output", "-o", required=True,
                        help="Output file path (or directory for 'all' format)")
    parser.add_argument("--format", "-f",
                        choices=["full", "executive", "staff", "community", "all"],
                        default="full",
                        help="Output format (default: full)")
    parser.add_argument("--district", "-d", default="Our District",
                        help="District name")
    parser.add_argument("--year", "-y", type=int,
                        default=datetime.now().year,
                        help="Plan start year")

    args = parser.parse_args()

    work_dir = Path(args.work_dir)
    output_path = Path(args.output)

    if not work_dir.exists():
        print(json.dumps({"success": False, "error": f"Work directory not found: {work_dir}"}))
        sys.exit(1)

    outputs = {}

    if args.format in ["full", "all"]:
        outputs["full"] = generate_full_plan(work_dir, args.district, args.year)

    if args.format in ["executive", "all"]:
        outputs["executive"] = generate_executive_summary(work_dir, args.district, args.year)

    if args.format in ["staff", "all"]:
        outputs["staff"] = generate_staff_version(work_dir, args.district, args.year)

    if args.format in ["community", "all"]:
        outputs["community"] = generate_community_version(work_dir, args.district, args.year)

    # Write output(s)
    if args.format == "all":
        output_path.mkdir(parents=True, exist_ok=True)
        for name, content in outputs.items():
            file_path = output_path / f"{args.district.lower().replace(' ', '-')}-{name}-plan.md"
            file_path.write_text(content)
    else:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(outputs[args.format])

    result = {
        "success": True,
        "format": args.format,
        "district": args.district,
        "year": args.year,
        "outputs": list(outputs.keys()),
        "output_path": str(output_path),
        "message": f"Strategic plan document(s) generated at {output_path}"
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
