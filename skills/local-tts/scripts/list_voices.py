"""
List available Kokoro TTS voices.

Usage:
    uv run --with mlx-audio skills/local-tts/scripts/list_voices.py
"""

# Kokoro voice presets organized by category
VOICES = {
    "American English Female": {
        "af_heart": "Warm, friendly (default for briefings)",
        "af_bella": "Soft, calm",
        "af_nicole": "Soft, hesitant",
        "af_nova": "Clear, professional",
        "af_river": "Clear, confident",
        "af_sarah": "Soft, expressive",
        "af_sky": "Youthful",
    },
    "American English Male": {
        "am_adam": "Clear, professional",
        "am_echo": "Deep, smooth",
        "am_eric": "Deep, measured",
        "am_liam": "Articulate, conversational",
        "am_michael": "Soft, measured",
        "am_onyx": "Deep, resonant",
    },
    "British English Female": {
        "bf_emma": "Clear, refined",
        "bf_isabella": "Refined, elegant",
        "bf_lily": "Soft, gentle",
    },
    "British English Male": {
        "bm_daniel": "Clear, professional",
        "bm_fable": "Narrative, storytelling",
        "bm_george": "Distinguished",
        "bm_lewis": "Warm, friendly",
    },
}


def main():
    print("Kokoro TTS Voice Presets")
    print("=" * 50)
    print()

    for category, voices in VOICES.items():
        print(f"{category}:")
        for voice_id, description in voices.items():
            print(f"  {voice_id:15} {description}")
        print()

    print("Language codes:")
    print("  a = American English (af_*, am_*)")
    print("  b = British English (bf_*, bm_*)")
    print()
    print("Default voice: af_heart")


if __name__ == "__main__":
    main()
