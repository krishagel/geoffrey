#!/usr/bin/env node

/**
 * Send Google Chat Message
 *
 * Usage: node send_message.js <account> <space-name> --text <message>
 *
 * Options:
 *   --text     Message text (required)
 *   --thread   Thread name to reply to (optional)
 *
 * Examples:
 *   node send_message.js psd spaces/AAAA1234567 --text "Hello team!"
 *   node send_message.js psd spaces/AAAA1234567 --text "Reply" --thread spaces/AAAA/threads/BBBB
 */

const { google } = require('googleapis');
const path = require('path');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

async function sendMessage(account, spaceName, options) {
  const auth = await getAuthClient(account);
  const chat = google.chat({ version: 'v1', auth });

  const requestBody = {
    text: options.text,
  };

  if (options.thread) {
    requestBody.thread = {
      name: options.thread,
    };
  }

  const response = await chat.spaces.messages.create({
    parent: spaceName,
    requestBody,
  });

  return {
    success: true,
    account,
    message: {
      name: response.data.name,
      text: response.data.text,
      createTime: response.data.createTime,
      space: spaceName,
      thread: response.data.thread?.name,
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
  const spaceName = args[1];

  if (!account || !spaceName) {
    console.error(JSON.stringify({
      error: 'Missing arguments',
      usage: 'node send_message.js <account> <space-name> --text <message>'
    }));
    process.exit(1);
  }

  // Parse options
  const options = {};
  for (let i = 2; i < args.length; i++) {
    switch (args[i]) {
      case '--text':
        options.text = args[++i];
        break;
      case '--thread':
        options.thread = args[++i];
        break;
    }
  }

  if (!options.text) {
    console.error(JSON.stringify({
      error: 'Missing --text option',
      usage: 'node send_message.js <account> <space-name> --text <message>'
    }));
    process.exit(1);
  }

  try {
    const result = await sendMessage(account, spaceName, options);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      error: error.message,
      account,
      spaceName,
    }));
    process.exit(1);
  }
}

main();

module.exports = { sendMessage };
