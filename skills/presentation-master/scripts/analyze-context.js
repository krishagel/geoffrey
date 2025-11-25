#!/usr/bin/env bun

/**
 * Presentation Context Analyzer
 *
 * Analyzes topic, audience, duration, purpose to detect presentation type
 * and recommend appropriate story framework.
 *
 * Usage:
 *   bun analyze-context.js --topic "Cybersecurity Trends" --audience "School Board" --duration "15min" --purpose "inform"
 *
 * Output: JSON with presentation type, recommended framework, pattern distribution
 */

const PRESENTATION_TYPES = {
  BOARD_UPDATE: {
    name: 'board-update',
    indicators: ['board', 'executive', 'update', 'quarterly', 'status', 'report'],
    characteristics: {
      audience_technical: 'low',
      focus: 'data-driven',
      primary_goal: 'inform + recommend',
      typical_duration: '15-20min'
    },
    pattern_distribution: {
      'data-viz': 0.40,
      'visual-caption': 0.30,
      'transition': 0.20,
      'title': 0.10
    },
    recommended_frameworks: ['classic-three-act', 'rule-of-three']
  },

  KEYNOTE: {
    name: 'keynote',
    indicators: ['keynote', 'conference', 'inspire', 'vision', 'future', 'transform'],
    characteristics: {
      audience_technical: 'mixed',
      focus: 'inspirational',
      primary_goal: 'shift perspective',
      typical_duration: '20-30min'
    },
    pattern_distribution: {
      'big-idea': 0.40,
      'visual-caption': 0.30,
      'title': 0.20,
      'transition': 0.10
    },
    recommended_frameworks: ['sparkline', 'rule-of-three', 'ted']
  },

  TRAINING: {
    name: 'training',
    indicators: ['training', 'workshop', 'tutorial', 'learn', 'how-to', 'guide'],
    characteristics: {
      audience_technical: 'variable',
      focus: 'educational',
      primary_goal: 'teach + practice',
      typical_duration: '30-60min'
    },
    pattern_distribution: {
      'process': 0.40,
      'data-viz': 0.30,
      'visual-caption': 0.20,
      'title': 0.10
    },
    recommended_frameworks: ['classic-three-act']
  },

  PITCH: {
    name: 'pitch',
    indicators: ['pitch', 'proposal', 'investment', 'funding', 'sell', 'convince'],
    characteristics: {
      audience_technical: 'mixed',
      focus: 'persuasive',
      primary_goal: 'convince + action',
      typical_duration: '10-20min'
    },
    pattern_distribution: {
      'data-viz': 0.30,
      'big-idea': 0.30,
      'visual-caption': 0.25,
      'title-transition': 0.15
    },
    recommended_frameworks: ['rule-of-three', 'classic-three-act']
  },

  TED_STYLE: {
    name: 'ted-style',
    indicators: ['ted', 'idea', 'story', 'personal', 'change the world'],
    characteristics: {
      audience_technical: 'general',
      focus: 'idea-centric',
      primary_goal: 'inspire + spread idea',
      typical_duration: '15-20min'
    },
    pattern_distribution: {
      'big-idea': 0.35,
      'visual-caption': 0.35,
      'transition': 0.20,
      'title': 0.10
    },
    recommended_frameworks: ['ted']
  }
};

const STORY_FRAMEWORKS = {
  'sparkline': {
    name: "Nancy Duarte's Sparkline",
    duration: '20-30min',
    slides: '18-25',
    best_for: ['keynote', 'ted-style'],
    structure: 'Alternate "what is" (reality) with "what could be" (aspiration)',
    complexity: 'high'
  },

  'rule-of-three': {
    name: "Steve Jobs' Rule of Three",
    duration: '15-30min',
    slides: '12-18',
    best_for: ['keynote', 'pitch', 'board-update'],
    structure: 'Three main sections, three points per section',
    complexity: 'medium'
  },

  'ted': {
    name: 'TED Talk Structure',
    duration: '15-20min',
    slides: '12-18',
    best_for: ['ted-style', 'keynote'],
    structure: 'Hook → Personal → Core Idea → Call to Action → Close',
    complexity: 'medium'
  },

  'classic-three-act': {
    name: 'Classic Three-Act Structure',
    duration: '20-45min',
    slides: '15-35',
    best_for: ['training', 'board-update', 'pitch'],
    structure: 'Setup (25%) → Confrontation (50%) → Resolution (25%)',
    complexity: 'low'
  }
};

function parseDuration(durationStr) {
  // Parse strings like "15min", "20 minutes", "1 hour", "45m"
  const matches = durationStr.toLowerCase().match(/(\d+)\s*(min|minute|minutes|m|hour|hours|h)/);
  if (!matches) return null;

  const value = parseInt(matches[1]);
  const unit = matches[2];

  if (unit.startsWith('h')) {
    return value * 60; // convert to minutes
  }
  return value;
}

function detectPresentationType(topic, audience, purpose) {
  const combined = `${topic} ${audience} ${purpose}`.toLowerCase();
  const scores = {};

  for (const [key, type] of Object.entries(PRESENTATION_TYPES)) {
    let score = 0;

    // Check for indicator keywords
    for (const indicator of type.indicators) {
      if (combined.includes(indicator)) {
        score += 10;
      }
    }

    scores[type.name] = score;
  }

  // Find highest scoring type
  const sortedTypes = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  if (sortedTypes[0][1] === 0) {
    // No clear match, default based on purpose
    if (purpose.includes('teach') || purpose.includes('train')) return 'training';
    if (purpose.includes('inspire') || purpose.includes('motivate')) return 'keynote';
    if (purpose.includes('convince') || purpose.includes('sell')) return 'pitch';
    return 'board-update'; // conservative default
  }

  return sortedTypes[0][0];
}

function recommendFrameworks(presentationType, durationMinutes) {
  const type = Object.values(PRESENTATION_TYPES).find(t => t.name === presentationType);
  if (!type) return [];

  // Get recommended frameworks for this type
  const recommendations = type.recommended_frameworks.map(fw => {
    const framework = STORY_FRAMEWORKS[fw];

    // Parse framework duration range
    const durationMatch = framework.duration.match(/(\d+)-(\d+)min/);
    if (!durationMatch) return { ...framework, key: fw, fit_score: 50 };

    const minDuration = parseInt(durationMatch[1]);
    const maxDuration = parseInt(durationMatch[2]);

    // Score based on duration fit
    let fit_score = 50;
    if (durationMinutes >= minDuration && durationMinutes <= maxDuration) {
      fit_score = 100;
    } else if (durationMinutes < minDuration) {
      fit_score = Math.max(0, 100 - ((minDuration - durationMinutes) * 5));
    } else {
      fit_score = Math.max(0, 100 - ((durationMinutes - maxDuration) * 5));
    }

    return {
      key: fw,
      ...framework,
      fit_score
    };
  });

  // Sort by fit score
  return recommendations.sort((a, b) => b.fit_score - a.fit_score);
}

function estimateSlideCount(durationMinutes, presentationType) {
  // Guy Kawasaki: 10 slides for 20 minutes = 0.5 slides/min
  // Adjust based on presentation type

  const rates = {
    'board-update': 0.5,    // More data-heavy, slower pace
    'keynote': 0.7,         // More visuals, faster pace
    'training': 0.4,        // More explanation needed
    'pitch': 0.6,           // Balanced
    'ted-style': 0.8        // Fast-paced, visual
  };

  const rate = rates[presentationType] || 0.5;
  const baseCount = Math.round(durationMinutes * rate);

  // Kawasaki's hard limit: max 10 core concepts
  // But we can have transition/title slides
  const maxCoreSlides = 10;
  const coreSlides = Math.min(baseCount, maxCoreSlides);
  const supportSlides = Math.ceil(coreSlides * 0.3); // 30% support slides

  return {
    total: coreSlides + supportSlides,
    core: coreSlides,
    support: supportSlides,
    recommendation: coreSlides + supportSlides <= 15 ? 'optimal' : 'consider-simplifying'
  };
}

function analyzeAudience(audienceStr) {
  const lower = audienceStr.toLowerCase();

  // Technical level
  let technical_level = 'medium';
  if (lower.match(/board|executive|c-suite|non-technical/)) {
    technical_level = 'low';
  } else if (lower.match(/engineer|developer|technical|expert|specialist/)) {
    technical_level = 'high';
  }

  // Decision-making power
  let decision_power = 'medium';
  if (lower.match(/board|executive|ceo|cio|cto|director|vp/)) {
    decision_power = 'high';
  } else if (lower.match(/staff|team|individual contributor|ic/)) {
    decision_power = 'low';
  }

  // Size
  let size = 'medium';
  if (lower.match(/small|intimate|1:1|one-on-one/)) {
    size = 'small';
  } else if (lower.match(/large|conference|hundreds|auditorium/)) {
    size = 'large';
  }

  return {
    technical_level,
    decision_power,
    size,
    recommendations: {
      font_size: size === 'large' ? '42pt+' : '36pt+',
      detail_level: technical_level === 'high' ? 'can-include-technical-details' : 'avoid-jargon',
      call_to_action: decision_power === 'high' ? 'specific-next-steps' : 'awareness-building'
    }
  };
}

function generateAnalysis(args) {
  const topic = args.topic || '';
  const audience = args.audience || '';
  const duration = args.duration || '20min';
  const purpose = args.purpose || '';

  const durationMinutes = parseDuration(duration);
  const presentationType = detectPresentationType(topic, audience, purpose);
  const typeDetails = Object.values(PRESENTATION_TYPES).find(t => t.name === presentationType);
  const frameworks = recommendFrameworks(presentationType, durationMinutes);
  const slideEstimate = estimateSlideCount(durationMinutes, presentationType);
  const audienceAnalysis = analyzeAudience(audience);

  return {
    input: {
      topic,
      audience,
      duration,
      purpose
    },
    analysis: {
      presentation_type: presentationType,
      type_characteristics: typeDetails.characteristics,
      audience_analysis: audienceAnalysis,
      duration_minutes: durationMinutes,
      slide_estimate: slideEstimate,
      pattern_distribution: typeDetails.pattern_distribution
    },
    recommendations: {
      primary_framework: frameworks[0],
      alternative_frameworks: frameworks.slice(1),
      key_principles: [
        'Maximum 6 words per slide (Seth Godin)',
        `Font size minimum: ${audienceAnalysis.recommendations.font_size}`,
        `${slideEstimate.core} core concepts maximum (Guy Kawasaki)`,
        'One idea per slide',
        'Visual dominance over text'
      ]
    },
    warnings: [
      slideEstimate.recommendation === 'consider-simplifying'
        ? `⚠️  ${slideEstimate.total} slides may be too many - consider simplifying to ${Math.min(slideEstimate.core, 10)} core concepts`
        : null,
      durationMinutes > 30
        ? '⚠️  Presentations >30min risk losing audience attention - consider breaking into sections'
        : null,
      audienceAnalysis.technical_level === 'low' && topic.toLowerCase().match(/technical|technology|ai|software/)
        ? '⚠️  Non-technical audience + technical topic = extra emphasis on visual metaphors'
        : null
    ].filter(w => w !== null)
  };
}

// CLI Interface
function main() {
  const args = {};

  for (let i = 2; i < process.argv.length; i += 2) {
    const key = process.argv[i].replace(/^--/, '');
    const value = process.argv[i + 1];
    args[key] = value;
  }

  if (!args.topic && !args.audience && !args.duration) {
    console.error('Usage: bun analyze-context.js --topic "Topic" --audience "Audience" --duration "15min" [--purpose "Purpose"]');
    process.exit(1);
  }

  const analysis = generateAnalysis(args);
  console.log(JSON.stringify(analysis, null, 2));
}

if (import.meta.main) {
  main();
}

export { generateAnalysis, detectPresentationType, recommendFrameworks, estimateSlideCount, analyzeAudience };
