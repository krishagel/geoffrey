#!/usr/bin/env bun

// Update an existing ticket
// Usage: bun update_ticket.js <ticket_id> '<json>'
// JSON: {"status": 4, "priority": 3, "responder_id": 123, "group_id": 456}

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

// Status: 2=Open, 3=Pending, 4=Resolved, 5=Closed
// Priority: 1=Low, 2=Medium, 3=High, 4=Urgent

const ticketId = process.argv[2];
let updateData;

if (!ticketId) {
  console.error(JSON.stringify({ error: 'Ticket ID required' }));
  process.exit(1);
}

try {
  updateData = JSON.parse(process.argv[3]);
} catch (e) {
  console.error(JSON.stringify({ error: 'Invalid JSON for update data' }));
  process.exit(1);
}

async function updateTicket(id, data) {
  const response = await fetch(`${baseUrl}/tickets/${id}`, {
    method: 'PUT',
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
  const result = await updateTicket(ticketId, updateData);
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}
