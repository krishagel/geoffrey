#!/usr/bin/env bun
/**
 * Get Bill Info - Single Bill Lookup
 *
 * Returns bill URL and structured prompt for WebFetch.
 * SOAP API is unreliable for current session bills - use WebFetch instead.
 *
 * Usage:
 *   bun get_bill_info.js HB 1234
 *   bun get_bill_info.js --bill "SB 5678" --year 2025
 */

import { parseArgs } from 'util';

const BILL_SUMMARY_URL = 'https://app.leg.wa.gov/billsummary';

/**
 * Parse bill ID into components
 * @param {string} billId - Bill ID like "HB 1234" or "SB5678"
 * @returns {Object} Parsed bill components
 */
function parseBillId(billId) {
  const match = billId.match(/^(E?[HS]B)\s*(\d+)$/i);
  if (!match) {
    throw new Error(`Invalid bill ID format: ${billId}. Expected format: HB 1234, SB 5678, EHB 1234, etc.`);
  }
  return {
    prefix: match[1].toUpperCase(),
    number: parseInt(match[2]),
    fullId: `${match[1].toUpperCase()} ${match[2]}`,
  };
}

/**
 * Get bill URL
 * @param {number} billNumber - Bill number
 * @param {number} year - Legislative year
 * @returns {string} Bill summary URL
 */
function getBillUrl(billNumber, year) {
  return `${BILL_SUMMARY_URL}?BillNumber=${billNumber}&Year=${year}`;
}

/**
 * Create bill lookup info for WebFetch
 * @param {string} billId - Bill ID like "SB 5956"
 * @param {number} year - Legislative year
 * @returns {Object} Bill info with WebFetch instructions
 */
function createBillLookup(billId, year) {
  const { prefix, number, fullId } = parseBillId(billId);
  const url = getBillUrl(number, year);
  const bienniumStart = year % 2 === 1 ? year : year - 1;
  const biennium = `${bienniumStart}-${(bienniumStart + 1).toString().slice(-2)}`;

  return {
    billId: fullId,
    billNumber: number.toString(),
    biennium: biennium,
    year: year,
    url: url,
    webfetch: {
      url: url,
      prompt: `Extract bill information for ${fullId}:
1. Full bill title/description
2. Current status (committee, floor, passed, etc.)
3. All sponsors (list names)
4. Latest action and date
5. Summary of what the bill does

Return as structured data.`,
    },
  };
}

/**
 * Main function
 */
async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      bill: { type: 'string', short: 'b' },
      year: { type: 'string', short: 'y', default: '2026' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`
Get Bill Info - Fetch details for a specific WA State bill

Usage:
  bun get_bill_info.js HB 1234
  bun get_bill_info.js --bill "SB 5678" --year 2025

Options:
  -b, --bill    Bill ID (e.g., "HB 1234")
  -y, --year    Legislative year (default: 2026)
  -h, --help    Show this help message

Output:
  Returns JSON with bill URL and WebFetch instructions.
  Use the webfetch.url and webfetch.prompt with WebFetch tool.

Examples:
  bun get_bill_info.js HB 2551 --year 2025
  bun get_bill_info.js "SB 6247" --year 2025
`);
    process.exit(0);
  }

  // Get bill ID from args or option
  let billIdInput = values.bill || positionals.join(' ');
  if (!billIdInput) {
    console.error('Error: Bill ID required. Use --help for usage.');
    process.exit(1);
  }

  const year = parseInt(values.year);
  const lookup = createBillLookup(billIdInput, year);

  console.log(JSON.stringify(lookup, null, 2));
}

main().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
