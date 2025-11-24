#!/usr/bin/env python3
# /// script
# dependencies = ["google-genai", "pillow", "python-dotenv"]
# ///
"""
Compose images using multiple reference images with Google's Nano Banana Pro.

Usage:
    uv run compose.py "prompt" output.png --refs image1.png image2.png [...]

Arguments:
    prompt       - Text description of desired composition
    output       - Output file path (PNG)
    --refs       - Flag followed by 1-14 reference images

Examples:
    uv run compose.py "Combine these styles into a cohesive logo" logo.png --refs style1.png style2.png
    uv run compose.py "Create a collage with these photos" collage.png --refs photo1.png photo2.png photo3.png
"""

import sys
import os
import json
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai.types import GenerateContentConfig, Part
from PIL import Image

# Load API key from Geoffrey secrets
SECRETS_PATH = Path.home() / "Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/secrets/.env"
if SECRETS_PATH.exists():
    load_dotenv(SECRETS_PATH)


def main():
    if len(sys.argv) < 4 or "--refs" not in sys.argv:
        print("Usage: uv run compose.py \"prompt\" output.png --refs image1.png image2.png [...]")
        print("\nSupports up to 14 reference images.")
        sys.exit(1)

    prompt = sys.argv[1]
    output_path = sys.argv[2]

    # Parse reference images after --refs flag
    refs_index = sys.argv.index("--refs")
    ref_paths = sys.argv[refs_index + 1:]

    if not ref_paths:
        print("Error: No reference images provided after --refs")
        sys.exit(1)

    if len(ref_paths) > 14:
        print(f"Error: Maximum 14 reference images supported, got {len(ref_paths)}")
        sys.exit(1)

    # Validate all reference images exist
    for path in ref_paths:
        if not os.path.exists(path):
            print(f"Error: Reference image not found: {path}")
            sys.exit(1)

    # Initialize client
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not set")
        sys.exit(1)

    client = genai.Client(api_key=api_key)

    # Load reference images
    print(f"Loading {len(ref_paths)} reference images...")
    ref_images = []
    for path in ref_paths:
        img = Image.open(path)
        ref_images.append(img)
        print(f"  Loaded: {path}")

    # Configure generation
    config = GenerateContentConfig(
        response_modalities=["TEXT", "IMAGE"]
    )

    print(f"\nComposing image...")
    print(f"  Prompt: {prompt[:100]}{'...' if len(prompt) > 100 else ''}")

    try:
        # Build content with all reference images and prompt
        content_parts = []
        for img in ref_images:
            content_parts.append(Part.from_image(img))
        content_parts.append(prompt)

        response = client.models.generate_content(
            model="gemini-3-pro-image-preview",
            contents=content_parts,
            config=config
        )

        # Extract and save composed image
        saved = False
        text_response = ""

        for part in response.candidates[0].content.parts:
            if hasattr(part, 'inline_data') and part.inline_data:
                image = part.as_image()

                output_file = Path(output_path)
                output_file.parent.mkdir(parents=True, exist_ok=True)

                image.save(output_path)
                saved = True
                print(f"\nComposed image saved: {output_path}")
            elif hasattr(part, 'text') and part.text:
                text_response = part.text

        if text_response:
            print(f"\nModel response: {text_response}")

        if not saved:
            print("\nError: No composed image was generated")
            sys.exit(1)

        result = {
            "success": True,
            "output": output_path,
            "reference_count": len(ref_paths),
            "text_response": text_response
        }
        print(f"\n{json.dumps(result)}")

    except Exception as e:
        print(f"\nError composing image: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
