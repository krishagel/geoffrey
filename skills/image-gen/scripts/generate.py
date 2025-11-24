#!/usr/bin/env python3
# /// script
# dependencies = ["google-genai", "pillow", "python-dotenv"]
# ///
"""
Generate images using Google's Nano Banana Pro (Gemini 3 Pro Image).

Usage:
    uv run generate.py "prompt" output.png [aspect_ratio] [size]

Arguments:
    prompt       - Text description of the image to generate
    output       - Output file path (PNG)
    aspect_ratio - Optional: 1:1, 2:3, 3:2, 4:3, 16:9, 21:9 (default: 1:1)
    size         - Optional: 1K, 2K, 4K (default: 2K)

Examples:
    uv run generate.py "A cozy coffee shop" coffee.png
    uv run generate.py "Infographic about AI" ai.png 16:9 2K
"""

import sys
import os
import json
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai.types import GenerateContentConfig

# Load API key from Geoffrey secrets
SECRETS_PATH = Path.home() / "Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/secrets/.env"
if SECRETS_PATH.exists():
    load_dotenv(SECRETS_PATH)


def main():
    if len(sys.argv) < 3:
        print("Usage: uv run generate.py \"prompt\" output.png [aspect_ratio] [size]")
        print("\nAspect ratios: 1:1, 2:3, 3:2, 4:3, 16:9, 21:9")
        print("Sizes: 1K, 2K, 4K")
        sys.exit(1)

    prompt = sys.argv[1]
    output_path = sys.argv[2]
    aspect_ratio = sys.argv[3] if len(sys.argv) > 3 else "1:1"
    image_size = sys.argv[4] if len(sys.argv) > 4 else "2K"

    # Validate aspect ratio
    valid_ratios = ["1:1", "2:3", "3:2", "4:3", "16:9", "21:9"]
    if aspect_ratio not in valid_ratios:
        print(f"Invalid aspect ratio: {aspect_ratio}")
        print(f"Valid options: {', '.join(valid_ratios)}")
        sys.exit(1)

    # Validate size
    valid_sizes = ["1K", "2K", "4K"]
    if image_size not in valid_sizes:
        print(f"Invalid size: {image_size}")
        print(f"Valid options: {', '.join(valid_sizes)}")
        sys.exit(1)

    # Initialize client (uses GEMINI_API_KEY env var)
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not set")
        sys.exit(1)

    client = genai.Client(api_key=api_key)

    # Configure generation
    config = GenerateContentConfig(
        response_modalities=["TEXT", "IMAGE"],
        image_config={
            "aspect_ratio": aspect_ratio,
            "image_size": image_size
        }
    )

    print(f"Generating image...")
    print(f"  Prompt: {prompt[:100]}{'...' if len(prompt) > 100 else ''}")
    print(f"  Aspect ratio: {aspect_ratio}")
    print(f"  Size: {image_size}")

    try:
        response = client.models.generate_content(
            model="gemini-3-pro-image-preview",
            contents=[prompt],
            config=config
        )

        # Extract and save image
        saved = False
        text_response = ""

        for part in response.candidates[0].content.parts:
            if hasattr(part, 'inline_data') and part.inline_data:
                # Save image
                image = part.as_image()

                # Ensure output directory exists
                output_file = Path(output_path)
                output_file.parent.mkdir(parents=True, exist_ok=True)

                image.save(output_path)
                saved = True
                print(f"\nImage saved: {output_path}")
            elif hasattr(part, 'text') and part.text:
                text_response = part.text

        if text_response:
            print(f"\nModel response: {text_response}")

        if not saved:
            print("\nError: No image was generated")
            print("The model may have declined due to content policy.")
            sys.exit(1)

        # Output JSON for programmatic use
        result = {
            "success": True,
            "output": output_path,
            "aspect_ratio": aspect_ratio,
            "size": image_size,
            "text_response": text_response
        }
        print(f"\n{json.dumps(result)}")

    except Exception as e:
        print(f"\nError generating image: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
