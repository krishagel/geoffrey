#!/usr/bin/env node

/**
 * Send Gmail Message with Attachment
 *
 * Usage: node send_with_attachment.js <account> --to <email> --subject <subject> --body <body> --attachment <path>
 *
 * Options:
 *   --to          Recipient email (required)
 *   --subject     Email subject (required)
 *   --body        Email body (required, can be plain text or HTML)
 *   --attachment  Path to attachment file (required)
 *   --cc          CC recipients (comma-separated)
 *   --bcc         BCC recipients (comma-separated)
 *   --html        Treat body as HTML (default: plain text)
 *
 * Examples:
 *   node send_with_attachment.js psd --to "john@example.com" --subject "Daily Briefing" --body "See attached" --attachment ~/Desktop/briefing.mp3
 *   node send_with_attachment.js psd --to "team@example.com" --subject "Report" --body "<h1>Report</h1>" --attachment ~/report.pdf --html
 */

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

/**
 * Get MIME type from file extension
 */
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.zip': 'application/zip',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

async function sendWithAttachment(account, options) {
  const auth = await getAuthClient(account);
  const gmail = google.gmail({ version: 'v1', auth });

  // Get sender email
  const profile = await gmail.users.getProfile({ userId: 'me' });
  const fromEmail = profile.data.emailAddress;

  // Read attachment
  const attachmentPath = options.attachment.startsWith('~')
    ? options.attachment.replace('~', process.env.HOME)
    : options.attachment;

  if (!fs.existsSync(attachmentPath)) {
    throw new Error(`Attachment not found: ${attachmentPath}`);
  }

  const attachmentData = fs.readFileSync(attachmentPath);
  const attachmentBase64 = attachmentData.toString('base64');
  const attachmentFilename = path.basename(attachmentPath);
  const attachmentMimeType = getMimeType(attachmentFilename);

  // Generate boundary for multipart message
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(2)}`;

  // Build headers
  const headers = [
    `From: ${fromEmail}`,
    `To: ${options.to}`,
  ];

  if (options.cc) {
    headers.push(`Cc: ${options.cc}`);
  }

  if (options.bcc) {
    headers.push(`Bcc: ${options.bcc}`);
  }

  headers.push(
    `Subject: ${options.subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`
  );

  // Build body content type
  const contentType = options.html ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8';

  // Build multipart message
  const emailParts = [
    headers.join('\r\n'),
    '',
    `--${boundary}`,
    `Content-Type: ${contentType}`,
    '',
    options.body,
    '',
    `--${boundary}`,
    `Content-Type: ${attachmentMimeType}; name="${attachmentFilename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${attachmentFilename}"`,
    '',
    // Split base64 into 76-character lines per RFC 2045
    attachmentBase64.match(/.{1,76}/g).join('\r\n'),
    '',
    `--${boundary}--`,
  ];

  const email = emailParts.join('\r\n');

  // Encode for Gmail API
  const encodedEmail = Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedEmail,
    },
  });

  return {
    success: true,
    account,
    sent: {
      id: response.data.id,
      threadId: response.data.threadId,
      to: options.to,
      subject: options.subject,
      attachment: {
        filename: attachmentFilename,
        mimeType: attachmentMimeType,
        size: attachmentData.length,
      },
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
      usage: 'node send_with_attachment.js <account> --to <email> --subject <subject> --body <body> --attachment <path>'
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
      case '--attachment':
        options.attachment = args[++i];
        break;
      case '--cc':
        options.cc = args[++i];
        break;
      case '--bcc':
        options.bcc = args[++i];
        break;
      case '--html':
        options.html = true;
        break;
    }
  }

  if (!options.to || !options.subject || !options.body || !options.attachment) {
    console.error(JSON.stringify({
      error: 'Missing required options: --to, --subject, --body, --attachment',
      usage: 'node send_with_attachment.js <account> --to <email> --subject <subject> --body <body> --attachment <path>'
    }));
    process.exit(1);
  }

  try {
    const result = await sendWithAttachment(account, options);
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

module.exports = { sendWithAttachment };
