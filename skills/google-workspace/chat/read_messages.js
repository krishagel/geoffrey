#!/usr/bin/env node

/**
 * Read Google Chat Messages from a Space
 *
 * Usage: node read_messages.js <account> <space-name> [options]
 *
 * Options:
 *   --max    Maximum messages to return (default: 50)
 *
 * Examples:
 *   node read_messages.js psd spaces/AAAA1234567
 *   node read_messages.js psd spaces/AAAA1234567 --max 100
 */

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

// Load user mapping from iCloud preferences
let allUserMappings = {};
const mappingPath = path.join(
  os.homedir(),
  'Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/knowledge/chat_user_mapping.json'
);
if (fs.existsSync(mappingPath)) {
  try {
    allUserMappings = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
  } catch (e) {
    // Ignore errors
  }
}

async function readMessages(account, spaceName, options = {}) {
  const auth = await getAuthClient(account);
  const chat = google.chat({ version: 'v1', auth });

  // Get space members to build userId -> displayName mapping
  const membersResponse = await chat.spaces.members.list({
    parent: spaceName,
    pageSize: 100,
  });

  const userNameMap = {};
  for (const membership of (membersResponse.data.memberships || [])) {
    if (membership.member && membership.member.name) {
      const userId = membership.member.name;
      userNameMap[userId] = membership.member.displayName || userId;
    }
  }

  const response = await chat.spaces.messages.list({
    parent: spaceName,
    pageSize: options.max || 50,
    orderBy: 'createTime desc',
  });

  // Get account-specific user mapping
  const userMapping = allUserMappings[account] || {};

  const messages = (response.data.messages || []).map(msg => {
    const senderId = msg.sender?.name;
    const bareId = senderId?.replace('users/', '');
    const senderName = userMapping[bareId] || userNameMap[senderId] || msg.sender?.displayName || senderId;

    return {
      name: msg.name,
      sender: senderName,
      senderId: bareId,
      senderType: msg.sender?.type,
      text: msg.text,
      createTime: msg.createTime,
      threadName: msg.thread?.name,
    };
  });

  return {
    success: true,
    account,
    spaceName,
    messages,
    metadata: {
      timestamp: new Date().toISOString(),
      count: messages.length,
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
      usage: 'node read_messages.js <account> <space-name> [--max N]'
    }));
    process.exit(1);
  }

  // Parse options
  const options = {};
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--max') {
      options.max = parseInt(args[++i], 10);
    }
  }

  try {
    const result = await readMessages(account, spaceName, options);
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

module.exports = { readMessages };
