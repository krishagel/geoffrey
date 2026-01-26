#!/usr/bin/env bun

// List all agents
// Usage: bun list_agents.js [query]
// Query can be first name, last name, or email to filter

const { SECRETS } = require('../../../scripts/secrets.js');

const { domain, apiKey } = SECRETS.freshservice;
const baseUrl = `https://${domain}/api/v2`;

const query = process.argv[2]?.toLowerCase();

async function listAgents() {
  let allAgents = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(`${baseUrl}/agents?per_page=100&page=${page}`, {
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
    allAgents = allAgents.concat(data.agents);

    // Check if there are more pages
    hasMore = data.agents.length === 100;
    page++;
  }

  // Filter and simplify
  let agents = allAgents
    .filter(a => a.active)
    .map(a => ({
      id: a.id,
      name: `${a.first_name} ${a.last_name}`,
      first_name: a.first_name,
      last_name: a.last_name,
      email: a.email,
      job_title: a.job_title
    }));

  // Filter by query if provided
  if (query) {
    agents = agents.filter(a =>
      a.first_name.toLowerCase().includes(query) ||
      a.last_name.toLowerCase().includes(query) ||
      a.email.toLowerCase().includes(query)
    );
  }

  // Sort by first name
  agents.sort((a, b) => a.first_name.localeCompare(b.first_name));

  return {
    count: agents.length,
    agents
  };
}

try {
  const result = await listAgents();
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}
