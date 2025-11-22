#!/usr/bin/env node

/**
 * List Google Chat Spaces
 *
 * Usage: node list_spaces.js <account>
 *
 * Examples:
 *   node list_spaces.js psd
 *   node list_spaces.js kh
 */

const { google } = require('googleapis');
const path = require('path');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

async function listSpaces(account) {
  const auth = await getAuthClient(account);
  const chat = google.chat({ version: 'v1', auth });

  const response = await chat.spaces.list({
    pageSize: 100,
  });

  // Get read state for each space to find unreads
  const spacesWithState = await Promise.all(
    (response.data.spaces || []).map(async space => {
      try {
        // Get space read state
        const stateResponse = await chat.spaces.spaceReadState.get({
          name: `${space.name}/spaceReadState`,
        });
        return {
          name: space.name,
          displayName: space.displayName,
          type: space.type,
          spaceType: space.spaceType,
          lastReadTime: stateResponse.data.lastReadTime,
        };
      } catch (e) {
        return {
          name: space.name,
          displayName: space.displayName,
          type: space.type,
          spaceType: space.spaceType,
          lastReadTime: null,
        };
      }
    })
  );

  const spaces = spacesWithState;

  return {
    success: true,
    account,
    spaces,
    metadata: {
      timestamp: new Date().toISOString(),
      count: spaces.length,
    }
  };
}

// CLI interface
async function main() {
  const account = process.argv[2];

  if (!account) {
    console.error(JSON.stringify({
      error: 'Missing account',
      usage: 'node list_spaces.js <account>'
    }));
    process.exit(1);
  }

  try {
    const result = await listSpaces(account);
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

module.exports = { listSpaces };
