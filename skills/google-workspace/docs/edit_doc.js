#!/usr/bin/env node

/**
 * Edit Google Doc
 *
 * Usage: node edit_doc.js <account> <document-id> --append <text>
 *        node edit_doc.js <account> <document-id> --replace <old> --with <new>
 *
 * Examples:
 *   node edit_doc.js psd DOC_ID --append "New paragraph at the end"
 *   node edit_doc.js psd DOC_ID --replace "old text" --with "new text"
 */

const { google } = require('googleapis');
const path = require('path');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

async function editDoc(account, documentId, options) {
  const auth = await getAuthClient(account);
  const docs = google.docs({ version: 'v1', auth });

  const requests = [];

  if (options.append) {
    // Get document to find end index
    const doc = await docs.documents.get({ documentId });
    const endIndex = doc.data.body.content[doc.data.body.content.length - 1].endIndex - 1;

    requests.push({
      insertText: {
        location: { index: endIndex },
        text: '\n' + options.append,
      },
    });
  }

  if (options.replace && options.with) {
    requests.push({
      replaceAllText: {
        containsText: {
          text: options.replace,
          matchCase: true,
        },
        replaceText: options.with,
      },
    });
  }

  if (requests.length === 0) {
    return {
      success: false,
      error: 'No edit operation specified',
    };
  }

  const response = await docs.documents.batchUpdate({
    documentId,
    requestBody: { requests },
  });

  return {
    success: true,
    account,
    documentId,
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
  const documentId = args[1];

  if (!account || !documentId) {
    console.error(JSON.stringify({
      error: 'Missing arguments',
      usage: 'node edit_doc.js <account> <document-id> --append <text>'
    }));
    process.exit(1);
  }

  // Parse options
  const options = {};
  for (let i = 2; i < args.length; i++) {
    switch (args[i]) {
      case '--append':
        options.append = args[++i];
        break;
      case '--replace':
        options.replace = args[++i];
        break;
      case '--with':
        options.with = args[++i];
        break;
    }
  }

  try {
    const result = await editDoc(account, documentId, options);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      error: error.message,
      account,
      documentId,
    }));
    process.exit(1);
  }
}

main();

module.exports = { editDoc };
