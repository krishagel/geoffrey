#!/usr/bin/env node

/**
 * Edit Google Sheet
 *
 * Usage: node edit_sheet.js <account> <spreadsheet-id> --range <range> --values <json-array>
 *
 * Examples:
 *   node edit_sheet.js psd SHEET_ID --range "A1" --values '[["Hello"]]'
 *   node edit_sheet.js psd SHEET_ID --range "A1:B2" --values '[["Name","Score"],["Alice",100]]'
 *   node edit_sheet.js psd SHEET_ID --range "Sheet2!A1" --values '[["Data"]]'
 */

const { google } = require('googleapis');
const path = require('path');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

async function editSheet(account, spreadsheetId, options) {
  const auth = await getAuthClient(account);
  const sheets = google.sheets({ version: 'v4', auth });

  const values = JSON.parse(options.values);

  const response = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: options.range,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values,
    },
  });

  return {
    success: true,
    account,
    spreadsheetId,
    update: {
      range: response.data.updatedRange,
      rowsUpdated: response.data.updatedRows,
      columnsUpdated: response.data.updatedColumns,
      cellsUpdated: response.data.updatedCells,
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
      usage: 'node edit_sheet.js <account> <spreadsheet-id> --range <range> --values <json-array>'
    }));
    process.exit(1);
  }

  // Parse options
  const options = {};
  for (let i = 2; i < args.length; i++) {
    switch (args[i]) {
      case '--range':
        options.range = args[++i];
        break;
      case '--values':
        options.values = args[++i];
        break;
    }
  }

  if (!options.range || !options.values) {
    console.error(JSON.stringify({
      error: 'Missing --range or --values option',
      usage: 'node edit_sheet.js <account> <spreadsheet-id> --range <range> --values <json-array>'
    }));
    process.exit(1);
  }

  try {
    const result = await editSheet(account, spreadsheetId, options);
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

module.exports = { editSheet };
