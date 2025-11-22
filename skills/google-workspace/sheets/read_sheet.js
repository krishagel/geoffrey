#!/usr/bin/env node

/**
 * Read Google Sheet Data
 *
 * Usage: node read_sheet.js <account> <spreadsheet-id> [--range <range>]
 *
 * Examples:
 *   node read_sheet.js psd 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
 *   node read_sheet.js psd SHEET_ID --range "Sheet1!A1:D10"
 */

const { google } = require('googleapis');
const path = require('path');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

async function readSheet(account, spreadsheetId, options = {}) {
  const auth = await getAuthClient(account);
  const sheets = google.sheets({ version: 'v4', auth });

  // Get spreadsheet metadata
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  // Get values
  const range = options.range || metadata.data.sheets[0].properties.title;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return {
    success: true,
    account,
    spreadsheet: {
      id: spreadsheetId,
      title: metadata.data.properties.title,
      sheets: metadata.data.sheets.map(s => s.properties.title),
    },
    data: {
      range: response.data.range,
      values: response.data.values || [],
      rowCount: (response.data.values || []).length,
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
  const spreadsheetId = args[1];

  if (!account || !spreadsheetId) {
    console.error(JSON.stringify({
      error: 'Missing arguments',
      usage: 'node read_sheet.js <account> <spreadsheet-id> [--range <range>]'
    }));
    process.exit(1);
  }

  // Parse options
  const options = {};
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--range') {
      options.range = args[++i];
    }
  }

  try {
    const result = await readSheet(account, spreadsheetId, options);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      error: error.message,
      account,
      spreadsheetId,
    }));
    process.exit(1);
  }
}

main();

module.exports = { readSheet };
