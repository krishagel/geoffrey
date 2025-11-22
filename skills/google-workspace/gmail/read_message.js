#!/usr/bin/env node

/**
 * Read Gmail Message
 *
 * Usage: node read_message.js <account> <message-id>
 *
 * Examples:
 *   node read_message.js psd 18d1234567890abc
 */

const { google } = require('googleapis');
const path = require('path');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

async function readMessage(account, messageId) {
  const auth = await getAuthClient(account);
  const gmail = google.gmail({ version: 'v1', auth });

  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  const message = response.data;
  const headers = message.payload.headers;

  const getHeader = (name) => {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : '';
  };

  // Extract body
  let body = '';
  let htmlBody = '';

  function extractBody(payload) {
    if (payload.body && payload.body.data) {
      const decoded = Buffer.from(payload.body.data, 'base64').toString('utf8');
      if (payload.mimeType === 'text/plain') {
        body = decoded;
      } else if (payload.mimeType === 'text/html') {
        htmlBody = decoded;
      }
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        extractBody(part);
      }
    }
  }

  extractBody(message.payload);

  // Get attachments info
  const attachments = [];
  function findAttachments(payload) {
    if (payload.filename && payload.body && payload.body.attachmentId) {
      attachments.push({
        filename: payload.filename,
        mimeType: payload.mimeType,
        size: payload.body.size,
        attachmentId: payload.body.attachmentId,
      });
    }
    if (payload.parts) {
      for (const part of payload.parts) {
        findAttachments(part);
      }
    }
  }

  findAttachments(message.payload);

  return {
    success: true,
    account,
    message: {
      id: message.id,
      threadId: message.threadId,
      from: getHeader('From'),
      to: getHeader('To'),
      cc: getHeader('Cc'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      body: body || htmlBody,
      isHtml: !body && !!htmlBody,
      labels: message.labelIds,
      attachments,
    },
    metadata: {
      timestamp: new Date().toISOString(),
    }
  };
}

// CLI interface
async function main() {
  const [account, messageId] = process.argv.slice(2);

  if (!account || !messageId) {
    console.error(JSON.stringify({
      error: 'Missing arguments',
      usage: 'node read_message.js <account> <message-id>'
    }));
    process.exit(1);
  }

  try {
    const result = await readMessage(account, messageId);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      error: error.message,
      account,
      messageId,
    }));
    process.exit(1);
  }
}

main();

module.exports = { readMessage };
