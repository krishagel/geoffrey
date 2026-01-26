#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "httpx",
#     "pydub",
#     "audioop-lts; python_version >= '3.13'",
# ]
# ///
"""
Eleven Labs Text-to-Speech Generator

Generate audio from text using the Eleven Labs API.
Supports automatic chunking for long text and concatenation.

Usage:
    uv run generate_audio.py --text "Hello world"
    uv run generate_audio.py --file input.txt --voice Josh --output output.mp3
"""

import argparse
import json
import re
import sys
import tempfile
from datetime import datetime
from pathlib import Path

import httpx
from pydub import AudioSegment

# Load API key from 1Password via centralized secrets module
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "scripts"))
from secrets import get_secret

API_KEY = get_secret("ELEVENLABS_API_KEY")
BASE_URL = "https://api.elevenlabs.io/v1"

# Curated voices mapping (name -> ID)
VOICES = {
    "rachel": "21m00Tcm4TlvDq8ikWAM",
    "bella": "EXAVITQu4vr4xnSDxMaL",
    "elli": "MF3mGyEYCl7XYWbV9V6O",
    "josh": "TxGEqnHWrfWFTfGW9XjX",
    "adam": "pNInz6obpgDQGcFmaJgB",
    "antoni": "ErXwobaYiN019PkySvjV",
}

# Model character limits
MODEL_LIMITS = {
    "eleven_multilingual_v2": 10000,
    "eleven_flash_v2_5": 40000,
    "eleven_turbo_v2_5": 40000,
    "eleven_v3": 3000,
}

DEFAULT_VOICE = "rachel"
DEFAULT_MODEL = "eleven_multilingual_v2"


def get_voice_id(voice: str) -> str:
    """Get voice ID from name or return as-is if already an ID."""
    voice_lower = voice.lower()
    if voice_lower in VOICES:
        return VOICES[voice_lower]
    # Assume it's already a voice ID
    return voice


def chunk_text(text: str, max_chars: int) -> list[str]:
    """Split text into chunks at sentence boundaries."""
    if len(text) <= max_chars:
        return [text]

    chunks = []
    current_chunk = ""

    # Split by sentence-ending punctuation
    sentences = re.split(r'(?<=[.!?])\s+', text)

    for sentence in sentences:
        if len(current_chunk) + len(sentence) + 1 <= max_chars:
            current_chunk = (current_chunk + " " + sentence).strip()
        else:
            if current_chunk:
                chunks.append(current_chunk)
            # Handle sentences longer than max_chars
            if len(sentence) > max_chars:
                # Split by commas or spaces as fallback
                words = sentence.split()
                current_chunk = ""
                for word in words:
                    if len(current_chunk) + len(word) + 1 <= max_chars:
                        current_chunk = (current_chunk + " " + word).strip()
                    else:
                        if current_chunk:
                            chunks.append(current_chunk)
                        current_chunk = word
            else:
                current_chunk = sentence

    if current_chunk:
        chunks.append(current_chunk)

    return chunks


def generate_audio_chunk(text: str, voice_id: str, model: str) -> bytes:
    """Generate audio for a single chunk of text."""
    url = f"{BASE_URL}/text-to-speech/{voice_id}"

    headers = {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }

    payload = {
        "text": text,
        "model_id": model,
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
        }
    }

    with httpx.Client(timeout=120.0) as client:
        response = client.post(url, headers=headers, json=payload)

        if response.status_code != 200:
            error_detail = response.text
            raise Exception(f"API error {response.status_code}: {error_detail}")

        return response.content


def concatenate_audio(audio_chunks: list[bytes], output_path: Path) -> None:
    """Concatenate multiple MP3 audio chunks into a single file."""
    if len(audio_chunks) == 1:
        output_path.write_bytes(audio_chunks[0])
        return

    combined = AudioSegment.empty()

    for i, chunk_bytes in enumerate(audio_chunks):
        # Write to temp file for pydub to read
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            tmp.write(chunk_bytes)
            tmp_path = tmp.name

        try:
            segment = AudioSegment.from_mp3(tmp_path)
            combined += segment
        finally:
            os.unlink(tmp_path)

    combined.export(str(output_path), format="mp3")


def generate_audio(
    text: str,
    voice: str = DEFAULT_VOICE,
    model: str = DEFAULT_MODEL,
    output: str | None = None,
) -> dict:
    """Generate audio from text."""
    if not API_KEY:
        return {
            "success": False,
            "error": "ELEVENLABS_API_KEY not available. Ensure 1Password CLI is configured. See docs/1password-setup.md"
        }

    voice_id = get_voice_id(voice)
    max_chars = MODEL_LIMITS.get(model, 10000)

    # Chunk text if needed
    chunks = chunk_text(text, max_chars)

    # Generate audio for each chunk
    audio_chunks = []
    for i, chunk in enumerate(chunks):
        try:
            audio_data = generate_audio_chunk(chunk, voice_id, model)
            audio_chunks.append(audio_data)
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed on chunk {i + 1}/{len(chunks)}: {str(e)}"
            }

    # Determine output path
    if output:
        output_path = Path(output).expanduser()
    else:
        timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
        output_path = Path.home() / "Desktop" / f"audio_{timestamp}.mp3"

    # Ensure parent directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Concatenate and save
    try:
        concatenate_audio(audio_chunks, output_path)
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to save audio: {str(e)}"
        }

    # Get voice name for display
    voice_name = voice.title() if voice.lower() in VOICES else voice

    return {
        "success": True,
        "file": str(output_path),
        "voice": voice_name,
        "model": model,
        "characters": len(text),
        "chunks": len(chunks),
    }


def main():
    parser = argparse.ArgumentParser(description="Generate audio from text using Eleven Labs")

    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument("--text", help="Text content to convert")
    input_group.add_argument("--file", help="Path to text file")

    parser.add_argument("--voice", default=DEFAULT_VOICE,
                        help=f"Voice name or ID (default: {DEFAULT_VOICE})")
    parser.add_argument("--model", default=DEFAULT_MODEL,
                        help=f"Model ID (default: {DEFAULT_MODEL})")
    parser.add_argument("--output", "-o", help="Output file path")

    args = parser.parse_args()

    # Get text content
    if args.text:
        text = args.text
    else:
        file_path = Path(args.file).expanduser()
        if not file_path.exists():
            print(json.dumps({"success": False, "error": f"File not found: {args.file}"}))
            sys.exit(1)
        text = file_path.read_text()

    # Generate audio
    result = generate_audio(
        text=text,
        voice=args.voice,
        model=args.model,
        output=args.output,
    )

    print(json.dumps(result, indent=2))
    sys.exit(0 if result["success"] else 1)


if __name__ == "__main__":
    main()
