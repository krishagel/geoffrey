#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "httpx",
#     "python-dotenv",
# ]
# ///
"""
List available Eleven Labs voices.

Usage:
    uv run list_voices.py           # Show premade voices
    uv run list_voices.py --all     # Show all voices including cloned
    uv run list_voices.py --json    # Output as JSON
"""

import argparse
import json
import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

# Load secrets
SECRETS_PATH = Path.home() / "Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/secrets/.env"
if SECRETS_PATH.exists():
    load_dotenv(SECRETS_PATH)

API_KEY = os.getenv("ELEVENLABS_API_KEY")
BASE_URL = "https://api.elevenlabs.io/v2"


def list_voices(show_all: bool = False) -> dict:
    """Fetch available voices from Eleven Labs API."""
    if not API_KEY:
        return {
            "success": False,
            "error": "ELEVENLABS_API_KEY not set. Add to ~/Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/secrets/.env"
        }

    url = f"{BASE_URL}/voices"
    headers = {
        "xi-api-key": API_KEY,
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.get(url, headers=headers)

            if response.status_code != 200:
                return {
                    "success": False,
                    "error": f"API error {response.status_code}: {response.text}"
                }

            data = response.json()
    except Exception as e:
        return {
            "success": False,
            "error": f"Request failed: {str(e)}"
        }

    voices = []
    for voice in data.get("voices", []):
        # Filter to premade voices unless --all
        if not show_all and voice.get("category") not in ["premade", "professional"]:
            continue

        voice_info = {
            "name": voice.get("name"),
            "voice_id": voice.get("voice_id"),
            "category": voice.get("category"),
            "labels": voice.get("labels", {}),
            "preview_url": voice.get("preview_url"),
        }
        voices.append(voice_info)

    # Sort by name
    voices.sort(key=lambda v: v["name"].lower())

    return {
        "success": True,
        "count": len(voices),
        "voices": voices,
    }


def format_table(voices: list) -> str:
    """Format voices as a readable table."""
    lines = []
    lines.append(f"{'Name':<20} {'ID':<26} {'Category':<12} {'Labels'}")
    lines.append("-" * 80)

    for v in voices:
        labels = v.get("labels", {})
        label_str = ", ".join(f"{k}: {v}" for k, v in labels.items() if k in ["accent", "age", "gender"])
        lines.append(f"{v['name']:<20} {v['voice_id']:<26} {v['category']:<12} {label_str}")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="List available Eleven Labs voices")
    parser.add_argument("--all", action="store_true", help="Show all voices including cloned")
    parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()

    result = list_voices(show_all=args.all)

    if not result["success"]:
        print(json.dumps(result, indent=2))
        sys.exit(1)

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"\nFound {result['count']} voices:\n")
        print(format_table(result["voices"]))
        print(f"\nUse --json for full details including preview URLs.")

    sys.exit(0)


if __name__ == "__main__":
    main()
