#!/usr/bin/env bun
/**
 * PreToolUse Hook: Security Validator
 *
 * Validates tool inputs for credential exposure before Write/Edit/Bash operations.
 * Uses tiered pattern matching with exception handling for false positives.
 *
 * Exit codes:
 * - 0: Safe to proceed
 * - 1: Warning (logged but continues)
 * - 2: Block (operation prevented)
 */

import { resolve, dirname } from 'path';
import { readFileSync } from 'fs';
import {
  parseStdin,
  logError,
  logInfo,
  exitSuccess,
  exitWarning,
  exitBlock,
  type PreToolUseInput,
} from '../shared/utils';

// ============================================================================
// Types
// ============================================================================

interface CredentialPattern {
  id: string;
  tier: 1 | 2 | 3;
  pattern: string;
  action: 'block' | 'warn';
  description: string;
  falsePositiveRisk: 'low' | 'medium' | 'high';
}

interface ExceptionPattern {
  id: string;
  pattern: string;
  description: string;
}

interface PatternsConfig {
  version: string;
  patterns: CredentialPattern[];
  exceptions: ExceptionPattern[];
}

interface Detection {
  patternId: string;
  description: string;
  action: 'block' | 'warn';
  match: string;
  tier: number;
}

// ============================================================================
// Configuration
// ============================================================================

const MONITORED_TOOLS = ['Write', 'Edit', 'Bash', 'NotebookEdit'];

// Load patterns from JSON config
function loadPatterns(): PatternsConfig {
  const patternsPath = resolve(dirname(import.meta.path), 'patterns.json');
  const content = readFileSync(patternsPath, 'utf-8');
  return JSON.parse(content);
}

// ============================================================================
// Content Extraction
// ============================================================================

/**
 * Extract content to scan from tool input based on tool type
 */
function extractContent(toolName: string, toolInput: Record<string, unknown>): string {
  const parts: string[] = [];

  switch (toolName) {
    case 'Write':
      if (typeof toolInput.content === 'string') parts.push(toolInput.content);
      if (typeof toolInput.file_path === 'string') parts.push(toolInput.file_path);
      break;

    case 'Edit':
      if (typeof toolInput.old_string === 'string') parts.push(toolInput.old_string);
      if (typeof toolInput.new_string === 'string') parts.push(toolInput.new_string);
      if (typeof toolInput.file_path === 'string') parts.push(toolInput.file_path);
      break;

    case 'Bash':
      if (typeof toolInput.command === 'string') parts.push(toolInput.command);
      break;

    case 'NotebookEdit':
      if (typeof toolInput.new_source === 'string') parts.push(toolInput.new_source);
      break;

    default:
      // Unknown tool - scan all string values
      for (const value of Object.values(toolInput)) {
        if (typeof value === 'string') parts.push(value);
      }
  }

  return parts.join('\n');
}

// ============================================================================
// Detection Logic
// ============================================================================

/**
 * Check if a match is a false positive based on exception patterns
 */
function isException(match: string, context: string, exceptions: ExceptionPattern[]): boolean {
  // Check surrounding context (50 chars before and after)
  const matchIndex = context.indexOf(match);
  const start = Math.max(0, matchIndex - 50);
  const end = Math.min(context.length, matchIndex + match.length + 50);
  const surroundingContext = context.substring(start, end);

  for (const exception of exceptions) {
    const regex = new RegExp(exception.pattern, 'i');
    if (regex.test(surroundingContext) || regex.test(match)) {
      return true;
    }
  }

  return false;
}

/**
 * Detect credentials in content using pattern matching
 */
function detectCredentials(content: string, config: PatternsConfig): Detection[] {
  const detections: Detection[] = [];

  for (const pattern of config.patterns) {
    try {
      const regex = new RegExp(pattern.pattern, 'gi');
      let match: RegExpExecArray | null;

      while ((match = regex.exec(content)) !== null) {
        const matchValue = match[0];

        // Check if this is a false positive
        if (isException(matchValue, content, config.exceptions)) {
          continue;
        }

        // Truncate long matches for logging
        const truncatedMatch =
          matchValue.length > 30 ? matchValue.substring(0, 30) + '...' : matchValue;

        detections.push({
          patternId: pattern.id,
          description: pattern.description,
          action: pattern.action,
          match: truncatedMatch,
          tier: pattern.tier,
        });

        // Only report first match per pattern to avoid spam
        break;
      }
    } catch (e) {
      logError(`Invalid pattern ${pattern.id}: ${e}`);
    }
  }

  // Sort by tier (most severe first)
  return detections.sort((a, b) => a.tier - b.tier);
}

// ============================================================================
// Main Hook Logic
// ============================================================================

async function main(): Promise<void> {
  try {
    // Parse stdin
    const input = await parseStdin<PreToolUseInput>();

    // Skip non-monitored tools
    if (!MONITORED_TOOLS.includes(input.tool_name)) {
      exitSuccess();
    }

    // Load patterns
    const config = loadPatterns();

    // Extract content to scan
    const content = extractContent(input.tool_name, input.tool_input as Record<string, unknown>);

    if (!content) {
      exitSuccess();
    }

    // Detect credentials
    const detections = detectCredentials(content, config);

    if (detections.length === 0) {
      exitSuccess();
    }

    // Check for blocking detections
    const blockers = detections.filter((d) => d.action === 'block');
    const warnings = detections.filter((d) => d.action === 'warn');

    if (blockers.length > 0) {
      const messages = blockers.map((d) => `  - ${d.description}: ${d.match}`);
      exitBlock(`Credential detected in ${input.tool_name} operation:\n${messages.join('\n')}`);
    }

    if (warnings.length > 0) {
      const messages = warnings.map((d) => `  - ${d.description}: ${d.match}`);
      exitWarning(
        `Possible credential detected in ${input.tool_name} operation:\n${messages.join('\n')}`
      );
    }

    exitSuccess();
  } catch (e) {
    // Fail open on hook errors (don't block legitimate operations)
    logError(`Hook error: ${e instanceof Error ? e.message : 'unknown error'}`);
    exitSuccess();
  }
}

main();
