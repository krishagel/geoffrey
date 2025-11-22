#!/usr/bin/env node

/**
 * Create Google Slides Presentation
 *
 * Usage: node create_presentation.js <account> --title <title>
 *
 * Examples:
 *   node create_presentation.js psd --title "Q4 Review"
 */

const { google } = require('googleapis');
const path = require('path');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

async function createPresentation(account, options) {
  const auth = await getAuthClient(account);
  const slides = google.slides({ version: 'v1', auth });

  const response = await slides.presentations.create({
    requestBody: {
      title: options.title,
    },
  });

  return {
    success: true,
    account,
    presentation: {
      id: response.data.presentationId,
      title: response.data.title,
      url: `https://docs.google.com/presentation/d/${response.data.presentationId}/edit`,
      slideCount: (response.data.slides || []).length,
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

  if (!account) {
    console.error(JSON.stringify({
      error: 'Missing account',
      usage: 'node create_presentation.js <account> --title <title>'
    }));
    process.exit(1);
  }

  // Parse options
  const options = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--title') {
      options.title = args[++i];
    }
  }

  if (!options.title) {
    console.error(JSON.stringify({
      error: 'Missing --title option',
      usage: 'node create_presentation.js <account> --title <title>'
    }));
    process.exit(1);
  }

  try {
    const result = await createPresentation(account, options);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      error: error.message,
      account,
    }));
    process.exit(1);
  }
}

main();

module.exports = { createPresentation };
