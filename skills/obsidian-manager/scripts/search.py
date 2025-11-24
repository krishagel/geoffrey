#!/usr/bin/env python3
# /// script
# dependencies = ["python-frontmatter"]
# ///
"""
Search Obsidian vault for keyword matches.

Usage:
    uv run search.py "query" [folder] [--limit N]

Arguments:
    query   - Search term or phrase
    folder  - Optional subfolder to search (default: entire vault)
    --limit - Maximum results to return (default: 20)

Examples:
    uv run search.py "prompt engineering"
    uv run search.py "leadership" People
    uv run search.py "AI" Readwise/Articles --limit 10
"""

import sys
import os
import json
import re
from pathlib import Path

VAULT_PATH = Path.home() / "Library/Mobile Documents/iCloud~md~obsidian/Documents/Personal_Notes"


def search_vault(query: str, folder: str = "", limit: int = 20) -> list[dict]:
    """Search vault for query matches."""
    results = []
    search_path = VAULT_PATH / folder if folder else VAULT_PATH

    if not search_path.exists():
        print(f"Error: Path does not exist: {search_path}")
        sys.exit(1)

    # Case-insensitive search pattern
    pattern = re.compile(re.escape(query), re.IGNORECASE)

    for md_file in search_path.rglob("*.md"):
        try:
            content = md_file.read_text(encoding='utf-8')
            matches = list(pattern.finditer(content))

            if matches:
                # Get context around first match
                first_match = matches[0]
                start = max(0, first_match.start() - 100)
                end = min(len(content), first_match.end() + 100)
                excerpt = content[start:end].strip()

                # Clean up excerpt
                excerpt = re.sub(r'\s+', ' ', excerpt)
                if start > 0:
                    excerpt = "..." + excerpt
                if end < len(content):
                    excerpt = excerpt + "..."

                results.append({
                    "file": str(md_file.relative_to(VAULT_PATH)),
                    "matches": len(matches),
                    "excerpt": excerpt
                })

                if len(results) >= limit:
                    break

        except Exception as e:
            continue  # Skip files that can't be read

    # Sort by number of matches
    results.sort(key=lambda x: x["matches"], reverse=True)
    return results[:limit]


def main():
    if len(sys.argv) < 2:
        print("Usage: uv run search.py \"query\" [folder] [--limit N]")
        sys.exit(1)

    query = sys.argv[1]
    folder = ""
    limit = 20

    # Parse arguments
    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == "--limit" and i + 1 < len(sys.argv):
            limit = int(sys.argv[i + 1])
            i += 2
        else:
            folder = sys.argv[i]
            i += 1

    print(f"Searching for '{query}' in {folder or 'entire vault'}...")
    results = search_vault(query, folder, limit)

    if not results:
        print(f"\nNo results found for '{query}'")
        return

    print(f"\nFound {len(results)} results:\n")

    for i, result in enumerate(results, 1):
        print(f"{i}. **{result['file']}** ({result['matches']} matches)")
        print(f"   {result['excerpt']}\n")

    # Output JSON for programmatic use
    print(f"\n{json.dumps({'results': results, 'total': len(results)})}")


if __name__ == "__main__":
    main()
