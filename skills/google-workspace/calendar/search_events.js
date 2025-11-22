#!/usr/bin/env node

/**
 * Search Calendar Events
 *
 * Usage: node search_events.js <account> <query> [options]
 *
 * Options:
 *   --days    Number of days to search (default: 30)
 *   --max     Maximum events to return (default: 50)
 *
 * Examples:
 *   node search_events.js psd "team meeting"
 *   node search_events.js personal "dinner" --days 60
 *   node search_events.js consulting "client"
 */

const { google } = require('googleapis');
const path = require('path');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));

async function searchEvents(account, query, options = {}) {
  const auth = await getAuthClient(account);
  const calendar = google.calendar({ version: 'v3', auth });

  // Calculate time range
  const now = new Date();
  const timeMin = new Date(now);
  timeMin.setDate(timeMin.getDate() - (options.days || 30)); // Look back too

  const timeMax = new Date(now);
  timeMax.setDate(timeMax.getDate() + (options.days || 30));

  const response = await calendar.events.list({
    calendarId: 'primary',
    q: query,
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
    attendees: (event.attendees || []).map(a => ({
      email: a.email,
      name: a.displayName,
      responseStatus: a.responseStatus,
    })),
    htmlLink: event.htmlLink,
  }));

  return {
    success: true,
    account,
    query,
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
      usage: 'node search_events.js <account> <query> [--days N] [--max N]'
    }));
    process.exit(1);
  }

  // Find query (first non-flag argument after account)
  let query = '';
  const options = {};

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--days') {
      options.days = parseInt(args[++i], 10);
    } else if (args[i] === '--max') {
      options.max = parseInt(args[++i], 10);
    } else if (!args[i].startsWith('--')) {
      query = args[i];
    }
  }

  if (!query) {
    console.error(JSON.stringify({
      error: 'Missing query',
      usage: 'node search_events.js <account> <query>'
    }));
    process.exit(1);
  }

  try {
    const result = await searchEvents(account, query, options);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      error: error.message,
      account,
      query,
    }));
    process.exit(1);
  }
}

main();

module.exports = { searchEvents };
