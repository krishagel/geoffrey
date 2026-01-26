#!/usr/bin/env node

/**
 * Get Unread Email Summary
 *
 * Returns count of unread messages plus summary of top unread emails.
 * Designed for morning briefings and quick status checks.
 *
 * Usage: node get_unread_summary.js <account> [options]
 *
 * Options:
 *   --max      Maximum messages to preview (default: 5)
 *   --label    Label to check (default: INBOX)
 *
 * Examples:
 *   node get_unread_summary.js psd
 *   node get_unread_summary.js personal --max 10
 */

const { google } = require('googleapis');
const path = require('path');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

async function getUnreadSummary(account, options = {}) {
  const auth = await getAuthClient(account);
  const gmail = google.gmail({ version: 'v1', auth });

  const labelId = options.label?.toUpperCase() || 'INBOX';
  const maxPreview = options.max || 5;

  // Get total unread count from label
  const labelResponse = await gmail.users.labels.get({
    userId: 'me',
    id: labelId,
  });

  const totalUnread = labelResponse.data.messagesUnread;
  const totalMessages = labelResponse.data.messagesTotal;

  // If no unread, return early
  if (totalUnread === 0) {
    return {
      success: true,
      account,
      label: labelId,
      summary: {
        totalUnread: 0,
        totalInbox: totalMessages,
        previewCount: 0,
        messages: [],
      },
      metadata: {
        timestamp: new Date().toISOString(),
      }
    };
  }

  // Get unread message IDs
  const listResponse = await gmail.users.messages.list({
    userId: 'me',
    labelIds: [labelId, 'UNREAD'],
    maxResults: maxPreview,
  });

  const messageIds = listResponse.data.messages || [];

  // Get message details
  const messages = await Promise.all(
    messageIds.map(async (msg) => {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date'],
      });

      const headers = detail.data.payload.headers;
      const getHeader = (name) => {
        const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
        return header ? header.value : '';
      };

      // Parse From header to get name and email
      const fromRaw = getHeader('From');
      let fromName = fromRaw;
      let fromEmail = fromRaw;

      const emailMatch = fromRaw.match(/<(.+)>/);
      if (emailMatch) {
        fromEmail = emailMatch[1];
        fromName = fromRaw.replace(/<.+>/, '').trim().replace(/^"(.*)"$/, '$1');
      }

      // Parse date
      const dateStr = getHeader('Date');
      let receivedAt = dateStr;
      try {
        const date = new Date(dateStr);
        receivedAt = date.toISOString();
      } catch (e) {
        // Keep original string if parsing fails
      }

      return {
        id: msg.id,
        from: fromName || fromEmail,
        fromEmail: fromEmail,
        subject: getHeader('Subject') || '(no subject)',
        snippet: detail.data.snippet,
        receivedAt,
      };
    })
  );

  // Categorize messages by sender domain for summary
  const senderDomains = {};
  messages.forEach(m => {
    const domain = m.fromEmail.split('@')[1] || 'unknown';
    senderDomains[domain] = (senderDomains[domain] || 0) + 1;
  });

  return {
    success: true,
    account,
    label: labelId,
    summary: {
      totalUnread,
      totalInbox: totalMessages,
      previewCount: messages.length,
      hasMore: totalUnread > messages.length,
      topSenders: Object.entries(senderDomains)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([domain, count]) => ({ domain, count })),
    },
    messages,
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
      usage: 'node get_unread_summary.js <account> [--max N] [--label LABEL]'
    }));
    process.exit(1);
  }

  // Parse options
  const options = {};
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--max':
        options.max = parseInt(args[++i], 10);
        break;
      case '--label':
        options.label = args[++i];
        break;
    }
  }

  try {
    const result = await getUnreadSummary(account, options);
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

module.exports = { getUnreadSummary };
