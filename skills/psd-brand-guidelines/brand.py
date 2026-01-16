#!/usr/bin/env python3
# /// script
# dependencies = []
# ///
"""
PSD Brand Guidelines Utilities.

Provides programmatic access to Peninsula School District brand assets
including colors, typography, and logos with intelligent selection.

Usage:
    from brand import get_logo_path, get_colors, validate_prompt

    # Get logo for dark background
    logo = get_logo_path(background='dark', space='wide')

    # Get all colors as hex dict
    colors = get_colors()

    # Validate prompt before image generation
    valid, errors = validate_prompt("create a PSD infographic")
"""

import json
import re
from pathlib import Path
from typing import Literal


def _load_config() -> dict:
    """Load brand configuration from JSON file."""
    config_path = Path(__file__).parent / 'brand-config.json'
    return json.loads(config_path.read_text())


def get_colors(flat: bool = True) -> dict:
    """
    Get brand colors.

    Args:
        flat: If True, return flat dict of color names to hex values.
              If False, return full config with primary/supporting structure.

    Returns:
        Dictionary of color names to hex values (if flat=True), or
        full color config with metadata (if flat=False).

    Example:
        >>> colors = get_colors()
        >>> colors['seaGlass']
        '#6CA18A'
    """
    config = _load_config()
    colors = config['colors']

    if flat:
        result = {}
        for category in ['primary', 'supporting']:
            for name, data in colors[category].items():
                result[name] = data['hex']
        return result

    return colors


def get_color(name: str) -> dict:
    """
    Get a specific color by name.

    Args:
        name: Color name (e.g., 'seaGlass', 'pacific')

    Returns:
        Dict with hex, rgb, and usage fields.

    Raises:
        KeyError: If color name not found.

    Example:
        >>> color = get_color('pacific')
        >>> color['hex']
        '#25424C'
    """
    config = _load_config()
    colors = config['colors']

    for category in ['primary', 'supporting']:
        if name in colors[category]:
            return colors[category][name]

    raise KeyError(f"Color '{name}' not found. Available: {list(get_colors().keys())}")


def get_typography() -> dict:
    """
    Get typography configuration.

    Returns:
        Dict with 'heading' and 'body' font configurations.

    Example:
        >>> fonts = get_typography()
        >>> fonts['heading']['family']
        'Josefin Sans'
    """
    config = _load_config()
    return config['typography']


def get_logo_path(
    background: Literal['light', 'medium', 'dark'] = 'light',
    space: Literal['wide', 'square', 'vertical', 'small'] = 'wide',
    format: Literal['png', 'eps'] = 'png',
    absolute: bool = True
) -> str:
    """
    Get the appropriate logo file path based on context.

    Uses selection rules from brand config to choose the best logo variant
    and layout for the given context.

    Args:
        background: Background color type ('light', 'medium', 'dark')
        space: Available space type ('wide', 'square', 'vertical', 'small')
        format: File format ('png' for web/Office, 'eps' for print)
        absolute: Return absolute path (True) or relative path (False)

    Returns:
        Path to the appropriate logo file.

    Example:
        >>> get_logo_path(background='dark', space='wide')
        '/Users/.../assets/psd_logo-white-horizontal.png'

        >>> get_logo_path(background='light', space='small')
        '/Users/.../assets/psd_logo-2color-emblem.png'
    """
    config = _load_config()
    logos = config['logos']

    # Get color variant based on background
    color_options = logos['selectionRules']['byBackground'].get(background, ['2color'])
    color_variant = color_options[0]

    # Get layout based on space
    layout_options = logos['selectionRules']['bySpace'].get(space, ['horizontal'])

    # Find first layout that exists for this color variant
    available_layouts = logos['variants'].get(color_variant, {}).get('files', [])
    layout = None
    for option in layout_options:
        if option in available_layouts:
            layout = option
            break

    # Fallback to first available layout
    if layout is None and available_layouts:
        layout = available_layouts[0]

    if layout is None:
        raise ValueError(f"No logo layout found for variant '{color_variant}'")

    # Build filename
    filename = f"psd_logo-{color_variant}-{layout}.{format}"

    if absolute:
        base_path = Path(__file__).parent / 'assets'
        return str(base_path / filename)
    else:
        return f"{logos['basePath']}/{filename}"


def get_all_logo_paths(format: Literal['png', 'eps'] = 'png') -> list[str]:
    """
    Get all available logo file paths.

    Args:
        format: File format ('png' or 'eps')

    Returns:
        List of absolute paths to all logo files.
    """
    config = _load_config()
    logos = config['logos']
    base_path = Path(__file__).parent / 'assets'

    paths = []
    for variant, data in logos['variants'].items():
        for layout in data['files']:
            filename = f"psd_logo-{variant}-{layout}.{format}"
            path = base_path / filename
            if path.exists():
                paths.append(str(path))

    return paths


def validate_prompt(prompt: str) -> tuple[bool, list[str]]:
    """
    Validate a prompt against brand generation rules.

    Only blocks explicit requests to GENERATE logos/emblems as image output.
    Allows normal use of "Peninsula School District", "design", etc.

    Args:
        prompt: The image generation prompt to validate.

    Returns:
        Tuple of (is_valid, error_messages).
        If valid, returns (True, []).
        If invalid, returns (False, [list of violation messages]).

    Example:
        >>> valid, errors = validate_prompt("infographic for Peninsula School District")
        >>> valid
        True

        >>> valid, errors = validate_prompt("create a PSD logo")
        >>> valid
        False
    """
    config = _load_config()
    forbidden = config['forbiddenGeneration']
    patterns = forbidden['patterns']

    prompt_lower = prompt.lower()
    violations = []

    for pattern in patterns:
        # All patterns are regex - match against prompt
        try:
            if re.search(pattern, prompt_lower):
                # Show a cleaner version of what was matched
                match = re.search(pattern, prompt_lower)
                matched_text = match.group(0) if match else pattern
                violations.append(f"Blocked: '{matched_text}'. {forbidden['message']}")
        except re.error:
            # Invalid regex - skip
            continue

    if violations:
        suggestion = f"\nTip: {forbidden['suggestion']}"
        violations.append(suggestion)

    return (len(violations) == 0, violations)


def get_application_config(context: Literal['presentations', 'documents', 'digital']) -> dict:
    """
    Get application-specific brand configuration.

    Args:
        context: Application context type.

    Returns:
        Dict with context-specific brand settings.

    Example:
        >>> config = get_application_config('presentations')
        >>> config['titleSlide']['background']
        'pacific'
    """
    config = _load_config()
    return config['applications'].get(context, {})


# CLI interface for testing
if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("Usage: python brand.py <command> [args]")
        print("\nCommands:")
        print("  colors              - List all brand colors")
        print("  color <name>        - Get specific color details")
        print("  logo [bg] [space]   - Get logo path (bg: light/medium/dark, space: wide/square/vertical/small)")
        print("  validate <prompt>   - Validate a prompt against brand rules")
        print("  typography          - Show font configuration")
        sys.exit(0)

    command = sys.argv[1]

    if command == 'colors':
        colors = get_colors()
        for name, hex_val in colors.items():
            print(f"  {name}: {hex_val}")

    elif command == 'color':
        if len(sys.argv) < 3:
            print("Usage: python brand.py color <name>")
            sys.exit(1)
        color = get_color(sys.argv[2])
        print(json.dumps(color, indent=2))

    elif command == 'logo':
        bg = sys.argv[2] if len(sys.argv) > 2 else 'light'
        space = sys.argv[3] if len(sys.argv) > 3 else 'wide'
        path = get_logo_path(background=bg, space=space)
        print(f"Logo path: {path}")

    elif command == 'validate':
        if len(sys.argv) < 3:
            print("Usage: python brand.py validate \"<prompt>\"")
            sys.exit(1)
        prompt = ' '.join(sys.argv[2:])
        valid, errors = validate_prompt(prompt)
        if valid:
            print("Valid prompt")
        else:
            print("Invalid prompt:")
            for error in errors:
                print(f"  {error}")
            sys.exit(1)

    elif command == 'typography':
        fonts = get_typography()
        print(json.dumps(fonts, indent=2))

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
