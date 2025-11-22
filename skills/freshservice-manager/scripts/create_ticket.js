#!/usr/bin/env bun

// Create a new ticket
// Usage: bun create_ticket.js '<json>'
// JSON: {"subject": "...", "description": "...", "email": "requester@email.com", "priority": 2, "status": 2, "workspace_id": 2}

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

// Status values: 2=Open, 3=Pending, 4=Resolved, 5=Closed
// Priority values: 1=Low, 2=Medium, 3=High, 4=Urgent

let ticketData;
try {
  ticketData = JSON.parse(process.argv[2]);
} catch (e) {
  console.error(JSON.stringify({ error: 'Invalid JSON. Required: subject, description, email' }));
  process.exit(1);
}

if (!ticketData.subject || !ticketData.description || !ticketData.email) {
  console.error(JSON.stringify({ error: 'Required fields: subject, description, email' }));
  process.exit(1);
}

// Set defaults
ticketData.status = ticketData.status || 2; // Open
ticketData.priority = ticketData.priority || 2; // Medium

async function createTicket(data) {
  const response = await fetch(`${baseUrl}/tickets`, {
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
  const result = await createTicket(ticketData);
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}
