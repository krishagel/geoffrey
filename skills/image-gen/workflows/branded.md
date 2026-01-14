# Branded Image Workflow

Generate on-brand images that comply with organizational brand guidelines.

## When to Use

Use this workflow when creating images for:
- School district communications
- Official presentations and materials
- Social media graphics
- Event banners and promotional materials
- Any context requiring organizational branding

## Brand Enforcement

When a brand is specified via `--brand`, the following rules are automatically enforced:

### What Gets Blocked

The validation will **reject** prompts that attempt to generate:
- Logos or emblems
- District seals
- Official branding elements
- Stylized organization names

**Why?** AI-generated logos are inconsistent and may hallucinate incorrect details. Always use actual logo files from the brand assets.

### What's Allowed

You can freely generate:
- Scenes and backgrounds
- Infographics (without logos)
- Illustrations
- Abstract patterns
- Any non-brand imagery

## Usage

### Basic Branded Generation

```bash
# Generate with PSD brand validation
uv run generate.py "school campus autumn scene" campus.png 16:9 2K --brand psd
```

### Color Guidance

When generating branded images, reference brand colors in your prompt:

**PSD Colors:**
- Sea Glass (#6CA18A) - Primary green
- Pacific (#25424C) - Primary dark blue
- Driftwood (#D7CDBE) - Neutral tan
- Skylight (#FFFAEC) - Off-white/cream

**Example prompts with color guidance:**
```
"Abstract wave pattern in teal (#6CA18A) and navy (#25424C) tones"
"School hallway scene with warm cream (#FFFAEC) lighting"
```

## Adding Logos to Generated Images

After generating an image, add the logo programmatically:

### Get the Right Logo

```python
from brand import get_logo_path

# For light backgrounds
logo = get_logo_path(background='light', space='small')

# For dark backgrounds
logo = get_logo_path(background='dark', space='horizontal')
```

### Logo Selection Guide

| Background | Space Available | Recommended |
|------------|-----------------|-------------|
| Light/white | Wide | 2color-fulllandscape |
| Light/white | Small | 2color-emblem |
| Dark/navy | Wide | white-horizontal |
| Dark/navy | Small | white-emblem |
| Medium/tan | Any | 1color-green-* |

### Composite with Logo

Use the `compose.py` script to overlay the logo:

```bash
# Add logo to generated image
uv run compose.py "Add the logo in the bottom right corner" final.png --refs generated.png logo.png
```

## Workflow Example

### Creating a PSD Event Banner

1. **Generate base image:**
   ```bash
   uv run generate.py "school gymnasium decorated for graduation ceremony, warm lighting" gym.png 16:9 2K --brand psd
   ```

2. **Get appropriate logo:**
   ```bash
   # For the warm-lit scene, use 2-color horizontal
   uv run ../psd-brand-guidelines/brand.py logo light wide
   # Output: .../assets/psd_logo-2color-fulllandscape.png
   ```

3. **Composite final image:**
   ```bash
   uv run compose.py "Place the logo discretely in the bottom right corner" banner.png --refs gym.png /path/to/logo.png
   ```

## Error Handling

### Brand Validation Failed

If you see "Brand validation failed", you attempted to generate a protected brand element:

```
Brand validation failed:
  Cannot generate 'psd logo'. Use actual logo files from assets/ instead.

Suggestion: Use get_logo_path() to get the appropriate logo file.
```

**Solution:** Remove logo/emblem requests from your prompt and use actual logo files.

### Brand Not Found

```
Warning: Brand 'xyz' not found, skipping validation
```

**Solution:** Check available brands. Currently supported: `psd`

## Best Practices

1. **Never generate logos** - Always use actual logo files
2. **Reference brand colors** - Include hex codes in prompts for color accuracy
3. **Composite don't generate** - Generate backgrounds, add logos as overlays
4. **Check validation first** - Run with `--brand` to catch issues early
5. **Use appropriate logo variant** - Match logo color to background for contrast
