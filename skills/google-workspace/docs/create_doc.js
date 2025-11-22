#!/usr/bin/env node

/**
 * Create Google Doc with Markdown Formatting
 *
 * Usage: bun create_doc.js <account> --title <title> [options]
 *
 * Options:
 *   --title     Document title (required)
 *   --content   Markdown content
 *   --folder    Subfolder in Geoffrey (Research, Notes, Reports, Travel)
 *   --raw       Don't apply markdown formatting (plain text)
 *
 * Examples:
 *   bun create_doc.js hrg --title "Meeting Notes" --folder Notes
 *   bun create_doc.js psd --title "Report" --content "# Header\n\nContent" --folder Research
 */

const { google } = require('googleapis');
const path = require('path');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));
const { ensureGeoffreyFolders } = require(path.join(__dirname, '..', 'utils', 'folder_manager'));
const { insertFormattedContent } = require(path.join(__dirname, '..', 'utils', 'markdown_to_docs'));

async function createDoc(account, options) {
  const auth = await getAuthClient(account);
  const docs = google.docs({ version: 'v1', auth });
  const drive = google.drive({ version: 'v3', auth });

  // Get or create Geoffrey folder structure
  let folderId = null;
  if (options.folder) {
    const folderResult = await ensureGeoffreyFolders(account, options.folder);
    folderId = folderResult.targetFolder;
  }

  // Create the document
  const createResponse = await docs.documents.create({
    requestBody: {
      title: options.title,
    },
  });

  const documentId = createResponse.data.documentId;

  // Move to Geoffrey folder if specified
  if (folderId) {
    // Get current parents
    const file = await drive.files.get({
      fileId: documentId,
      fields: 'parents',
    });

    // Move to Geoffrey folder
    await drive.files.update({
      fileId: documentId,
      addParents: folderId,
      removeParents: file.data.parents.join(','),
      fields: 'id, parents',
    });
  }

  // Add content if provided
  let formattingInfo = null;
  if (options.content) {
    if (options.raw) {
      // Plain text insertion
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
    } else {
      // Markdown formatted insertion
      formattingInfo = await insertFormattedContent(docs, documentId, options.content);
    }
  }

  return {
    success: true,
    account,
    document: {
      id: documentId,
      title: createResponse.data.title,
      url: `https://docs.google.com/document/d/${documentId}/edit`,
      folder: options.folder || 'root',
    },
    formatting: formattingInfo,
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
      usage: 'bun create_doc.js <account> --title <title> [--content <markdown>] [--folder <subfolder>]'
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
      case '--folder':
        options.folder = args[++i];
        break;
      case '--raw':
        options.raw = true;
        break;
    }
  }

  if (!options.title) {
    console.error(JSON.stringify({
      error: 'Missing --title option',
      usage: 'bun create_doc.js <account> --title <title> [--content <markdown>] [--folder <subfolder>]'
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
