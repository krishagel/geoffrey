# Validation Rules & Scoring System

Automatic quality assessment for presentations.

## Scoring Formula (0-100)

### Simplicity (10 points)
- **Word count per slide**: 0-3 words = 10pts, 4-6 words = 8pts, 7-10 words = 5pts, >10 words = 0pts
- **Visual clutter**: Single element = 10pts, 2-3 elements = 8pts, 4-5 elements = 5pts, >5 elements = 0pts

### Visual Dominance (10 points)
- **Image quality**: All high-res = 10pts, some low-res = 5pts, no images = 0pts
- **Text-to-visual ratio**: 20/80 or better = 10pts, 50/50 = 5pts, 80/20 = 0pts

### Story Structure (10 points)
- **Narrative arc**: Clear beginning/middle/end = 10pts, partial = 5pts, none = 0pts
- **Emotional beats**: 3+ moments = 10pts, 1-2 moments = 5pts, none = 0pts

### One Idea Per Slide (10 points)
- **Concept clarity**: All slides single-concept = 10pts, most = 7pts, mixed = 3pts, confused = 0pts

### Typography (8 points)
- **Font size**: All 36pt+ = 8pts, all 30pt+ = 6pts, some <30pt = 2pts, any <24pt = 0pts
- **Consistency**: 1 font family = 8pts, 2 families = 6pts, 3+ families = 0pts

### Layout (7 points)
- **Visual hierarchy**: Clear focal points = 7pts, somewhat clear = 4pts, unclear = 0pts
- **Whitespace**: 40%+ = 7pts, 20-40% = 4pts, <20% = 0pts
- **Alignment**: All aligned = 7pts, mostly = 4pts, inconsistent = 0pts

### Color/Contrast (7 points)
- **Readability**: 7:1+ contrast = 7pts, 4.5:1+ = 5pts, <4.5:1 = 0pts
- **Consistency**: Single palette = 7pts, mixed = 3pts, chaotic = 0pts

### Media Quality (8 points)
- **Image resolution**: All 2K+ = 8pts, all 1K+ = 6pts, some low-res = 2pts
- **Relevance**: All relevant = 8pts, mostly = 5pts, decorative = 0pts

### Cognitive Load (20 points)
- **Mayer's 12 principles adherence**: 10-12 = 20pts, 7-9 = 15pts, 4-6 = 10pts, 1-3 = 5pts, 0 = 0pts

### Data Integrity (10 points, if applicable)
- **Lie factor**: 0.95-1.05 = 10pts, 0.90-1.10 = 7pts, 0.80-1.20 = 3pts, outside = 0pts
- **Data-ink ratio**: Maximized = 10pts, good = 7pts, poor = 3pts, terrible = 0pts

## Critical Violations (Auto-Fail)

These cause immediate score reduction or failure:

1. **Font size < 30pt** → -20 points
2. **>10 core concepts** → -15 points (Kawasaki violation)
3. **Bullet points detected** → -10 points per slide
4. **Paragraphs (>2 sentences)** → -10 points per slide
5. **Contrast ratio <4.5:1** → -15 points
6. **Default template detected** → -20 points

## Warning Flags

These reduce score but don't fail:

1. **>6 words per slide** → -2 points per violation (Godin standard)
2. **>15 slides for 20-min presentation** → -5 points
3. **No images** → -10 points
4. **Text-heavy slides (>3 lines)** → -3 points per slide
5. **Inconsistent fonts (>2 families)** → -5 points
6. **Low-res images** → -3 points per image

## Score Interpretation

- **90-100**: Exceptional - TED/Keynote quality
- **80-89**: Excellent - Professional standard
- **70-79**: Good - Solid presentation
- **60-69**: Acceptable - Needs improvement
- **<60**: Poor - Major revisions needed

## Automated Checks (JavaScript)

```javascript
function validatePresentation(slides) {
  let score = 0;
  const issues = [];

  // Check each slide
  slides.forEach((slide, i) => {
    const wordCount = slide.text.split(' ').length;
    const fontSize = slide.minFontSize;
    const hasBullets = slide.text.includes('•') || slide.text.includes('-');

    // Word count scoring
    if (wordCount <= 3) score += 10 / slides.length;
    else if (wordCount <= 6) score += 8 / slides.length;
    else if (wordCount <= 10) score += 5 / slides.length;
    else issues.push(`Slide ${i+1}: ${wordCount} words (recommend ≤6)`);

    // Font size critical check
    if (fontSize < 30) {
      score -= 20;
      issues.push(`CRITICAL: Slide ${i+1} has ${fontSize}pt font (minimum 30pt)`);
    }

    // Bullet point check
    if (hasBullets) {
      score -= 10;
      issues.push(`CRITICAL: Slide ${i+1} has bullet points (use individual slides)`);
    }
  });

  return { score: Math.max(0, Math.min(100, score)), issues };
}
```

## Quality Report Template

```markdown
# Presentation Quality Report

**Overall Score**: {score}/100
**Status**: {Exceptional|Excellent|Good|Acceptable|Poor}

## Strengths
- {List what scores well}

## Critical Issues
- {Font size violations}
- {Bullet points}
- {Contrast problems}

## Warnings
- {Word count}
- {Slide count}
- {Consistency issues}

## Recommendations
1. {Highest priority fix}
2. {Second priority}
3. {Third priority}

## Score Breakdown
- Simplicity: {score}/10
- Visual Dominance: {score}/10
- Story Structure: {score}/10
- One Idea/Slide: {score}/10
- Typography: {score}/8
- Layout: {score}/7
- Color/Contrast: {score}/7
- Media Quality: {score}/8
- Cognitive Load: {score}/20
- Data Integrity: {score}/10 (if applicable)
```
