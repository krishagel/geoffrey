#!/usr/bin/env bun

// Get Red Rover organization info and validate credentials
// Usage: bun get_organization.js
//
// This discovery script validates Basic Auth credentials and retrieves
// organization information including the orgId needed for other API calls.

const { SECRETS } = require('../../../scripts/secrets.js');

const { username, password, apiKey } = SECRETS.redrover;
const baseUrl = 'https://connect.redroverk12.com';

async function getOrganization() {
  // Use Basic Auth for this endpoint
  const authString = Buffer.from(`${username}:${password}`).toString('base64');

  const response = await fetch(`${baseUrl}/api/v1/organization`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${authString}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      error: `API error ${response.status}: ${errorText}`,
      status: response.status,
    };
  }

  const data = await response.json();
  return data;
}

try {
  const result = await getOrganization();

  if (result.error) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}
