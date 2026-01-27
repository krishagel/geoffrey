#!/usr/bin/env python3
# /// script
# dependencies = ["pandas", "openpyxl", "textblob"]
# ///

"""
Analyze survey data for K-12 strategic planning.

Supports CSV, JSON, and Excel formats. Performs:
- Response distribution statistics
- Sentiment analysis on open-ended responses
- Theme extraction from text responses
- Stakeholder group comparisons (if demographics available)
- Word frequency and phrase analysis

Usage:
    uv run scripts/analyze_surveys.py --input survey.csv --output-dir ./discovery
    uv run scripts/analyze_surveys.py --input survey.xlsx --format excel --output-dir ./discovery
    uv run scripts/analyze_surveys.py --input survey.json --format json --output-dir ./discovery

Output: JSON analysis results and markdown summary
"""

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any

import pandas as pd
from textblob import TextBlob


def detect_question_type(series: pd.Series) -> str:
    """Detect if a column contains numeric ratings, categorical, or open-ended responses."""
    # Drop NA values for analysis
    values = series.dropna()

    if len(values) == 0:
        return "empty"

    # Check if numeric
    if pd.api.types.is_numeric_dtype(values):
        unique_count = values.nunique()
        if unique_count <= 10:
            return "rating"  # Likely a Likert scale
        return "numeric"

    # Check if categorical (few unique values relative to total)
    unique_ratio = values.nunique() / len(values)
    avg_length = values.astype(str).str.len().mean()

    if unique_ratio < 0.2 and avg_length < 50:
        return "categorical"

    if avg_length > 100:
        return "open_ended"

    return "short_text"


def analyze_rating_question(series: pd.Series, question: str) -> dict:
    """Analyze a rating/Likert scale question."""
    values = series.dropna()

    return {
        "question": question,
        "type": "rating",
        "response_count": len(values),
        "mean": round(values.mean(), 2),
        "median": values.median(),
        "std_dev": round(values.std(), 2),
        "distribution": values.value_counts().sort_index().to_dict(),
        "missing_count": series.isna().sum()
    }


def analyze_categorical_question(series: pd.Series, question: str) -> dict:
    """Analyze a categorical/multiple choice question."""
    values = series.dropna()

    distribution = values.value_counts().to_dict()
    percentages = {k: round(v / len(values) * 100, 1) for k, v in distribution.items()}

    return {
        "question": question,
        "type": "categorical",
        "response_count": len(values),
        "distribution": distribution,
        "percentages": percentages,
        "missing_count": series.isna().sum()
    }


def extract_themes(texts: list[str], top_n: int = 10) -> dict:
    """Extract themes from a collection of text responses."""
    if not texts:
        return {"themes": [], "word_frequency": {}}

    # Combine all text
    all_text = " ".join(str(t) for t in texts if pd.notna(t))

    # Simple word frequency (excluding common words)
    stopwords = {
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
        "be", "have", "has", "had", "do", "does", "did", "will", "would",
        "could", "should", "may", "might", "must", "shall", "can", "need",
        "that", "this", "these", "those", "it", "its", "we", "our", "they",
        "their", "i", "my", "you", "your", "he", "she", "him", "her", "his"
    }

    words = re.findall(r'\b[a-zA-Z]{3,}\b', all_text.lower())
    word_counts = Counter(w for w in words if w not in stopwords)

    # Extract 2-word phrases
    phrase_pattern = r'\b[a-zA-Z]{3,}\s+[a-zA-Z]{3,}\b'
    phrases = re.findall(phrase_pattern, all_text.lower())
    phrase_counts = Counter(phrases)

    return {
        "themes": [word for word, _ in word_counts.most_common(top_n)],
        "word_frequency": dict(word_counts.most_common(top_n * 2)),
        "common_phrases": dict(phrase_counts.most_common(top_n))
    }


def analyze_sentiment(texts: list[str]) -> dict:
    """Analyze sentiment of text responses."""
    if not texts:
        return {"average_polarity": 0, "average_subjectivity": 0, "distribution": {}}

    sentiments = []
    for text in texts:
        if pd.notna(text) and str(text).strip():
            blob = TextBlob(str(text))
            sentiments.append({
                "polarity": blob.sentiment.polarity,  # -1 to 1
                "subjectivity": blob.sentiment.subjectivity  # 0 to 1
            })

    if not sentiments:
        return {"average_polarity": 0, "average_subjectivity": 0, "distribution": {}}

    avg_polarity = sum(s["polarity"] for s in sentiments) / len(sentiments)
    avg_subjectivity = sum(s["subjectivity"] for s in sentiments) / len(sentiments)

    # Categorize sentiments
    positive = sum(1 for s in sentiments if s["polarity"] > 0.1)
    negative = sum(1 for s in sentiments if s["polarity"] < -0.1)
    neutral = len(sentiments) - positive - negative

    return {
        "average_polarity": round(avg_polarity, 3),
        "average_subjectivity": round(avg_subjectivity, 3),
        "distribution": {
            "positive": positive,
            "neutral": neutral,
            "negative": negative
        },
        "sample_size": len(sentiments)
    }


def analyze_open_ended(series: pd.Series, question: str) -> dict:
    """Analyze an open-ended text question."""
    values = series.dropna().astype(str).tolist()

    themes = extract_themes(values)
    sentiment = analyze_sentiment(values)

    # Get representative quotes (longest responses that aren't too long)
    quotes = sorted(values, key=len, reverse=True)
    representative_quotes = [q[:500] for q in quotes[:5] if 50 < len(q) < 1000]

    return {
        "question": question,
        "type": "open_ended",
        "response_count": len(values),
        "themes": themes,
        "sentiment": sentiment,
        "representative_quotes": representative_quotes,
        "missing_count": series.isna().sum()
    }


def analyze_by_group(df: pd.DataFrame, group_column: str, analysis_results: dict) -> dict:
    """Compare results across stakeholder groups."""
    if group_column not in df.columns:
        return {}

    groups = df[group_column].dropna().unique()
    group_comparisons = {}

    for question, result in analysis_results.items():
        if result["type"] == "rating":
            group_means = {}
            for group in groups:
                group_data = df[df[group_column] == group][question].dropna()
                if len(group_data) > 0:
                    group_means[str(group)] = round(group_data.mean(), 2)

            if group_means:
                group_comparisons[question] = {
                    "type": "rating_by_group",
                    "group_means": group_means,
                    "variance": round(max(group_means.values()) - min(group_means.values()), 2) if group_means else 0
                }

        elif result["type"] == "categorical":
            group_distributions = {}
            for group in groups:
                group_data = df[df[group_column] == group][question].dropna()
                if len(group_data) > 0:
                    dist = group_data.value_counts(normalize=True).round(3).to_dict()
                    group_distributions[str(group)] = {str(k): v for k, v in dist.items()}

            if group_distributions:
                group_comparisons[question] = {
                    "type": "categorical_by_group",
                    "group_distributions": group_distributions
                }

    return group_comparisons


def generate_swot_suggestions(analysis_results: dict) -> dict:
    """Generate SWOT input suggestions based on survey analysis."""
    strengths = []
    weaknesses = []
    opportunities = []
    threats = []

    for question, result in analysis_results.items():
        if result["type"] == "rating":
            mean = result.get("mean", 0)
            if mean >= 4.0:  # Assuming 5-point scale
                strengths.append(f"High satisfaction with {question[:50]}... (mean: {mean})")
            elif mean <= 2.5:
                weaknesses.append(f"Low satisfaction with {question[:50]}... (mean: {mean})")

        elif result["type"] == "open_ended":
            sentiment = result.get("sentiment", {})
            if sentiment.get("average_polarity", 0) > 0.2:
                themes = result.get("themes", {}).get("themes", [])[:3]
                if themes:
                    strengths.append(f"Positive sentiment around: {', '.join(themes)}")
            elif sentiment.get("average_polarity", 0) < -0.2:
                themes = result.get("themes", {}).get("themes", [])[:3]
                if themes:
                    weaknesses.append(f"Concerns about: {', '.join(themes)}")

    return {
        "suggested_strengths": strengths[:5],
        "suggested_weaknesses": weaknesses[:5],
        "suggested_opportunities": opportunities[:5],
        "suggested_threats": threats[:5],
        "note": "These are AI-generated suggestions based on survey data. Human validation required."
    }


def load_data(input_path: Path, format_type: str) -> pd.DataFrame:
    """Load survey data from file."""
    if format_type == "csv" or (format_type == "auto" and input_path.suffix.lower() == ".csv"):
        return pd.read_csv(input_path)
    elif format_type == "json" or (format_type == "auto" and input_path.suffix.lower() == ".json"):
        return pd.read_json(input_path)
    elif format_type == "excel" or (format_type == "auto" and input_path.suffix.lower() in [".xlsx", ".xls"]):
        return pd.read_excel(input_path)
    else:
        # Try CSV as default
        return pd.read_csv(input_path)


def generate_markdown_summary(analysis: dict, output_path: Path) -> None:
    """Generate a markdown summary of the survey analysis."""
    md = ["# Survey Analysis Summary\n"]
    md.append(f"**Total Responses:** {analysis.get('total_responses', 'N/A')}\n")
    md.append(f"**Questions Analyzed:** {analysis.get('question_count', 'N/A')}\n")
    md.append("\n---\n")

    # Key Findings
    md.append("## Key Findings\n")

    # Highest/Lowest rated items
    ratings = [(q, r) for q, r in analysis.get("questions", {}).items()
               if r.get("type") == "rating"]
    if ratings:
        ratings.sort(key=lambda x: x[1].get("mean", 0), reverse=True)
        md.append("### Highest Rated Areas\n")
        for q, r in ratings[:3]:
            md.append(f"- **{q[:60]}...**: {r.get('mean', 'N/A')} avg\n")

        md.append("\n### Lowest Rated Areas\n")
        for q, r in ratings[-3:]:
            md.append(f"- **{q[:60]}...**: {r.get('mean', 'N/A')} avg\n")

    # Theme summary
    md.append("\n## Common Themes\n")
    all_themes = []
    for q, r in analysis.get("questions", {}).items():
        if r.get("type") == "open_ended":
            themes = r.get("themes", {}).get("themes", [])
            all_themes.extend(themes)

    theme_counts = Counter(all_themes)
    for theme, count in theme_counts.most_common(10):
        md.append(f"- {theme} ({count} mentions)\n")

    # SWOT suggestions
    swot = analysis.get("swot_suggestions", {})
    md.append("\n## Suggested SWOT Inputs\n")
    md.append("### Strengths\n")
    for s in swot.get("suggested_strengths", []):
        md.append(f"- {s}\n")
    md.append("\n### Weaknesses\n")
    for w in swot.get("suggested_weaknesses", []):
        md.append(f"- {w}\n")

    # Representative Quotes
    md.append("\n## Representative Quotes\n")
    for q, r in analysis.get("questions", {}).items():
        if r.get("type") == "open_ended":
            quotes = r.get("representative_quotes", [])[:2]
            if quotes:
                md.append(f"\n### {q[:60]}...\n")
                for quote in quotes:
                    md.append(f"> {quote[:200]}...\n\n")

    output_path.write_text("".join(md))


def main():
    parser = argparse.ArgumentParser(
        description="Analyze survey data for K-12 strategic planning"
    )
    parser.add_argument("--input", "-i", required=True, help="Input data file path")
    parser.add_argument("--format", "-f", choices=["csv", "json", "excel", "auto"],
                        default="auto", help="Input file format")
    parser.add_argument("--output-dir", "-o", required=True, help="Output directory")
    parser.add_argument("--group-by", "-g", help="Column name for stakeholder group comparison")

    args = parser.parse_args()

    input_path = Path(args.input)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Load data
    try:
        df = load_data(input_path, args.format)
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Failed to load data: {e}"}))
        sys.exit(1)

    # Analyze each column
    analysis_results: dict[str, Any] = {}

    for column in df.columns:
        question_type = detect_question_type(df[column])

        if question_type == "rating":
            analysis_results[column] = analyze_rating_question(df[column], column)
        elif question_type == "categorical":
            analysis_results[column] = analyze_categorical_question(df[column], column)
        elif question_type in ["open_ended", "short_text"]:
            analysis_results[column] = analyze_open_ended(df[column], column)
        elif question_type == "numeric":
            analysis_results[column] = analyze_rating_question(df[column], column)

    # Group analysis if specified
    group_analysis = {}
    if args.group_by:
        group_analysis = analyze_by_group(df, args.group_by, analysis_results)

    # Generate SWOT suggestions
    swot_suggestions = generate_swot_suggestions(analysis_results)

    # Compile final output
    output = {
        "success": True,
        "source_file": str(input_path),
        "total_responses": len(df),
        "question_count": len(analysis_results),
        "questions": analysis_results,
        "group_analysis": group_analysis,
        "swot_suggestions": swot_suggestions
    }

    # Save JSON output
    json_output_path = output_dir / "survey-analysis.json"
    json_output_path.write_text(json.dumps(output, indent=2, default=str))

    # Generate markdown summary
    md_output_path = output_dir / "survey-analysis-summary.md"
    generate_markdown_summary(output, md_output_path)

    # Print success message
    result = {
        "success": True,
        "json_output": str(json_output_path),
        "markdown_output": str(md_output_path),
        "total_responses": len(df),
        "questions_analyzed": len(analysis_results),
        "message": f"Survey analysis complete. Results saved to {output_dir}"
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
