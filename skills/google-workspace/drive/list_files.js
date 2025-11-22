#!/usr/bin/env node

/**
 * List Drive Files
 *
 * Usage: node list_files.js <account> [options]
 *
 * Options:
 *   --query    Search query (Drive search syntax)
 *   --type     File type: doc, sheet, slide, pdf, folder
 *   --max      Maximum files to return (default: 20)
 *   --folder   Folder ID to list contents of
 *
 * Examples:
 *   node list_files.js psd
 *   node list_files.js psd --query "budget"
 *   node list_files.js personal --type sheet
 *   node list_files.js consulting --type pdf --query "contract"
 */

const { google } = require('googleapis');
const path = require('path');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

const MIME_TYPES = {
  doc: 'application/vnd.google-apps.document',
  sheet: 'application/vnd.google-apps.spreadsheet',
  slide: 'application/vnd.google-apps.presentation',
  pdf: 'application/pdf',
  folder: 'application/vnd.google-apps.folder',
};

async function listFiles(account, options = {}) {
  const auth = await getAuthClient(account);
  const drive = google.drive({ version: 'v3', auth });

  // Build query
  const queryParts = [];

  if (options.query) {
    queryParts.push(`fullText contains '${options.query}'`);
  }

  if (options.type && MIME_TYPES[options.type]) {
    queryParts.push(`mimeType = '${MIME_TYPES[options.type]}'`);
  }

  if (options.folder) {
    queryParts.push(`'${options.folder}' in parents`);
  }

  // Exclude trashed files
  queryParts.push('trashed = false');

  const response = await drive.files.list({
    q: queryParts.join(' and '),
    pageSize: options.max || 20,
    fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, parents)',
    orderBy: 'modifiedTime desc',
  });

  const files = (response.data.files || []).map(file => ({
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    size: file.size,
    created: file.createdTime,
    modified: file.modifiedTime,
    webLink: file.webViewLink,
    parents: file.parents,
  }));

  return {
    success: true,
    account,
    files,
    metadata: {
      timestamp: new Date().toISOString(),
      count: files.length,
      query: options.query || '(all)',
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
      usage: 'node list_files.js <account> [--query "..."] [--type doc|sheet|slide|pdf|folder] [--max N]'
    }));
    process.exit(1);
  }

  // Parse options
  const options = {};
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--query':
        options.query = args[++i];
        break;
      case '--type':
        options.type = args[++i];
        break;
      case '--max':
        options.max = parseInt(args[++i], 10);
        break;
      case '--folder':
        options.folder = args[++i];
        break;
    }
  }

  try {
    const result = await listFiles(account, options);
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

module.exports = { listFiles };
