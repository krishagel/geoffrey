#!/usr/bin/env bun

// Get agent info by email
// Usage: bun get_agent.js [email]
// If no email provided, returns current agent (API key owner)

import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// Load environment from iCloud secrets
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

if (!domain || !apiKey) {
  console.error(JSON.stringify({ error: 'Missing FRESHSERVICE_DOMAIN or FRESHSERVICE_API_KEY in .env' }));
  process.exit(1);
}

const email = process.argv[2];
const baseUrl = `https://${domain}/api/v2`;

async function getAgents(email) {
  let url = `${baseUrl}/agents`;
  if (email) {
    url += `?email=${encodeURIComponent(email)}`;
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
  const result = await getAgents(email);
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}
