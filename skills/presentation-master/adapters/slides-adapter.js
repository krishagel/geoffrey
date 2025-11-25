#!/usr/bin/env bun

/**
 * Google Slides Adapter
 *
 * Converts presentation specification to Google Slides API requests.
 * Integrates with google-workspace skill for authentication and API access.
 *
 * Usage:
 *   bun slides-adapter.js --presentation presentation.json --account psd --output slides-spec.json
 *
 * Output: Google Slides API request specification that google-workspace skill can execute
 */

// PSD Brand Colors (from psd-brand-guidelines skill)
const PSD_COLORS = {
  primary_teal: '#6CA18A',
  dark_blue: '#25424C',
  cream: '#FFFAEC',
  warm_gray: '#EEEBE4',
  black: '#000000',
  white: '#FFFFFF'
};

// Slide dimensions (16:9 aspect ratio)
const SLIDE_DIMENSIONS = {
  width: { magnitude: 10, unit: 'INCHES' },
  height: { magnitude: 5.625, unit: 'INCHES' }
};

// Convert points to EMU (English Metric Units) for Google Slides API
function pointsToEmu(points) {
  return Math.round(points * 12700);
}

// Convert inches to EMU
function inchesToEmu(inches) {
  return Math.round(inches * 914400);
}

/**
 * Generate Google Slides API requests for creating a presentation
 */
function generateSlidesRequests(presentation, options = {}) {
  const account = options.account || 'psd';
  const applyBrand = options.brand !== false;

  const requests = [];

  // 1. Create presentation
  const createRequest = {
    operation: 'create_presentation',
    params: {
      title: presentation.title,
      locale: 'en-US'
    }
  };

  // 2. Delete default slide
  const deleteDefaultSlide = {
    operation: 'delete_object',
    params: {
      objectId: '{{DEFAULT_SLIDE_ID}}' // Will be replaced after creation
    }
  };

  // 3. Apply master theme if PSD brand
  let masterThemeRequests = [];
  if (applyBrand && account === 'psd') {
    masterThemeRequests = generatePsdTheme();
  }

  // 4. Create slides
  const slideRequests = [];
  for (let i = 0; i < presentation.slides.length; i++) {
    const slide = presentation.slides[i];
    const slideId = `slide_${i}`;

    // Create slide
    slideRequests.push({
      operation: 'create_slide',
      params: {
        objectId: slideId,
        insertionIndex: i,
        slideLayoutReference: { predefinedLayout: 'BLANK' }
      }
    });

    // Add slide content based on pattern
    const contentRequests = generateSlideContent(slide, slideId, applyBrand ? account : null);
    slideRequests.push(...contentRequests);
  }

  return {
    account,
    presentation_title: presentation.title,
    requests: [
      createRequest,
      ...masterThemeRequests,
      ...slideRequests
    ],
    post_creation_steps: [
      'Delete default slide if present',
      'Return shareable link with edit permissions'
    ]
  };
}

/**
 * Generate PSD brand theme
 */
function generatePsdTheme() {
  return [
    {
      operation: 'update_page_properties',
      params: {
        objectId: '{{MASTER_SLIDE_ID}}',
        pageProperties: {
          pageBackgroundFill: {
            solidFill: {
              color: { rgbColor: hexToRgb(PSD_COLORS.warm_gray) }
            }
          }
        }
      }
    }
  ];
}

/**
 * Generate slide content based on pattern
 */
function generateSlideContent(slide, slideId, brand) {
  const requests = [];

  switch (slide.pattern) {
    case 'title':
      requests.push(...generateTitleSlide(slide, slideId, brand));
      break;

    case 'big-idea':
      requests.push(...generateBigIdeaSlide(slide, slideId, brand));
      break;

    case 'visual-caption':
      requests.push(...generateVisualCaptionSlide(slide, slideId, brand));
      break;

    case 'data-viz':
      requests.push(...generateDataVizSlide(slide, slideId, brand));
      break;

    case 'process':
    case 'timeline':
      requests.push(...generateProcessSlide(slide, slideId, brand));
      break;

    case 'transition':
      requests.push(...generateTransitionSlide(slide, slideId, brand));
      break;

    default:
      requests.push(...generateDefaultSlide(slide, slideId, brand));
  }

  return requests;
}

/**
 * Title Slide Pattern
 */
function generateTitleSlide(slide, slideId, brand) {
  const requests = [];

  if (brand === 'psd') {
    // Background
    requests.push({
      operation: 'update_page_properties',
      params: {
        objectId: slideId,
        pageProperties: {
          pageBackgroundFill: {
            solidFill: {
              color: { rgbColor: hexToRgb(PSD_COLORS.dark_blue) }
            }
          }
        }
      }
    });
  }

  // Title text
  const titleBoxId = `${slideId}_title`;
  requests.push({
    operation: 'create_shape',
    params: {
      objectId: titleBoxId,
      shapeType: 'TEXT_BOX',
      elementProperties: {
        pageObjectId: slideId,
        size: {
          width: { magnitude: 8, unit: 'INCHES' },
          height: { magnitude: 2, unit: 'INCHES' }
        },
        transform: {
          scaleX: 1,
          scaleY: 1,
          translateX: inchesToEmu(1),
          translateY: inchesToEmu(1.8),
          unit: 'EMU'
        }
      }
    }
  });

  // Insert title text
  requests.push({
    operation: 'insert_text',
    params: {
      objectId: titleBoxId,
      text: slide.title,
      insertionIndex: 0
    }
  });

  // Style title text
  requests.push({
    operation: 'update_text_style',
    params: {
      objectId: titleBoxId,
      textRange: { type: 'ALL' },
      style: {
        fontFamily: 'Arial',
        fontSize: { magnitude: 48, unit: 'PT' },
        bold: true,
        foregroundColor: {
          opaqueColor: {
            rgbColor: brand === 'psd'
              ? hexToRgb(PSD_COLORS.cream)
              : hexToRgb('#FFFFFF')
          }
        }
      },
      fields: 'fontFamily,fontSize,bold,foregroundColor'
    }
  });

  // Center align
  requests.push({
    operation: 'update_paragraph_style',
    params: {
      objectId: titleBoxId,
      textRange: { type: 'ALL' },
      style: {
        alignment: 'CENTER'
      },
      fields: 'alignment'
    }
  });

  return requests;
}

/**
 * Big Idea Slide Pattern
 */
function generateBigIdeaSlide(slide, slideId, brand) {
  const requests = [];

  // Massive text in center
  const textBoxId = `${slideId}_bigidea`;
  requests.push({
    operation: 'create_shape',
    params: {
      objectId: textBoxId,
      shapeType: 'TEXT_BOX',
      elementProperties: {
        pageObjectId: slideId,
        size: {
          width: { magnitude: 8, unit: 'INCHES' },
          height: { magnitude: 3, unit: 'INCHES' }
        },
        transform: {
          scaleX: 1,
          scaleY: 1,
          translateX: inchesToEmu(1),
          translateY: inchesToEmu(1.3),
          unit: 'EMU'
        }
      }
    }
  });

  requests.push({
    operation: 'insert_text',
    params: {
      objectId: textBoxId,
      text: slide.title,
      insertionIndex: 0
    }
  });

  // Giant font size (60-120pt)
  const fontSize = Math.min(120, Math.max(60, Math.floor(300 / slide.title.length)));

  requests.push({
    operation: 'update_text_style',
    params: {
      objectId: textBoxId,
      textRange: { type: 'ALL' },
      style: {
        fontFamily: 'Arial',
        fontSize: { magnitude: fontSize, unit: 'PT' },
        bold: true,
        foregroundColor: {
          opaqueColor: {
            rgbColor: brand === 'psd'
              ? hexToRgb(PSD_COLORS.primary_teal)
              : hexToRgb('#000000')
          }
        }
      },
      fields: 'fontFamily,fontSize,bold,foregroundColor'
    }
  });

  requests.push({
    operation: 'update_paragraph_style',
    params: {
      objectId: textBoxId,
      textRange: { type: 'ALL' },
      style: {
        alignment: 'CENTER'
      },
      fields: 'alignment'
    }
  });

  return requests;
}

/**
 * Visual + Caption Slide Pattern
 */
function generateVisualCaptionSlide(slide, slideId, brand) {
  const requests = [];

  // Image (70-80% of slide)
  if (slide.image) {
    const imageId = `${slideId}_image`;
    requests.push({
      operation: 'create_image',
      params: {
        objectId: imageId,
        url: slide.image.url,
        elementProperties: {
          pageObjectId: slideId,
          size: {
            width: { magnitude: 9, unit: 'INCHES' },
            height: { magnitude: 4, unit: 'INCHES' }
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: inchesToEmu(0.5),
            translateY: inchesToEmu(0.3),
            unit: 'EMU'
          }
        }
      }
    });
  }

  // Caption (1 line, bottom)
  const captionId = `${slideId}_caption`;
  requests.push({
    operation: 'create_shape',
    params: {
      objectId: captionId,
      shapeType: 'TEXT_BOX',
      elementProperties: {
        pageObjectId: slideId,
        size: {
          width: { magnitude: 9, unit: 'INCHES' },
          height: { magnitude: 0.8, unit: 'INCHES' }
        },
        transform: {
          scaleX: 1,
          scaleY: 1,
          translateX: inchesToEmu(0.5),
          translateY: inchesToEmu(4.6),
          unit: 'EMU'
        }
      }
    }
  });

  requests.push({
    operation: 'insert_text',
    params: {
      objectId: captionId,
      text: slide.text || slide.title,
      insertionIndex: 0
    }
  });

  requests.push({
    operation: 'update_text_style',
    params: {
      objectId: captionId,
      textRange: { type: 'ALL' },
      style: {
        fontFamily: 'Arial',
        fontSize: { magnitude: 24, unit: 'PT' },
        foregroundColor: {
          opaqueColor: {
            rgbColor: hexToRgb('#000000')
          }
        }
      },
      fields: 'fontFamily,fontSize,foregroundColor'
    }
  });

  requests.push({
    operation: 'update_paragraph_style',
    params: {
      objectId: captionId,
      textRange: { type: 'ALL' },
      style: {
        alignment: 'CENTER'
      },
      fields: 'alignment'
    }
  });

  return requests;
}

/**
 * Data Visualization Slide Pattern
 */
function generateDataVizSlide(slide, slideId, brand) {
  const requests = [];

  // Header
  if (brand === 'psd') {
    const headerId = `${slideId}_header`;
    requests.push({
      operation: 'create_shape',
      params: {
        objectId: headerId,
        shapeType: 'RECTANGLE',
        elementProperties: {
          pageObjectId: slideId,
          size: {
            width: { magnitude: 10, unit: 'INCHES' },
            height: { magnitude: 0.8, unit: 'INCHES' }
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: 0,
            translateY: 0,
            unit: 'EMU'
          }
        }
      }
    });

    requests.push({
      operation: 'update_shape_properties',
      params: {
        objectId: headerId,
        shapeProperties: {
          shapeBackgroundFill: {
            solidFill: {
              color: { rgbColor: hexToRgb(PSD_COLORS.dark_blue) }
            }
          }
        },
        fields: 'shapeBackgroundFill'
      }
    });

    // Header text
    const headerTextId = `${slideId}_header_text`;
    requests.push({
      operation: 'create_shape',
      params: {
        objectId: headerTextId,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: slideId,
          size: {
            width: { magnitude: 9, unit: 'INCHES' },
            height: { magnitude: 0.6, unit: 'INCHES' }
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: inchesToEmu(0.5),
            translateY: inchesToEmu(0.1),
            unit: 'EMU'
          }
        }
      }
    });

    requests.push({
      operation: 'insert_text',
      params: {
        objectId: headerTextId,
        text: slide.title,
        insertionIndex: 0
      }
    });

    requests.push({
      operation: 'update_text_style',
      params: {
        objectId: headerTextId,
        textRange: { type: 'ALL' },
        style: {
          fontFamily: 'Arial',
          fontSize: { magnitude: 36, unit: 'PT' },
          bold: true,
          foregroundColor: {
            opaqueColor: {
              rgbColor: hexToRgb(PSD_COLORS.cream)
            }
          }
        },
        fields: 'fontFamily,fontSize,bold,foregroundColor'
      }
    });
  }

  // Chart/Image placeholder
  if (slide.chart || slide.image) {
    const chartId = `${slideId}_chart`;
    const yOffset = brand === 'psd' ? 1.0 : 0.5;

    requests.push({
      operation: 'create_image',
      params: {
        objectId: chartId,
        url: (slide.chart || slide.image).url,
        elementProperties: {
          pageObjectId: slideId,
          size: {
            width: { magnitude: 8.5, unit: 'INCHES' },
            height: { magnitude: 4, unit: 'INCHES' }
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: inchesToEmu(0.75),
            translateY: inchesToEmu(yOffset),
            unit: 'EMU'
          }
        }
      }
    });
  }

  return requests;
}

/**
 * Process/Timeline Slide Pattern
 */
function generateProcessSlide(slide, slideId, brand) {
  const requests = [];

  // Title
  const titleId = `${slideId}_title`;
  requests.push({
    operation: 'create_shape',
    params: {
      objectId: titleId,
      shapeType: 'TEXT_BOX',
      elementProperties: {
        pageObjectId: slideId,
        size: {
          width: { magnitude: 9, unit: 'INCHES' },
          height: { magnitude: 0.8, unit: 'INCHES' }
        },
        transform: {
          scaleX: 1,
          scaleY: 1,
          translateX: inchesToEmu(0.5),
          translateY: inchesToEmu(0.3),
          unit: 'EMU'
        }
      }
    }
  });

  requests.push({
    operation: 'insert_text',
    params: {
      objectId: titleId,
      text: slide.title,
      insertionIndex: 0
    }
  });

  requests.push({
    operation: 'update_text_style',
    params: {
      objectId: titleId,
      textRange: { type: 'ALL' },
      style: {
        fontFamily: 'Arial',
        fontSize: { magnitude: 36, unit: 'PT' },
        bold: true,
        foregroundColor: {
          opaqueColor: {
            rgbColor: brand === 'psd'
              ? hexToRgb(PSD_COLORS.dark_blue)
              : hexToRgb('#000000')
          }
        }
      },
      fields: 'fontFamily,fontSize,bold,foregroundColor'
    }
  });

  // Process diagram/image
  if (slide.image) {
    const imageId = `${slideId}_process`;
    requests.push({
      operation: 'create_image',
      params: {
        objectId: imageId,
        url: slide.image.url,
        elementProperties: {
          pageObjectId: slideId,
          size: {
            width: { magnitude: 9, unit: 'INCHES' },
            height: { magnitude: 3.5, unit: 'INCHES' }
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: inchesToEmu(0.5),
            translateY: inchesToEmu(1.5),
            unit: 'EMU'
          }
        }
      }
    });
  }

  return requests;
}

/**
 * Transition Slide Pattern
 */
function generateTransitionSlide(slide, slideId, brand) {
  const requests = [];

  // Simple centered text
  const textId = `${slideId}_transition`;
  requests.push({
    operation: 'create_shape',
    params: {
      objectId: textId,
      shapeType: 'TEXT_BOX',
      elementProperties: {
        pageObjectId: slideId,
        size: {
          width: { magnitude: 8, unit: 'INCHES' },
          height: { magnitude: 2, unit: 'INCHES' }
        },
        transform: {
          scaleX: 1,
          scaleY: 1,
          translateX: inchesToEmu(1),
          translateY: inchesToEmu(1.8),
          unit: 'EMU'
        }
      }
    }
  });

  requests.push({
    operation: 'insert_text',
    params: {
      objectId: textId,
      text: slide.title,
      insertionIndex: 0
    }
  });

  requests.push({
    operation: 'update_text_style',
    params: {
      objectId: textId,
      textRange: { type: 'ALL' },
      style: {
        fontFamily: 'Arial',
        fontSize: { magnitude: 42, unit: 'PT' },
        bold: true,
        foregroundColor: {
          opaqueColor: {
            rgbColor: brand === 'psd'
              ? hexToRgb(PSD_COLORS.primary_teal)
              : hexToRgb('#000000')
          }
        }
      },
      fields: 'fontFamily,fontSize,bold,foregroundColor'
    }
  });

  requests.push({
    operation: 'update_paragraph_style',
    params: {
      objectId: textId,
      textRange: { type: 'ALL' },
      style: {
        alignment: 'CENTER'
      },
      fields: 'alignment'
    }
  });

  return requests;
}

/**
 * Default Slide Pattern (fallback)
 */
function generateDefaultSlide(slide, slideId, brand) {
  // Use title slide pattern as default
  return generateTitleSlide(slide, slideId, brand);
}

/**
 * Helper: Convert hex color to RGB object
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    red: parseInt(result[1], 16) / 255,
    green: parseInt(result[2], 16) / 255,
    blue: parseInt(result[3], 16) / 255
  } : { red: 0, green: 0, blue: 0 };
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
    console.error('Usage: bun slides-adapter.js --presentation presentation.json --account psd [--output slides-spec.json]');
    process.exit(1);
  }

  const fs = require('fs');
  const presentation = JSON.parse(fs.readFileSync(args.presentation, 'utf-8'));

  const options = {
    account: args.account || 'psd',
    brand: args.brand !== 'false'
  };

  const slidesSpec = generateSlidesRequests(presentation, options);

  if (args.output) {
    fs.writeFileSync(args.output, JSON.stringify(slidesSpec, null, 2));
    console.log(`Google Slides specification written to ${args.output}`);
  } else {
    console.log(JSON.stringify(slidesSpec, null, 2));
  }
}

if (import.meta.main) {
  main();
}

export { generateSlidesRequests, generateSlideContent, hexToRgb };
