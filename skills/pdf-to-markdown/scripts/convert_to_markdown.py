#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "marker-pdf>=1.0.0",
# ]
# ///
"""
PDF to Markdown Converter

Converts PDF files to clean Markdown using Marker library.
Uses LLM (Gemini) to describe images as text - no image files output.

Usage:
    uv run skills/pdf-to-markdown/scripts/convert_to_markdown.py input.pdf [output.md]

Options:
    --no-llm        Skip LLM processing (images become [Image] placeholders)
    --force-ocr     Force OCR on all pages (for scanned PDFs)
    --page-range    Process specific pages (e.g., "0,5-10")
"""

import argparse
import os
import re
import sys
from pathlib import Path

# Load Gemini API key from 1Password
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "scripts"))
from secrets import require_secret


def setup_api_key():
    """Load Gemini API key from 1Password and set as env var."""
    # Marker expects GOOGLE_API_KEY
    if "GOOGLE_API_KEY" not in os.environ:
        os.environ["GOOGLE_API_KEY"] = require_secret("GEMINI_API_KEY")


def strip_image_references(markdown: str) -> str:
    """Remove any remaining image references from markdown output."""
    # Remove markdown image syntax: ![alt](path)
    markdown = re.sub(r"!\[[^\]]*\]\([^)]+\)", "", markdown)
    # Remove HTML img tags
    markdown = re.sub(r"<img[^>]*>", "", markdown)
    # Remove empty lines left behind
    markdown = re.sub(r"\n{3,}", "\n\n", markdown)
    return markdown.strip()


def convert_pdf(
    input_path: Path,
    output_path: Path,
    use_llm: bool = True,
    force_ocr: bool = False,
    page_range: str | None = None,
) -> str:
    """
    Convert PDF to Markdown.

    Args:
        input_path: Path to input PDF
        output_path: Path for output markdown
        use_llm: Use LLM for image descriptions (default True)
        force_ocr: Force OCR on all pages
        page_range: Page range string (e.g., "0,5-10")

    Returns:
        Path to output file
    """
    # Import marker here (after env var is set)
    from marker.converters.pdf import PdfConverter
    from marker.models import create_model_dict
    from marker.config.parser import ConfigParser

    # Build config
    config_dict = {
        "output_format": "markdown",
        "use_llm": use_llm,
        "force_ocr": force_ocr,
    }

    if page_range:
        config_dict["page_range"] = page_range

    # Parse config
    config_parser = ConfigParser(config_dict)
    config = config_parser.generate_config_dict()

    # Create models
    model_dict = create_model_dict()

    # Create converter
    converter = PdfConverter(
        config=config,
        artifact_dict=model_dict,
    )

    # Convert
    print(f"Converting: {input_path}")
    if use_llm:
        print("Using LLM for image descriptions...")
    if force_ocr:
        print("Forcing OCR on all pages...")

    rendered = converter(str(input_path))

    # Get markdown content
    markdown = rendered.markdown

    # Strip any remaining image references
    markdown = strip_image_references(markdown)

    # Write output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(markdown, encoding="utf-8")

    print(f"Output: {output_path}")
    return str(output_path)


def main():
    parser = argparse.ArgumentParser(
        description="Convert PDF to clean Markdown with image content described as text.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Basic conversion
    uv run convert_to_markdown.py document.pdf

    # Specify output path
    uv run convert_to_markdown.py document.pdf ~/Documents/output.md

    # Fast mode (no LLM, images become placeholders)
    uv run convert_to_markdown.py --no-llm document.pdf

    # Scanned PDF
    uv run convert_to_markdown.py --force-ocr scanned.pdf

    # Specific pages
    uv run convert_to_markdown.py --page-range "0,5-10" large.pdf
""",
    )

    parser.add_argument("input", type=Path, help="Input PDF file")
    parser.add_argument(
        "output",
        type=Path,
        nargs="?",
        help="Output markdown file (default: ~/Desktop/{input_name}.md)",
    )
    parser.add_argument(
        "--no-llm",
        action="store_true",
        help="Skip LLM processing (faster, images become [Image] placeholders)",
    )
    parser.add_argument(
        "--force-ocr",
        action="store_true",
        help="Force OCR on all pages (for scanned PDFs)",
    )
    parser.add_argument(
        "--page-range",
        type=str,
        help='Process specific pages only (e.g., "0,5-10")',
    )

    args = parser.parse_args()

    # Validate input
    input_path = args.input.expanduser().resolve()
    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    if not input_path.suffix.lower() == ".pdf":
        print(f"Error: Input must be a PDF file: {input_path}", file=sys.stderr)
        sys.exit(1)

    # Determine output path
    if args.output:
        output_path = args.output.expanduser().resolve()
    else:
        # Default: ~/Desktop/{input_name}.md
        output_path = Path.home() / "Desktop" / f"{input_path.stem}.md"

    # Setup API key (only needed if using LLM)
    use_llm = not args.no_llm
    if use_llm:
        setup_api_key()

    # Convert
    try:
        convert_pdf(
            input_path=input_path,
            output_path=output_path,
            use_llm=use_llm,
            force_ocr=args.force_ocr,
            page_range=args.page_range,
        )
        print("Done!")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
