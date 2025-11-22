#!/usr/bin/env node

/**
 * Read Google Doc Content
 *
 * Usage: node read_doc.js <account> <document-id>
 *
 * Examples:
 *   node read_doc.js psd 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
 */

const { google } = require('googleapis');
const path = require('path');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

async function readDoc(account, documentId) {
  const auth = await getAuthClient(account);
  const docs = google.docs({ version: 'v1', auth });

  const response = await docs.documents.get({
    documentId,
  });

  const doc = response.data;

  // Extract text content from document body
  let textContent = '';
  if (doc.body && doc.body.content) {
    for (const element of doc.body.content) {
      if (element.paragraph && element.paragraph.elements) {
        for (const textElement of element.paragraph.elements) {
          if (textElement.textRun && textElement.textRun.content) {
            textContent += textElement.textRun.content;
          }
        }
      }
      if (element.table) {
        textContent += '[TABLE]\n';
      }
    }
  }

  return {
    success: true,
    account,
    document: {
      id: doc.documentId,
      title: doc.title,
      textContent: textContent.trim(),
      revisionId: doc.revisionId,
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
  const documentId = args[1];

  if (!account || !documentId) {
    console.error(JSON.stringify({
      error: 'Missing arguments',
      usage: 'node read_doc.js <account> <document-id>'
    }));
    process.exit(1);
  }

  try {
    const result = await readDoc(account, documentId);
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

module.exports = { readDoc };
