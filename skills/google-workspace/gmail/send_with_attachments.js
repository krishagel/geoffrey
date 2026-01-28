#!/usr/bin/env bun

/**
 * Send Gmail Message with Multiple Attachments
 *
 * Usage: bun send_with_attachments.js <account> --to <email> --subject <subject> --body-file <path> --attachments <path1,path2,...>
 *
 * Options:
 *   --to           Recipient email (required)
 *   --subject      Email subject (required)
 *   --body         Email body text (short messages)
 *   --body-file    Path to file containing email body (for long content)
 *   --attachments  Comma-separated paths to attachment files
 *   --inline-image Path to image to embed inline (referenced as cid:briefing_image in HTML)
 *   --cc           CC recipients (comma-separated)
 *   --bcc          BCC recipients (comma-separated)
 *   --html         Treat body as HTML (default: plain text)
 *
 * Inline Image Usage:
 *   Use --inline-image to embed an image that displays in the email body.
 *   Reference it in your HTML with: <img src="cid:briefing_image">
 *   The image will appear inline AND be downloadable.
 *
 * Examples:
 *   # With inline image at top of HTML email
 *   bun send_with_attachments.js psd --to "john@example.com" --subject "Daily Briefing" \
 *     --body-file /tmp/briefing.html --html \
 *     --inline-image ~/Desktop/infographic.png \
 *     --attachments ~/Desktop/podcast.mp3
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
    '.md': 'text/markdown',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Expand ~ to home directory
 */
function expandPath(filepath) {
  if (filepath.startsWith('~')) {
    return filepath.replace('~', process.env.HOME);
  }
  return filepath;
}

async function sendWithAttachments(account, options) {
  const auth = await getAuthClient(account);
  const gmail = google.gmail({ version: 'v1', auth });

  // Get sender email
  const profile = await gmail.users.getProfile({ userId: 'me' });
  const fromEmail = profile.data.emailAddress;

  // Get body content
  let body = options.body || '';
  if (options.bodyFile) {
    const bodyPath = expandPath(options.bodyFile);
    if (!fs.existsSync(bodyPath)) {
      throw new Error(`Body file not found: ${bodyPath}`);
    }
    body = fs.readFileSync(bodyPath, 'utf8');
  }

  // Parse inline image (embedded in email body)
  let inlineImage = null;
  if (options.inlineImage) {
    const inlinePath = expandPath(options.inlineImage);
    if (!fs.existsSync(inlinePath)) {
      throw new Error(`Inline image not found: ${inlinePath}`);
    }
    const data = fs.readFileSync(inlinePath);
    const filename = path.basename(inlinePath);
    inlineImage = {
      path: inlinePath,
      filename,
      mimeType: getMimeType(filename),
      base64: data.toString('base64'),
      size: data.length,
      contentId: 'briefing_image', // Referenced as cid:briefing_image in HTML
    };
  }

  // Parse attachments
  const attachmentPaths = options.attachments
    ? options.attachments.split(',').map(p => expandPath(p.trim()))
    : [];

  // Validate attachments exist
  const attachments = [];
  for (const attachmentPath of attachmentPaths) {
    if (!fs.existsSync(attachmentPath)) {
      throw new Error(`Attachment not found: ${attachmentPath}`);
    }
    const data = fs.readFileSync(attachmentPath);
    const filename = path.basename(attachmentPath);
    attachments.push({
      path: attachmentPath,
      filename,
      mimeType: getMimeType(filename),
      base64: data.toString('base64'),
      size: data.length,
    });
  }

  // Generate boundaries for multipart message
  const mixedBoundary = `mixed_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const relatedBoundary = `related_${Date.now()}_${Math.random().toString(36).substring(2)}`;

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
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`
  );

  // Build body content type
  const contentType = options.html ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8';

  // Build multipart message
  let emailParts;

  if (inlineImage && options.html) {
    // Use multipart/related for HTML with inline image
    emailParts = [
      headers.join('\r\n'),
      '',
      `--${mixedBoundary}`,
      `Content-Type: multipart/related; boundary="${relatedBoundary}"`,
      '',
      `--${relatedBoundary}`,
      `Content-Type: ${contentType}`,
      '',
      body,
      '',
      `--${relatedBoundary}`,
      `Content-Type: ${inlineImage.mimeType}; name="${inlineImage.filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-ID: <${inlineImage.contentId}>`,
      `Content-Disposition: inline; filename="${inlineImage.filename}"`,
      '',
      inlineImage.base64.match(/.{1,76}/g).join('\r\n'),
      '',
      `--${relatedBoundary}--`,
    ];
  } else {
    // Standard multipart/mixed
    emailParts = [
      headers.join('\r\n'),
      '',
      `--${mixedBoundary}`,
      `Content-Type: ${contentType}`,
      '',
      body,
    ];
  }

  // Add each attachment
  for (const attachment of attachments) {
    emailParts.push(
      '',
      `--${mixedBoundary}`,
      `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      '',
      // Split base64 into 76-character lines per RFC 2045
      attachment.base64.match(/.{1,76}/g).join('\r\n')
    );
  }

  // Close boundary
  emailParts.push('', `--${mixedBoundary}--`);

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
      inlineImage: inlineImage ? {
        filename: inlineImage.filename,
        mimeType: inlineImage.mimeType,
        size: inlineImage.size,
        contentId: inlineImage.contentId,
      } : null,
      attachments: attachments.map(a => ({
        filename: a.filename,
        mimeType: a.mimeType,
        size: a.size,
      })),
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
      usage: 'bun send_with_attachments.js <account> --to <email> --subject <subject> --body-file <path> --attachments <path1,path2>'
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
      case '--body-file':
        options.bodyFile = args[++i];
        break;
      case '--attachments':
        options.attachments = args[++i];
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
      case '--inline-image':
        options.inlineImage = args[++i];
        break;
    }
  }

  if (!options.to || !options.subject || (!options.body && !options.bodyFile)) {
    console.error(JSON.stringify({
      error: 'Missing required options: --to, --subject, and either --body or --body-file',
      usage: 'bun send_with_attachments.js <account> --to <email> --subject <subject> --body-file <path> --attachments <path1,path2>'
    }));
    process.exit(1);
  }

  try {
    const result = await sendWithAttachments(account, options);
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

module.exports = { sendWithAttachments };
