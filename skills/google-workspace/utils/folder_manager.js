#!/usr/bin/env node

/**
 * Geoffrey Folder Manager
 *
 * Ensures Geoffrey folder structure exists in Google Drive.
 * Creates folders if they don't exist, returns folder IDs.
 *
 * Usage: bun folder_manager.js <account> [subfolder]
 *
 * Examples:
 *   bun folder_manager.js hrg              # Get/create Geoffrey folder
 *   bun folder_manager.js hrg Research     # Get/create Geoffrey/Research
 */

const { google } = require('googleapis');
const path = require('path');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

const GEOFFREY_FOLDER = 'Geoffrey';
const SUBFOLDERS = ['Research', 'Notes', 'Reports', 'Travel'];

async function findFolder(drive, name, parentId = null) {
  let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }

  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  return response.data.files[0] || null;
}

async function createFolder(drive, name, parentId = null) {
  const fileMetadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentId) {
    fileMetadata.parents = [parentId];
  }

  const response = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id, name',
  });

  return response.data;
}

async function ensureGeoffreyFolders(account, subfolder = null) {
  const auth = await getAuthClient(account);
  const drive = google.drive({ version: 'v3', auth });

  // Find or create main Geoffrey folder
  let geoffreyFolder = await findFolder(drive, GEOFFREY_FOLDER);
  if (!geoffreyFolder) {
    geoffreyFolder = await createFolder(drive, GEOFFREY_FOLDER);
  }

  const result = {
    success: true,
    account,
    folders: {
      Geoffrey: geoffreyFolder.id,
    },
    metadata: {
      timestamp: new Date().toISOString(),
    }
  };

  // If specific subfolder requested, ensure it exists
  if (subfolder) {
    let subfolderObj = await findFolder(drive, subfolder, geoffreyFolder.id);
    if (!subfolderObj) {
      subfolderObj = await createFolder(drive, subfolder, geoffreyFolder.id);
    }
    result.folders[subfolder] = subfolderObj.id;
    result.targetFolder = subfolderObj.id;
  } else {
    result.targetFolder = geoffreyFolder.id;
  }

  return result;
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const account = args[0];
  const subfolder = args[1];

  if (!account) {
    console.error(JSON.stringify({
      error: 'Missing account',
      usage: 'bun folder_manager.js <account> [subfolder]',
      subfolders: SUBFOLDERS,
    }));
    process.exit(1);
  }

  try {
    const result = await ensureGeoffreyFolders(account, subfolder);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      error: error.message,
      account,
    }));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { ensureGeoffreyFolders, findFolder, createFolder };
