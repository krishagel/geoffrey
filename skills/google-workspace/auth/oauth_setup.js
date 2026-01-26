#!/usr/bin/env node

/**
 * OAuth2 Setup Script for Google Workspace
 *
 * Usage: node oauth_setup.js <account-alias>
 * Example: node oauth_setup.js psd
 *
 * This script:
 * 1. Starts a local server to receive OAuth callback
 * 2. Opens browser to Google consent page
 * 3. Exchanges auth code for tokens
 * 4. Outputs tokens as JSON (to be stored by token_manager.js)
 *
 * Prerequisites:
 * - .env file with GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
 * - npm install googleapis open dotenv
 */

const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const openModule = require('open');
const open = openModule.default || openModule;
const path = require('path');

// Load secrets from 1Password via centralized secrets module
const { SECRETS } = require('../../../scripts/secrets.js');

// Configuration
const REDIRECT_PORT = process.env.OAUTH_REDIRECT_PORT || 3000;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth2callback`;

// Full scope list for complete Google Workspace access
const SCOPES = [
  // Gmail
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',

  // Calendar
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',

  // Drive
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',

  // Docs, Sheets, Slides
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/presentations',

  // Forms
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/forms.responses.readonly',

  // Chat
  'https://www.googleapis.com/auth/chat.spaces',
  'https://www.googleapis.com/auth/chat.messages',
  'https://www.googleapis.com/auth/chat.memberships.readonly',

  // Tasks
  'https://www.googleapis.com/auth/tasks',

  // Keep (Note: Keep API has limited availability)
  // 'https://www.googleapis.com/auth/keep',

  // User info (to identify which account)
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',

  // Admin Directory (to look up user names)
  'https://www.googleapis.com/auth/admin.directory.user.readonly',
];

async function main() {
  const accountAlias = process.argv[2];

  if (!accountAlias) {
    console.error(JSON.stringify({
      error: 'Missing account alias',
      usage: 'node oauth_setup.js <account-alias>',
      example: 'node oauth_setup.js psd'
    }));
    process.exit(1);
  }

  // Load client credentials from 1Password
  const { clientId: client_id, clientSecret: client_secret } = SECRETS.google;

  if (!client_id || !client_secret) {
    console.error(JSON.stringify({
      error: 'Missing Google credentials in 1Password',
      instructions: [
        '1. Go to Google Cloud Console',
        '2. Create OAuth 2.0 Client ID (Desktop app)',
        '3. Store client ID and secret in 1Password vault "Geoffrey/Google-Workspace"',
        '4. See docs/1password-setup.md for details'
      ]
    }));
    process.exit(1);
  }

  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    REDIRECT_URI
  );

  // Generate auth URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force to get refresh token
  });

  // Start local server to receive callback
  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = url.parse(req.url, true);

      if (parsedUrl.pathname === '/oauth2callback') {
        const code = parsedUrl.query.code;

        if (!code) {
          res.writeHead(400);
          res.end('Missing authorization code');
          return;
        }

        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);

        // Get user info to confirm which account
        oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();

        // Send success response to browser
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: sans-serif; padding: 40px; text-align: center;">
              <h1>✅ Authorization Successful</h1>
              <p>Account: <strong>${userInfo.data.email}</strong></p>
              <p>Alias: <strong>${accountAlias}</strong></p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);

        // Output tokens as JSON
        console.log(JSON.stringify({
          success: true,
          account: accountAlias,
          email: userInfo.data.email,
          tokens: {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_type: tokens.token_type,
            expiry_date: tokens.expiry_date,
          }
        }, null, 2));

        // Close server
        server.close();
      }
    } catch (error) {
      res.writeHead(500);
      res.end('Authorization failed');
      console.error(JSON.stringify({
        error: 'Token exchange failed',
        message: error.message
      }));
      server.close();
      process.exit(1);
    }
  });

  server.listen(REDIRECT_PORT, async () => {
    console.error(`Opening browser for ${accountAlias} account authorization...`);
    console.error(`If browser doesn't open, visit: ${authUrl}`);
    await open(authUrl);
  });

  // Timeout after 5 minutes
  setTimeout(() => {
    console.error(JSON.stringify({
      error: 'Authorization timeout',
      message: 'No response received within 5 minutes'
    }));
    server.close();
    process.exit(1);
  }, 5 * 60 * 1000);
}

main().catch(error => {
  console.error(JSON.stringify({
    error: 'Setup failed',
    message: error.message
  }));
  process.exit(1);
});
