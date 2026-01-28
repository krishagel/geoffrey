#!/usr/bin/env bun
/**
 * Get Committees - Fetch Active WA Legislature Committees via SOAP
 *
 * Queries the WA Legislature SOAP API to get active committee names.
 * Used by get_bills.js for committee-based bill discovery.
 *
 * Usage:
 *   bun get_committees.js              # Get all active committees
 *   bun get_committees.js --chamber house  # House committees only
 *   bun get_committees.js --chamber senate # Senate committees only
 */

import { parseArgs } from 'util';

const COMMITTEE_SERVICE_URL = 'https://wslwebservices.leg.wa.gov/CommitteeService.asmx';

/**
 * Build SOAP envelope for GetActiveHouseCommittees or GetActiveSenateCommittees
 * @param {string} chamber - 'house' or 'senate'
 * @returns {string} SOAP envelope XML
 */
function buildGetCommitteesEnvelope(chamber) {
  const methodName = chamber === 'house' ? 'GetActiveHouseCommittees' : 'GetActiveSenateCommittees';

  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${methodName} xmlns="http://WSLWebServices.leg.wa.gov/" />
  </soap:Body>
</soap:Envelope>`;
}

/**
 * Parse committee XML response into array of committee objects
 * @param {string} xml - Response XML
 * @returns {Object[]} Array of committee objects
 */
function parseCommitteeResponse(xml) {
  const committees = [];

  // Match all Committee elements
  const committeeMatches = xml.matchAll(/<Committee>([\s\S]*?)<\/Committee>/g);

  for (const match of committeeMatches) {
    const committeeXml = match[1];

    // Extract fields using simple regex (avoids XML parser dependency)
    const getId = (field) => {
      const m = committeeXml.match(new RegExp(`<${field}>([^<]*)</${field}>`));
      if (!m) return null;
      // Decode HTML entities (API returns &amp; for &)
      return m[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    };

    const name = getId('Name');
    const longName = getId('LongName');
    const id = getId('Id');
    const acronym = getId('Acronym');
    const agency = getId('Agency');

    if (name) {
      committees.push({
        name,
        longName: longName || name,
        id,
        acronym,
        agency,
      });
    }
  }

  return committees;
}

/**
 * Fetch committees from SOAP API
 * @param {string} chamber - 'house' or 'senate'
 * @returns {Promise<Object[]>} Array of committee objects
 */
async function fetchCommittees(chamber) {
  const envelope = buildGetCommitteesEnvelope(chamber);
  const soapAction = chamber === 'house'
    ? 'http://WSLWebServices.leg.wa.gov/GetActiveHouseCommittees'
    : 'http://WSLWebServices.leg.wa.gov/GetActiveSenateCommittees';

  try {
    const response = await fetch(COMMITTEE_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': soapAction,
      },
      body: envelope,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xml = await response.text();
    return parseCommitteeResponse(xml);

  } catch (error) {
    console.error(`Error fetching ${chamber} committees: ${error.message}`);
    return [];
  }
}

/**
 * Get education-related committees (used for Tier 1 discovery)
 * @param {Object[]} committees - All committees
 * @returns {Object[]} Education-related committees
 */
function filterEducationCommittees(committees) {
  const educationKeywords = ['education', 'learning', 'k-12', 'early learning'];

  return committees.filter(c => {
    const name = (c.name || '').toLowerCase();
    const longName = (c.longName || '').toLowerCase();
    return educationKeywords.some(kw => name.includes(kw) || longName.includes(kw));
  });
}

/**
 * Get finance/budget committees (used for Tier 2 discovery)
 * @param {Object[]} committees - All committees
 * @returns {Object[]} Finance-related committees
 */
function filterFinanceCommittees(committees) {
  const financeKeywords = ['appropriations', 'ways & means', 'ways and means', 'capital budget', 'budget'];

  return committees.filter(c => {
    const name = (c.name || '').toLowerCase();
    const longName = (c.longName || '').toLowerCase();
    return financeKeywords.some(kw => name.includes(kw) || longName.includes(kw));
  });
}

/**
 * Main entry point
 */
async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      chamber: { type: 'string', short: 'c' },
      filter: { type: 'string', short: 'f' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`
Get Committees - Fetch Active WA Legislature Committees

Usage:
  bun get_committees.js [options]

Options:
  -c, --chamber <chamber>  Filter by chamber: house, senate (default: both)
  -f, --filter <type>      Filter type: education, finance, all (default: all)
  -h, --help               Show this help

Output:
  Returns JSON with active committee names and metadata.
  Used by get_bills.js for committee-based bill discovery.

Examples:
  bun get_committees.js                     # All committees
  bun get_committees.js --chamber house     # House only
  bun get_committees.js --filter education  # Education committees only
`);
    process.exit(0);
  }

  const results = {
    generated_at: new Date().toISOString(),
    house: [],
    senate: [],
    education: [],
    finance: [],
  };

  // Fetch committees based on chamber filter
  const chambers = values.chamber
    ? [values.chamber.toLowerCase()]
    : ['house', 'senate'];

  for (const chamber of chambers) {
    if (chamber === 'house' || chamber === 'senate') {
      const committees = await fetchCommittees(chamber);
      results[chamber] = committees;
    }
  }

  // Add filtered views
  const allCommittees = [...results.house, ...results.senate];
  results.education = filterEducationCommittees(allCommittees);
  results.finance = filterFinanceCommittees(allCommittees);

  // Apply output filter if specified
  if (values.filter === 'education') {
    console.log(JSON.stringify({
      generated_at: results.generated_at,
      education: results.education,
    }, null, 2));
  } else if (values.filter === 'finance') {
    console.log(JSON.stringify({
      generated_at: results.generated_at,
      finance: results.finance,
    }, null, 2));
  } else {
    console.log(JSON.stringify(results, null, 2));
  }
}

main().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
