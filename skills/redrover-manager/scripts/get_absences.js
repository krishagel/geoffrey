#!/usr/bin/env bun

// Get absence/vacancy data from Red Rover for a date range
// Usage: bun get_absences.js <start_date> <end_date> [filled|unfilled|all]
//
// Example: bun get_absences.js 2026-01-20 2026-01-27
// Example: bun get_absences.js 2026-01-27 2026-01-27 unfilled
//
// Dates should be in YYYY-MM-DD format.
// Max date range: 31 days

const { SECRETS } = require('../../../scripts/secrets.js');

const { username, password } = SECRETS.redrover;
const baseUrl = 'https://connect.redroverk12.com';
const authString = Buffer.from(`${username}:${password}`).toString('base64');

// Get organization info (includes dynamic apiKey)
async function getOrganization() {
  const response = await fetch(`${baseUrl}/api/v1/organization`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${authString}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get organization: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data[0] : data;
}

// Fetch vacancy details for a date range
async function getVacancyDetails(orgId, apiKey, startDate, endDate, filledFilter) {
  const url = new URL(`${baseUrl}/api/v1/${orgId}/Vacancy/details`);
  url.searchParams.set('fromDate', `${startDate}T00:00:00Z`);
  url.searchParams.set('toDate', `${endDate}T23:59:59Z`);
  url.searchParams.set('pageSize', '100');

  // Add filled filter if specified
  if (filledFilter === 'filled') {
    url.searchParams.set('filled', 'true');
  } else if (filledFilter === 'unfilled') {
    url.searchParams.set('filled', 'false');
  }

  let allData = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    url.searchParams.set('page', String(page));

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Basic ${authString}`,
        apiKey: apiKey,
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

    const result = await response.json();
    allData = allData.concat(result.data || []);
    hasMore = result.hasMoreData;
    page++;
  }

  return { data: allData, total: allData.length };
}

// Parse command line arguments
const startDate = process.argv[2];
const endDate = process.argv[3];
const filledFilter = process.argv[4] || 'all'; // filled, unfilled, or all

if (!startDate || !endDate) {
  console.error('Usage: bun get_absences.js <start_date> <end_date> [filled|unfilled|all]');
  console.error('Example: bun get_absences.js 2026-01-20 2026-01-27');
  console.error('Example: bun get_absences.js 2026-01-27 2026-01-27 unfilled');
  process.exit(1);
}

// Validate date format
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
  console.error('Dates must be in YYYY-MM-DD format');
  process.exit(1);
}

try {
  const org = await getOrganization();
  const orgId = org.orgId;
  const apiKey = org.apiKey;

  console.error(`Fetching ${filledFilter} vacancies from ${startDate} to ${endDate}...`);
  console.error('');

  const result = await getVacancyDetails(orgId, apiKey, startDate, endDate, filledFilter);

  if (result.error) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}
