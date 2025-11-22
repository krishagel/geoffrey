#!/usr/bin/env node

/**
 * Create Google Doc
 *
 * Usage: node create_doc.js <account> --title <title> [--content <content>]
 *
 * Examples:
 *   node create_doc.js psd --title "Meeting Notes"
 *   node create_doc.js psd --title "Report" --content "Initial content here"
 */

const { google } = require('googleapis');
const path = require('path');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

async function createDoc(account, options) {
  const auth = await getAuthClient(account);
  const docs = google.docs({ version: 'v1', auth });

  // Create the document
  const createResponse = await docs.documents.create({
    requestBody: {
      title: options.title,
    },
  });

  const documentId = createResponse.data.documentId;

  // Add content if provided
  if (options.content) {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [{
          insertText: {
            location: { index: 1 },
            text: options.content,
          },
        }],
      },
    });
  }

  return {
    success: true,
    account,
    document: {
      id: documentId,
      title: createResponse.data.title,
      url: `https://docs.google.com/document/d/${documentId}/edit`,
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
      usage: 'node create_doc.js <account> --title <title> [--content <content>]'
    }));
    process.exit(1);
  }

  // Parse options
  const options = {};
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--title':
        options.title = args[++i];
        break;
      case '--content':
        options.content = args[++i];
        break;
    }
  }

  if (!options.title) {
    console.error(JSON.stringify({
      error: 'Missing --title option',
      usage: 'node create_doc.js <account> --title <title> [--content <content>]'
    }));
    process.exit(1);
  }

  try {
    const result = await createDoc(account, options);
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

module.exports = { createDoc };
