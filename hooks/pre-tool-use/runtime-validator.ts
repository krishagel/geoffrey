#!/usr/bin/env bun
/**
 * PreToolUse Hook: Runtime Validator
 *
 * Blocks incorrect runtimes (node/npm/npx/python/python3) and suggests
 * the correct alternatives (bun/bunx/uv run).
 *
 * Only triggers on Bash tool calls. Splits compound commands and checks
 * each segment independently. Strips quoted strings to avoid false positives.
 *
 * Exit codes:
 * - 0: Safe to proceed
 * - 2: Block (wrong runtime detected)
 */

import { resolve, dirname } from 'path';
import { readFileSync } from 'fs';
import {
  parseStdin,
  logError,
  exitSuccess,
  exitBlock,
  type PreToolUseInput,
} from '../shared/utils';

// ============================================================================
// Types
// ============================================================================

interface RuntimeRule {
  id: string;
  pattern: string;
  replacement: string;
  message: string;
  exceptions?: string[];
}

interface RuntimeRulesConfig {
  version: string;
  rules: RuntimeRule[];
}

interface Violation {
  ruleId: string;
  message: string;
  replacement: string;
}

// ============================================================================
// Core Functions (exported for testing)
// ============================================================================

/**
 * Split a compound command into segments on &&, ||, ;
 * Respects quoted strings — doesn't split inside them.
 */
export function splitCommandSegments(command: string): string[] {
  const segments: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let i = 0;

  while (i < command.length) {
    const ch = command[i];
    const next = command[i + 1];

    // Handle escape sequences
    if (ch === '\\' && i + 1 < command.length) {
      current += ch + next;
      i += 2;
      continue;
    }

    // Track quote state
    if (ch === "'" && !inDouble && !inBacktick) {
      inSingle = !inSingle;
      current += ch;
      i++;
      continue;
    }
    if (ch === '"' && !inSingle && !inBacktick) {
      inDouble = !inDouble;
      current += ch;
      i++;
      continue;
    }
    if (ch === '`' && !inSingle && !inDouble) {
      inBacktick = !inBacktick;
      current += ch;
      i++;
      continue;
    }

    // Only split when not inside quotes
    if (!inSingle && !inDouble && !inBacktick) {
      // && or ||
      if ((ch === '&' && next === '&') || (ch === '|' && next === '|')) {
        segments.push(current);
        current = '';
        i += 2;
        continue;
      }
      // ;
      if (ch === ';') {
        segments.push(current);
        current = '';
        i++;
        continue;
      }
    }

    current += ch;
    i++;
  }

  if (current.trim()) {
    segments.push(current);
  }

  return segments.map(s => s.trim()).filter(s => s.length > 0);
}

/**
 * Strip quoted strings from a command segment to avoid false positives.
 * Replaces content in single quotes, double quotes, and backticks with empty string.
 */
export function stripQuotedStrings(segment: string): string {
  let result = '';
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;

  while (i < segment.length) {
    const ch = segment[i];

    // Handle escape sequences inside double quotes
    if (ch === '\\' && inDouble && i + 1 < segment.length) {
      i += 2;
      continue;
    }

    if (ch === "'" && !inDouble && !inBacktick) {
      inSingle = !inSingle;
      i++;
      continue;
    }
    if (ch === '"' && !inSingle && !inBacktick) {
      inDouble = !inDouble;
      i++;
      continue;
    }
    if (ch === '`' && !inSingle && !inDouble) {
      inBacktick = !inBacktick;
      i++;
      continue;
    }

    if (!inSingle && !inDouble && !inBacktick) {
      result += ch;
    }

    i++;
  }

  return result;
}

/**
 * Check if a segment matches any exception pattern for a rule.
 */
export function isException(segment: string, exceptions?: string[]): boolean {
  if (!exceptions || exceptions.length === 0) return false;

  const trimmed = segment.trim();
  for (const exc of exceptions) {
    // Check if the exception flag appears right after the command
    // e.g., "node -v" or "node --version" or "python3 -V"
    if (trimmed.includes(exc)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a segment starts with a comment
 */
function isComment(segment: string): boolean {
  return segment.trim().startsWith('#');
}

/**
 * Check a single command segment against all rules.
 * Returns the first violation found, or null if clean.
 */
export function checkSegment(segment: string, rules: RuntimeRule[]): Violation | null {
  if (isComment(segment)) return null;

  const stripped = stripQuotedStrings(segment);

  for (const rule of rules) {
    const regex = new RegExp(rule.pattern);
    if (regex.test(stripped)) {
      // Check exceptions against the original segment (not stripped)
      if (isException(segment, rule.exceptions)) {
        continue;
      }
      return {
        ruleId: rule.id,
        message: rule.message,
        replacement: rule.replacement,
      };
    }
  }

  return null;
}

/**
 * Load rules from the JSON config file.
 */
export function loadRules(): RuntimeRulesConfig {
  const rulesPath = resolve(dirname(import.meta.path), 'runtime-rules.json');
  const content = readFileSync(rulesPath, 'utf-8');
  return JSON.parse(content);
}

// ============================================================================
// Main Hook Logic
// ============================================================================

async function main(): Promise<void> {
  try {
    const input = await parseStdin<PreToolUseInput>();

    // Only check Bash commands
    if (input.tool_name !== 'Bash') {
      exitSuccess();
    }

    const command = input.tool_input?.command;
    if (typeof command !== 'string' || !command.trim()) {
      exitSuccess();
    }

    const config = loadRules();
    const segments = splitCommandSegments(command);

    for (const segment of segments) {
      const violation = checkSegment(segment, config.rules);
      if (violation) {
        exitBlock(
          `Wrong runtime detected: ${violation.message}\n` +
          `Use \`${violation.replacement}\` instead.\n` +
          `Command segment: ${segment.trim()}`
        );
      }
    }

    exitSuccess();
  } catch (e) {
    // Fail open on hook errors
    logError(`Runtime validator error: ${e instanceof Error ? e.message : 'unknown error'}`);
    exitSuccess();
  }
}

// Only run main when executed directly (not imported for testing)
if (import.meta.main) {
  main();
}
