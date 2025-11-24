#!/usr/bin/env python3
# /// script
# dependencies = ["python-frontmatter", "pyyaml"]
# ///
"""
Create a new note in the Obsidian vault with proper frontmatter.

Usage:
    uv run create-note.py "title" "content" [--folder path] [--tags tag1,tag2] [--related "[[Note]]"]

Arguments:
    title    - Note title (will be used for filename)
    content  - Note content (markdown)
    --folder - Folder path relative to vault (default: Geoffrey/Research)
    --tags   - Comma-separated tags
    --related - Comma-separated related notes as wiki-links

Examples:
    uv run create-note.py "AI Model Comparison" "Content..." --folder Geoffrey/Research --tags research,ai
    uv run create-note.py "Meeting Notes" "Content..." --folder Meetings --related "[[John Smith]],[[Project]]"
"""

import sys
import os
import json
import re
from pathlib import Path
from datetime import datetime
import frontmatter

VAULT_PATH = Path.home() / "Library/Mobile Documents/iCloud~md~obsidian/Documents/Personal_Notes"


def slugify(title: str) -> str:
    """Convert title to filename-safe slug."""
    # Replace spaces with hyphens, remove special chars
    slug = re.sub(r'[^\w\s-]', '', title.lower())
    slug = re.sub(r'[-\s]+', '-', slug).strip('-')
    return slug


def create_note(
    title: str,
    content: str,
    folder: str = "Geoffrey/Research",
    tags: list[str] = None,
    related: list[str] = None
) -> str:
    """Create a new note with frontmatter."""

    # Ensure folder exists
    folder_path = VAULT_PATH / folder
    folder_path.mkdir(parents=True, exist_ok=True)

    # Generate filename
    date_prefix = datetime.now().strftime("%Y-%m-%d")
    slug = slugify(title)
    filename = f"{date_prefix}-{slug}.md"
    file_path = folder_path / filename

    # Check if file exists
    if file_path.exists():
        # Add timestamp to make unique
        timestamp = datetime.now().strftime("%H%M%S")
        filename = f"{date_prefix}-{slug}-{timestamp}.md"
        file_path = folder_path / filename

    # Build frontmatter
    metadata = {
        "created": datetime.now().strftime("%Y-%m-%d"),
        "source": "geoffrey"
    }

    if tags:
        metadata["tags"] = ["geoffrey"] + [t.strip() for t in tags if t.strip()]
    else:
        metadata["tags"] = ["geoffrey"]

    if related:
        metadata["related"] = [r.strip() for r in related if r.strip()]

    # Create the post
    post = frontmatter.Post(content)
    post.metadata = metadata

    # Add title as H1 if not already present
    if not content.strip().startswith('#'):
        post.content = f"# {title}\n\n{content}"

    # Write file
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(frontmatter.dumps(post))

    return str(file_path.relative_to(VAULT_PATH))


def main():
    if len(sys.argv) < 3:
        print("Usage: uv run create-note.py \"title\" \"content\" [--folder path] [--tags t1,t2] [--related \"[[Note]]\"]")
        sys.exit(1)

    title = sys.argv[1]
    content = sys.argv[2]
    folder = "Geoffrey/Research"
    tags = []
    related = []

    # Parse arguments
    i = 3
    while i < len(sys.argv):
        if sys.argv[i] == "--folder" and i + 1 < len(sys.argv):
            folder = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == "--tags" and i + 1 < len(sys.argv):
            tags = sys.argv[i + 1].split(',')
            i += 2
        elif sys.argv[i] == "--related" and i + 1 < len(sys.argv):
            related = sys.argv[i + 1].split(',')
            i += 2
        else:
            i += 1

    print(f"Creating note: {title}")
    print(f"Folder: {folder}")
    if tags:
        print(f"Tags: {', '.join(tags)}")
    if related:
        print(f"Related: {', '.join(related)}")

    relative_path = create_note(title, content, folder, tags, related)
    full_path = VAULT_PATH / relative_path

    print(f"\nNote created: {relative_path}")

    # Output JSON for programmatic use
    result = {
        "success": True,
        "path": relative_path,
        "full_path": str(full_path),
        "folder": folder,
        "title": title
    }
    print(f"\n{json.dumps(result)}")


if __name__ == "__main__":
    main()
