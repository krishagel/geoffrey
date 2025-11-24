#!/usr/bin/env python3
# /// script
# dependencies = ["python-frontmatter", "pyyaml"]
# ///
"""
Search Readwise highlights by topic, author, or category.

Usage:
    uv run search-readwise.py "query" [--author "name"] [--category articles|books|podcasts|tweets]

Arguments:
    query      - Search term or phrase
    --author   - Filter by author name
    --category - Filter by category (articles, books, podcasts, tweets)

Examples:
    uv run search-readwise.py "second brain"
    uv run search-readwise.py "AI" --author "Andrej Karpathy"
    uv run search-readwise.py "habits" --category books
"""

import sys
import os
import json
import re
from pathlib import Path
import frontmatter

VAULT_PATH = Path.home() / "Library/Mobile Documents/iCloud~md~obsidian/Documents/Personal_Notes"
READWISE_PATH = VAULT_PATH / "Readwise"


def search_readwise(query: str, author: str = "", category: str = "", limit: int = 15) -> list[dict]:
    """Search Readwise highlights."""
    results = []

    # Determine search paths based on category
    if category:
        category_map = {
            "articles": "Articles",
            "books": "Books",
            "podcasts": "Podcasts",
            "tweets": "Tweets"
        }
        search_paths = [READWISE_PATH / category_map.get(category.lower(), category)]
    else:
        search_paths = [
            READWISE_PATH / "Articles",
            READWISE_PATH / "Books",
            READWISE_PATH / "Podcasts",
            READWISE_PATH / "Tweets"
        ]

    pattern = re.compile(re.escape(query), re.IGNORECASE)
    author_pattern = re.compile(re.escape(author), re.IGNORECASE) if author else None

    for search_path in search_paths:
        if not search_path.exists():
            continue

        for md_file in search_path.rglob("*.md"):
            try:
                post = frontmatter.load(md_file)
                content = post.content
                metadata = post.metadata

                # Filter by author if specified
                if author_pattern:
                    file_author = metadata.get("Author", "")
                    if not author_pattern.search(file_author):
                        continue

                # Search in content
                matches = list(pattern.finditer(content))
                if not matches:
                    continue

                # Extract highlights (lines starting with - or >)
                highlights = []
                for line in content.split('\n'):
                    line = line.strip()
                    if (line.startswith('-') or line.startswith('>')) and pattern.search(line):
                        highlights.append(line[:200])

                # Get context around first match if no highlight found
                if not highlights and matches:
                    first_match = matches[0]
                    start = max(0, first_match.start() - 50)
                    end = min(len(content), first_match.end() + 150)
                    excerpt = content[start:end].strip()
                    excerpt = re.sub(r'\s+', ' ', excerpt)
                    highlights = [excerpt]

                results.append({
                    "file": str(md_file.relative_to(VAULT_PATH)),
                    "title": metadata.get("Full Title", md_file.stem),
                    "author": metadata.get("Author", "Unknown"),
                    "category": search_path.name,
                    "matches": len(matches),
                    "highlights": highlights[:3]  # Top 3 matching highlights
                })

                if len(results) >= limit:
                    break

            except Exception as e:
                continue

        if len(results) >= limit:
            break

    # Sort by number of matches
    results.sort(key=lambda x: x["matches"], reverse=True)
    return results[:limit]


def main():
    if len(sys.argv) < 2:
        print("Usage: uv run search-readwise.py \"query\" [--author \"name\"] [--category type]")
        sys.exit(1)

    query = sys.argv[1]
    author = ""
    category = ""

    # Parse arguments
    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == "--author" and i + 1 < len(sys.argv):
            author = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == "--category" and i + 1 < len(sys.argv):
            category = sys.argv[i + 1]
            i += 2
        else:
            i += 1

    filters = []
    if author:
        filters.append(f"author: {author}")
    if category:
        filters.append(f"category: {category}")
    filter_str = f" ({', '.join(filters)})" if filters else ""

    print(f"Searching Readwise for '{query}'{filter_str}...")
    results = search_readwise(query, author, category)

    if not results:
        print(f"\nNo Readwise highlights found for '{query}'")
        return

    print(f"\nFound {len(results)} sources:\n")

    for i, result in enumerate(results, 1):
        print(f"{i}. **{result['title']}**")
        print(f"   Author: {result['author']} | Category: {result['category']} | {result['matches']} matches")
        print(f"   File: {result['file']}")
        if result['highlights']:
            print(f"   Highlights:")
            for h in result['highlights']:
                print(f"     - {h[:150]}{'...' if len(h) > 150 else ''}")
        print()

    # Output JSON for programmatic use
    print(f"\n{json.dumps({'results': results, 'total': len(results)})}")


if __name__ == "__main__":
    main()
