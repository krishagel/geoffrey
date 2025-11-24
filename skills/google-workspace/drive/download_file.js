#!/usr/bin/env node

/**
 * Download Drive File
 *
 * Downloads a file from Google Drive to local filesystem.
 *
 * Usage: bun download_file.js <account> <fileId> <outputPath>
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

async function downloadFile(account, fileId, outputPath) {
  const auth = await getAuthClient(account);
  const drive = google.drive({ version: 'v3', auth });

  // Get file metadata first
  const fileInfo = await drive.files.get({
    fileId,
    fields: 'name, mimeType',
    supportsAllDrives: true
  });

  // Download file content
  const response = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream' }
  );

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write to file
  const dest = fs.createWriteStream(outputPath);

  return new Promise((resolve, reject) => {
    response.data
      .on('end', () => {
        resolve({
          success: true,
          account,
          file: {
            id: fileId,
            name: fileInfo.data.name,
            mimeType: fileInfo.data.mimeType,
            outputPath
          }
        });
      })
      .on('error', err => {
        reject(err);
      })
      .pipe(dest);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const account = args[0];
  const fileId = args[1];
  const outputPath = args[2];

  if (!account || !fileId || !outputPath) {
    console.error(JSON.stringify({
      error: 'Missing arguments',
      usage: 'bun download_file.js <account> <fileId> <outputPath>'
    }));
    process.exit(1);
  }

  try {
    const result = await downloadFile(account, fileId, outputPath);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      error: error.message,
      account,
      fileId
    }));
    process.exit(1);
  }
}

main();

module.exports = { downloadFile };
