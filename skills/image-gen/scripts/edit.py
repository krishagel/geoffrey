#!/usr/bin/env python3
# /// script
# dependencies = ["google-genai", "pillow"]
# ///
"""
Edit existing images using Google's Nano Banana Pro.

Usage:
    uv run edit.py input.png "edit instructions" output.png

Arguments:
    input        - Input image file path
    instructions - Text description of edits to make
    output       - Output file path (PNG)

Examples:
    uv run edit.py photo.png "Change background to sunset" edited.png
    uv run edit.py logo.png "Make the text larger and blue" logo_v2.png
"""

import sys
import json
from pathlib import Path

from google import genai
from google.genai.types import GenerateContentConfig, Part
from PIL import Image

# Load API key from 1Password via centralized secrets module
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "scripts"))
from secrets import require_secret


def main():
    if len(sys.argv) < 4:
        print("Usage: uv run edit.py input.png \"edit instructions\" output.png")
        sys.exit(1)

    input_path = sys.argv[1]
    instructions = sys.argv[2]
    output_path = sys.argv[3]

    # Validate input exists
    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        sys.exit(1)

    # Initialize client
    api_key = require_secret("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)

    # Load input image
    print(f"Loading input image: {input_path}")
    input_image = Image.open(input_path)

    # Configure generation
    config = GenerateContentConfig(
        response_modalities=["TEXT", "IMAGE"]
    )

    print(f"Editing image...")
    print(f"  Instructions: {instructions[:100]}{'...' if len(instructions) > 100 else ''}")

    try:
        # Create content with image and instructions
        response = client.models.generate_content(
            model="gemini-3-pro-image-preview",
            contents=[
                Part.from_image(input_image),
                f"Edit this image: {instructions}"
            ],
            config=config
        )

        # Extract and save edited image
        saved = False
        text_response = ""

        for part in response.candidates[0].content.parts:
            if hasattr(part, 'inline_data') and part.inline_data:
                image = part.as_image()

                output_file = Path(output_path)
                output_file.parent.mkdir(parents=True, exist_ok=True)

                image.save(output_path)
                saved = True
                print(f"\nEdited image saved: {output_path}")
            elif hasattr(part, 'text') and part.text:
                text_response = part.text

        if text_response:
            print(f"\nModel response: {text_response}")

        if not saved:
            print("\nError: No edited image was generated")
            sys.exit(1)

        result = {
            "success": True,
            "input": input_path,
            "output": output_path,
            "text_response": text_response
        }
        print(f"\n{json.dumps(result)}")

    except Exception as e:
        print(f"\nError editing image: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
