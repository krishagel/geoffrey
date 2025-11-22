#!/usr/bin/env bun

// Add a note to a ticket
// Usage: bun add_note.js <ticket_id> '<json>'
// JSON: {"body": "Note text", "private": true, "notify_emails": ["email@example.com"]}

import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

function loadEnv() {
  const envPath = join(homedir(), 'Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/secrets/.env');
  const content = readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  }
  return env;
}

const env = loadEnv();
const domain = env.FRESHSERVICE_DOMAIN;
const apiKey = env.FRESHSERVICE_API_KEY;
const baseUrl = `https://${domain}/api/v2`;

const ticketId = process.argv[2];
let noteData;

if (!ticketId) {
  console.error(JSON.stringify({ error: 'Ticket ID required' }));
  process.exit(1);
}

try {
  noteData = JSON.parse(process.argv[3]);
} catch (e) {
  console.error(JSON.stringify({ error: 'Invalid JSON. Required: {"body": "note text"}' }));
  process.exit(1);
}

if (!noteData.body) {
  console.error(JSON.stringify({ error: 'Note body is required' }));
  process.exit(1);
}

// Default to private note
if (noteData.private === undefined) {
  noteData.private = true;
}

async function addNote(ticketId, data) {
  const response = await fetch(`${baseUrl}/tickets/${ticketId}/notes`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${apiKey}:X`).toString('base64'),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.text();
    return { error: `API error ${response.status}: ${error}` };
  }

  const result = await response.json();
  return result;
}

try {
  const result = await addNote(ticketId, noteData);
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}
