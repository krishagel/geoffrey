#!/usr/bin/env python3
# /// script
# dependencies = ["textblob", "nltk"]
# ///

"""
Process focus group transcripts for K-12 strategic planning.

Performs NLP analysis on text transcripts:
- Theme extraction using frequency and co-occurrence
- Sentiment pattern analysis
- Quote extraction for evidence
- Cross-transcript pattern identification
- Speaker/stakeholder attribution (if labeled)

Usage:
    uv run scripts/process_transcripts.py --input-dir ./transcripts --output ./discovery/themes.json
    uv run scripts/process_transcripts.py --input transcript.txt --output ./discovery/themes.json

Input: Directory of .txt files or single transcript file
Output: JSON with extracted themes and evidence
"""

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

from textblob import TextBlob


# Common stopwords for theme extraction
STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
    "be", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "must", "shall", "can", "need",
    "that", "this", "these", "those", "it", "its", "we", "our", "they",
    "their", "i", "my", "you", "your", "he", "she", "him", "her", "his",
    "just", "also", "so", "if", "then", "there", "here", "when", "where",
    "what", "how", "why", "who", "which", "about", "into", "through",
    "during", "before", "after", "above", "below", "between", "such",
    "very", "more", "most", "other", "some", "any", "all", "both", "each",
    "few", "many", "much", "own", "same", "than", "too", "only", "now",
    "even", "new", "get", "got", "going", "go", "come", "came", "like",
    "know", "think", "see", "say", "said", "make", "made", "take", "want",
    "use", "used", "using", "really", "thing", "things", "something",
    "anything", "everything", "nothing", "someone", "anyone", "everyone",
    "well", "still", "back", "being", "over", "down", "out", "up", "off"
}

# K-12 education domain terms to prioritize
K12_TERMS = {
    "student", "students", "teacher", "teachers", "learning", "education",
    "curriculum", "classroom", "instruction", "assessment", "parent",
    "parents", "community", "school", "district", "board", "administrator",
    "principal", "staff", "technology", "equity", "achievement", "success",
    "support", "resources", "budget", "funding", "facilities", "safety",
    "social", "emotional", "engagement", "communication", "professional",
    "development", "training", "leadership", "culture", "climate"
}


def load_transcript(file_path: Path) -> str:
    """Load a transcript file."""
    try:
        return file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return file_path.read_text(encoding="latin-1")


def extract_speaker_segments(text: str) -> list[dict]:
    """
    Extract speaker-labeled segments from transcript.

    Supports formats like:
    - "Speaker Name: text"
    - "[Speaker Name] text"
    - "SPEAKER NAME: text"
    """
    segments = []

    # Pattern: Name followed by colon
    pattern1 = r'^([A-Z][a-zA-Z\s]+?):\s*(.+?)(?=^[A-Z][a-zA-Z\s]+?:|$)'
    # Pattern: Name in brackets
    pattern2 = r'\[([^\]]+)\]\s*(.+?)(?=\[|$)'

    # Try pattern 1 first
    matches = re.findall(pattern1, text, re.MULTILINE | re.DOTALL)
    if matches:
        for speaker, content in matches:
            segments.append({
                "speaker": speaker.strip(),
                "content": content.strip()
            })
    else:
        # Try pattern 2
        matches = re.findall(pattern2, text, re.DOTALL)
        for speaker, content in matches:
            segments.append({
                "speaker": speaker.strip(),
                "content": content.strip()
            })

    # If no speaker labels found, treat entire text as one segment
    if not segments:
        segments.append({
            "speaker": "Unknown",
            "content": text
        })

    return segments


def extract_sentences(text: str) -> list[str]:
    """Extract sentences from text."""
    blob = TextBlob(text)
    return [str(s) for s in blob.sentences]


def extract_themes(text: str, top_n: int = 20) -> dict:
    """Extract themes from text using word frequency and phrase analysis."""
    # Tokenize and clean
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
    filtered_words = [w for w in words if w not in STOPWORDS]

    # Word frequency
    word_counts = Counter(filtered_words)

    # Boost K-12 terms
    boosted_counts = Counter()
    for word, count in word_counts.items():
        if word in K12_TERMS:
            boosted_counts[word] = count * 1.5
        else:
            boosted_counts[word] = count

    # Extract 2-word and 3-word phrases
    bigrams = []
    trigrams = []
    for i in range(len(filtered_words) - 1):
        bigrams.append(f"{filtered_words[i]} {filtered_words[i+1]}")
    for i in range(len(filtered_words) - 2):
        trigrams.append(f"{filtered_words[i]} {filtered_words[i+1]} {filtered_words[i+2]}")

    bigram_counts = Counter(bigrams)
    trigram_counts = Counter(trigrams)

    # Filter to meaningful phrases (appear at least twice)
    meaningful_bigrams = {k: v for k, v in bigram_counts.items() if v >= 2}
    meaningful_trigrams = {k: v for k, v in trigram_counts.items() if v >= 2}

    return {
        "top_words": [word for word, _ in boosted_counts.most_common(top_n)],
        "word_frequency": dict(word_counts.most_common(top_n * 2)),
        "key_phrases": dict(Counter(meaningful_bigrams).most_common(top_n)),
        "long_phrases": dict(Counter(meaningful_trigrams).most_common(10))
    }


def analyze_sentiment_by_segment(segments: list[dict]) -> dict:
    """Analyze sentiment across transcript segments."""
    sentiment_data = []

    for segment in segments:
        blob = TextBlob(segment["content"])
        sentiment_data.append({
            "speaker": segment["speaker"],
            "polarity": blob.sentiment.polarity,
            "subjectivity": blob.sentiment.subjectivity,
            "length": len(segment["content"])
        })

    if not sentiment_data:
        return {}

    avg_polarity = sum(s["polarity"] for s in sentiment_data) / len(sentiment_data)
    avg_subjectivity = sum(s["subjectivity"] for s in sentiment_data) / len(sentiment_data)

    # Categorize overall sentiment
    positive_segments = [s for s in sentiment_data if s["polarity"] > 0.1]
    negative_segments = [s for s in sentiment_data if s["polarity"] < -0.1]
    neutral_segments = [s for s in sentiment_data if -0.1 <= s["polarity"] <= 0.1]

    # Speaker-specific sentiment
    speaker_sentiment = defaultdict(list)
    for s in sentiment_data:
        speaker_sentiment[s["speaker"]].append(s["polarity"])

    speaker_averages = {
        speaker: round(sum(polarities) / len(polarities), 3)
        for speaker, polarities in speaker_sentiment.items()
    }

    return {
        "overall": {
            "average_polarity": round(avg_polarity, 3),
            "average_subjectivity": round(avg_subjectivity, 3),
            "positive_segments": len(positive_segments),
            "negative_segments": len(negative_segments),
            "neutral_segments": len(neutral_segments)
        },
        "by_speaker": speaker_averages
    }


def extract_key_quotes(text: str, themes: list[str], max_quotes: int = 10) -> list[dict]:
    """Extract quotes that contain key themes."""
    sentences = extract_sentences(text)
    quotes = []

    for sentence in sentences:
        sentence_lower = sentence.lower()
        matching_themes = [t for t in themes if t in sentence_lower]

        if matching_themes and 30 < len(sentence) < 500:
            quotes.append({
                "quote": sentence.strip(),
                "themes": matching_themes,
                "theme_count": len(matching_themes)
            })

    # Sort by theme count and take top quotes
    quotes.sort(key=lambda x: x["theme_count"], reverse=True)
    return quotes[:max_quotes]


def categorize_themes(themes: dict) -> dict:
    """Categorize themes into K-12 strategic planning categories."""
    categories = {
        "student_achievement": [],
        "equity_access": [],
        "staff_quality": [],
        "community_engagement": [],
        "technology": [],
        "facilities_resources": [],
        "safety_wellness": [],
        "fiscal": [],
        "other": []
    }

    # Mapping of keywords to categories
    category_keywords = {
        "student_achievement": ["student", "learning", "achievement", "success", "academic", "curriculum", "instruction", "assessment", "grade", "test", "score"],
        "equity_access": ["equity", "access", "inclusive", "gap", "diversity", "equal", "fair", "opportunity", "underserved"],
        "staff_quality": ["teacher", "staff", "professional", "development", "training", "retention", "hiring", "support"],
        "community_engagement": ["parent", "family", "community", "engagement", "communication", "partnership", "involvement"],
        "technology": ["technology", "digital", "device", "online", "computer", "software", "internet", "tech"],
        "facilities_resources": ["facility", "building", "space", "resource", "material", "equipment", "infrastructure"],
        "safety_wellness": ["safety", "security", "wellness", "mental", "health", "social", "emotional", "climate", "culture"],
        "fiscal": ["budget", "funding", "fiscal", "financial", "cost", "money", "resource"]
    }

    top_words = themes.get("top_words", [])

    for word in top_words:
        categorized = False
        for category, keywords in category_keywords.items():
            if any(kw in word for kw in keywords):
                categories[category].append(word)
                categorized = True
                break
        if not categorized:
            categories["other"].append(word)

    # Remove empty categories
    return {k: v for k, v in categories.items() if v}


def process_single_transcript(file_path: Path) -> dict:
    """Process a single transcript file."""
    text = load_transcript(file_path)

    segments = extract_speaker_segments(text)
    themes = extract_themes(text)
    sentiment = analyze_sentiment_by_segment(segments)
    categorized = categorize_themes(themes)
    quotes = extract_key_quotes(text, themes["top_words"][:10])

    return {
        "file": file_path.name,
        "word_count": len(text.split()),
        "segment_count": len(segments),
        "speakers": list(set(s["speaker"] for s in segments)),
        "themes": themes,
        "categorized_themes": categorized,
        "sentiment": sentiment,
        "key_quotes": quotes
    }


def merge_transcript_analyses(analyses: list[dict]) -> dict:
    """Merge analyses from multiple transcripts."""
    all_words = Counter()
    all_phrases = Counter()
    all_categories = defaultdict(list)
    all_quotes = []
    all_speakers = set()

    for analysis in analyses:
        # Merge word frequencies
        word_freq = analysis.get("themes", {}).get("word_frequency", {})
        for word, count in word_freq.items():
            all_words[word] += count

        # Merge phrases
        phrases = analysis.get("themes", {}).get("key_phrases", {})
        for phrase, count in phrases.items():
            all_phrases[phrase] += count

        # Merge categorized themes
        for category, words in analysis.get("categorized_themes", {}).items():
            all_categories[category].extend(words)

        # Collect quotes
        all_quotes.extend(analysis.get("key_quotes", []))

        # Collect speakers
        all_speakers.update(analysis.get("speakers", []))

    # Deduplicate category words
    dedupe_categories = {k: list(set(v)) for k, v in all_categories.items()}

    # Sort quotes by theme count
    all_quotes.sort(key=lambda x: x.get("theme_count", 0), reverse=True)

    return {
        "transcript_count": len(analyses),
        "total_word_count": sum(a.get("word_count", 0) for a in analyses),
        "unique_speakers": list(all_speakers),
        "merged_themes": {
            "top_words": [w for w, _ in all_words.most_common(30)],
            "word_frequency": dict(all_words.most_common(50)),
            "key_phrases": dict(all_phrases.most_common(20))
        },
        "categorized_themes": dedupe_categories,
        "top_quotes": all_quotes[:15],
        "individual_analyses": analyses
    }


def generate_markdown_summary(analysis: dict, output_path: Path) -> None:
    """Generate a markdown summary of transcript analysis."""
    md = ["# Transcript Analysis Summary\n"]

    if "transcript_count" in analysis:
        md.append(f"**Transcripts Analyzed:** {analysis['transcript_count']}\n")
        md.append(f"**Total Words:** {analysis.get('total_word_count', 'N/A'):,}\n")
        md.append(f"**Unique Speakers:** {len(analysis.get('unique_speakers', []))}\n")
    else:
        md.append(f"**Words:** {analysis.get('word_count', 'N/A'):,}\n")
        md.append(f"**Speakers:** {', '.join(analysis.get('speakers', ['Unknown']))}\n")

    md.append("\n---\n")

    # Categorized Themes
    md.append("## Themes by Category\n")
    categories = analysis.get("categorized_themes", {})
    for category, words in categories.items():
        category_display = category.replace("_", " ").title()
        md.append(f"\n### {category_display}\n")
        md.append(f"{', '.join(words[:10])}\n")

    # Key Phrases
    md.append("\n## Key Phrases\n")
    if "merged_themes" in analysis:
        phrases = analysis["merged_themes"].get("key_phrases", {})
    else:
        phrases = analysis.get("themes", {}).get("key_phrases", {})

    for phrase, count in list(phrases.items())[:10]:
        md.append(f"- \"{phrase}\" ({count} mentions)\n")

    # Top Quotes
    md.append("\n## Key Quotes\n")
    quotes = analysis.get("top_quotes", analysis.get("key_quotes", []))
    for quote_data in quotes[:8]:
        quote = quote_data.get("quote", "")
        themes = quote_data.get("themes", [])
        md.append(f"\n> {quote}\n")
        md.append(f"*Themes: {', '.join(themes)}*\n")

    output_path.write_text("".join(md))


def main():
    parser = argparse.ArgumentParser(
        description="Process focus group transcripts for K-12 strategic planning"
    )
    parser.add_argument("--input", "-i", help="Single transcript file path")
    parser.add_argument("--input-dir", "-d", help="Directory containing transcript files")
    parser.add_argument("--output", "-o", required=True, help="Output JSON file path")

    args = parser.parse_args()

    if not args.input and not args.input_dir:
        print(json.dumps({"success": False, "error": "Must specify --input or --input-dir"}))
        sys.exit(1)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    analyses = []

    if args.input:
        # Process single file
        input_path = Path(args.input)
        if not input_path.exists():
            print(json.dumps({"success": False, "error": f"File not found: {input_path}"}))
            sys.exit(1)
        analyses.append(process_single_transcript(input_path))

    if args.input_dir:
        # Process directory
        input_dir = Path(args.input_dir)
        if not input_dir.exists():
            print(json.dumps({"success": False, "error": f"Directory not found: {input_dir}"}))
            sys.exit(1)

        for file_path in input_dir.glob("*.txt"):
            try:
                analyses.append(process_single_transcript(file_path))
            except Exception as e:
                print(f"Warning: Failed to process {file_path}: {e}", file=sys.stderr)

    if not analyses:
        print(json.dumps({"success": False, "error": "No transcripts processed"}))
        sys.exit(1)

    # Merge if multiple, otherwise use single
    if len(analyses) == 1:
        final_analysis = analyses[0]
    else:
        final_analysis = merge_transcript_analyses(analyses)

    final_analysis["success"] = True

    # Save JSON
    output_path.write_text(json.dumps(final_analysis, indent=2))

    # Generate markdown summary
    md_path = output_path.with_suffix(".md")
    generate_markdown_summary(final_analysis, md_path)

    result = {
        "success": True,
        "json_output": str(output_path),
        "markdown_output": str(md_path),
        "transcripts_processed": len(analyses),
        "message": f"Transcript analysis complete. Results saved to {output_path}"
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
