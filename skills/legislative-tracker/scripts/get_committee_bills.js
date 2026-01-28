#!/usr/bin/env bun
/**
 * Get Committee Bills - Fetch Bills in a Committee via SOAP
 *
 * Queries the WA Legislature SOAP API to get all bills currently in a committee.
 * This is the core of the committee-based discovery approach - gets ALL bills,
 * not just those matching keywords.
 *
 * Usage:
 *   bun get_committee_bills.js --committee "Education" --agency House
 *   bun get_committee_bills.js --committee "Early Learning & K-12 Education" --agency Senate
 *   bun get_committee_bills.js --committee "Appropriations" --agency House --biennium "2025-26"
 */

import { parseArgs } from 'util';

const COMMITTEE_ACTION_SERVICE_URL = 'https://wslwebservices.leg.wa.gov/CommitteeActionService.asmx';
const DEFAULT_BIENNIUM = '2025-26';

/**
 * Escape XML special characters
 * @param {string} str - String to escape
 * @returns {string} XML-safe string
 */
function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build SOAP envelope for GetInCommittee
 * @param {string} biennium - Biennium like "2025-26"
 * @param {string} agency - "House" or "Senate"
 * @param {string} committeeName - Exact committee name
 * @returns {string} SOAP envelope XML
 */
function buildGetInCommitteeEnvelope(biennium, agency, committeeName) {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetInCommittee xmlns="http://WSLWebServices.leg.wa.gov/">
      <biennium>${escapeXml(biennium)}</biennium>
      <agency>${escapeXml(agency)}</agency>
      <committeeName>${escapeXml(committeeName)}</committeeName>
    </GetInCommittee>
  </soap:Body>
</soap:Envelope>`;
}

/**
 * Build SOAP envelope for GetCommitteeReferralsByCommittee
 * This gets ALL bills ever referred to the committee (broader than GetInCommittee)
 * @param {string} biennium - Biennium like "2025-26"
 * @param {string} agency - "House" or "Senate"
 * @param {string} committeeName - Exact committee name
 * @returns {string} SOAP envelope XML
 */
function buildGetReferralsEnvelope(biennium, agency, committeeName) {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetCommitteeReferralsByCommittee xmlns="http://WSLWebServices.leg.wa.gov/">
      <biennium>${escapeXml(biennium)}</biennium>
      <agency>${escapeXml(agency)}</agency>
      <committeeName>${escapeXml(committeeName)}</committeeName>
    </GetCommitteeReferralsByCommittee>
  </soap:Body>
</soap:Envelope>`;
}

/**
 * Parse bills from XML response
 * @param {string} xml - Response XML
 * @returns {Object[]} Array of bill objects
 */
function parseBillsResponse(xml) {
  const bills = [];

  // The response may contain LegislationInfo or CommitteeReferral elements
  // Try to match both patterns
  const patterns = [
    /<LegislationInfo>([\s\S]*?)<\/LegislationInfo>/g,
    /<CommitteeReferral>([\s\S]*?)<\/CommitteeReferral>/g,
  ];

  for (const pattern of patterns) {
    const matches = xml.matchAll(pattern);

    for (const match of matches) {
      const billXml = match[1];

      // Extract fields
      const getId = (field) => {
        const m = billXml.match(new RegExp(`<${field}>([^<]*)</${field}>`));
        return m ? m[1].trim() : null;
      };

      const billId = getId('BillId');
      const billNumber = getId('BillNumber');
      const shortDescription = getId('ShortDescription');
      const longDescription = getId('LongDescription');
      const currentStatus = getId('CurrentStatus');
      const sponsor = getId('Sponsor');
      const primeSponsorID = getId('PrimeSponsorID');
      const introducedDate = getId('IntroducedDate');
      const activeYn = getId('ActiveYn');
      const active = getId('Active');

      // Get either billId or construct from prefix/number
      const prefix = billXml.match(/<BillId>([A-Z]+)/)?.[1] || '';
      const num = billNumber || billXml.match(/<BillNumber>(\d+)/)?.[1] || '';
      const resolvedBillId = billId || (prefix && num ? `${prefix} ${num}` : null);

      if (resolvedBillId || billNumber) {
        bills.push({
          billId: resolvedBillId,
          billNumber: billNumber || num,
          shortDescription,
          longDescription: longDescription || shortDescription,
          currentStatus,
          sponsor,
          primeSponsorID,
          introducedDate,
          active: activeYn === 'true' || active === 'true',
        });
      }
    }
  }

  // Dedupe by billId
  const seen = new Set();
  return bills.filter(b => {
    const key = b.billId || b.billNumber;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Fetch bills in committee from SOAP API
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Bills and metadata
 */
async function fetchCommitteeBills(options) {
  const { biennium, agency, committeeName, includeReferrals } = options;

  const results = {
    committee: committeeName,
    agency,
    biennium,
    currentlyInCommittee: [],
    allReferrals: [],
    errors: [],
  };

  // Fetch bills currently in committee
  try {
    const envelope = buildGetInCommitteeEnvelope(biennium, agency, committeeName);
    const response = await fetch(COMMITTEE_ACTION_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://WSLWebServices.leg.wa.gov/GetInCommittee',
      },
      body: envelope,
    });

    if (!response.ok) {
      results.errors.push(`GetInCommittee HTTP ${response.status}: ${response.statusText}`);
    } else {
      const xml = await response.text();

      // Check for SOAP fault
      if (xml.includes('<soap:Fault>') || xml.includes('<faultstring>')) {
        const faultMatch = xml.match(/<faultstring>([^<]*)<\/faultstring>/);
        results.errors.push(`SOAP Fault: ${faultMatch ? faultMatch[1] : 'Unknown error'}`);
      } else {
        results.currentlyInCommittee = parseBillsResponse(xml);
      }
    }
  } catch (error) {
    results.errors.push(`GetInCommittee error: ${error.message}`);
  }

  // Optionally fetch all referrals (broader scope)
  if (includeReferrals) {
    try {
      const envelope = buildGetReferralsEnvelope(biennium, agency, committeeName);
      const response = await fetch(COMMITTEE_ACTION_SERVICE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'http://WSLWebServices.leg.wa.gov/GetCommitteeReferralsByCommittee',
        },
        body: envelope,
      });

      if (!response.ok) {
        results.errors.push(`GetReferrals HTTP ${response.status}: ${response.statusText}`);
      } else {
        const xml = await response.text();
        if (xml.includes('<soap:Fault>') || xml.includes('<faultstring>')) {
          const faultMatch = xml.match(/<faultstring>([^<]*)<\/faultstring>/);
          results.errors.push(`GetReferrals SOAP Fault: ${faultMatch ? faultMatch[1] : 'Unknown error'}`);
        } else {
          results.allReferrals = parseBillsResponse(xml);
        }
      }
    } catch (error) {
      results.errors.push(`GetReferrals error: ${error.message}`);
    }
  }

  return results;
}

/**
 * Filter bills for education relevance (for Tier 2 committees)
 * @param {Object[]} bills - Array of bill objects
 * @returns {Object[]} Bills with education-related content
 */
function filterForEducationRelevance(bills) {
  const educationKeywords = [
    'school', 'student', 'teacher', 'education', 'k-12', 'k12',
    'district', 'ospi', 'classroom', 'principal', 'paraeducator',
    'learning', 'instruction', 'academic', 'curriculum', 'diploma',
    'graduation', 'superintendent', 'school board', 'esa', 'esd',
  ];

  return bills.filter(bill => {
    const description = (bill.shortDescription || '').toLowerCase() +
      ' ' + (bill.longDescription || '').toLowerCase();
    return educationKeywords.some(kw => description.includes(kw));
  });
}

/**
 * Main entry point
 */
async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      committee: { type: 'string', short: 'c' },
      agency: { type: 'string', short: 'a' },
      biennium: { type: 'string', short: 'b', default: DEFAULT_BIENNIUM },
      referrals: { type: 'boolean', short: 'r' },
      'education-filter': { type: 'boolean', short: 'e' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`
Get Committee Bills - Fetch Bills in a WA Legislature Committee

Usage:
  bun get_committee_bills.js --committee <name> --agency <House|Senate>

Required:
  -c, --committee <name>   Exact committee name (e.g., "Education", "Appropriations")
  -a, --agency <agency>    Chamber: House or Senate

Options:
  -b, --biennium <biennium>  Legislative biennium (default: ${DEFAULT_BIENNIUM})
  -r, --referrals            Include all bills ever referred (not just currently in committee)
  -e, --education-filter     Filter results for education relevance (for non-education committees)
  -h, --help                 Show this help

Output:
  Returns JSON with bills currently in the committee and optional referral history.

Examples:
  # Tier 1: Get ALL bills in House Education Committee
  bun get_committee_bills.js --committee "Education" --agency House

  # Tier 1: Get ALL bills in Senate Early Learning & K-12 Committee
  bun get_committee_bills.js --committee "Early Learning & K-12 Education" --agency Senate

  # Tier 2: Get education-relevant bills from Appropriations
  bun get_committee_bills.js --committee "Appropriations" --agency House --education-filter

  # Include historical referrals
  bun get_committee_bills.js --committee "Education" --agency House --referrals
`);
    process.exit(0);
  }

  if (!values.committee || !values.agency) {
    console.error('Error: --committee and --agency are required. Use --help for usage.');
    process.exit(1);
  }

  const results = await fetchCommitteeBills({
    biennium: values.biennium,
    agency: values.agency,
    committeeName: values.committee,
    includeReferrals: values.referrals,
  });

  // Apply education filter if requested
  if (values['education-filter']) {
    results.currentlyInCommittee = filterForEducationRelevance(results.currentlyInCommittee);
    if (results.allReferrals.length > 0) {
      results.allReferrals = filterForEducationRelevance(results.allReferrals);
    }
    results.filtered = true;
  }

  // Add summary
  results.summary = {
    currentlyInCommittee: results.currentlyInCommittee.length,
    allReferrals: results.allReferrals.length,
    hasErrors: results.errors.length > 0,
  };

  results.generated_at = new Date().toISOString();

  console.log(JSON.stringify(results, null, 2));
}

main().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
