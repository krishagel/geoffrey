#!/usr/bin/env bun

// List tickets with filters
// Usage: bun list_tickets.js [options]
// Options passed as JSON: {"workspace_id": 2, "filter": "open", "agent_id": 123, "per_page": 30}

const { SECRETS } = require('../../../scripts/secrets.js');

const { domain, apiKey } = SECRETS.freshservice;
const baseUrl = `https://${domain}/api/v2`;

// Parse options
let options = {};
if (process.argv[2]) {
  try {
    options = JSON.parse(process.argv[2]);
  } catch (e) {
    console.error(JSON.stringify({ error: 'Invalid JSON options' }));
    process.exit(1);
  }
}

async function listTickets(options) {
  const params = new URLSearchParams();

  // Workspace filter (0 = all workspaces)
  if (options.workspace_id !== undefined) {
    params.append('workspace_id', options.workspace_id);
  }

  // Predefined filters: new_and_my_open, watching, spam, deleted
  if (options.filter) {
    params.append('filter', options.filter);
  }

  // Include related data
  if (options.include) {
    params.append('include', options.include);
  }

  // Pagination
  params.append('per_page', options.per_page || 30);
  if (options.page) {
    params.append('page', options.page);
  }

  // Order
  if (options.order_type) {
    params.append('order_type', options.order_type);
  }

  // Updated since (for older tickets)
  if (options.updated_since) {
    params.append('updated_since', options.updated_since);
  }

  const url = `${baseUrl}/tickets?${params.toString()}`;

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

  // Simplify output for readability
  const tickets = data.tickets.map(t => ({
    id: t.id,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    requester_id: t.requester_id,
    responder_id: t.responder_id,
    group_id: t.group_id,
    workspace_id: t.workspace_id,
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
  const result = await listTickets(options);
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}
