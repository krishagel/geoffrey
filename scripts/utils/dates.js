#!/usr/bin/env bun
/**
 * Date Utilities - Geoffrey Shared Module
 *
 * CRITICAL: JavaScript's new Date("2026-01-27") interprets as midnight UTC,
 * which causes timezone bugs (e.g., becomes Jan 26 at 4pm in Pacific time).
 *
 * ALWAYS use these functions for date parsing and formatting:
 * - parseLocalDate("2026-01-27") - Parses as LOCAL midnight
 * - formatLocalDate(date) - Formats as "YYYY-MM-DD" in LOCAL time
 * - parseDateArg(arg) - Smart parser for CLI args (handles relative terms too)
 */

/**
 * Parse a YYYY-MM-DD string as LOCAL time (not UTC)
 *
 * JavaScript's new Date("2026-01-27") interprets as midnight UTC, which is
 * 4-5pm the PREVIOUS day in Pacific time. This function parses as local midnight.
 *
 * @param {string|Date} input - "YYYY-MM-DD" string or Date object
 * @returns {Date} Date object at local midnight
 */
export function parseLocalDate(input) {
  if (input instanceof Date) {
    return input;
  }

  if (typeof input !== 'string') {
    throw new Error(`parseLocalDate expects string or Date, got ${typeof input}`);
  }

  // Handle ISO strings with time component (already has timezone info)
  if (input.includes('T')) {
    return new Date(input);
  }

  // Parse YYYY-MM-DD as local time by splitting components
  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid date format: "${input}". Expected YYYY-MM-DD`);
  }

  const [, year, month, day] = match.map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
}

/**
 * Format a Date as "YYYY-MM-DD" in LOCAL time (not UTC)
 *
 * JavaScript's toISOString() returns UTC, which can shift the date.
 * This function formats in the local timezone.
 *
 * @param {Date} date - Date object to format
 * @returns {string} "YYYY-MM-DD" in local time
 */
export function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a CLI date argument with support for relative terms
 *
 * Supports:
 * - "YYYY-MM-DD" - Specific date
 * - "today" - Current date
 * - "yesterday" - Previous day
 * - "last monday", "last tuesday", etc. - Most recent weekday
 *
 * @param {string} arg - Date argument from CLI
 * @returns {Date} Parsed date at local midnight
 */
export function parseDateArg(arg) {
  if (!arg) {
    return new Date();
  }

  const normalized = arg.toLowerCase().trim();

  // Handle relative terms
  if (normalized === 'today') {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  if (normalized === 'yesterday') {
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    return yesterday;
  }

  // Handle "last monday", "last friday", etc.
  const dayMatch = normalized.match(/^last\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/);
  if (dayMatch) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = dayNames.indexOf(dayMatch[1]);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentDay = today.getDay();

    // Calculate days to go back
    let daysBack = currentDay - targetDay;
    if (daysBack <= 0) {
      daysBack += 7; // Go to previous week
    }

    const result = new Date(today);
    result.setDate(result.getDate() - daysBack);
    return result;
  }

  // Handle YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return parseLocalDate(normalized);
  }

  // Fallback: try native parsing (risky but sometimes needed)
  const parsed = new Date(arg);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Cannot parse date: "${arg}"`);
  }
  return parsed;
}

/**
 * Get the day of week name for a date
 *
 * @param {Date} date - Date object
 * @returns {string} Day name (e.g., "Monday")
 */
export function getDayOfWeek(date) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 *
 * @param {Date} date - Date object
 * @returns {boolean} True if weekend
 */
export function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// Default export for convenience
export default {
  parseLocalDate,
  formatLocalDate,
  parseDateArg,
  getDayOfWeek,
  isWeekend,
};
