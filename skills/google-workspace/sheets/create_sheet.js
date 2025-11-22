#!/usr/bin/env node

/**
 * Create Google Sheet
 *
 * Usage: node create_sheet.js <account> --title <title> [--sheets <sheet1,sheet2>]
 *
 * Examples:
 *   node create_sheet.js psd --title "Budget 2025"
 *   node create_sheet.js psd --title "Project Tracker" --sheets "Tasks,Timeline,Resources"
 */

const { google } = require('googleapis');
const path = require('path');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

async function createSheet(account, options) {
  const auth = await getAuthClient(account);
  const sheets = google.sheets({ version: 'v4', auth });

  const requestBody = {
    properties: {
      title: options.title,
    },
  };

  // Add custom sheets if specified
  if (options.sheets) {
    const sheetNames = options.sheets.split(',').map(s => s.trim());
    requestBody.sheets = sheetNames.map(name => ({
      properties: { title: name },
    }));
  }

  const response = await sheets.spreadsheets.create({
    requestBody,
  });

  return {
    success: true,
    account,
    spreadsheet: {
      id: response.data.spreadsheetId,
      title: response.data.properties.title,
      url: response.data.spreadsheetUrl,
      sheets: response.data.sheets.map(s => s.properties.title),
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
      usage: 'node create_sheet.js <account> --title <title> [--sheets <sheet1,sheet2>]'
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
      case '--sheets':
        options.sheets = args[++i];
        break;
    }
  }

  if (!options.title) {
    console.error(JSON.stringify({
      error: 'Missing --title option',
      usage: 'node create_sheet.js <account> --title <title> [--sheets <sheet1,sheet2>]'
    }));
    process.exit(1);
  }

  try {
    const result = await createSheet(account, options);
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

module.exports = { createSheet };
