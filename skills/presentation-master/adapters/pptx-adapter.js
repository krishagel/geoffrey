#!/usr/bin/env bun

/**
 * PPTX Adapter
 *
 * Converts presentation specification to PPTX format specification.
 * Integrates with pptx skill for actual file generation.
 *
 * Usage:
 *   bun pptx-adapter.js --presentation presentation.json --output pptx-spec.json
 *
 * Output: PPTX specification that pptx skill can execute
 */

// PSD Brand Colors
const PSD_COLORS = {
  primary_teal: '6CA18A',
  dark_blue: '25424C',
  cream: 'FFFAEC',
  warm_gray: 'EEEBE4',
  black: '000000',
  white: 'FFFFFF'
};

/**
 * Generate PPTX specification from presentation
 */
function generatePptxSpec(presentation, options = {}) {
  const brand = options.brand || null;
  const outputPath = options.output_path || null;

  const spec = {
    title: presentation.title,
    author: options.author || 'Geoffrey',
    subject: presentation.description || presentation.title,
    layout: '16x9',
    output_path: outputPath,
    slides: []
  };

  // Apply default theme if brand specified
  if (brand === 'psd') {
    spec.theme = {
      background: PSD_COLORS.warm_gray,
      primary_color: PSD_COLORS.primary_teal,
      secondary_color: PSD_COLORS.dark_blue,
      text_color: PSD_COLORS.black,
      accent_color: PSD_COLORS.cream
    };
  }

  // Convert slides
  for (const slide of presentation.slides) {
    const slideSpec = convertSlide(slide, brand);
    spec.slides.push(slideSpec);
  }

  return spec;
}

/**
 * Convert individual slide based on pattern
 */
function convertSlide(slide, brand) {
  switch (slide.pattern) {
    case 'title':
      return convertTitleSlide(slide, brand);

    case 'big-idea':
      return convertBigIdeaSlide(slide, brand);

    case 'visual-caption':
      return convertVisualCaptionSlide(slide, brand);

    case 'data-viz':
      return convertDataVizSlide(slide, brand);

    case 'process':
    case 'timeline':
      return convertProcessSlide(slide, brand);

    case 'transition':
      return convertTransitionSlide(slide, brand);

    default:
      return convertDefaultSlide(slide, brand);
  }
}

/**
 * Title Slide
 */
function convertTitleSlide(slide, brand) {
  const spec = {
    type: 'title',
    background: brand === 'psd' ? PSD_COLORS.dark_blue : 'FFFFFF',
    elements: []
  };

  // Title
  spec.elements.push({
    type: 'text',
    text: slide.title,
    x: '10%',
    y: '35%',
    w: '80%',
    h: '30%',
    fontSize: 48,
    bold: true,
    color: brand === 'psd' ? PSD_COLORS.cream : '000000',
    align: 'center',
    valign: 'middle',
    fontFace: 'Arial'
  });

  // Subtitle if present
  if (slide.text) {
    spec.elements.push({
      type: 'text',
      text: slide.text,
      x: '15%',
      y: '65%',
      w: '70%',
      h: '10%',
      fontSize: 24,
      color: brand === 'psd' ? PSD_COLORS.cream : '666666',
      align: 'center',
      fontFace: 'Arial'
    });
  }

  return spec;
}

/**
 * Big Idea Slide
 */
function convertBigIdeaSlide(slide, brand) {
  // Calculate font size based on text length
  const textLength = slide.title.length;
  const fontSize = Math.min(120, Math.max(60, Math.floor(300 / textLength)));

  const spec = {
    type: 'big-idea',
    background: 'FFFFFF',
    elements: [{
      type: 'text',
      text: slide.title,
      x: '10%',
      y: '25%',
      w: '80%',
      h: '50%',
      fontSize,
      bold: true,
      color: brand === 'psd' ? PSD_COLORS.primary_teal : '000000',
      align: 'center',
      valign: 'middle',
      fontFace: 'Arial'
    }]
  };

  return spec;
}

/**
 * Visual + Caption Slide
 */
function convertVisualCaptionSlide(slide, brand) {
  const spec = {
    type: 'visual-caption',
    background: brand === 'psd' ? PSD_COLORS.warm_gray : 'FFFFFF',
    elements: []
  };

  // Image (70-80% of slide)
  if (slide.image) {
    spec.elements.push({
      type: 'image',
      path: slide.image.url || slide.image.path,
      x: '5%',
      y: '5%',
      w: '90%',
      h: '70%',
      sizing: {
        type: 'contain',
        w: '90%',
        h: '70%'
      }
    });
  }

  // Caption (bottom)
  spec.elements.push({
    type: 'text',
    text: slide.text || slide.title,
    x: '5%',
    y: '80%',
    w: '90%',
    h: '15%',
    fontSize: 24,
    color: '000000',
    align: 'center',
    valign: 'top',
    fontFace: 'Arial'
  });

  return spec;
}

/**
 * Data Visualization Slide
 */
function convertDataVizSlide(slide, brand) {
  const spec = {
    type: 'data-viz',
    background: brand === 'psd' ? PSD_COLORS.warm_gray : 'FFFFFF',
    elements: []
  };

  // Header bar if PSD brand
  if (brand === 'psd') {
    spec.elements.push({
      type: 'rect',
      x: 0,
      y: 0,
      w: '100%',
      h: '12%',
      fill: { color: PSD_COLORS.dark_blue }
    });

    spec.elements.push({
      type: 'text',
      text: slide.title,
      x: '5%',
      y: '1%',
      w: '90%',
      h: '10%',
      fontSize: 36,
      bold: true,
      color: PSD_COLORS.cream,
      fontFace: 'Arial'
    });
  } else {
    spec.elements.push({
      type: 'text',
      text: slide.title,
      x: '5%',
      y: '5%',
      w: '90%',
      h: '10%',
      fontSize: 36,
      bold: true,
      color: '000000',
      fontFace: 'Arial'
    });
  }

  // Chart/Data visualization
  if (slide.chart || slide.image) {
    const yOffset = brand === 'psd' ? '18%' : '18%';
    spec.elements.push({
      type: 'image',
      path: (slide.chart || slide.image).url || (slide.chart || slide.image).path,
      x: '7.5%',
      y: yOffset,
      w: '85%',
      h: '70%',
      sizing: {
        type: 'contain',
        w: '85%',
        h: '70%'
      }
    });
  }

  return spec;
}

/**
 * Process/Timeline Slide
 */
function convertProcessSlide(slide, brand) {
  const spec = {
    type: 'process',
    background: brand === 'psd' ? PSD_COLORS.warm_gray : 'FFFFFF',
    elements: []
  };

  // Title
  spec.elements.push({
    type: 'text',
    text: slide.title,
    x: '5%',
    y: '5%',
    w: '90%',
    h: '12%',
    fontSize: 36,
    bold: true,
    color: brand === 'psd' ? PSD_COLORS.dark_blue : '000000',
    fontFace: 'Arial'
  });

  // Process diagram
  if (slide.image) {
    spec.elements.push({
      type: 'image',
      path: slide.image.url || slide.image.path,
      x: '5%',
      y: '25%',
      w: '90%',
      h: '65%',
      sizing: {
        type: 'contain',
        w: '90%',
        h: '65%'
      }
    });
  }

  return spec;
}

/**
 * Transition Slide
 */
function convertTransitionSlide(slide, brand) {
  const spec = {
    type: 'transition',
    background: 'FFFFFF',
    elements: [{
      type: 'text',
      text: slide.title,
      x: '10%',
      y: '35%',
      w: '80%',
      h: '30%',
      fontSize: 42,
      bold: true,
      color: brand === 'psd' ? PSD_COLORS.primary_teal : '000000',
      align: 'center',
      valign: 'middle',
      fontFace: 'Arial'
    }]
  };

  return spec;
}

/**
 * Default Slide (fallback)
 */
function convertDefaultSlide(slide, brand) {
  return convertTitleSlide(slide, brand);
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
    console.error('Usage: bun pptx-adapter.js --presentation presentation.json [--brand psd] [--output pptx-spec.json]');
    process.exit(1);
  }

  const fs = require('fs');
  const presentation = JSON.parse(fs.readFileSync(args.presentation, 'utf-8'));

  const options = {
    brand: args.brand || null,
    output_path: args['output-path'] || null,
    author: args.author || 'Geoffrey'
  };

  const pptxSpec = generatePptxSpec(presentation, options);

  if (args.output) {
    fs.writeFileSync(args.output, JSON.stringify(pptxSpec, null, 2));
    console.log(`PPTX specification written to ${args.output}`);
  } else {
    console.log(JSON.stringify(pptxSpec, null, 2));
  }
}

if (import.meta.main) {
  main();
}

export { generatePptxSpec, convertSlide };
