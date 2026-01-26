#!/usr/bin/env bun

// Get agent info by email
// Usage: bun get_agent.js [email]
// If no email provided, returns current agent (API key owner)

const { SECRETS } = require('../../../scripts/secrets.js');

const { domain, apiKey } = SECRETS.freshservice;
const baseUrl = `https://${domain}/api/v2`;

const email = process.argv[2];

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
