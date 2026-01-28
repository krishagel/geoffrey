#!/usr/bin/env bun
/**
 * Get Recent Bill Activity - Legislative Tracker
 *
 * Returns confirmed education bills with instructions for Geoffrey to check
 * which had activity since the last business day. On Mondays, this includes
 * all weekend activity.
 *
 * Usage:
 *   bun get_recent_bill_activity.js --last-business-day  # Default, checks since last biz day
 *   bun get_recent_bill_activity.js --since 2026-01-24   # Check since specific date
 */

import { parseArgs } from 'util';
import { join, dirname } from 'path';

// Get script directory
const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const GET_BILLS_PATH = join(SCRIPT_DIR, 'get_bills.js');
const GET_LAST_BIZ_DAY_PATH = join(SCRIPT_DIR, '..', '..', 'morning-briefing', 'scripts', 'get_last_business_day.js');

const DEFAULT_BIENNIUM = '2025-26';

/**
 * Format date as YYYY-MM-DD in LOCAL time (not UTC)
 * NEVER use toISOString() - it returns UTC which causes off-by-one bugs
 */
function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse YYYY-MM-DD as LOCAL time (not UTC)
 * NEVER use new Date("YYYY-MM-DD") - it parses as midnight UTC
 */
function parseLocalDate(str) {
  const [year, month, day] = str.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
}

/**
 * Get day of week name
 */
function getDayOfWeek(date) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

/**
 * Get last business day info by running the morning-briefing script
 */
async function getLastBusinessDay() {
  const proc = Bun.spawn(['bun', GET_LAST_BIZ_DAY_PATH], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const output = await new Response(proc.stdout).text();
  await proc.exited;

  if (proc.exitCode !== 0) {
    throw new Error('Failed to get last business day');
  }

  return JSON.parse(output);
}

/**
 * Get confirmed education bills from get_bills.js --tier 1
 */
async function getConfirmedBills() {
  const proc = Bun.spawn(['bun', GET_BILLS_PATH, '--tier', '1'], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const output = await new Response(proc.stdout).text();
  await proc.exited;

  if (proc.exitCode !== 0) {
    throw new Error('Failed to get bills');
  }

  return JSON.parse(output);
}

/**
 * Main entry point
 */
async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      since: { type: 'string', short: 's' },
      'last-business-day': { type: 'boolean', short: 'l', default: true },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: false,
  });

  if (values.help) {
    console.log(`
Get Recent Bill Activity - Legislative Tracker

Returns confirmed K-12 education bills with instructions for checking activity
since the last business day. On Mondays, this includes all weekend activity.

Usage:
  bun get_recent_bill_activity.js [options]

Options:
  -l, --last-business-day   Use last business day (default)
  -s, --since <date>        Specific start date (YYYY-MM-DD)
  -h, --help                Show this help

Output:
  Returns JSON with:
  - lookback_start: First date to check for activity
  - lookback_end: Today's date
  - is_monday: Whether today is Monday (includes weekend activity)
  - bills_to_check: Array of bill IDs from education committees
  - webfetch_instructions: How to check each bill for activity

Example:
  bun get_recent_bill_activity.js --last-business-day

  On Monday 2026-01-27:
    lookback_start: 2026-01-24 (Friday)
    This catches any bills with hearings, votes, or readings over the weekend.
`);
    process.exit(0);
  }

  const today = new Date();
  const todayStr = formatLocalDate(today);
  const todayDayOfWeek = getDayOfWeek(today);
  const isMonday = today.getDay() === 1;

  // Determine lookback date
  let lookbackStart;
  let lookbackDayOfWeek;

  if (values.since) {
    lookbackStart = values.since;
    const d = parseLocalDate(values.since);
    lookbackDayOfWeek = getDayOfWeek(d);
  } else {
    const bizDayInfo = await getLastBusinessDay();
    lookbackStart = bizDayInfo.date;
    lookbackDayOfWeek = bizDayInfo.dayOfWeek;
  }

  // Get confirmed education bills
  const billsData = await getConfirmedBills();
  const confirmedBills = billsData.confirmed_bills || [];

  // Extract bill IDs for checking
  const billIds = confirmedBills.map(b => b.billId || b.billNumber);

  // Build output
  const output = {
    metadata: {
      generated_at: new Date().toISOString(),
      today: todayStr,
      today_day_of_week: todayDayOfWeek,
    },
    lookback: {
      start_date: lookbackStart,
      start_day_of_week: lookbackDayOfWeek,
      end_date: todayStr,
      is_monday: isMonday,
      note: isMonday
        ? 'Monday lookback includes Friday + weekend activity'
        : `Checking activity since ${lookbackDayOfWeek}`,
    },
    bills_to_check: {
      count: billIds.length,
      source: 'Education committees (House Education + Senate Early Learning & K-12)',
      bill_ids: billIds,
    },
    webfetch_instructions: {
      url_pattern: 'https://app.leg.wa.gov/billsummary?BillNumber={NUMBER}&Year=2025',
      prompt: `Extract from this bill page:
1. Bill number and short title
2. Latest action (what happened)
3. Latest action date (YYYY-MM-DD format)
4. Current status (committee, floor, passed, etc.)
5. Brief summary (what the bill does, 1-2 sentences)

Return as JSON with fields: bill_number, title, latest_action, latest_action_date, status, summary`,
      filter_rule: `Keep bills where latest_action_date >= "${lookbackStart}"`,
    },
    priority_framework: {
      high: {
        symbol: '🔴',
        criteria: [
          'Direct fiscal impact on district operations',
          'New mandates or compliance requirements',
          'Hearing scheduled within 7 days',
          'Passed committee or floor vote',
        ],
      },
      medium: {
        symbol: '🟡',
        criteria: [
          'First reading or introduction',
          'Referred to committee',
          'Moderate district impact',
        ],
      },
      low: {
        symbol: '🟢',
        criteria: [
          'Study or task force creation',
          'Reporting requirements only',
          'Minimal direct impact',
        ],
      },
    },
    instructions: `
LEGISLATIVE ACTIVITY CHECK
===========================

Check ${billIds.length} confirmed education bills for activity since ${lookbackStart}.

WORKFLOW:
1. WebFetch each bill URL (can batch 5-6 in parallel)
2. Extract latest action date from each bill page
3. Filter: Keep only bills where latest_action_date >= ${lookbackStart}
4. Apply priority_framework to categorize each active bill
5. Format for morning briefing

PARALLEL WEBFETCH BATCHES:
${billIds.slice(0, 20).map((id, i) => {
  const num = id.replace(/[^\d]/g, '');
  return `  ${i + 1}. https://app.leg.wa.gov/billsummary?BillNumber=${num}&Year=2025`;
}).join('\n')}
${billIds.length > 20 ? `  ... and ${billIds.length - 20} more bills` : ''}

OUTPUT FORMAT for Morning Briefing:
## Legislative Activity (${lookbackStart} - ${todayStr})

### 🔴 HIGH Priority
- [Bill ID] - [Title]: [Action] (date)
  Summary: [What it does]

### 🟡 MEDIUM Priority
- [Bill ID] - [Title]: [Action] (date)

### 🟢 LOW Priority
- [Bill ID]: [Action type]

*No activity* - if no bills moved since ${lookbackStart}
`,
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
