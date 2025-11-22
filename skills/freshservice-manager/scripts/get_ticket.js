#!/usr/bin/env bun

// Get ticket details by ID
// Usage: bun get_ticket.js <ticket_id> [include]
// Include options: conversations, requester, problem, stats, assets, change, related_tickets

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
const include = process.argv[3];

if (!ticketId) {
  console.error(JSON.stringify({ error: 'Ticket ID required' }));
  process.exit(1);
}

async function getTicket(id, include) {
  let url = `${baseUrl}/tickets/${id}`;
  if (include) {
    url += `?include=${include}`;
  }

  const response = await fetch(url, {
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${apiKey}:X`).toString('base64'),
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    return { error: `API error ${response.status}: ${error}` };
  }

  const data = await response.json();
  return data;
}

try {
  const result = await getTicket(ticketId, include);
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}
