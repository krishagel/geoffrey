#!/usr/bin/env python3
# /// script
# dependencies = ["pytest"]
# ///
"""
Unit tests for PSD brand utilities.

Run with: uv run pytest test_brand.py -v
"""

import pytest
from pathlib import Path

from brand import (
    get_colors,
    get_color,
    get_logo_path,
    get_all_logo_paths,
    get_typography,
    validate_prompt,
    get_application_config,
)


class TestGetColors:
    def test_returns_all_colors_flat(self):
        colors = get_colors(flat=True)
        assert len(colors) == 9
        assert 'seaGlass' in colors
        assert 'pacific' in colors
        assert colors['seaGlass'] == '#6CA18A'

    def test_returns_structured_colors(self):
        colors = get_colors(flat=False)
        assert 'primary' in colors
        assert 'supporting' in colors
        assert 'seaGlass' in colors['primary']


class TestGetColor:
    def test_returns_primary_color(self):
        color = get_color('pacific')
        assert color['hex'] == '#25424C'
        assert color['rgb'] == [37, 66, 76]

    def test_returns_supporting_color(self):
        color = get_color('whulge')
        assert color['hex'] == '#346780'

    def test_raises_for_unknown_color(self):
        with pytest.raises(KeyError):
            get_color('notacolor')


class TestGetLogoPath:
    def test_light_background_wide_space(self):
        path = get_logo_path(background='light', space='wide')
        assert 'psd_logo-2color-fulllandscape.png' in path

    def test_dark_background(self):
        path = get_logo_path(background='dark', space='wide')
        assert 'white' in path

    def test_small_space(self):
        path = get_logo_path(background='light', space='small')
        assert 'emblem' in path or 'square' in path

    def test_absolute_path_exists(self):
        path = get_logo_path(absolute=True)
        assert Path(path).exists()

    def test_relative_path(self):
        path = get_logo_path(absolute=False)
        assert path.startswith('skills/psd-brand-guidelines/assets/')

    def test_eps_format(self):
        path = get_logo_path(format='eps')
        assert path.endswith('.eps')


class TestGetAllLogoPaths:
    def test_returns_multiple_paths(self):
        paths = get_all_logo_paths()
        assert len(paths) >= 15  # We have 19 PNG files

    def test_all_paths_exist(self):
        paths = get_all_logo_paths()
        for path in paths:
            assert Path(path).exists(), f"Logo file not found: {path}"


class TestGetTypography:
    def test_returns_heading_config(self):
        fonts = get_typography()
        assert fonts['heading']['family'] == 'Josefin Sans'
        assert fonts['heading']['weight'] == 'Bold'

    def test_returns_body_config(self):
        fonts = get_typography()
        assert fonts['body']['family'] == 'Josefin Slab'


class TestValidatePrompt:
    def test_valid_prompt_passes(self):
        valid, errors = validate_prompt("a cozy coffee shop scene")
        assert valid is True
        assert len(errors) == 0

    def test_psd_logo_blocked(self):
        valid, errors = validate_prompt("create a PSD logo")
        assert valid is False
        assert any('psd logo' in e.lower() for e in errors)

    def test_district_logo_blocked(self):
        valid, errors = validate_prompt("generate a district logo for my presentation")
        assert valid is False

    def test_emblem_blocked(self):
        valid, errors = validate_prompt("design a peninsula emblem")
        assert valid is False

    def test_generic_logo_request_blocked(self):
        valid, errors = validate_prompt("make a logo for PSD")
        assert valid is False

    def test_case_insensitive(self):
        valid, errors = validate_prompt("CREATE A PSD LOGO")
        assert valid is False

    def test_suggestion_included(self):
        valid, errors = validate_prompt("create a psd logo")
        assert any('get_logo_path' in e for e in errors)


class TestGetApplicationConfig:
    def test_presentations_config(self):
        config = get_application_config('presentations')
        assert 'titleSlide' in config
        assert config['titleSlide']['background'] == 'pacific'

    def test_documents_config(self):
        config = get_application_config('documents')
        assert 'headings' in config

    def test_unknown_context_returns_empty(self):
        config = get_application_config('unknown')
        assert config == {}


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
