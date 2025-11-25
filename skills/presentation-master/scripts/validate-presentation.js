#!/usr/bin/env bun

/**
 * Presentation Quality Validator
 *
 * Scores presentations 0-100 against best practices from presentation masters.
 * Implements validation rules from principles/validation-rules.md
 *
 * Usage:
 *   bun validate-presentation.js --presentation presentation.json
 *
 * Output: JSON with score, breakdown, critical issues, warnings, recommendations
 */

const SCORING_WEIGHTS = {
  simplicity: 10,
  visual_dominance: 10,
  story_structure: 10,
  one_idea_per_slide: 10,
  typography: 8,
  layout: 7,
  color_contrast: 7,
  media_quality: 8,
  cognitive_load: 20,
  data_integrity: 10
};

const CRITICAL_VIOLATIONS = {
  font_too_small: { penalty: -20, threshold: 30 },
  too_many_concepts: { penalty: -15, threshold: 10 },
  bullet_points: { penalty: -10 },
  paragraphs: { penalty: -10 },
  poor_contrast: { penalty: -15, threshold: 4.5 },
  default_template: { penalty: -20 }
};

const WARNING_FLAGS = {
  too_many_words: { penalty: -2, threshold: 6 },
  too_many_slides: { penalty: -5, ratio: 0.75 },
  no_images: { penalty: -10 },
  text_heavy: { penalty: -3, threshold: 3 },
  inconsistent_fonts: { penalty: -5, threshold: 2 },
  low_res_images: { penalty: -3 }
};

function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function detectBulletPoints(text) {
  if (!text) return false;
  return /[•\-*]\s/.test(text) || /^\s*[\d]+\.\s/m.test(text);
}

function detectParagraphs(text) {
  if (!text) return false;
  const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 0);
  return sentences.length > 2;
}

function estimateContrastRatio(slide) {
  // Simplified contrast estimation
  // In real implementation, would analyze actual colors
  if (slide.contrast_ratio) return slide.contrast_ratio;

  // Conservative default
  return 7.0;
}

function countElements(slide) {
  let elements = 0;
  if (slide.title) elements++;
  if (slide.text) elements++;
  if (slide.image) elements++;
  if (slide.chart) elements++;
  return elements;
}

function scoreSimplicity(slides) {
  let score = 0;
  const maxScore = SCORING_WEIGHTS.simplicity;

  for (const slide of slides) {
    const wordCount = countWords(slide.text);
    const elements = countElements(slide);

    // Word count scoring
    let wordScore = 0;
    if (wordCount <= 3) wordScore = 10;
    else if (wordCount <= 6) wordScore = 8;
    else if (wordCount <= 10) wordScore = 5;
    else wordScore = 0;

    // Visual clutter scoring
    let elementScore = 0;
    if (elements === 1) elementScore = 10;
    else if (elements <= 3) elementScore = 8;
    else if (elements <= 5) elementScore = 5;
    else elementScore = 0;

    score += (wordScore + elementScore) / 2;
  }

  return Math.min(maxScore, score / slides.length);
}

function scoreVisualDominance(slides) {
  let score = 0;
  const maxScore = SCORING_WEIGHTS.visual_dominance;

  const slidesWithImages = slides.filter(s => s.image || s.chart).length;
  const imageRatio = slidesWithImages / slides.length;

  // Image quality check
  const highResImages = slides.filter(s => {
    if (!s.image) return false;
    return s.image.resolution >= 2000;
  }).length;

  const imageQualityScore = slidesWithImages > 0
    ? (highResImages / slidesWithImages) * 10
    : 0;

  // Text-to-visual ratio
  const textVsVisualScore = imageRatio >= 0.8 ? 10 :
                            imageRatio >= 0.5 ? 5 : 0;

  score = (imageQualityScore + textVsVisualScore) / 2;

  return Math.min(maxScore, score);
}

function scoreStoryStructure(presentation) {
  const maxScore = SCORING_WEIGHTS.story_structure;

  // Check if presentation has defined structure
  if (!presentation.framework) return maxScore * 0.3; // partial credit

  const framework = presentation.framework.toLowerCase();

  // Narrative arc check
  let narrativeScore = 0;
  if (presentation.slides.length >= 3) {
    const hasOpening = presentation.slides[0].pattern === 'title';
    const hasClosing = presentation.slides[presentation.slides.length - 1].pattern === 'transition' ||
                      presentation.slides[presentation.slides.length - 1].pattern === 'big-idea';

    if (hasOpening && hasClosing) narrativeScore = 10;
    else if (hasOpening || hasClosing) narrativeScore = 5;
  }

  // Emotional beats check
  const bigIdeaSlides = presentation.slides.filter(s => s.pattern === 'big-idea').length;
  const emotionalScore = bigIdeaSlides >= 3 ? 10 :
                        bigIdeaSlides >= 1 ? 5 : 0;

  return Math.min(maxScore, (narrativeScore + emotionalScore) / 2);
}

function scoreOneIdeaPerSlide(slides) {
  const maxScore = SCORING_WEIGHTS.one_idea_per_slide;

  let clearSlides = 0;
  for (const slide of slides) {
    const wordCount = countWords(slide.text);
    const hasBullets = detectBulletPoints(slide.text);
    const elements = countElements(slide);

    // Single concept if: few words, no bullets, few elements
    if (wordCount <= 10 && !hasBullets && elements <= 3) {
      clearSlides++;
    }
  }

  const ratio = clearSlides / slides.length;

  if (ratio === 1.0) return maxScore;
  if (ratio >= 0.7) return maxScore * 0.7;
  if (ratio >= 0.5) return maxScore * 0.3;
  return 0;
}

function scoreTypography(slides) {
  const maxScore = SCORING_WEIGHTS.typography;

  // Font size check
  const minFontSize = Math.min(...slides.map(s => s.min_font_size || 36));

  let fontSizeScore = 0;
  if (minFontSize >= 36) fontSizeScore = 8;
  else if (minFontSize >= 30) fontSizeScore = 6;
  else if (minFontSize >= 24) fontSizeScore = 2;
  else fontSizeScore = 0;

  // Font consistency
  const fontFamilies = new Set(slides.map(s => s.font_family || 'default'));
  let consistencyScore = 0;
  if (fontFamilies.size === 1) consistencyScore = 8;
  else if (fontFamilies.size === 2) consistencyScore = 6;
  else consistencyScore = 0;

  return Math.min(maxScore, (fontSizeScore + consistencyScore) / 2);
}

function scoreLayout(slides) {
  const maxScore = SCORING_WEIGHTS.layout;

  // Simplified layout scoring
  // In real implementation, would analyze actual layouts
  let hierarchyScore = 7; // assume good by default
  let whitespaceScore = 7; // assume good by default
  let alignmentScore = 7; // assume good by default

  return Math.min(maxScore, (hierarchyScore + whitespaceScore + alignmentScore) / 3);
}

function scoreColorContrast(slides) {
  const maxScore = SCORING_WEIGHTS.color_contrast;

  const avgContrast = slides.reduce((sum, s) => sum + estimateContrastRatio(s), 0) / slides.length;

  let contrastScore = 0;
  if (avgContrast >= 7.0) contrastScore = 7;
  else if (avgContrast >= 4.5) contrastScore = 5;
  else contrastScore = 0;

  return Math.min(maxScore, contrastScore);
}

function scoreMediaQuality(slides) {
  const maxScore = SCORING_WEIGHTS.media_quality;

  const slidesWithMedia = slides.filter(s => s.image || s.chart);
  if (slidesWithMedia.length === 0) return 0;

  // Resolution check
  const highRes = slidesWithMedia.filter(s => {
    if (s.image) return s.image.resolution >= 2000;
    return true; // charts assumed high quality
  }).length;

  const resolutionScore = (highRes / slidesWithMedia.length) * 8;

  // Relevance is assumed (would need manual review)
  const relevanceScore = 8;

  return Math.min(maxScore, (resolutionScore + relevanceScore) / 2);
}

function scoreCognitiveLoad(slides, presentation) {
  const maxScore = SCORING_WEIGHTS.cognitive_load;

  // Mayer's 12 principles adherence (simplified)
  let principlesFollowed = 0;

  // 1. Coherence (extraneous material excluded)
  const avgWordCount = slides.reduce((sum, s) => sum + countWords(s.text), 0) / slides.length;
  if (avgWordCount <= 10) principlesFollowed++;

  // 2. Signaling (essential material highlighted)
  const hasTransitions = slides.some(s => s.pattern === 'transition');
  if (hasTransitions) principlesFollowed++;

  // 3. Redundancy (graphics + narration, not graphics + text + narration)
  const textHeavySlides = slides.filter(s => countWords(s.text) > 15).length;
  if (textHeavySlides / slides.length < 0.2) principlesFollowed++;

  // 4. Spatial contiguity (related words/pictures near each other)
  principlesFollowed++; // assume good

  // 5. Temporal contiguity (corresponding narration/animation together)
  principlesFollowed++; // assume good

  // 6. Segmenting (user-paced)
  principlesFollowed++; // presentations are inherently segmented

  // 7. Pre-training (key concepts introduced early)
  const hasOpening = slides[0]?.pattern === 'title';
  if (hasOpening) principlesFollowed++;

  // 8. Modality (graphics + narration better than graphics + text)
  const avgTextPerSlide = slides.reduce((sum, s) => sum + (s.text || '').length, 0) / slides.length;
  if (avgTextPerSlide < 100) principlesFollowed++;

  // 9-12: Multimedia, personalization, voice, image principles
  principlesFollowed += 4; // assume followed

  // Score based on principles followed
  if (principlesFollowed >= 10) return maxScore;
  if (principlesFollowed >= 7) return maxScore * 0.75;
  if (principlesFollowed >= 4) return maxScore * 0.5;
  return maxScore * 0.25;
}

function scoreDataIntegrity(slides) {
  const maxScore = SCORING_WEIGHTS.data_integrity;

  const dataSlides = slides.filter(s => s.chart || s.pattern === 'data-viz');
  if (dataSlides.length === 0) return maxScore; // not applicable, full credit

  // Lie factor check (if provided)
  let lieFactor = 1.0; // assume honest by default
  if (dataSlides[0].lie_factor) {
    lieFactor = dataSlides[0].lie_factor;
  }

  let lieFactorScore = 0;
  if (lieFactor >= 0.95 && lieFactor <= 1.05) lieFactorScore = 10;
  else if (lieFactor >= 0.90 && lieFactor <= 1.10) lieFactorScore = 7;
  else if (lieFactor >= 0.80 && lieFactor <= 1.20) lieFactorScore = 3;
  else lieFactorScore = 0;

  // Data-ink ratio (assume maximized by default)
  const dataInkScore = 10;

  return Math.min(maxScore, (lieFactorScore + dataInkScore) / 2);
}

function checkCriticalViolations(slides, presentation) {
  const violations = [];

  // Font size check
  const minFont = Math.min(...slides.map(s => s.min_font_size || 36));
  if (minFont < CRITICAL_VIOLATIONS.font_too_small.threshold) {
    violations.push({
      type: 'font_too_small',
      penalty: CRITICAL_VIOLATIONS.font_too_small.penalty,
      message: `CRITICAL: Minimum font size is ${minFont}pt (required: 30pt+)`,
      slides_affected: slides.filter(s => (s.min_font_size || 36) < 30).map(s => s.index)
    });
  }

  // Concept count check
  if (slides.length > CRITICAL_VIOLATIONS.too_many_concepts.threshold) {
    violations.push({
      type: 'too_many_concepts',
      penalty: CRITICAL_VIOLATIONS.too_many_concepts.penalty,
      message: `CRITICAL: ${slides.length} slides exceeds Kawasaki's 10 core concepts limit`
    });
  }

  // Bullet points check
  const bulletSlides = slides.filter(s => detectBulletPoints(s.text));
  if (bulletSlides.length > 0) {
    violations.push({
      type: 'bullet_points',
      penalty: CRITICAL_VIOLATIONS.bullet_points.penalty * bulletSlides.length,
      message: `CRITICAL: ${bulletSlides.length} slides have bullet points`,
      slides_affected: bulletSlides.map(s => s.index)
    });
  }

  // Paragraphs check
  const paragraphSlides = slides.filter(s => detectParagraphs(s.text));
  if (paragraphSlides.length > 0) {
    violations.push({
      type: 'paragraphs',
      penalty: CRITICAL_VIOLATIONS.paragraphs.penalty * paragraphSlides.length,
      message: `CRITICAL: ${paragraphSlides.length} slides have paragraphs (>2 sentences)`,
      slides_affected: paragraphSlides.map(s => s.index)
    });
  }

  // Contrast check
  const avgContrast = slides.reduce((sum, s) => sum + estimateContrastRatio(s), 0) / slides.length;
  if (avgContrast < CRITICAL_VIOLATIONS.poor_contrast.threshold) {
    violations.push({
      type: 'poor_contrast',
      penalty: CRITICAL_VIOLATIONS.poor_contrast.penalty,
      message: `CRITICAL: Average contrast ratio ${avgContrast.toFixed(1)}:1 (required: 4.5:1+)`
    });
  }

  return violations;
}

function checkWarnings(slides, presentation) {
  const warnings = [];

  // Word count warnings
  const wordySlides = slides.filter(s => countWords(s.text) > WARNING_FLAGS.too_many_words.threshold);
  if (wordySlides.length > 0) {
    warnings.push({
      type: 'too_many_words',
      penalty: WARNING_FLAGS.too_many_words.penalty * wordySlides.length,
      message: `${wordySlides.length} slides exceed 6-word limit (Seth Godin standard)`,
      slides_affected: wordySlides.map(s => ({
        index: s.index,
        words: countWords(s.text)
      }))
    });
  }

  // Slide count for duration
  if (presentation.duration_minutes) {
    const recommendedSlides = presentation.duration_minutes * WARNING_FLAGS.too_many_slides.ratio;
    if (slides.length > recommendedSlides) {
      warnings.push({
        type: 'too_many_slides',
        penalty: WARNING_FLAGS.too_many_slides.penalty,
        message: `${slides.length} slides for ${presentation.duration_minutes}min (recommended: ≤${Math.round(recommendedSlides)})`
      });
    }
  }

  // Images check
  const slidesWithImages = slides.filter(s => s.image || s.chart).length;
  if (slidesWithImages === 0) {
    warnings.push({
      type: 'no_images',
      penalty: WARNING_FLAGS.no_images.penalty,
      message: 'No images detected - presentations should be visual-dominant'
    });
  }

  return warnings;
}

function generateRecommendations(violations, warnings, scores) {
  const recommendations = [];

  // Address critical violations first
  if (violations.length > 0) {
    recommendations.push({
      priority: 'CRITICAL',
      action: 'Fix all critical violations before presenting',
      details: violations.map(v => v.message)
    });
  }

  // Typography recommendations
  if (scores.typography < 6) {
    recommendations.push({
      priority: 'high',
      action: 'Increase font sizes to 36pt minimum',
      details: ['Guy Kawasaki: 30pt absolute minimum', 'TED: 42pt recommended']
    });
  }

  // Simplicity recommendations
  if (scores.simplicity < 7) {
    recommendations.push({
      priority: 'high',
      action: 'Simplify slides - reduce word count and elements',
      details: ['Seth Godin: 6 words maximum per slide', 'One idea per slide']
    });
  }

  // Visual recommendations
  if (scores.visual_dominance < 7) {
    recommendations.push({
      priority: 'medium',
      action: 'Add more high-quality images',
      details: ['Garr Reynolds: Pictures > text', '80% of slides should have visuals']
    });
  }

  return recommendations;
}

function validatePresentation(presentation) {
  const slides = presentation.slides || [];

  // Calculate scores
  const scores = {
    simplicity: scoreSimplicity(slides),
    visual_dominance: scoreVisualDominance(slides),
    story_structure: scoreStoryStructure(presentation),
    one_idea_per_slide: scoreOneIdeaPerSlide(slides),
    typography: scoreTypography(slides),
    layout: scoreLayout(slides),
    color_contrast: scoreColorContrast(slides),
    media_quality: scoreMediaQuality(slides),
    cognitive_load: scoreCognitiveLoad(slides, presentation),
    data_integrity: scoreDataIntegrity(slides)
  };

  // Calculate total
  const baseScore = Object.values(scores).reduce((sum, score) => sum + score, 0);

  // Check violations
  const violations = checkCriticalViolations(slides, presentation);
  const warnings = checkWarnings(slides, presentation);

  // Apply penalties
  const violationPenalty = violations.reduce((sum, v) => sum + v.penalty, 0);
  const warningPenalty = warnings.reduce((sum, w) => sum + w.penalty, 0);

  const finalScore = Math.max(0, Math.min(100, baseScore + violationPenalty + warningPenalty));

  // Generate report
  const status = finalScore >= 90 ? 'Exceptional' :
                finalScore >= 80 ? 'Excellent' :
                finalScore >= 70 ? 'Good' :
                finalScore >= 60 ? 'Acceptable' : 'Poor';

  const recommendations = generateRecommendations(violations, warnings, scores);

  return {
    overall_score: Math.round(finalScore),
    status,
    score_breakdown: Object.entries(scores).map(([category, score]) => ({
      category,
      score: Math.round(score * 10) / 10,
      max: SCORING_WEIGHTS[category]
    })),
    critical_violations: violations,
    warnings,
    recommendations,
    summary: {
      total_slides: slides.length,
      avg_words_per_slide: Math.round(slides.reduce((sum, s) => sum + countWords(s.text), 0) / slides.length),
      slides_with_images: slides.filter(s => s.image || s.chart).length,
      min_font_size: Math.min(...slides.map(s => s.min_font_size || 36))
    }
  };
}

// CLI Interface
function main() {
  const args = {};

  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i].startsWith('--')) {
      const key = process.argv[i].replace(/^--/, '');
      const value = process.argv[i + 1];
      args[key] = value;
      i++;
    }
  }

  if (!args.presentation) {
    console.error('Usage: bun validate-presentation.js --presentation presentation.json');
    process.exit(1);
  }

  const fs = require('fs');
  const presentation = JSON.parse(fs.readFileSync(args.presentation, 'utf-8'));

  const report = validatePresentation(presentation);
  console.log(JSON.stringify(report, null, 2));
}

if (import.meta.main) {
  main();
}

export { validatePresentation };
