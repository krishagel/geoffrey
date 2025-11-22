#!/usr/bin/env node

/**
 * Edit Google Slides Presentation
 *
 * Usage: node edit_presentation.js <account> <presentation-id> <action> [options]
 *
 * Actions:
 *   --add-slide              Add a blank slide
 *   --add-text-slide         Add slide with title and body
 *   --replace-text           Replace text across presentation
 *
 * Examples:
 *   node edit_presentation.js psd PRES_ID --add-slide
 *   node edit_presentation.js psd PRES_ID --add-text-slide --title "Agenda" --body "Item 1\nItem 2"
 *   node edit_presentation.js psd PRES_ID --replace-text --find "2024" --replace "2025"
 */

const { google } = require('googleapis');
const path = require('path');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

async function editPresentation(account, presentationId, options) {
  const auth = await getAuthClient(account);
  const slides = google.slides({ version: 'v1', auth });

  const requests = [];

  if (options.addSlide) {
    requests.push({
      createSlide: {
        slideLayoutReference: {
          predefinedLayout: 'BLANK',
        },
      },
    });
  }

  if (options.addTextSlide) {
    const slideId = `slide_${Date.now()}`;
    const titleId = `title_${Date.now()}`;
    const bodyId = `body_${Date.now()}`;

    requests.push({
      createSlide: {
        objectId: slideId,
        slideLayoutReference: {
          predefinedLayout: 'TITLE_AND_BODY',
        },
        placeholderIdMappings: [
          {
            layoutPlaceholder: { type: 'TITLE' },
            objectId: titleId,
          },
          {
            layoutPlaceholder: { type: 'BODY' },
            objectId: bodyId,
          },
        ],
      },
    });

    if (options.title) {
      requests.push({
        insertText: {
          objectId: titleId,
          text: options.title,
        },
      });
    }

    if (options.body) {
      requests.push({
        insertText: {
          objectId: bodyId,
          text: options.body,
        },
      });
    }
  }

  if (options.replaceText && options.find && options.replace) {
    requests.push({
      replaceAllText: {
        containsText: {
          text: options.find,
          matchCase: true,
        },
        replaceText: options.replace,
      },
    });
  }

  if (requests.length === 0) {
    return {
      success: false,
      error: 'No edit operation specified',
    };
  }

  const response = await slides.presentations.batchUpdate({
    presentationId,
    requestBody: { requests },
  });

  return {
    success: true,
    account,
    presentationId,
    updates: response.data.replies.length,
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
      usage: 'node edit_presentation.js <account> <presentation-id> --add-slide'
    }));
    process.exit(1);
  }

  // Parse options
  const options = {};
  for (let i = 2; i < args.length; i++) {
    switch (args[i]) {
      case '--add-slide':
        options.addSlide = true;
        break;
      case '--add-text-slide':
        options.addTextSlide = true;
        break;
      case '--replace-text':
        options.replaceText = true;
        break;
      case '--title':
        options.title = args[++i];
        break;
      case '--body':
        options.body = args[++i];
        break;
      case '--find':
        options.find = args[++i];
        break;
      case '--replace':
        options.replace = args[++i];
        break;
    }
  }

  try {
    const result = await editPresentation(account, presentationId, options);
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

module.exports = { editPresentation };
