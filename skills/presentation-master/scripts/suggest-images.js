#!/usr/bin/env bun

/**
 * Visual Recommendation Engine
 *
 * Analyzes slide content and recommends visual types and generation prompts
 * for the image-gen skill.
 *
 * Usage:
 *   bun suggest-images.js --slides slides.json --presentation-id "cyber-2025"
 *
 * Output: JSON with image recommendations, prompts, cost estimates
 */

const IMAGE_COSTS = {
  '1K': 0.065,  // 1024x1024
  '2K': 0.13,   // 2048x2048
  '4K': 0.24    // 4096x4096
};

const VISUAL_TYPES = {
  INFOGRAPHIC: {
    name: 'infographic',
    best_for: ['statistics', 'comparisons', 'processes', 'timelines'],
    style_keywords: ['clean', 'modern', 'professional', 'data-driven', 'minimalist'],
    default_resolution: '2K',
    prompt_template: 'Clean, modern infographic showing {concept}. Minimalist design, professional color palette, clear visual hierarchy. {specifics}. High contrast, data-focused, no text.'
  },

  CONCEPTUAL: {
    name: 'conceptual',
    best_for: ['abstract ideas', 'metaphors', 'themes', 'emotions'],
    style_keywords: ['metaphorical', 'symbolic', 'artistic', 'thought-provoking'],
    default_resolution: '2K',
    prompt_template: 'Conceptual image representing {concept}. Symbolic, thought-provoking visual metaphor. {specifics}. Artistic but professional, high quality, suitable for business presentation.'
  },

  REALISTIC: {
    name: 'realistic',
    best_for: ['examples', 'scenarios', 'people', 'places', 'objects'],
    style_keywords: ['photographic', 'realistic', 'professional', 'high-quality'],
    default_resolution: '2K',
    prompt_template: 'Professional photograph of {concept}. Realistic, high-quality, well-lit. {specifics}. Commercial photography style, suitable for corporate presentation.'
  },

  DIAGRAM: {
    name: 'diagram',
    best_for: ['technical concepts', 'architectures', 'flows', 'relationships'],
    style_keywords: ['technical', 'schematic', 'architectural', 'structured'],
    default_resolution: '2K',
    prompt_template: 'Clean technical diagram illustrating {concept}. {specifics}. Professional, minimal color, clear connections, no labels or text.'
  },

  DATA_VIZ: {
    name: 'data-visualization',
    best_for: ['trends', 'growth', 'decline', 'distributions', 'correlations'],
    style_keywords: ['chart', 'graph', 'visualization', 'quantitative'],
    default_resolution: '2K',
    prompt_template: 'Modern data visualization showing {concept}. {specifics}. Clean design, professional color scheme, Tufte-style minimalism, no grid lines or labels.'
  },

  ABSTRACT: {
    name: 'abstract',
    best_for: ['innovation', 'transformation', 'future', 'technology'],
    style_keywords: ['abstract', 'modern', 'technological', 'futuristic'],
    default_resolution: '2K',
    prompt_template: 'Abstract visual representing {concept}. Modern, technological feel. {specifics}. Clean, professional, suitable for corporate presentation.'
  }
};

const CONTENT_PATTERNS = {
  // Numeric indicators
  numeric: {
    patterns: [/\d+%/, /\$\d+/, /\d+[KMB]/, /\d+ (percent|million|billion|thousand)/i],
    recommended_types: ['infographic', 'data-visualization']
  },

  // Comparison indicators
  comparison: {
    patterns: [/vs\.?/i, /versus/i, /compared to/i, /before.*after/i, /old.*new/i],
    recommended_types: ['infographic', 'data-visualization']
  },

  // Process indicators
  process: {
    patterns: [/step/i, /phase/i, /stage/i, /process/i, /workflow/i, /pipeline/i],
    recommended_types: ['diagram', 'infographic']
  },

  // Time indicators
  timeline: {
    patterns: [/timeline/i, /history/i, /evolution/i, /\d{4}/, /past.*future/i],
    recommended_types: ['infographic', 'diagram']
  },

  // Abstract concepts
  abstract: {
    patterns: [/future/i, /innovation/i, /transform/i, /vision/i, /imagine/i, /potential/i],
    recommended_types: ['conceptual', 'abstract']
  },

  // People/scenarios
  human: {
    patterns: [/people/i, /user/i, /student/i, /teacher/i, /team/i, /customer/i],
    recommended_types: ['realistic', 'conceptual']
  },

  // Technical
  technical: {
    patterns: [/architecture/i, /system/i, /infrastructure/i, /network/i, /api/i],
    recommended_types: ['diagram', 'abstract']
  }
};

function analyzeSlideContent(slide) {
  const content = `${slide.title || ''} ${slide.text || ''} ${slide.notes || ''}`.toLowerCase();

  // Detect patterns
  const detectedPatterns = [];
  for (const [patternName, pattern] of Object.entries(CONTENT_PATTERNS)) {
    for (const regex of pattern.patterns) {
      if (regex.test(content)) {
        detectedPatterns.push({
          pattern: patternName,
          recommended_types: pattern.recommended_types
        });
        break;
      }
    }
  }

  return detectedPatterns;
}

function selectVisualType(patterns, slidePattern) {
  // If no patterns detected, use slide pattern to guide
  if (patterns.length === 0) {
    switch (slidePattern) {
      case 'data-viz':
        return VISUAL_TYPES.DATA_VIZ;
      case 'process':
      case 'timeline':
        return VISUAL_TYPES.DIAGRAM;
      case 'big-idea':
        return VISUAL_TYPES.CONCEPTUAL;
      default:
        return VISUAL_TYPES.REALISTIC;
    }
  }

  // Count type recommendations
  const typeCounts = {};
  for (const p of patterns) {
    for (const type of p.recommended_types) {
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    }
  }

  // Get highest scoring type
  const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  const typeName = sorted[0][0];

  // Find matching visual type
  for (const visualType of Object.values(VISUAL_TYPES)) {
    if (visualType.name === typeName) {
      return visualType;
    }
  }

  return VISUAL_TYPES.CONCEPTUAL; // fallback
}

function extractConcepts(slide) {
  // Extract key concepts from slide content
  const title = slide.title || '';
  const text = slide.text || '';

  // Primary concept is the title (simplified)
  const concept = title.replace(/[?!.]/g, '').trim();

  // Secondary details from text
  const specifics = text
    ? text.split(/[.!?]/).slice(0, 2).join('. ').trim()
    : '';

  return { concept, specifics };
}

function generatePrompt(visualType, slide) {
  const { concept, specifics } = extractConcepts(slide);

  // Use template
  let prompt = visualType.prompt_template
    .replace('{concept}', concept)
    .replace('{specifics}', specifics);

  // Add brand context if available
  if (slide.brand) {
    if (slide.brand === 'psd') {
      prompt += ' Peninsula School District brand: teal/green color palette (#6CA18A), professional education context.';
    } else if (slide.brand === 'personal') {
      prompt += ' Modern, clean aesthetic.';
    }
  }

  return prompt;
}

function estimateCost(imageCount, resolution = '2K') {
  const perImage = IMAGE_COSTS[resolution];
  return {
    per_image: perImage,
    total: perImage * imageCount,
    resolution,
    currency: 'USD'
  };
}

function shouldGenerateImage(slide) {
  // Skip image generation for certain patterns
  if (slide.pattern === 'title' && slide.index === 0) {
    return false; // Title slide often doesn't need generated image
  }

  if (slide.pattern === 'transition') {
    return false; // Transitions are usually text-only
  }

  if (slide.pattern === 'big-idea' && !slide.needs_visual) {
    return false; // Some big ideas are typography-only
  }

  return true;
}

function generateRecommendations(slides, presentationId, options = {}) {
  const brand = options.brand || null;
  const resolution = options.resolution || '2K';
  const autoInclude = options.auto_include !== false;

  const recommendations = [];

  for (let i = 0; i < slides.length; i++) {
    const slide = { ...slides[i], index: i, brand };

    if (!shouldGenerateImage(slide)) {
      recommendations.push({
        slide_index: i,
        slide_title: slide.title,
        recommendation: 'no-image-needed',
        reason: `Pattern '${slide.pattern}' typically doesn't require generated image`
      });
      continue;
    }

    // Analyze content
    const patterns = analyzeSlideContent(slide);
    const visualType = selectVisualType(patterns, slide.pattern);

    // Generate prompt
    const prompt = generatePrompt(visualType, slide);

    // Generate filename
    const slideNum = String(i + 1).padStart(2, '0');
    const slugTitle = slide.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 40);
    const filename = `${presentationId}-slide-${slideNum}-${slugTitle}.png`;

    recommendations.push({
      slide_index: i,
      slide_title: slide.title,
      slide_pattern: slide.pattern,
      visual_type: visualType.name,
      prompt,
      filename,
      resolution,
      auto_include: autoInclude,
      confidence: patterns.length > 0 ? 'high' : 'medium'
    });
  }

  // Calculate costs
  const imagesToGenerate = recommendations.filter(r => r.recommendation !== 'no-image-needed');
  const costEstimate = estimateCost(imagesToGenerate.length, resolution);

  return {
    presentation_id: presentationId,
    total_slides: slides.length,
    images_recommended: imagesToGenerate.length,
    cost_estimate: costEstimate,
    recommendations,
    summary: {
      by_type: imagesToGenerate.reduce((acc, r) => {
        acc[r.visual_type] = (acc[r.visual_type] || 0) + 1;
        return acc;
      }, {}),
      high_confidence: imagesToGenerate.filter(r => r.confidence === 'high').length,
      medium_confidence: imagesToGenerate.filter(r => r.confidence === 'medium').length
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

  if (!args.slides || !args['presentation-id']) {
    console.error('Usage: bun suggest-images.js --slides slides.json --presentation-id "cyber-2025" [--brand psd] [--resolution 2K]');
    process.exit(1);
  }

  // Read slides from file
  const fs = require('fs');
  const slidesData = JSON.parse(fs.readFileSync(args.slides, 'utf-8'));
  const slides = Array.isArray(slidesData) ? slidesData : slidesData.slides;

  const options = {
    brand: args.brand || null,
    resolution: args.resolution || '2K'
  };

  const recommendations = generateRecommendations(slides, args['presentation-id'], options);
  console.log(JSON.stringify(recommendations, null, 2));
}

if (import.meta.main) {
  main();
}

export { generateRecommendations, analyzeSlideContent, selectVisualType, generatePrompt, estimateCost };
