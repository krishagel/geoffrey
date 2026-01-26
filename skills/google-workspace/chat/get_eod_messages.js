#!/usr/bin/env bun

/**
 * Get End-of-Day Messages from Google Chat Space
 *
 * Fetches messages from a specific Chat space and filters to a specific date.
 * Designed for morning briefings to summarize team EOD check-ins.
 *
 * Usage: bun get_eod_messages.js <account> <space-name> [date]
 *
 * Options:
 *   date: "yesterday", "last-business-day", or specific date like "2026-01-24"
 *
 * Examples:
 *   bun get_eod_messages.js psd spaces/AAAAxOtpv10 yesterday
 *   bun get_eod_messages.js psd spaces/AAAAxOtpv10 last-business-day
 *   bun get_eod_messages.js psd spaces/AAAAxOtpv10 2026-01-24
 */

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

// Load user mapping from iCloud preferences
let allUserMappings = {};
const mappingPath = path.join(
  os.homedir(),
  'Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/knowledge/chat_user_mapping.json'
);
if (fs.existsSync(mappingPath)) {
  try {
    allUserMappings = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
  } catch (e) {
    // Ignore errors
  }
}

// US Federal Holidays (for last-business-day calculation)
const HOLIDAYS = new Set([
  '2025-01-01', '2025-01-20', '2025-02-17', '2025-05-26', '2025-06-19',
  '2025-07-04', '2025-09-01', '2025-10-13', '2025-11-11', '2025-11-27', '2025-12-25',
  '2026-01-01', '2026-01-19', '2026-02-16', '2026-05-25', '2026-06-19',
  '2026-07-03', '2026-09-07', '2026-10-12', '2026-11-11', '2026-11-26', '2026-12-25',
]);

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function isBusinessDay(date) {
  const day = date.getDay();
  if (day === 0 || day === 6) return false; // Weekend
  return !HOLIDAYS.has(formatDate(date));
}

function getLastBusinessDay(referenceDate = new Date()) {
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);

  const candidate = new Date(ref);
  candidate.setDate(candidate.getDate() - 1);

  while (!isBusinessDay(candidate)) {
    candidate.setDate(candidate.getDate() - 1);
  }

  return candidate;
}

function parseTargetDate(dateArg) {
  const now = new Date();

  if (!dateArg || dateArg === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return {
      start: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0),
      end: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59),
      label: 'yesterday'
    };
  }

  if (dateArg === 'last-business-day') {
    const lbd = getLastBusinessDay(now);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return {
      start: new Date(lbd.getFullYear(), lbd.getMonth(), lbd.getDate(), 0, 0, 0),
      end: new Date(lbd.getFullYear(), lbd.getMonth(), lbd.getDate(), 23, 59, 59),
      label: `${dayNames[lbd.getDay()]} (${formatDate(lbd)})`
    };
  }

  // Parse specific date
  const date = new Date(dateArg);
  return {
    start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0),
    end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59),
    label: formatDate(date)
  };
}

async function getEodMessages(account, spaceName, dateArg) {
  const auth = await getAuthClient(account);
  const chat = google.chat({ version: 'v1', auth });

  // Parse the target date
  const dateRange = parseTargetDate(dateArg);

  // Get space members to build userId -> displayName mapping
  const membersResponse = await chat.spaces.members.list({
    parent: spaceName,
    pageSize: 100,
  });

  const userNameMap = {};
  for (const membership of (membersResponse.data.memberships || [])) {
    if (membership.member && membership.member.name) {
      const userId = membership.member.name;
      userNameMap[userId] = membership.member.displayName || userId;
    }
  }

  // Fetch more messages to ensure we cover the target date
  const response = await chat.spaces.messages.list({
    parent: spaceName,
    pageSize: 100,
    orderBy: 'createTime desc',
  });

  // Get account-specific user mapping
  const userMapping = allUserMappings[account] || {};

  // Filter messages to target date
  const filteredMessages = (response.data.messages || [])
    .filter(msg => {
      const msgTime = new Date(msg.createTime);
      return msgTime >= dateRange.start && msgTime <= dateRange.end;
    })
    .map(msg => {
      const senderId = msg.sender?.name;
      const bareId = senderId?.replace('users/', '');
      const senderName = userMapping[bareId] || userNameMap[senderId] || msg.sender?.displayName || senderId;

      return {
        sender: senderName,
        senderId: bareId,
        text: msg.text,
        createTime: msg.createTime,
        // Extract time for display
        time: new Date(msg.createTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      };
    })
    .reverse(); // Chronological order

  return {
    success: true,
    account,
    spaceName,
    targetDate: dateRange.label,
    dateRange: {
      start: dateRange.start.toISOString(),
      end: dateRange.end.toISOString()
    },
    messages: filteredMessages,
    metadata: {
      timestamp: new Date().toISOString(),
      count: filteredMessages.length,
    }
  };
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const account = args[0];
  const spaceName = args[1];
  const dateArg = args[2] || 'last-business-day';

  if (!account || !spaceName) {
    console.error(JSON.stringify({
      error: 'Missing arguments',
      usage: 'bun get_eod_messages.js <account> <space-name> [date]',
      dateOptions: ['yesterday', 'last-business-day', '2026-01-24']
    }));
    process.exit(1);
  }

  try {
    const result = await getEodMessages(account, spaceName, dateArg);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      error: error.message,
      account,
      spaceName,
    }));
    process.exit(1);
  }
}

main();

module.exports = { getEodMessages };
