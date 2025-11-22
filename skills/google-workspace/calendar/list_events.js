#!/usr/bin/env node

/**
 * List Calendar Events
 *
 * Usage: node list_events.js <account> [options]
 *
 * Options:
 *   --days     Number of days to look ahead (default: 7)
 *   --today    Show only today's events
 *   --max      Maximum events to return (default: 50)
 *
 * Examples:
 *   node list_events.js psd
 *   node list_events.js psd --today
 *   node list_events.js personal --days 30
 */

const { google } = require('googleapis');
const path = require('path');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

async function listEvents(account, options = {}) {
  const auth = await getAuthClient(account);
  const calendar = google.calendar({ version: 'v3', auth });

  // Calculate time range
  const now = new Date();
  const timeMin = new Date(now);
  timeMin.setHours(0, 0, 0, 0);

  let timeMax;
  if (options.today) {
    timeMax = new Date(timeMin);
    timeMax.setDate(timeMax.getDate() + 1);
  } else {
    timeMax = new Date(timeMin);
    timeMax.setDate(timeMax.getDate() + (options.days || 7));
  }

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    maxResults: options.max || 50,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = (response.data.items || []).map(event => ({
    id: event.id,
    summary: event.summary,
    description: event.description,
    location: event.location,
    start: event.start.dateTime || event.start.date,
    end: event.end.dateTime || event.end.date,
    isAllDay: !event.start.dateTime,
    status: event.status,
    attendees: (event.attendees || []).map(a => ({
      email: a.email,
      name: a.displayName,
      responseStatus: a.responseStatus,
    })),
    hangoutLink: event.hangoutLink,
    htmlLink: event.htmlLink,
  }));

  return {
    success: true,
    account,
    events,
    metadata: {
      timestamp: new Date().toISOString(),
      count: events.length,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
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
      usage: 'node list_events.js <account> [--today] [--days N] [--max N]'
    }));
    process.exit(1);
  }

  // Parse options
  const options = {};
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--today':
        options.today = true;
        break;
      case '--days':
        options.days = parseInt(args[++i], 10);
        break;
      case '--max':
        options.max = parseInt(args[++i], 10);
        break;
    }
  }

  try {
    const result = await listEvents(account, options);
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

module.exports = { listEvents };
