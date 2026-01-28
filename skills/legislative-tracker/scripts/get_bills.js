#!/usr/bin/env bun
/**
 * Get Bills - Legislative Tracker Committee-Based Discovery
 *
 * Orchestrates committee-based bill discovery to find ALL K-12 education bills.
 * Uses SOAP API to query committees directly rather than keyword searching.
 *
 * Strategy:
 *   Tier 1: Get ALL bills from education committees (confirmed education bills)
 *   Tier 2: Get ALL bills from finance committees (candidates - need WebFetch to filter)
 *   Tier 3: WebSearch fallback if SOAP fails
 *
 * Usage:
 *   bun get_bills.js                  # Full discovery
 *   bun get_bills.js --tier 1         # Education committees only
 *   bun get_bills.js --format briefing # Morning briefing JSON
 */

import { parseArgs } from 'util';
import * as yaml from 'yaml';
import { existsSync } from 'fs';
import { join, dirname } from 'path';

// Get script directory for config path
const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const DEFAULT_CONFIG_PATH = join(SCRIPT_DIR, '..', 'config', 'topics.yaml');

// SOAP endpoints
const COMMITTEE_ACTION_SERVICE_URL = 'https://wslwebservices.leg.wa.gov/CommitteeActionService.asmx';

// Known education and finance committees
// These are validated committee names from the WA Legislature
const TIER_1_COMMITTEES = [
  { name: 'Education', agency: 'House' },
  { name: 'Early Learning & K-12 Education', agency: 'Senate' },
];

const TIER_2_COMMITTEES = [
  { name: 'Appropriations', agency: 'House' },
  { name: 'Capital Budget', agency: 'House' },
  { name: 'Labor & Workplace Standards', agency: 'House' },
  { name: 'Ways & Means', agency: 'Senate' },
  { name: 'Labor & Commerce', agency: 'Senate' },
  { name: 'State Government, Tribal Affairs & Elections', agency: 'Senate' },
];

const DEFAULT_BIENNIUM = '2025-26';

// Education relevance keywords for Tier 2 filtering (used by Geoffrey, not this script)
const EDUCATION_KEYWORDS = [
  'school', 'student', 'teacher', 'education', 'k-12', 'k12',
  'district', 'ospi', 'classroom', 'principal', 'paraeducator',
  'learning', 'instruction', 'academic', 'curriculum', 'diploma',
  'graduation', 'superintendent', 'school board', 'esa', 'esd',
  'levy', 'bond', 'capital', 'school construction',
];

/**
 * Load configuration from YAML file
 */
async function loadConfig(configPath) {
  if (!existsSync(configPath)) {
    return getDefaultConfig();
  }
  const configText = await Bun.file(configPath).text();
  return yaml.parse(configText);
}

/**
 * Get default configuration
 */
function getDefaultConfig() {
  return {
    search: {
      session: { biennium: DEFAULT_BIENNIUM, year: 2025 },
    },
    district: {
      name: 'Peninsula School District',
      legislators: [],
    },
  };
}

/**
 * Escape XML special characters
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
 * Parse bills from SOAP XML response
 */
function parseBillsResponse(xml) {
  const bills = [];
  const pattern = /<LegislationInfo>([\s\S]*?)<\/LegislationInfo>/g;
  const matches = xml.matchAll(pattern);

  for (const match of matches) {
    const billXml = match[1];
    const getId = (field) => {
      const m = billXml.match(new RegExp(`<${field}>([^<]*)</${field}>`));
      return m ? m[1].trim() : null;
    };

    const billId = getId('BillId');
    const billNumber = getId('BillNumber');

    if (billId || billNumber) {
      bills.push({
        billId,
        billNumber,
      });
    }
  }

  return bills;
}

/**
 * Fetch bills in a committee via SOAP
 */
async function fetchCommitteeBills(biennium, agency, committeeName) {
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
      return { bills: [], error: `HTTP ${response.status}` };
    }

    const xml = await response.text();
    if (xml.includes('<soap:Fault>') || xml.includes('<faultstring>')) {
      const faultMatch = xml.match(/<faultstring>([^<]*)<\/faultstring>/);
      return { bills: [], error: faultMatch ? faultMatch[1] : 'SOAP Fault' };
    }

    return { bills: parseBillsResponse(xml), error: null };
  } catch (error) {
    return { bills: [], error: error.message };
  }
}

/**
 * Deduplicate bills by billId, tracking source tier
 */
function dedupeBills(tier1Bills, tier2Bills) {
  const seen = new Set();
  const confirmed = [];
  const candidates = [];

  // Tier 1 bills are confirmed education bills
  for (const bill of tier1Bills) {
    const key = bill.billId || bill.billNumber;
    if (!seen.has(key)) {
      seen.add(key);
      confirmed.push(bill);
    }
  }

  // Tier 2 bills that aren't already in Tier 1 are candidates
  for (const bill of tier2Bills) {
    const key = bill.billId || bill.billNumber;
    if (!seen.has(key)) {
      seen.add(key);
      candidates.push(bill);
    }
  }

  return { confirmed, candidates };
}

/**
 * Build WebSearch fallback queries
 */
function buildFallbackQueries(biennium) {
  return [
    `site:leg.wa.gov "referred to Education" ${biennium}`,
    `site:leg.wa.gov "Early Learning & K-12" ${biennium}`,
    `site:leg.wa.gov K-12 school district bill ${biennium.split('-')[0]}`,
  ];
}

/**
 * Create analysis framework for Geoffrey
 */
function getAnalysisFramework(config) {
  return {
    priority_levels: {
      high: {
        symbol: '🔴',
        criteria: [
          'Direct fiscal impact >$100K',
          'Immediate deadline (<7 days)',
          'New mandates affecting operations',
          'Sponsored by district legislator',
        ],
      },
      medium: {
        symbol: '🟡',
        criteria: [
          'Moderate impact',
          'Compliance changes',
          'Deadline within 30 days',
        ],
      },
      low: {
        symbol: '🟢',
        criteria: [
          'Minimal direct impact',
          'Monitoring only',
          'Distant timeline',
        ],
      },
    },
    impact_categories: {
      fiscal: ['levy', 'bond', 'funding', 'appropriation', 'budget'],
      operational: ['procurement', 'transportation', 'facilities', 'food', 'contracts'],
      workforce: ['staff', 'salary', 'certification', 'benefits', 'teacher'],
      governance: ['reporting', 'accountability', 'board', 'compliance'],
    },
    fiscal_indicators: {
      cost_increase: { symbol: '⬆️', keywords: ['increase', 'additional', 'mandate', 'require'] },
      cost_decrease: { symbol: '⬇️', keywords: ['reduce', 'savings', 'efficiency', 'eliminate'] },
      risk: { symbol: '⚠️', keywords: ['liability', 'penalty', 'fine', 'violation'] },
      neutral: { symbol: '➡️', keywords: [] },
    },
    district_legislators: config.district?.legislators || [],
  };
}

/**
 * Main entry point
 */
async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      tier: { type: 'string', short: 't', default: 'all' },
      format: { type: 'string', short: 'f', default: 'full' },
      biennium: { type: 'string', short: 'b', default: DEFAULT_BIENNIUM },
      config: { type: 'string', short: 'c', default: DEFAULT_CONFIG_PATH },
      output: { type: 'string', short: 'o' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`
Legislative Tracker - Committee-Based Bill Discovery

This script queries WA Legislature committees via SOAP to discover ALL K-12
education bills - no keyword filtering that might miss bills.

Usage:
  bun get_bills.js [options]

Options:
  -t, --tier <tier>       Discovery tier: 1, 2, all (default: all)
                          1 = Education committees only (confirmed bills)
                          2 = Finance committees only (candidates needing WebFetch)
                          all = Both tiers
  -f, --format <format>   Output format: full, briefing (default: full)
  -b, --biennium <biennium>  Legislative biennium (default: ${DEFAULT_BIENNIUM})
  -c, --config <path>     Path to topics.yaml config
  -o, --output <path>     Output file path (default: stdout)
  -h, --help              Show this help

Discovery Strategy:
  Tier 1: Query House Education + Senate Early Learning & K-12 Education
          Gets ALL bills - CONFIRMED education bills (no WebFetch filtering needed)

  Tier 2: Query Appropriations, Capital Budget, Ways & Means, etc.
          Gets ALL bills as CANDIDATES - Geoffrey must WebFetch each to check
          if description contains education keywords

  Tier 3: WebSearch fallback if SOAP API fails

Output:
  Returns JSON with:
  - confirmed_bills: From Tier 1 education committees (definitely education-related)
  - tier2_candidates: From Tier 2 finance committees (need WebFetch to filter)
  - Instructions for Geoffrey to process candidates

Examples:
  bun get_bills.js                          # Full discovery
  bun get_bills.js --tier 1                 # Education committees only
  bun get_bills.js --format briefing        # Morning briefing format
`);
    process.exit(0);
  }

  const config = await loadConfig(values.config);
  const biennium = values.biennium;
  const year = parseInt(biennium.split('-')[0]);

  // Collect bills by tier
  const tier1Bills = [];
  const tier2Bills = [];
  const errors = [];
  const committeeResults = [];

  // Tier 1: Education committees (confirmed education bills)
  if (values.tier === 'all' || values.tier === '1') {
    for (const committee of TIER_1_COMMITTEES) {
      const result = await fetchCommitteeBills(biennium, committee.agency, committee.name);
      committeeResults.push({
        committee: committee.name,
        agency: committee.agency,
        tier: 1,
        billCount: result.bills.length,
        error: result.error,
      });

      if (result.error) {
        errors.push(`${committee.agency} ${committee.name}: ${result.error}`);
      } else {
        tier1Bills.push(...result.bills);
      }
    }
  }

  // Tier 2: Finance committees (candidates needing WebFetch)
  if (values.tier === 'all' || values.tier === '2') {
    for (const committee of TIER_2_COMMITTEES) {
      const result = await fetchCommitteeBills(biennium, committee.agency, committee.name);
      committeeResults.push({
        committee: committee.name,
        agency: committee.agency,
        tier: 2,
        billCount: result.bills.length,
        error: result.error,
      });

      if (result.error) {
        errors.push(`${committee.agency} ${committee.name}: ${result.error}`);
      } else {
        tier2Bills.push(...result.bills);
      }
    }
  }

  // Dedupe: Tier 1 = confirmed, Tier 2 = candidates (excluding those in Tier 1)
  const { confirmed, candidates } = dedupeBills(tier1Bills, tier2Bills);

  // Build output
  const output = {
    metadata: {
      generated_at: new Date().toISOString(),
      biennium,
      year,
      tiers_queried: values.tier === 'all' ? [1, 2] : [parseInt(values.tier)],
      requested_format: values.format,
    },
    discovery: {
      committees_queried: committeeResults,
      tier1_confirmed: confirmed.length,
      tier2_candidates: candidates.length,
      errors: errors,
    },
    // Tier 1: Confirmed education bills (from education committees)
    confirmed_bills: confirmed,
    // Tier 2: Candidates that need WebFetch to determine education relevance
    tier2_candidates: candidates,
    // Keywords for filtering Tier 2 candidates
    education_keywords: EDUCATION_KEYWORDS,
    webfetch_instructions: {
      url_pattern: `https://app.leg.wa.gov/billsummary?BillNumber={NUMBER}&Year=${year}`,
      prompt: `Extract bill information:
1. Full bill title/description
2. Current status (committee, floor, passed, etc.)
3. All sponsors (list names)
4. Latest action and date
5. Summary of what the bill does

Return as structured data.`,
    },
    tier2_filtering_instructions: `
TIER 2 CANDIDATE FILTERING
==========================

The tier2_candidates array contains ${candidates.length} bills from finance/labor committees
that MAY be education-related. To filter them:

1. For each bill in tier2_candidates:
   - WebFetch: https://app.leg.wa.gov/billsummary?BillNumber={NUMBER}&Year=${year}
   - Check if title or description contains any education keywords:
     ${EDUCATION_KEYWORDS.join(', ')}

2. If education-relevant, add to your tracked bills list

3. Apply the analysis_framework to categorize

Note: This is optional but catches indirect-impact bills like budget amendments
or labor laws affecting school employees.
`,
    analysis_framework: getAnalysisFramework(config),
    fallback_queries: errors.length > 0 ? buildFallbackQueries(biennium) : [],
    instructions: `
LEGISLATIVE TRACKER DISCOVERY RESULTS
=====================================

CONFIRMED EDUCATION BILLS (Tier 1): ${confirmed.length}
These are from House Education and Senate Early Learning & K-12 Education committees.
They are definitely education-related. WebFetch each for full details and analysis.

${confirmed.length > 0 ? confirmed.map(b => `- ${b.billId}`).join('\n') : '(none)'}

TIER 2 CANDIDATES: ${candidates.length}
These are from Appropriations, Ways & Means, Capital Budget, Labor committees.
WebFetch each to check if description contains education keywords.
If relevant, add to tracked bills.

${candidates.length > 0 ? `First 20: ${candidates.slice(0, 20).map(b => b.billId).join(', ')}${candidates.length > 20 ? '...' : ''}` : '(none)'}

NEXT STEPS:
1. WebFetch each confirmed_bill for full details
2. WebFetch tier2_candidates and filter for education relevance
3. Apply analysis_framework to categorize all bills
4. Generate report in ${values.format} format
`,
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
