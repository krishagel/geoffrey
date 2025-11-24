#!/usr/bin/env python3
# /// script
# dependencies = ["python-frontmatter", "pyyaml"]
# ///
"""
Search Snipd podcast transcripts and snips.

Usage:
    uv run search-snipd.py "query" [--show "podcast name"]

Arguments:
    query  - Search term or phrase
    --show - Filter by podcast show name

Examples:
    uv run search-snipd.py "machine learning"
    uv run search-snipd.py "leadership" --show "Huberman Lab"
"""

import sys
import os
import json
import re
from pathlib import Path
import frontmatter

VAULT_PATH = Path.home() / "Library/Mobile Documents/iCloud~md~obsidian/Documents/Personal_Notes"
SNIPD_PATH = VAULT_PATH / "Snipd"


def search_snipd(query: str, show: str = "", limit: int = 15) -> list[dict]:
    """Search Snipd podcast transcripts."""
    results = []

    search_path = SNIPD_PATH / "Data"
    if not search_path.exists():
        search_path = SNIPD_PATH

    pattern = re.compile(re.escape(query), re.IGNORECASE)
    show_pattern = re.compile(re.escape(show), re.IGNORECASE) if show else None

    for md_file in search_path.rglob("*.md"):
        try:
            post = frontmatter.load(md_file)
            content = post.content
            metadata = post.metadata

            # Filter by show if specified
            if show_pattern:
                episode_show = metadata.get("episode_show", "")
                if not show_pattern.search(episode_show):
                    continue

            # Search in content
            matches = list(pattern.finditer(content))
            if not matches:
                continue

            # Extract snips (look for timestamp patterns and quotes)
            snips = []
            lines = content.split('\n')
            for j, line in enumerate(lines):
                if pattern.search(line):
                    # Get context (this line and surrounding)
                    start = max(0, j - 1)
                    end = min(len(lines), j + 2)
                    context = ' '.join(lines[start:end]).strip()
                    context = re.sub(r'\s+', ' ', context)
                    if context:
                        snips.append(context[:300])

            results.append({
                "file": str(md_file.relative_to(VAULT_PATH)),
                "title": metadata.get("episode_title", md_file.stem),
                "show": metadata.get("episode_show", "Unknown"),
                "date": str(metadata.get("episode_publish_date", "")),
                "snips_count": metadata.get("snips_count", 0),
                "matches": len(matches),
                "excerpts": snips[:3]  # Top 3 matching excerpts
            })

            if len(results) >= limit:
                break

        except Exception as e:
            continue

    # Sort by number of matches
    results.sort(key=lambda x: x["matches"], reverse=True)
    return results[:limit]


def main():
    if len(sys.argv) < 2:
        print("Usage: uv run search-snipd.py \"query\" [--show \"podcast name\"]")
        sys.exit(1)

    query = sys.argv[1]
    show = ""

    # Parse arguments
    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == "--show" and i + 1 < len(sys.argv):
            show = sys.argv[i + 1]
            i += 2
        else:
            i += 1

    filter_str = f" (show: {show})" if show else ""

    print(f"Searching Snipd podcasts for '{query}'{filter_str}...")
    results = search_snipd(query, show)

    if not results:
        print(f"\nNo Snipd episodes found for '{query}'")
        return

    print(f"\nFound {len(results)} episodes:\n")

    for i, result in enumerate(results, 1):
        print(f"{i}. **{result['title']}**")
        print(f"   Show: {result['show']} | Date: {result['date']} | Snips: {result['snips_count']} | {result['matches']} matches")
        print(f"   File: {result['file']}")
        if result['excerpts']:
            print(f"   Excerpts:")
            for e in result['excerpts']:
                print(f"     - {e[:200]}{'...' if len(e) > 200 else ''}")
        print()

    # Output JSON for programmatic use
    print(f"\n{json.dumps({'results': results, 'total': len(results)})}")


if __name__ == "__main__":
    main()
