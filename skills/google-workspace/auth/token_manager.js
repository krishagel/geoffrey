#!/usr/bin/env node

/**
 * Token Manager for Google Workspace
 *
 * Stores and retrieves OAuth tokens from macOS Keychain.
 *
 * Usage:
 *   Store:    node token_manager.js store <account> '<tokens-json>'
 *   Retrieve: node token_manager.js get <account>
 *   Refresh:  node token_manager.js refresh <account>
 *   List:     node token_manager.js list
 *   Delete:   node token_manager.js delete <account>
 *
 * Examples:
 *   node token_manager.js store psd '{"access_token":"...","refresh_token":"..."}'
 *   node token_manager.js get psd
 *   node token_manager.js refresh psd
 */

const { execSync } = require('child_process');
const { google } = require('googleapis');
const path = require('path');

// Load environment variables from iCloud secrets
const os = require('os');
const ENV_PATH = path.join(
  os.homedir(),
  'Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/secrets/.env'
);
require('dotenv').config({ path: ENV_PATH });

const SERVICE_NAME = 'geoffrey-google-workspace';

/**
 * Store tokens in Keychain
 */
function storeTokens(account, tokens) {
  const tokenString = typeof tokens === 'string' ? tokens : JSON.stringify(tokens);

  // Delete existing entry if present
  try {
    execSync(
      `security delete-generic-password -s "${SERVICE_NAME}" -a "${account}" 2>/dev/null`,
      { encoding: 'utf8' }
    );
  } catch (e) {
    // Entry might not exist, that's fine
  }

  // Add new entry
  try {
    execSync(
      `security add-generic-password -s "${SERVICE_NAME}" -a "${account}" -w '${tokenString.replace(/'/g, "'\\''")}' -U`,
      { encoding: 'utf8' }
    );
    return { success: true, account, message: 'Tokens stored in Keychain' };
  } catch (error) {
    throw new Error(`Failed to store tokens: ${error.message}`);
  }
}

/**
 * Retrieve tokens from Keychain
 */
function getTokens(account) {
  try {
    const result = execSync(
      `security find-generic-password -s "${SERVICE_NAME}" -a "${account}" -w`,
      { encoding: 'utf8' }
    ).trim();
    return JSON.parse(result);
  } catch (error) {
    throw new Error(`No tokens found for account: ${account}`);
  }
}

/**
 * Refresh access token using refresh token
 */
async function refreshTokens(account) {
  // Get current tokens
  const tokens = getTokens(account);

  if (!tokens.refresh_token) {
    throw new Error('No refresh token available');
  }

  // Load credentials from environment
  const client_id = process.env.GOOGLE_CLIENT_ID;
  const client_secret = process.env.GOOGLE_CLIENT_SECRET;

  if (!client_id || !client_secret) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env');
  }

  // Create OAuth2 client and refresh
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret);
  oauth2Client.setCredentials(tokens);

  const { credentials: newTokens } = await oauth2Client.refreshAccessToken();

  // Store updated tokens (keep refresh_token if not returned)
  const updatedTokens = {
    ...tokens,
    access_token: newTokens.access_token,
    expiry_date: newTokens.expiry_date,
  };

  storeTokens(account, updatedTokens);

  return {
    success: true,
    account,
    access_token: newTokens.access_token,
    expiry_date: newTokens.expiry_date
  };
}

/**
 * List all stored accounts
 */
function listAccounts() {
  try {
    const result = execSync(
      `security dump-keychain | grep -A 4 '"svce"<blob>="${SERVICE_NAME}"' | grep '"acct"' | sed 's/.*="\\(.*\\)"/\\1/'`,
      { encoding: 'utf8' }
    );
    const accounts = result.trim().split('\n').filter(Boolean);
    return { accounts };
  } catch (error) {
    return { accounts: [] };
  }
}

/**
 * Delete tokens for an account
 */
function deleteTokens(account) {
  try {
    execSync(
      `security delete-generic-password -s "${SERVICE_NAME}" -a "${account}"`,
      { encoding: 'utf8' }
    );
    return { success: true, account, message: 'Tokens deleted' };
  } catch (error) {
    throw new Error(`Failed to delete tokens for ${account}: ${error.message}`);
  }
}

/**
 * Get an authenticated OAuth2 client for an account
 */
async function getAuthClient(account) {
  const tokens = getTokens(account);

  const client_id = process.env.GOOGLE_CLIENT_ID;
  const client_secret = process.env.GOOGLE_CLIENT_SECRET;

  if (!client_id || !client_secret) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env');
  }

  const oauth2Client = new google.auth.OAuth2(client_id, client_secret);
  oauth2Client.setCredentials(tokens);

  // Check if token needs refresh (expires in next 5 minutes)
  if (tokens.expiry_date && tokens.expiry_date < Date.now() + 5 * 60 * 1000) {
    const refreshed = await refreshTokens(account);
    oauth2Client.setCredentials({
      ...tokens,
      access_token: refreshed.access_token
    });
  }

  return oauth2Client;
}

// CLI interface
async function main() {
  const [command, account, data] = process.argv.slice(2);

  try {
    let result;

    switch (command) {
      case 'store':
        if (!account || !data) {
          throw new Error('Usage: token_manager.js store <account> <tokens-json>');
        }
        result = storeTokens(account, JSON.parse(data));
        break;

      case 'get':
        if (!account) {
          throw new Error('Usage: token_manager.js get <account>');
        }
        result = getTokens(account);
        break;

      case 'refresh':
        if (!account) {
          throw new Error('Usage: token_manager.js refresh <account>');
        }
        result = await refreshTokens(account);
        break;

      case 'list':
        result = listAccounts();
        break;

      case 'delete':
        if (!account) {
          throw new Error('Usage: token_manager.js delete <account>');
        }
        result = deleteTokens(account);
        break;

      default:
        throw new Error(`Unknown command: ${command}\nCommands: store, get, refresh, list, delete`);
    }

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
}

// Only run CLI if called directly
if (require.main === module) {
  main();
}

// Export for use by other scripts
module.exports = { getAuthClient, getTokens, refreshTokens, storeTokens };
