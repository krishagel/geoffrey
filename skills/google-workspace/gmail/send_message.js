#!/usr/bin/env node

/**
 * Send Gmail Message
 *
 * Usage: node send_message.js <account> --to <email> --subject <subject> --body <body>
 *
 * Options:
 *   --to        Recipient email (required)
 *   --subject   Email subject (required)
 *   --body      Email body (required)
 *   --cc        CC recipients (comma-separated)
 *   --bcc       BCC recipients (comma-separated)
 *   --reply-to  Message ID to reply to
 *
 * Examples:
 *   node send_message.js psd --to "john@example.com" --subject "Hello" --body "Message here"
 *   node send_message.js personal --to "friend@gmail.com" --subject "Lunch?" --body "Are you free?" --cc "other@gmail.com"
 */

const { google } = require('googleapis');
const path = require('path');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

async function sendMessage(account, options) {
  const auth = await getAuthClient(account);
  const gmail = google.gmail({ version: 'v1', auth });

  // Get sender email
  const profile = await gmail.users.getProfile({ userId: 'me' });
  const fromEmail = profile.data.emailAddress;

  // Build email
  const emailLines = [
    `From: ${fromEmail}`,
    `To: ${options.to}`,
  ];

  if (options.cc) {
    emailLines.push(`Cc: ${options.cc}`);
  }

  if (options.bcc) {
    emailLines.push(`Bcc: ${options.bcc}`);
  }

  emailLines.push(
    `Subject: ${options.subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    options.body
  );

  // If replying, add thread info
  if (options.replyTo) {
    const original = await gmail.users.messages.get({
      userId: 'me',
      id: options.replyTo,
      format: 'metadata',
      metadataHeaders: ['Message-ID', 'References'],
    });

    const headers = original.data.payload.headers;
    const messageIdHeader = headers.find(h => h.name === 'Message-ID');
    const referencesHeader = headers.find(h => h.name === 'References');

    if (messageIdHeader) {
      const references = referencesHeader
        ? `${referencesHeader.value} ${messageIdHeader.value}`
        : messageIdHeader.value;
      emailLines.splice(2, 0, `In-Reply-To: ${messageIdHeader.value}`);
      emailLines.splice(3, 0, `References: ${references}`);
    }
  }

  const email = emailLines.join('\r\n');
  const encodedEmail = Buffer.from(email).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const sendParams = {
    userId: 'me',
    requestBody: {
      raw: encodedEmail,
    },
  };

  if (options.replyTo) {
    const original = await gmail.users.messages.get({
      userId: 'me',
      id: options.replyTo,
      format: 'minimal',
    });
    sendParams.requestBody.threadId = original.data.threadId;
  }

  const response = await gmail.users.messages.send(sendParams);

  return {
    success: true,
    account,
    sent: {
      id: response.data.id,
      threadId: response.data.threadId,
      to: options.to,
      subject: options.subject,
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
      usage: 'node send_message.js <account> --to <email> --subject <subject> --body <body>'
    }));
    process.exit(1);
  }

  // Parse options
  const options = {};
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--to':
        options.to = args[++i];
        break;
      case '--subject':
        options.subject = args[++i];
        break;
      case '--body':
        options.body = args[++i];
        break;
      case '--cc':
        options.cc = args[++i];
        break;
      case '--bcc':
        options.bcc = args[++i];
        break;
      case '--reply-to':
        options.replyTo = args[++i];
        break;
    }
  }

  if (!options.to || !options.subject || !options.body) {
    console.error(JSON.stringify({
      error: 'Missing required options: --to, --subject, --body',
      usage: 'node send_message.js <account> --to <email> --subject <subject> --body <body>'
    }));
    process.exit(1);
  }

  try {
    const result = await sendMessage(account, options);
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

module.exports = { sendMessage };
