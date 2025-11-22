#!/usr/bin/env node

/**
 * Update Calendar Event
 *
 * Usage: node update_event.js <account> <event-id> [options]
 *
 * Options:
 *   --summary      New event title
 *   --start        New start datetime
 *   --end          New end datetime
 *   --description  New description
 *   --location     New location
 *
 * Examples:
 *   node update_event.js psd abc123 --start "2024-01-15T15:00:00"
 *   node update_event.js personal def456 --summary "Updated Meeting" --location "New Room"
 */

const { google } = require('googleapis');
const path = require('path');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

async function updateEvent(account, eventId, options) {
  const auth = await getAuthClient(account);
  const calendar = google.calendar({ version: 'v3', auth });

  // Get existing event
  const existing = await calendar.events.get({
    calendarId: 'primary',
    eventId,
  });

  const event = existing.data;

  // Update fields
  if (options.summary) event.summary = options.summary;
  if (options.description) event.description = options.description;
  if (options.location) event.location = options.location;

  if (options.start) {
    const startDate = new Date(options.start);
    if (isNaN(startDate.getTime())) {
      throw new Error(`Invalid start date: ${options.start}`);
    }
    event.start = {
      dateTime: startDate.toISOString(),
      timeZone: event.start.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  if (options.end) {
    const endDate = new Date(options.end);
    if (isNaN(endDate.getTime())) {
      throw new Error(`Invalid end date: ${options.end}`);
    }
    event.end = {
      dateTime: endDate.toISOString(),
      timeZone: event.end.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  const response = await calendar.events.update({
    calendarId: 'primary',
    eventId,
    requestBody: event,
    sendUpdates: event.attendees ? 'all' : 'none',
  });

  return {
    success: true,
    account,
    event: {
      id: response.data.id,
      summary: response.data.summary,
      start: response.data.start.dateTime || response.data.start.date,
      end: response.data.end.dateTime || response.data.end.date,
      htmlLink: response.data.htmlLink,
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
  const eventId = args[1];

  if (!account || !eventId) {
    console.error(JSON.stringify({
      error: 'Missing arguments',
      usage: 'node update_event.js <account> <event-id> [options]'
    }));
    process.exit(1);
  }

  // Parse options
  const options = {};
  for (let i = 2; i < args.length; i++) {
    switch (args[i]) {
      case '--summary':
        options.summary = args[++i];
        break;
      case '--start':
        options.start = args[++i];
        break;
      case '--end':
        options.end = args[++i];
        break;
      case '--description':
        options.description = args[++i];
        break;
      case '--location':
        options.location = args[++i];
        break;
    }
  }

  try {
    const result = await updateEvent(account, eventId, options);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      error: error.message,
      account,
      eventId,
    }));
    process.exit(1);
  }
}

main();

module.exports = { updateEvent };
