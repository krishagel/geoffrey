#!/usr/bin/env node

/**
 * List Gmail Messages
 *
 * Usage: node list_messages.js <account> [options]
 *
 * Options:
 *   --query    Gmail search query (default: empty = all)
 *   --label    Filter by label (e.g., INBOX, UNREAD, SENT)
 *   --max      Maximum messages to return (default: 10)
 *   --unread   Show only unread messages
 *
 * Examples:
 *   node list_messages.js psd
 *   node list_messages.js psd --unread --max 5
 *   node list_messages.js personal --query "from:amazon.com"
 *   node list_messages.js consulting --label SENT
 */

const { google } = require('googleapis');
const path = require('path');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

async function listMessages(account, options = {}) {
  const auth = await getAuthClient(account);
  const gmail = google.gmail({ version: 'v1', auth });

  // Build query
  let query = options.query || '';
  if (options.unread) {
    query = query ? `${query} is:unread` : 'is:unread';
  }

  // List messages
  const listParams = {
    userId: 'me',
    maxResults: options.max || 10,
  };

  if (query) {
    listParams.q = query;
  }

  if (options.label) {
    listParams.labelIds = [options.label.toUpperCase()];
  }

  const response = await gmail.users.messages.list(listParams);
  const messages = response.data.messages || [];

  if (messages.length === 0) {
    return {
      success: true,
      account,
      messages: [],
      metadata: {
        timestamp: new Date().toISOString(),
        count: 0,
        query: query || '(all)',
      }
    };
  }

  // Get message details
  const messageDetails = await Promise.all(
    messages.map(async (msg) => {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      });

      const headers = detail.data.payload.headers;
      const getHeader = (name) => {
        const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
        return header ? header.value : '';
      };

      const labelIds = detail.data.labelIds || [];
      return {
        id: msg.id,
        threadId: msg.threadId,
        from: getHeader('From'),
        to: getHeader('To'),
        subject: getHeader('Subject'),
        date: getHeader('Date'),
        snippet: detail.data.snippet,
        labels: labelIds,
        isUnread: labelIds.includes('UNREAD'),
      };
    })
  );

  return {
    success: true,
    account,
    messages: messageDetails,
    metadata: {
      timestamp: new Date().toISOString(),
      count: messageDetails.length,
      query: query || '(all)',
      nextPageToken: response.data.nextPageToken,
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
      usage: 'node list_messages.js <account> [--unread] [--query "..."] [--max N] [--label LABEL]'
    }));
    process.exit(1);
  }

  // Parse options
  const options = {};
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--unread':
        options.unread = true;
        break;
      case '--query':
        options.query = args[++i];
        break;
      case '--max':
        options.max = parseInt(args[++i], 10);
        break;
      case '--label':
        options.label = args[++i];
        break;
    }
  }

  try {
    const result = await listMessages(account, options);
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

module.exports = { listMessages };
