"""
Local TTS audio generation using MLX and Kokoro model.

Usage (MUST use --with flags for dependencies):
    uv run --with mlx-audio --with pydub skills/local-tts/scripts/generate_audio.py \\
        --text "Hello world" --output ~/Desktop/test.mp3

    uv run --with mlx-audio --with pydub skills/local-tts/scripts/generate_audio.py \\
        --file /tmp/script.txt --voice af_bella --output ~/Desktop/podcast.mp3

Note: Do NOT use PEP 723 inline deps - mlx-audio requires cached uv environment.
"""

import argparse
import json
import os
import sys
import tempfile
import time
from pathlib import Path


# Kokoro voice presets
VOICES = {
    # American English Female
    "af_heart": "Warm, friendly female (default)",
    "af_bella": "Soft, calm female",
    "af_nicole": "Soft, hesitant female",
    "af_nova": "Clear, professional female",
    "af_river": "Clear, confident female",
    "af_sarah": "Soft, expressive female",
    "af_sky": "Youthful female",
    # American English Male
    "am_adam": "Clear, professional male",
    "am_echo": "Deep, smooth male",
    "am_eric": "Deep, measured male",
    "am_liam": "Articulate, conversational male",
    "am_michael": "Soft, measured male",
    "am_onyx": "Deep, resonant male",
    # British English Female
    "bf_emma": "British, clear female",
    "bf_isabella": "British, refined female",
    "bf_lily": "British, soft female",
    # British English Male
    "bm_daniel": "British, clear male",
    "bm_fable": "British, narrative male",
    "bm_george": "British, distinguished male",
    "bm_lewis": "British, warm male",
}

DEFAULT_VOICE = "af_heart"
DEFAULT_MODEL = "mlx-community/Kokoro-82M-bf16"
CHUNK_SIZE = 400  # Characters per chunk for optimal quality


def chunk_text(text: str, max_chars: int = CHUNK_SIZE) -> list[str]:
    """Split text into chunks at sentence boundaries."""
    # Simple sentence splitting
    sentences = []
    current = ""

    for char in text:
        current += char
        if char in ".!?" and len(current) > 10:
            sentences.append(current.strip())
            current = ""

    if current.strip():
        sentences.append(current.strip())

    # Combine sentences into chunks
    chunks = []
    current_chunk = ""

    for sentence in sentences:
        if len(current_chunk) + len(sentence) < max_chars:
            current_chunk += " " + sentence if current_chunk else sentence
        else:
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = sentence

    if current_chunk:
        chunks.append(current_chunk)

    return chunks if chunks else [text]


def generate_audio(
    text: str,
    output_path: str,
    voice: str = DEFAULT_VOICE,
    model: str = DEFAULT_MODEL,
) -> dict:
    """Generate audio from text using Kokoro model."""
    from mlx_audio.tts.generate import generate_audio as mlx_generate
    from pydub import AudioSegment

    start_time = time.time()
    output_path = os.path.expanduser(output_path)

    # Determine language code from voice prefix
    lang_code = "a" if voice.startswith("a") else "b"  # American or British

    # Chunk text for long content
    chunks = chunk_text(text)

    # Generate audio for each chunk
    with tempfile.TemporaryDirectory() as tmpdir:
        chunk_files = []

        for i, chunk in enumerate(chunks):
            prefix = os.path.join(tmpdir, f"chunk_{i:03d}")

            try:
                mlx_generate(
                    model=model,
                    text=chunk,
                    voice=voice,
                    lang_code=lang_code,
                    file_prefix=prefix,
                    verbose=False,
                )

                # Find generated file
                wav_file = f"{prefix}_000.wav"
                if os.path.exists(wav_file):
                    chunk_files.append(wav_file)

            except Exception as e:
                print(f"Warning: Failed to generate chunk {i}: {e}", file=sys.stderr)

        if not chunk_files:
            return {
                "success": False,
                "error": "No audio chunks generated",
            }

        # Concatenate chunks
        combined = AudioSegment.empty()
        for wav_file in chunk_files:
            segment = AudioSegment.from_wav(wav_file)
            combined += segment

        # Export to output format
        output_format = Path(output_path).suffix.lstrip(".").lower()
        if output_format not in ["mp3", "wav", "m4a", "ogg"]:
            output_format = "mp3"
            output_path = str(Path(output_path).with_suffix(".mp3"))

        # Ensure output directory exists
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        combined.export(output_path, format=output_format)

    generation_time = time.time() - start_time

    return {
        "success": True,
        "file": output_path,
        "voice": voice,
        "model": model.split("/")[-1],
        "characters": len(text),
        "chunks": len(chunks),
        "duration_seconds": len(combined) / 1000,
        "generation_time": round(generation_time, 2),
    }


def main():
    parser = argparse.ArgumentParser(
        description="Generate audio using local MLX TTS (Kokoro model)"
    )
    parser.add_argument(
        "--text",
        help="Text to convert to speech",
    )
    parser.add_argument(
        "--file",
        help="Path to text file to convert",
    )
    parser.add_argument(
        "--voice",
        default=DEFAULT_VOICE,
        choices=list(VOICES.keys()),
        help=f"Voice preset (default: {DEFAULT_VOICE})",
    )
    parser.add_argument(
        "--output",
        required=True,
        help="Output audio file path (supports .mp3, .wav, .m4a, .ogg)",
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"Model to use (default: {DEFAULT_MODEL})",
    )
    parser.add_argument(
        "--list-voices",
        action="store_true",
        help="List available voices and exit",
    )

    args = parser.parse_args()

    if args.list_voices:
        print("Available voices:")
        for voice_id, description in VOICES.items():
            print(f"  {voice_id}: {description}")
        return

    # Get text from argument or file
    if args.text:
        text = args.text
    elif args.file:
        file_path = os.path.expanduser(args.file)
        with open(file_path, "r") as f:
            text = f.read()
    else:
        parser.error("Either --text or --file is required")

    if not text.strip():
        parser.error("Text cannot be empty")

    result = generate_audio(
        text=text,
        output_path=args.output,
        voice=args.voice,
        model=args.model,
    )

    print(json.dumps(result, indent=2))

    if not result["success"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
