#!/usr/bin/env bun

// Get workspace details
// Usage: bun get_workspaces.js [workspace_id]
// If no ID provided, gets all workspaces the agent has access to

const { SECRETS } = require('../../../scripts/secrets.js');

const { domain, apiKey } = SECRETS.freshservice;
const baseUrl = `https://${domain}/api/v2`;

async function getWorkspace(id) {
  const response = await fetch(`${baseUrl}/workspaces/${id}`, {
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${apiKey}:X`).toString('base64'),
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    return { id, error: `${response.status}` };
  }

  const data = await response.json();
  return data.workspace;
}

// Known workspace IDs from agent profile
const workspaceIds = [2, 3, 4, 5, 6, 8, 9, 10, 11, 13];
const specificId = process.argv[2];

try {
  if (specificId) {
    const workspace = await getWorkspace(parseInt(specificId));
    console.log(JSON.stringify(workspace, null, 2));
  } else {
    const results = await Promise.all(workspaceIds.map(getWorkspace));
    const workspaces = results
      .filter(w => !w.error)
      .map(w => ({
        id: w.id,
        name: w.name,
        primary: w.primary,
        state: w.state
      }));
    console.log(JSON.stringify({ workspaces }, null, 2));
  }
} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}
