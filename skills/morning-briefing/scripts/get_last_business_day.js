#!/usr/bin/env bun

/**
 * Get Last Business Day
 *
 * Calculates the last business day before the current date,
 * considering weekends and US federal holidays.
 *
 * Usage: bun get_last_business_day.js [reference_date]
 *
 * Returns: JSON with last business day date and info
 */

// US Federal Holidays (observed dates for 2025-2026)
const FEDERAL_HOLIDAYS_2025 = [
  '2025-01-01', // New Year's Day
  '2025-01-20', // MLK Jr. Day
  '2025-02-17', // Presidents' Day
  '2025-05-26', // Memorial Day
  '2025-06-19', // Juneteenth
  '2025-07-04', // Independence Day
  '2025-09-01', // Labor Day
  '2025-10-13', // Columbus Day
  '2025-11-11', // Veterans Day
  '2025-11-27', // Thanksgiving
  '2025-12-25', // Christmas
];

const FEDERAL_HOLIDAYS_2026 = [
  '2026-01-01', // New Year's Day
  '2026-01-19', // MLK Jr. Day
  '2026-02-16', // Presidents' Day
  '2026-05-25', // Memorial Day
  '2026-06-19', // Juneteenth
  '2026-07-03', // Independence Day (observed)
  '2026-09-07', // Labor Day
  '2026-10-12', // Columbus Day
  '2026-11-11', // Veterans Day
  '2026-11-26', // Thanksgiving
  '2026-12-25', // Christmas
];

const ALL_HOLIDAYS = new Set([...FEDERAL_HOLIDAYS_2025, ...FEDERAL_HOLIDAYS_2026]);

/**
 * Format date as YYYY-MM-DD in LOCAL time (not UTC)
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse date string as LOCAL time (not UTC)
 * Accepts: "2026-01-27" or Date object
 */
function parseLocalDate(input) {
  if (input instanceof Date) {
    return input;
  }
  // Parse YYYY-MM-DD as local time by splitting components
  const [year, month, day] = input.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

function isHoliday(date) {
  return ALL_HOLIDAYS.has(formatDate(date));
}

function isBusinessDay(date) {
  return !isWeekend(date) && !isHoliday(date);
}

function getLastBusinessDay(referenceDate = new Date()) {
  const ref = referenceDate instanceof Date ? new Date(referenceDate) : parseLocalDate(referenceDate);
  ref.setHours(0, 0, 0, 0);

  // Start from the day before reference
  const candidate = new Date(ref);
  candidate.setDate(candidate.getDate() - 1);

  // Keep going back until we find a business day
  let daysBack = 1;
  while (!isBusinessDay(candidate) && daysBack < 30) {
    candidate.setDate(candidate.getDate() - 1);
    daysBack++;
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return {
    date: formatDate(candidate),
    dayOfWeek: dayNames[candidate.getDay()],
    daysAgo: daysBack,
    isHoliday: ALL_HOLIDAYS.has(formatDate(candidate)),
    skipped: {
      weekendDays: daysBack > 1 ? daysBack - 1 : 0,
      holidays: daysBack > 1
    },
    referenceDate: formatDate(ref)
  };
}

// CLI
const referenceArg = process.argv[2];
const referenceDate = referenceArg ? parseLocalDate(referenceArg) : new Date();

const result = getLastBusinessDay(referenceDate);
console.log(JSON.stringify(result, null, 2));
