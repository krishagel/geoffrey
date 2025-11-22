#!/usr/bin/env node

/**
 * Create Calendar Event
 *
 * Usage: node create_event.js <account> --summary <title> --start <datetime> [options]
 *
 * Options:
 *   --summary      Event title (required)
 *   --start        Start datetime (required, ISO 8601 or natural)
 *   --end          End datetime (default: 1 hour after start)
 *   --description  Event description
 *   --location     Event location
 *   --attendees    Comma-separated email addresses
 *   --all-day      Create all-day event (use date format for start/end)
 *
 * Examples:
 *   node create_event.js psd --summary "Team Meeting" --start "2024-01-15T14:00:00"
 *   node create_event.js personal --summary "Dinner" --start "2024-01-15T18:00:00" --end "2024-01-15T20:00:00" --location "Restaurant"
 *   node create_event.js consulting --summary "Client Call" --start "2024-01-15T10:00:00" --attendees "client@example.com"
 */

const { google } = require('googleapis');
const path = require('path');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

async function createEvent(account, options) {
  const auth = await getAuthClient(account);
  const calendar = google.calendar({ version: 'v3', auth });

  // Parse start time
  const startDate = new Date(options.start);
  if (isNaN(startDate.getTime())) {
    throw new Error(`Invalid start date: ${options.start}`);
  }

  // Calculate end time (default: 1 hour after start)
  let endDate;
  if (options.end) {
    endDate = new Date(options.end);
    if (isNaN(endDate.getTime())) {
      throw new Error(`Invalid end date: ${options.end}`);
    }
  } else {
    endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1);
  }

  // Build event
  const event = {
    summary: options.summary,
    description: options.description,
    location: options.location,
  };

  // Handle all-day vs timed events
  if (options.allDay) {
    event.start = { date: startDate.toISOString().split('T')[0] };
    event.end = { date: endDate.toISOString().split('T')[0] };
  } else {
    event.start = {
      dateTime: startDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    event.end = {
      dateTime: endDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  // Add attendees
  if (options.attendees) {
    event.attendees = options.attendees.split(',').map(email => ({
      email: email.trim(),
    }));
  }

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    sendUpdates: options.attendees ? 'all' : 'none',
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

  if (!account) {
    console.error(JSON.stringify({
      error: 'Missing account',
      usage: 'node create_event.js <account> --summary <title> --start <datetime> [options]'
    }));
    process.exit(1);
  }

  // Parse options
  const options = {};
  for (let i = 1; i < args.length; i++) {
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
      case '--attendees':
        options.attendees = args[++i];
        break;
      case '--all-day':
        options.allDay = true;
        break;
    }
  }

  if (!options.summary || !options.start) {
    console.error(JSON.stringify({
      error: 'Missing required options: --summary, --start',
      usage: 'node create_event.js <account> --summary <title> --start <datetime>'
    }));
    process.exit(1);
  }

  try {
    const result = await createEvent(account, options);
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

module.exports = { createEvent };
