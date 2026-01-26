#!/usr/bin/env bun

// Get ticket details by ID
// Usage: bun get_ticket.js <ticket_id> [include]
// Include options: conversations, requester, problem, stats, assets, change, related_tickets

const { SECRETS } = require('../../../scripts/secrets.js');

const { domain, apiKey } = SECRETS.freshservice;
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
