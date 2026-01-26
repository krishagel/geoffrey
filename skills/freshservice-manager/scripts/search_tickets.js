#!/usr/bin/env bun

// Search tickets with query
// Usage: bun search_tickets.js '<query>' [workspace_id]
// Query examples: "responder_id:123", "status:2 AND priority:3", "agent_id:123"

const { SECRETS } = require('../../../scripts/secrets.js');

const { domain, apiKey } = SECRETS.freshservice;
const baseUrl = `https://${domain}/api/v2`;

const query = process.argv[2];
const workspaceId = process.argv[3] || '0';

if (!query) {
  console.error(JSON.stringify({ error: 'Query required. Example: "responder_id:6000130414"' }));
  process.exit(1);
}

async function searchTickets(query, workspaceId) {
  const url = `${baseUrl}/tickets/filter?query="${encodeURIComponent(query)}"&workspace_id=${workspaceId}`;

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

  const tickets = data.tickets.map(t => ({
    id: t.id,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    workspace_id: t.workspace_id,
    responder_id: t.responder_id,
    created_at: t.created_at,
    updated_at: t.updated_at,
    due_by: t.due_by
  }));

  return {
    count: tickets.length,
    tickets
  };
}

try {
  const result = await searchTickets(query, workspaceId);
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}
