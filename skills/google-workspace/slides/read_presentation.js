#!/usr/bin/env node

/**
 * Read Google Slides Presentation
 *
 * Usage: node read_presentation.js <account> <presentation-id>
 *
 * Examples:
 *   node read_presentation.js psd 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
 */

const { google } = require('googleapis');
const path = require('path');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

async function readPresentation(account, presentationId) {
  const auth = await getAuthClient(account);
  const slides = google.slides({ version: 'v1', auth });

  const response = await slides.presentations.get({
    presentationId,
  });

  const presentation = response.data;

  // Extract slide content
  const slideContent = (presentation.slides || []).map((slide, index) => {
    const texts = [];

    // Extract text from page elements
    for (const element of (slide.pageElements || [])) {
      if (element.shape && element.shape.text) {
        for (const textElement of (element.shape.text.textElements || [])) {
          if (textElement.textRun && textElement.textRun.content) {
            const text = textElement.textRun.content.trim();
            if (text) texts.push(text);
          }
        }
      }
    }

    return {
      slideNumber: index + 1,
      objectId: slide.objectId,
      texts,
    };
  });

  return {
    success: true,
    account,
    presentation: {
      id: presentation.presentationId,
      title: presentation.title,
      slideCount: (presentation.slides || []).length,
      slides: slideContent,
    },
    metadata: {
      timestamp: new Date().toISOString(),
    }
  };
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const account = args[0];
  const presentationId = args[1];

  if (!account || !presentationId) {
    console.error(JSON.stringify({
      error: 'Missing arguments',
      usage: 'node read_presentation.js <account> <presentation-id>'
    }));
    process.exit(1);
  }

  try {
    const result = await readPresentation(account, presentationId);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      error: error.message,
      account,
      presentationId,
    }));
    process.exit(1);
  }
}

main();

module.exports = { readPresentation };
