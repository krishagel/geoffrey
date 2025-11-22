#!/usr/bin/env node

/**
 * Search Gmail Messages
 *
 * Usage: node search_messages.js <account> <query>
 *
 * Supports all Gmail search operators:
 *   from:        - Sender
 *   to:          - Recipient
 *   subject:     - Subject line
 *   has:attachment - Has attachments
 *   after:       - After date (YYYY/MM/DD)
 *   before:      - Before date
 *   is:unread    - Unread only
 *   is:starred   - Starred only
 *   label:       - By label
 *   filename:    - Attachment filename
 *
 * Examples:
 *   node search_messages.js psd "from:boss@psd.org"
 *   node search_messages.js personal "subject:invoice after:2024/01/01"
 *   node search_messages.js consulting "has:attachment from:client"
 */

const { google } = require('googleapis');
const path = require('path');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

async function searchMessages(account, query, maxResults = 20) {
  const auth = await getAuthClient(account);
  const gmail = google.gmail({ version: 'v1', auth });

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults,
  });

  const messages = response.data.messages || [];

  if (messages.length === 0) {
    return {
      success: true,
      account,
      query,
      messages: [],
      metadata: {
        timestamp: new Date().toISOString(),
        count: 0,
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

      return {
        id: msg.id,
        threadId: msg.threadId,
        from: getHeader('From'),
        to: getHeader('To'),
        subject: getHeader('Subject'),
        date: getHeader('Date'),
        snippet: detail.data.snippet,
        labels: detail.data.labelIds,
        isUnread: detail.data.labelIds.includes('UNREAD'),
      };
    })
  );

  return {
    success: true,
    account,
    query,
    messages: messageDetails,
    metadata: {
      timestamp: new Date().toISOString(),
      count: messageDetails.length,
      nextPageToken: response.data.nextPageToken,
    }
  };
}

// CLI interface
async function main() {
  const [account, ...queryParts] = process.argv.slice(2);
  const query = queryParts.join(' ');

  if (!account || !query) {
    console.error(JSON.stringify({
      error: 'Missing arguments',
      usage: 'node search_messages.js <account> <query>',
      examples: [
        'node search_messages.js psd "from:boss@psd.org"',
        'node search_messages.js personal "subject:invoice after:2024/01/01"',
      ]
    }));
    process.exit(1);
  }

  try {
    const result = await searchMessages(account, query);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      error: error.message,
      account,
      query,
    }));
    process.exit(1);
  }
}

main();

module.exports = { searchMessages };
