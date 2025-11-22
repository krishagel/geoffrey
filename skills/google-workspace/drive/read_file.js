#!/usr/bin/env node

/**
 * Read Drive File Content
 *
 * Usage: node read_file.js <account> <file-id> [options]
 *
 * Options:
 *   --format   Export format for Google Docs (text, html, pdf)
 *
 * Examples:
 *   node read_file.js psd 1abc123def456
 *   node read_file.js personal 1xyz789 --format html
 */

const { google } = require('googleapis');
const path = require('path');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

const EXPORT_FORMATS = {
  'application/vnd.google-apps.document': {
    text: 'text/plain',
    html: 'text/html',
    pdf: 'application/pdf',
  },
  'application/vnd.google-apps.spreadsheet': {
    csv: 'text/csv',
    pdf: 'application/pdf',
  },
  'application/vnd.google-apps.presentation': {
    text: 'text/plain',
    pdf: 'application/pdf',
  },
};

async function readFile(account, fileId, options = {}) {
  const auth = await getAuthClient(account);
  const drive = google.drive({ version: 'v3', auth });

  // Get file metadata
  const metadata = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, size, webViewLink',
  });

  const file = metadata.data;
  let content = '';

  // Check if it's a Google Workspace file (needs export)
  if (file.mimeType.startsWith('application/vnd.google-apps.')) {
    const exportFormats = EXPORT_FORMATS[file.mimeType];
    if (exportFormats) {
      const format = options.format || 'text';
      const mimeType = exportFormats[format] || exportFormats.text || Object.values(exportFormats)[0];

      const response = await drive.files.export({
        fileId,
        mimeType,
      }, { responseType: 'text' });

      content = response.data;
    } else {
      content = '[Cannot export this file type]';
    }
  } else {
    // Regular file - download content
    const response = await drive.files.get({
      fileId,
      alt: 'media',
    }, { responseType: 'text' });

    content = response.data;
  }

  return {
    success: true,
    account,
    file: {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      webLink: file.webViewLink,
      content,
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
  const fileId = args[1];

  if (!account || !fileId) {
    console.error(JSON.stringify({
      error: 'Missing arguments',
      usage: 'node read_file.js <account> <file-id> [--format text|html|pdf]'
    }));
    process.exit(1);
  }

  // Parse options
  const options = {};
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--format') {
      options.format = args[++i];
    }
  }

  try {
    const result = await readFile(account, fileId, options);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      error: error.message,
      account,
      fileId,
    }));
    process.exit(1);
  }
}

main();

module.exports = { readFile };
