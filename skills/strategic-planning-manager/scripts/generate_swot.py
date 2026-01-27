#!/usr/bin/env python3
# /// script
# dependencies = ["pyyaml"]
# ///

"""
Generate SWOT analysis from discovery data for K-12 strategic planning.

Synthesizes survey analysis, transcript themes, and document reviews into
a comprehensive SWOT matrix with:
- Evidence-based strengths and weaknesses
- Opportunity and threat identification
- "Where Will We Invest?" recommendations (S×O)
- "What's Holding Us Back?" analysis (W focus)

Usage:
    uv run scripts/generate_swot.py --discovery-dir ./discovery --output ./outputs/swot.md
    uv run scripts/generate_swot.py --survey ./survey.json --transcripts ./themes.json --output ./swot.md

Output: Markdown SWOT analysis with evidence citations
"""

import argparse
import json
import sys
from pathlib import Path
from collections import defaultdict
from datetime import datetime


def load_json(path: Path) -> dict:
    """Load JSON file."""
    try:
        return json.loads(path.read_text())
    except Exception as e:
        print(f"Warning: Could not load {path}: {e}", file=sys.stderr)
        return {}


def extract_from_survey(survey_data: dict) -> dict:
    """Extract SWOT inputs from survey analysis."""
    swot = {
        "strengths": [],
        "weaknesses": [],
        "opportunities": [],
        "threats": []
    }

    questions = survey_data.get("questions", {})

    for question, result in questions.items():
        if result.get("type") == "rating":
            mean = result.get("mean", 0)
            response_count = result.get("response_count", 0)

            if mean >= 4.0:
                swot["strengths"].append({
                    "finding": f"High satisfaction: {question[:80]}",
                    "evidence": f"Mean rating: {mean}/5 (n={response_count})",
                    "source": "survey"
                })
            elif mean <= 2.5:
                swot["weaknesses"].append({
                    "finding": f"Low satisfaction: {question[:80]}",
                    "evidence": f"Mean rating: {mean}/5 (n={response_count})",
                    "source": "survey"
                })

        elif result.get("type") == "open_ended":
            sentiment = result.get("sentiment", {})
            themes = result.get("themes", {}).get("themes", [])[:3]
            polarity = sentiment.get("average_polarity", 0)

            if polarity > 0.2 and themes:
                swot["strengths"].append({
                    "finding": f"Positive sentiment around: {', '.join(themes)}",
                    "evidence": f"Polarity: {polarity:.2f}, from responses to: {question[:50]}",
                    "source": "survey"
                })
            elif polarity < -0.2 and themes:
                swot["weaknesses"].append({
                    "finding": f"Negative sentiment around: {', '.join(themes)}",
                    "evidence": f"Polarity: {polarity:.2f}, from responses to: {question[:50]}",
                    "source": "survey"
                })

    # Add any pre-generated SWOT suggestions
    suggestions = survey_data.get("swot_suggestions", {})
    for strength in suggestions.get("suggested_strengths", []):
        swot["strengths"].append({
            "finding": strength,
            "evidence": "AI-generated from survey patterns",
            "source": "survey"
        })
    for weakness in suggestions.get("suggested_weaknesses", []):
        swot["weaknesses"].append({
            "finding": weakness,
            "evidence": "AI-generated from survey patterns",
            "source": "survey"
        })

    return swot


def extract_from_transcripts(transcript_data: dict) -> dict:
    """Extract SWOT inputs from transcript analysis."""
    swot = {
        "strengths": [],
        "weaknesses": [],
        "opportunities": [],
        "threats": []
    }

    categories = transcript_data.get("categorized_themes", {})

    # Map categories to SWOT quadrants with context
    positive_indicators = ["success", "strength", "improve", "achievement", "effective", "support"]
    negative_indicators = ["challenge", "concern", "lack", "need", "barrier", "problem", "issue"]

    # Get quotes for evidence
    quotes = transcript_data.get("top_quotes", transcript_data.get("key_quotes", []))
    quote_by_theme = defaultdict(list)
    for q in quotes:
        for theme in q.get("themes", []):
            quote_by_theme[theme].append(q.get("quote", "")[:200])

    # Analyze word frequency for sentiment context
    word_freq = transcript_data.get("merged_themes", transcript_data.get("themes", {})).get("word_frequency", {})

    # Look for opportunity and threat signals
    opportunity_terms = ["innovation", "technology", "growth", "potential", "opportunity", "future", "expand"]
    threat_terms = ["risk", "competition", "decline", "budget", "cut", "shortage", "crisis"]

    for term in opportunity_terms:
        if term in word_freq and word_freq[term] >= 3:
            evidence = quote_by_theme.get(term, ["Multiple mentions in discussions"])
            swot["opportunities"].append({
                "finding": f"Stakeholders discussing: {term}",
                "evidence": evidence[0] if evidence else f"Mentioned {word_freq[term]} times",
                "source": "transcripts"
            })

    for term in threat_terms:
        if term in word_freq and word_freq[term] >= 3:
            evidence = quote_by_theme.get(term, ["Multiple mentions in discussions"])
            swot["threats"].append({
                "finding": f"Concern identified: {term}",
                "evidence": evidence[0] if evidence else f"Mentioned {word_freq[term]} times",
                "source": "transcripts"
            })

    # Overall sentiment from transcripts
    sentiment = transcript_data.get("sentiment", {}).get("overall", {})
    if sentiment:
        if sentiment.get("average_polarity", 0) > 0.1:
            swot["strengths"].append({
                "finding": "Overall positive stakeholder sentiment",
                "evidence": f"Average polarity: {sentiment.get('average_polarity', 0):.2f}",
                "source": "transcripts"
            })
        elif sentiment.get("average_polarity", 0) < -0.1:
            swot["weaknesses"].append({
                "finding": "Overall negative stakeholder sentiment",
                "evidence": f"Average polarity: {sentiment.get('average_polarity', 0):.2f}",
                "source": "transcripts"
            })

    return swot


def merge_swot(swot_list: list[dict]) -> dict:
    """Merge multiple SWOT analyses, deduplicating similar items."""
    merged = {
        "strengths": [],
        "weaknesses": [],
        "opportunities": [],
        "threats": []
    }

    for swot in swot_list:
        for quadrant in merged.keys():
            for item in swot.get(quadrant, []):
                # Simple deduplication by checking if finding is similar
                finding = item.get("finding", "").lower()
                existing = [i.get("finding", "").lower() for i in merged[quadrant]]

                is_duplicate = any(
                    finding in e or e in finding
                    for e in existing
                )

                if not is_duplicate:
                    merged[quadrant].append(item)

    return merged


def generate_investment_analysis(swot: dict) -> list[dict]:
    """
    Generate 'Where Will We Invest?' recommendations.
    Maps Strengths × Opportunities.
    """
    investments = []

    strengths = swot.get("strengths", [])
    opportunities = swot.get("opportunities", [])

    # Find natural pairings
    for strength in strengths[:5]:
        s_finding = strength.get("finding", "").lower()

        for opportunity in opportunities[:5]:
            o_finding = opportunity.get("finding", "").lower()

            # Look for thematic overlap
            s_words = set(s_finding.split())
            o_words = set(o_finding.split())
            overlap = s_words & o_words - {"the", "a", "and", "to", "of", "in", "for"}

            if overlap or len(investments) < 3:
                investments.append({
                    "recommendation": f"Leverage '{strength.get('finding', '')[:50]}...' to pursue '{opportunity.get('finding', '')[:50]}...'",
                    "strength": strength.get("finding", ""),
                    "opportunity": opportunity.get("finding", ""),
                    "connection": list(overlap) if overlap else ["Strategic alignment"]
                })

    return investments[:5]


def generate_barriers_analysis(swot: dict) -> list[dict]:
    """
    Generate 'What's Holding Us Back?' analysis.
    Focus on Weaknesses with highest impact.
    """
    barriers = []

    weaknesses = swot.get("weaknesses", [])
    threats = swot.get("threats", [])

    for weakness in weaknesses[:5]:
        # Check if weakness aligns with any threat
        w_finding = weakness.get("finding", "").lower()
        related_threats = []

        for threat in threats:
            t_finding = threat.get("finding", "").lower()
            w_words = set(w_finding.split())
            t_words = set(t_finding.split())
            if w_words & t_words:
                related_threats.append(threat.get("finding", ""))

        barriers.append({
            "barrier": weakness.get("finding", ""),
            "evidence": weakness.get("evidence", ""),
            "source": weakness.get("source", ""),
            "compounded_by": related_threats[:2] if related_threats else None,
            "severity": "High" if related_threats else "Medium"
        })

    return barriers[:5]


def generate_markdown(swot: dict, investments: list, barriers: list, output_path: Path) -> None:
    """Generate SWOT analysis markdown document."""
    date = datetime.now().strftime("%Y-%m-%d")

    md = [f"""---
type: swot-analysis
created: {date}
status: draft
---

# SWOT Analysis

> Generated from discovery data on {date}. Human validation required.

---

## Strengths

*What we do well; what others see as strengths*

"""]

    for i, item in enumerate(swot.get("strengths", [])[:10], 1):
        md.append(f"### S{i}: {item.get('finding', 'Strength')}\n")
        md.append(f"**Evidence:** {item.get('evidence', 'N/A')}\n")
        md.append(f"**Source:** {item.get('source', 'N/A')}\n\n")

    md.append("""---

## Weaknesses

*What limits us; where we're vulnerable*

""")

    for i, item in enumerate(swot.get("weaknesses", [])[:10], 1):
        md.append(f"### W{i}: {item.get('finding', 'Weakness')}\n")
        md.append(f"**Evidence:** {item.get('evidence', 'N/A')}\n")
        md.append(f"**Source:** {item.get('source', 'N/A')}\n\n")

    md.append("""---

## Opportunities

*External factors to leverage; trends we can capitalize on*

""")

    for i, item in enumerate(swot.get("opportunities", [])[:10], 1):
        md.append(f"### O{i}: {item.get('finding', 'Opportunity')}\n")
        md.append(f"**Evidence:** {item.get('evidence', 'N/A')}\n")
        md.append(f"**Source:** {item.get('source', 'N/A')}\n\n")

    md.append("""---

## Threats

*External risks to navigate; competitive/regulatory concerns*

""")

    for i, item in enumerate(swot.get("threats", [])[:10], 1):
        md.append(f"### T{i}: {item.get('finding', 'Threat')}\n")
        md.append(f"**Evidence:** {item.get('evidence', 'N/A')}\n")
        md.append(f"**Source:** {item.get('source', 'N/A')}\n\n")

    md.append("""---

## Where Will We Invest? (S×O)

*Strategic opportunities that leverage our strengths*

""")

    for i, investment in enumerate(investments, 1):
        md.append(f"### Investment {i}\n")
        md.append(f"**Recommendation:** {investment.get('recommendation', '')}\n")
        md.append(f"- Strength: {investment.get('strength', '')}\n")
        md.append(f"- Opportunity: {investment.get('opportunity', '')}\n")
        md.append(f"- Connection: {', '.join(investment.get('connection', []))}\n\n")

    md.append("""---

## What's Holding Us Back? (W Focus)

*Key barriers that must be addressed*

""")

    for i, barrier in enumerate(barriers, 1):
        severity_icon = "🔴" if barrier.get("severity") == "High" else "🟡"
        md.append(f"### {severity_icon} Barrier {i}: {barrier.get('barrier', '')}\n")
        md.append(f"**Evidence:** {barrier.get('evidence', '')}\n")
        md.append(f"**Source:** {barrier.get('source', '')}\n")
        if barrier.get("compounded_by"):
            md.append(f"**Compounded by:** {'; '.join(barrier['compounded_by'])}\n")
        md.append("\n")

    md.append("""---

## Summary Matrix

| Strengths | Weaknesses |
|-----------|------------|
""")

    max_rows = max(len(swot.get("strengths", [])), len(swot.get("weaknesses", [])))
    for i in range(min(5, max_rows)):
        s = swot.get("strengths", [])[i].get("finding", "")[:50] if i < len(swot.get("strengths", [])) else ""
        w = swot.get("weaknesses", [])[i].get("finding", "")[:50] if i < len(swot.get("weaknesses", [])) else ""
        md.append(f"| {s} | {w} |\n")

    md.append("""
| Opportunities | Threats |
|---------------|---------|
""")

    max_rows = max(len(swot.get("opportunities", [])), len(swot.get("threats", [])))
    for i in range(min(5, max_rows)):
        o = swot.get("opportunities", [])[i].get("finding", "")[:50] if i < len(swot.get("opportunities", [])) else ""
        t = swot.get("threats", [])[i].get("finding", "")[:50] if i < len(swot.get("threats", [])) else ""
        md.append(f"| {o} | {t} |\n")

    md.append("""
---

*Generated by Geoffrey Strategic Planning Manager v1.0.0*
*Human validation and refinement required before proceeding to Practical Vision phase*
""")

    output_path.write_text("".join(md))


def main():
    parser = argparse.ArgumentParser(
        description="Generate SWOT analysis from discovery data"
    )
    parser.add_argument("--discovery-dir", "-d", help="Directory containing discovery outputs")
    parser.add_argument("--survey", "-s", help="Survey analysis JSON file")
    parser.add_argument("--transcripts", "-t", help="Transcript analysis JSON file")
    parser.add_argument("--output", "-o", required=True, help="Output markdown file path")

    args = parser.parse_args()

    swot_inputs = []

    # Load from discovery directory
    if args.discovery_dir:
        discovery_dir = Path(args.discovery_dir)
        if discovery_dir.exists():
            # Look for survey analysis
            survey_path = discovery_dir / "survey-analysis.json"
            if survey_path.exists():
                survey_data = load_json(survey_path)
                if survey_data:
                    swot_inputs.append(extract_from_survey(survey_data))

            # Look for transcript analysis
            for pattern in ["transcript-themes.json", "themes.json", "*-themes.json"]:
                for transcript_path in discovery_dir.glob(pattern):
                    transcript_data = load_json(transcript_path)
                    if transcript_data:
                        swot_inputs.append(extract_from_transcripts(transcript_data))

    # Load explicit files
    if args.survey:
        survey_path = Path(args.survey)
        if survey_path.exists():
            swot_inputs.append(extract_from_survey(load_json(survey_path)))

    if args.transcripts:
        transcript_path = Path(args.transcripts)
        if transcript_path.exists():
            swot_inputs.append(extract_from_transcripts(load_json(transcript_path)))

    if not swot_inputs:
        print(json.dumps({"success": False, "error": "No valid input data found"}))
        sys.exit(1)

    # Merge all SWOT inputs
    merged_swot = merge_swot(swot_inputs)

    # Generate analyses
    investments = generate_investment_analysis(merged_swot)
    barriers = generate_barriers_analysis(merged_swot)

    # Generate output
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    generate_markdown(merged_swot, investments, barriers, output_path)

    # Also save JSON version
    json_output = {
        "success": True,
        "swot": merged_swot,
        "investments": investments,
        "barriers": barriers,
        "summary": {
            "strengths_count": len(merged_swot.get("strengths", [])),
            "weaknesses_count": len(merged_swot.get("weaknesses", [])),
            "opportunities_count": len(merged_swot.get("opportunities", [])),
            "threats_count": len(merged_swot.get("threats", []))
        }
    }

    json_path = output_path.with_suffix(".json")
    json_path.write_text(json.dumps(json_output, indent=2))

    result = {
        "success": True,
        "markdown_output": str(output_path),
        "json_output": str(json_path),
        "strengths_identified": len(merged_swot.get("strengths", [])),
        "weaknesses_identified": len(merged_swot.get("weaknesses", [])),
        "opportunities_identified": len(merged_swot.get("opportunities", [])),
        "threats_identified": len(merged_swot.get("threats", [])),
        "message": f"SWOT analysis generated at {output_path}"
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
