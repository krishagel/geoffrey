#!/usr/bin/env node

/**
 * Create Drive File (Google Docs, Sheets, Slides)
 *
 * Usage: node create_file.js <account> --name <name> --type <type> [options]
 *
 * Options:
 *   --name      File name (required)
 *   --type      File type: doc, sheet, slide (required)
 *   --content   Initial content (for docs)
 *   --folder    Parent folder ID
 *
 * Examples:
 *   node create_file.js psd --name "Meeting Notes" --type doc
 *   node create_file.js personal --name "Budget 2024" --type sheet
 *   node create_file.js consulting --name "Proposal" --type slide --folder 1abc123
 */

const { google } = require('googleapis');
const path = require('path');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

const MIME_TYPES = {
  doc: 'application/vnd.google-apps.document',
  sheet: 'application/vnd.google-apps.spreadsheet',
  slide: 'application/vnd.google-apps.presentation',
};

async function createFile(account, options) {
  const auth = await getAuthClient(account);
  const drive = google.drive({ version: 'v3', auth });

  const mimeType = MIME_TYPES[options.type];
  if (!mimeType) {
    throw new Error(`Invalid type: ${options.type}. Use: doc, sheet, slide`);
  }

  const fileMetadata = {
    name: options.name,
    mimeType,
  };

  if (options.folder) {
    fileMetadata.parents = [options.folder];
  }

  const response = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id, name, mimeType, webViewLink',
  });

  const file = response.data;

  // If content provided for doc, update it
  if (options.content && options.type === 'doc') {
    const docs = google.docs({ version: 'v1', auth });
    await docs.documents.batchUpdate({
      documentId: file.id,
      requestBody: {
        requests: [{
          insertText: {
            location: { index: 1 },
            text: options.content,
          }
        }]
      }
    });
  }

  return {
    success: true,
    account,
    file: {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      webLink: file.webViewLink,
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
      usage: 'node create_file.js <account> --name <name> --type doc|sheet|slide [options]'
    }));
    process.exit(1);
  }

  // Parse options
  const options = {};
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--name':
        options.name = args[++i];
        break;
      case '--type':
        options.type = args[++i];
        break;
      case '--content':
        options.content = args[++i];
        break;
      case '--folder':
        options.folder = args[++i];
        break;
    }
  }

  if (!options.name || !options.type) {
    console.error(JSON.stringify({
      error: 'Missing required options: --name, --type',
      usage: 'node create_file.js <account> --name <name> --type doc|sheet|slide'
    }));
    process.exit(1);
  }

  try {
    const result = await createFile(account, options);
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

module.exports = { createFile };
