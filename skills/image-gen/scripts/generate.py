#!/usr/bin/env python3
# /// script
# dependencies = ["google-genai", "pillow"]
# ///
"""
Generate images using Google's Nano Banana Pro (Gemini 3 Pro Image).

Usage:
    uv run generate.py "prompt" output.png [aspect_ratio] [size] [--brand ID] [--logo POSITION]

Arguments:
    prompt       - Text description of the image to generate
    output       - Output file path (PNG)
    aspect_ratio - Optional: 1:1, 2:3, 3:2, 4:3, 16:9, 21:9 (default: 1:1)
    size         - Optional: 1K, 2K, 4K (default: 2K)
    --brand      - Optional: Brand ID to enforce brand rules (e.g., 'psd')
    --logo       - Optional: Add brand logo at position (requires --brand)
                   Positions: bottom-right, bottom-left, top-right, top-left

Examples:
    uv run generate.py "A cozy coffee shop" coffee.png
    uv run generate.py "Infographic about AI" ai.png 16:9 2K
    uv run generate.py "PSD school event banner" banner.png 16:9 2K --brand psd
    uv run generate.py "PSD infographic" info.png 16:9 2K --brand psd --logo bottom-right
"""

import sys
import json
import importlib.util
from pathlib import Path

from google import genai
from google.genai.types import GenerateContentConfig

# Load API key from 1Password via centralized secrets module
# Use importlib to avoid conflict with Python's built-in secrets module
secrets_path = Path(__file__).parent.parent.parent.parent / "scripts" / "secrets.py"
spec = importlib.util.spec_from_file_location("geoffrey_secrets", secrets_path)
geoffrey_secrets = importlib.util.module_from_spec(spec)
spec.loader.exec_module(geoffrey_secrets)
require_secret = geoffrey_secrets.require_secret

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


def get_brand_logo_path(brand_id: str, background: str = 'light') -> str | None:
    """Get logo path from brand module."""
    brand_module = load_brand_module(brand_id)
    if brand_module is None:
        return None
    return brand_module.get_logo_path(background=background, space='horizontal')


def composite_logo(image_path: str, logo_path: str, position: str = 'bottom-right') -> None:
    """
    Composite brand logo onto generated image.

    Args:
        image_path: Path to the generated image
        logo_path: Path to the logo file
        position: One of 'bottom-right', 'bottom-left', 'top-right', 'top-left'
    """
    from PIL import Image

    # Open images
    image = Image.open(image_path).convert('RGBA')
    logo = Image.open(logo_path).convert('RGBA')

    # Scale logo to ~12% of image width
    img_width, img_height = image.size
    logo_width = int(img_width * 0.12)
    logo_ratio = logo.size[1] / logo.size[0]
    logo_height = int(logo_width * logo_ratio)
    logo = logo.resize((logo_width, logo_height), Image.Resampling.LANCZOS)

    # Calculate position
    margin = int(img_width * 0.03)  # 3% margin
    positions = {
        'bottom-right': (img_width - logo_width - margin, img_height - logo_height - margin),
        'bottom-left': (margin, img_height - logo_height - margin),
        'top-right': (img_width - logo_width - margin, margin),
        'top-left': (margin, margin),
    }
    pos = positions.get(position, positions['bottom-right'])

    # Composite
    image.paste(logo, pos, logo)

    # Save (convert back to RGB if output is not PNG)
    if image_path.lower().endswith('.png'):
        image.save(image_path, 'PNG')
    else:
        image.convert('RGB').save(image_path)


def main():
    if len(sys.argv) < 3:
        print("Usage: uv run generate.py \"prompt\" output.png [aspect_ratio] [size] [--brand ID] [--logo POS]")
        print("\nAspect ratios: 1:1, 2:3, 3:2, 4:3, 16:9, 21:9")
        print("Sizes: 1K, 2K, 4K")
        print("\nBranding options:")
        print("  --brand psd              Validate prompt against PSD brand guidelines")
        print("  --logo bottom-right      Add brand logo (requires --brand)")
        print("                           Positions: bottom-right, bottom-left, top-right, top-left")
        sys.exit(1)

    # Parse arguments, handling --brand and --logo flags
    args = sys.argv[1:]
    brand_id = None
    logo_position = None

    # Extract --brand if present
    if '--brand' in args:
        brand_idx = args.index('--brand')
        if brand_idx + 1 < len(args):
            brand_id = args[brand_idx + 1]
            args = args[:brand_idx] + args[brand_idx + 2:]
        else:
            print("Error: --brand requires a brand ID (e.g., --brand psd)")
            sys.exit(1)

    # Extract --logo if present
    if '--logo' in args:
        logo_idx = args.index('--logo')
        if logo_idx + 1 < len(args):
            logo_position = args[logo_idx + 1]
            args = args[:logo_idx] + args[logo_idx + 2:]
        else:
            print("Error: --logo requires a position (bottom-right, bottom-left, top-right, top-left)")
            sys.exit(1)

        if not brand_id:
            print("Error: --logo requires --brand to be specified")
            sys.exit(1)

        valid_positions = ['bottom-right', 'bottom-left', 'top-right', 'top-left']
        if logo_position not in valid_positions:
            print(f"Error: Invalid logo position '{logo_position}'")
            print(f"Valid positions: {', '.join(valid_positions)}")
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

    # Initialize client
    api_key = require_secret("GEMINI_API_KEY")
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

                # Add logo if requested
                if logo_position and brand_id:
                    logo_path = get_brand_logo_path(brand_id, background='light')
                    if logo_path and Path(logo_path).exists():
                        print(f"Adding {brand_id.upper()} logo at {logo_position}...")
                        composite_logo(output_path, logo_path, logo_position)
                        print(f"  Logo added successfully")
                    else:
                        print(f"Warning: Could not find logo for brand '{brand_id}'")

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
            "text_response": text_response,
            "logo_added": logo_position is not None,
            "brand": brand_id
        }
        print(f"\n{json.dumps(result)}")

    except Exception as e:
        print(f"\nError generating image: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
