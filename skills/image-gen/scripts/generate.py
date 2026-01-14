#!/usr/bin/env python3
# /// script
# dependencies = ["google-genai", "pillow", "python-dotenv"]
# ///
"""
Generate images using Google's Nano Banana Pro (Gemini 3 Pro Image).

Usage:
    uv run generate.py "prompt" output.png [aspect_ratio] [size] [--brand BRAND_ID]

Arguments:
    prompt       - Text description of the image to generate
    output       - Output file path (PNG)
    aspect_ratio - Optional: 1:1, 2:3, 3:2, 4:3, 16:9, 21:9 (default: 1:1)
    size         - Optional: 1K, 2K, 4K (default: 2K)
    --brand      - Optional: Brand ID to enforce brand rules (e.g., 'psd')
                   When specified, validates prompt against brand guidelines
                   and blocks requests to generate logos/emblems.

Examples:
    uv run generate.py "A cozy coffee shop" coffee.png
    uv run generate.py "Infographic about AI" ai.png 16:9 2K
    uv run generate.py "PSD school event banner" banner.png 16:9 2K --brand psd
"""

import sys
import os
import json
import importlib.util
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai.types import GenerateContentConfig

# Load API key from Geoffrey secrets
SECRETS_PATH = Path.home() / "Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/secrets/.env"
if SECRETS_PATH.exists():
    load_dotenv(SECRETS_PATH)

# Geoffrey skills directory for brand imports
SKILLS_DIR = Path(__file__).parent.parent.parent


def load_brand_module(brand_id: str):
    """
    Dynamically load a brand module by ID.

    Args:
        brand_id: Brand identifier (e.g., 'psd' for psd-brand-guidelines)

    Returns:
        The loaded brand module, or None if not found.
    """
    # Map brand ID to skill directory
    brand_paths = {
        'psd': SKILLS_DIR / 'psd-brand-guidelines' / 'brand.py',
    }

    brand_path = brand_paths.get(brand_id)
    if not brand_path or not brand_path.exists():
        return None

    # Dynamically import the brand module
    spec = importlib.util.spec_from_file_location(f"brand_{brand_id}", brand_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def validate_brand_prompt(prompt: str, brand_id: str) -> tuple[bool, list[str]]:
    """
    Validate a prompt against brand guidelines.

    Args:
        prompt: The image generation prompt
        brand_id: Brand identifier to validate against

    Returns:
        Tuple of (is_valid, error_messages)
    """
    brand_module = load_brand_module(brand_id)
    if brand_module is None:
        return True, [f"Warning: Brand '{brand_id}' not found, skipping validation"]

    return brand_module.validate_prompt(prompt)


def main():
    if len(sys.argv) < 3:
        print("Usage: uv run generate.py \"prompt\" output.png [aspect_ratio] [size] [--brand BRAND_ID]")
        print("\nAspect ratios: 1:1, 2:3, 3:2, 4:3, 16:9, 21:9")
        print("Sizes: 1K, 2K, 4K")
        print("\nBrand validation:")
        print("  --brand psd    Enforce PSD brand guidelines (blocks logo generation)")
        sys.exit(1)

    # Parse arguments, handling --brand flag
    args = sys.argv[1:]
    brand_id = None

    # Extract --brand if present
    if '--brand' in args:
        brand_idx = args.index('--brand')
        if brand_idx + 1 < len(args):
            brand_id = args[brand_idx + 1]
            args = args[:brand_idx] + args[brand_idx + 2:]
        else:
            print("Error: --brand requires a brand ID (e.g., --brand psd)")
            sys.exit(1)

    if len(args) < 2:
        print("Error: Missing required arguments (prompt and output path)")
        sys.exit(1)

    prompt = args[0]
    output_path = args[1]
    aspect_ratio = args[2] if len(args) > 2 else "1:1"
    image_size = args[3] if len(args) > 3 else "2K"

    # Brand validation (only when --brand is specified)
    if brand_id:
        print(f"Validating prompt against '{brand_id}' brand guidelines...")
        valid, errors = validate_brand_prompt(prompt, brand_id)
        if not valid:
            print("\nBrand validation failed:")
            for error in errors:
                print(f"  {error}")
            sys.exit(1)
        print("  Prompt validated successfully")

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
