# Google Cloud Console Setup Guide

## Step 1: Create Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your **consulting account** (this will own the OAuth app)
3. Click **Select a project** → **New Project**
4. Name: `Geoffrey Google Workspace`
5. Click **Create**

## Step 2: Enable APIs

Navigate to **APIs & Services → Library** and enable each:

### Required APIs
- [ ] Gmail API
- [ ] Google Calendar API
- [ ] Google Drive API
- [ ] Google Docs API
- [ ] Google Sheets API
- [ ] Google Slides API
- [ ] Google Forms API
- [ ] Google Chat API
- [ ] Tasks API
- [ ] People API (for user info)

### Optional APIs
- [ ] Google Keep API (limited availability)
- [ ] Gemini API (if using AI features)

**Tip:** Search for each API name and click **Enable**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. Select **External** (unless all accounts are in same org)
3. Click **Create**

### App Information
- App name: `Geoffrey`
- User support email: Your consulting email
- Developer contact: Your consulting email

### Scopes
Click **Add or Remove Scopes** and add:

```
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/drive
https://www.googleapis.com/auth/documents
https://www.googleapis.com/auth/spreadsheets
https://www.googleapis.com/auth/presentations
https://www.googleapis.com/auth/forms.body
https://www.googleapis.com/auth/chat.messages
https://www.googleapis.com/auth/tasks
https://www.googleapis.com/auth/userinfo.email
```

### Test Users
Add all three email addresses:
- Your PSD email
- Your personal email
- Your consulting email

**Note:** While in "Testing" mode, only these users can authorize.

## Step 4: Create OAuth Credentials

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Application type: **Desktop app**
4. Name: `Geoffrey CLI`
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**
7. Add to your iCloud secrets `.env` file:
   ```
   ~/Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/secrets/.env
   ```

   Add these lines:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

## Step 5: PSD Domain Allowlisting

Your PSD Google Workspace likely restricts third-party apps. To allow Geoffrey:

### If You're a Google Admin:

1. Go to [Google Admin Console](https://admin.google.com)
2. Navigate to **Security → Access and data control → API controls**
3. Click **Manage Third-Party App Access**
4. Click **Add app → OAuth App Name Or Client ID**
5. Enter your OAuth Client ID (from Step 4)
6. Select **Trusted** access

### If You Need IT Approval:

Send this to your IT team:

```
Subject: Request to Allow OAuth App for Personal Productivity Tool

I need to allowlist a personal productivity app that integrates with Google Workspace.

OAuth Client ID: [YOUR_CLIENT_ID_HERE]

Requested scopes:
- Gmail (read/send)
- Calendar (read/write)
- Drive (read/write)
- Docs/Sheets/Slides (read/write)
- Tasks (read/write)

This is a local CLI tool that runs only on my machine.
No data is sent to external servers.

Please add this client ID to the trusted apps list.
```

## Step 6: Authenticate Each Account

Once credentials are in your .env:

```bash
cd skills/google-workspace

# Install dependencies
bun install

# Authenticate each account
bun auth/oauth_setup.js psd    # Will open browser, sign in with PSD account
bun auth/oauth_setup.js kh     # Will open browser, sign in with personal account
bun auth/oauth_setup.js hrg    # Will open browser, sign in with consulting account

# After each auth, store the tokens (copy the JSON output from oauth_setup)
bun auth/token_manager.js store psd '<tokens-json-output>'
bun auth/token_manager.js store kh '<tokens-json-output>'
bun auth/token_manager.js store hrg '<tokens-json-output>'
```

## Step 7: Verify Setup

```bash
# List stored accounts
bun auth/token_manager.js list

# Test token retrieval
bun auth/token_manager.js get psd
```

## Troubleshooting

### "Access blocked: This app's request is invalid"
- Check that redirect URI matches: `http://localhost:3000/oauth2callback`
- Verify OAuth consent screen is configured

### "Access denied" for PSD account
- App needs to be allowlisted in PSD Google Admin
- Contact IT with the client ID

### "Refresh token is null"
- Delete the app from your Google account's connected apps
- Re-run oauth_setup.js with the account
- The `prompt: 'consent'` should force a new refresh token

### Token expires quickly
- Access tokens last 1 hour
- token_manager.js auto-refreshes using the refresh token
- Refresh tokens don't expire unless revoked

## Security Notes

- Credentials stored in iCloud secrets `.env` (synced, but local to your devices)
- Tokens stored in macOS Keychain (encrypted)
- Each account has its own isolated tokens
- Revoke access anytime from Google Account → Security → Third-party apps
