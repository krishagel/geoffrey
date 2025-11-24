#!/usr/bin/env python3
# /// script
# dependencies = []
# ///
"""
Open a note in Obsidian using Actions URI.

Usage:
    uv run open-in-obsidian.py "path/to/note.md"

Arguments:
    path - Path to note relative to vault root

Examples:
    uv run open-in-obsidian.py "Geoffrey/Research/2025-11-23-ai-comparison.md"
    uv run open-in-obsidian.py "People/John Smith.md"
"""

import sys
import subprocess
import urllib.parse
from pathlib import Path

VAULT_NAME = "Personal_Notes"
VAULT_PATH = Path.home() / "Library/Mobile Documents/iCloud~md~obsidian/Documents/Personal_Notes"


def open_in_obsidian(note_path: str) -> bool:
    """Open a note in Obsidian using Actions URI."""

    # Remove .md extension if present (Actions URI doesn't need it)
    if note_path.endswith('.md'):
        note_path = note_path[:-3]

    # URL encode the path
    encoded_path = urllib.parse.quote(note_path, safe='')

    # Build Actions URI
    # Using actions-uri plugin: obsidian://actions-uri/note/open
    uri = f"obsidian://actions-uri/note/open?vault={urllib.parse.quote(VAULT_NAME)}&file={encoded_path}"

    try:
        # Open the URI (macOS)
        subprocess.run(['open', uri], check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error opening note: {e}")
        return False


def main():
    if len(sys.argv) < 2:
        print("Usage: uv run open-in-obsidian.py \"path/to/note.md\"")
        print("\nExamples:")
        print("  uv run open-in-obsidian.py \"Geoffrey/Research/note.md\"")
        print("  uv run open-in-obsidian.py \"People/John Smith.md\"")
        sys.exit(1)

    note_path = sys.argv[1]

    # Verify file exists
    full_path = VAULT_PATH / note_path
    if not full_path.exists():
        print(f"Warning: Note does not exist at {full_path}")
        print("Attempting to open anyway (Obsidian may create it)...")

    print(f"Opening in Obsidian: {note_path}")

    if open_in_obsidian(note_path):
        print("Note opened successfully")
    else:
        print("Failed to open note")
        sys.exit(1)


if __name__ == "__main__":
    main()
