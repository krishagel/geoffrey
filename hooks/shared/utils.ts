/**
 * Shared utilities for Geoffrey Claude Code hooks
 *
 * These utilities handle:
 * - stdin JSON parsing with validation
 * - File operations with path sanitization
 * - Exit code management
 * - Logging to stderr
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'fs';
import { resolve, dirname } from 'path';

// ============================================================================
// Types
// ============================================================================

export interface BaseHookInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  hook_event_name: string;
}

export interface PreToolUseInput extends BaseHookInput {
  hook_event_name: 'PreToolUse';
  tool_name: string;
  tool_input: Record<string, unknown>;
}

export interface SessionEndInput extends BaseHookInput {
  hook_event_name: 'SessionEnd';
}

export type HookInput = PreToolUseInput | SessionEndInput;

export interface TranscriptMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

// ============================================================================
// Path Resolution
// ============================================================================

/**
 * Get the Geoffrey knowledge directory path
 */
export function getKnowledgePath(): string {
  return resolve(
    process.env.HOME || '~',
    'Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/knowledge'
  );
}

/**
 * Get the Obsidian vault path (dynamic across machines)
 */
export function getObsidianVaultPath(): string {
  // Check environment variable first
  if (process.env.GEOFFREY_VAULT) {
    return process.env.GEOFFREY_VAULT;
  }

  // Default to iCloud path
  return resolve(
    process.env.HOME || '~',
    'Library/Mobile Documents/iCloud~md~obsidian/Documents/Geoffrey'
  );
}

/**
 * Sanitize a file path to prevent path traversal attacks
 */
export function sanitizePath(filePath: string, baseDir: string): string {
  const resolved = resolve(filePath);
  const canonicalBase = resolve(baseDir);

  // Check for null bytes
  if (filePath.includes('\0')) {
    throw new Error('Null byte in path');
  }

  // Check for path traversal patterns
  const suspicious = ['../', '.\\', '%2e%2e', '%252e'];
  if (suspicious.some(pattern => filePath.toLowerCase().includes(pattern))) {
    throw new Error(`Suspicious path pattern: ${filePath}`);
  }

  // Ensure path is within allowed directory
  if (!resolved.startsWith(canonicalBase)) {
    throw new Error(`Path traversal attempt: ${filePath}`);
  }

  return resolved;
}

// ============================================================================
// stdin Parsing
// ============================================================================

/**
 * Read and parse JSON from stdin
 * Validates required fields based on hook type
 */
export async function parseStdin<T extends HookInput>(): Promise<T> {
  const rawInput = await Bun.stdin.text();

  if (!rawInput.trim()) {
    throw new Error('Empty stdin');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawInput);
  } catch (e) {
    throw new Error(`Invalid JSON: ${e instanceof Error ? e.message : 'unknown error'}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Input must be an object');
  }

  const input = parsed as Record<string, unknown>;

  // Validate required base fields
  if (typeof input.session_id !== 'string') {
    throw new Error('Missing or invalid session_id');
  }
  if (typeof input.transcript_path !== 'string') {
    throw new Error('Missing or invalid transcript_path');
  }
  if (typeof input.cwd !== 'string') {
    throw new Error('Missing or invalid cwd');
  }
  if (typeof input.hook_event_name !== 'string') {
    throw new Error('Missing or invalid hook_event_name');
  }

  // Additional validation for PreToolUse
  if (input.hook_event_name === 'PreToolUse') {
    if (typeof input.tool_name !== 'string') {
      throw new Error('Missing or invalid tool_name for PreToolUse');
    }
  }

  return input as T;
}

// ============================================================================
// File Operations
// ============================================================================

/**
 * Read a JSON file with error handling
 */
export function readJsonFile<T>(filePath: string): T | null {
  try {
    if (!existsSync(filePath)) {
      return null;
    }
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (e) {
    logError(`Failed to read JSON file ${filePath}: ${e}`);
    return null;
  }
}

/**
 * Write a JSON file, creating parent directories if needed
 */
export function writeJsonFile(filePath: string, data: unknown): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/**
 * Append content to a file, creating it if needed
 */
export function appendToFile(filePath: string, content: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  appendFileSync(filePath, content, 'utf-8');
}

/**
 * Read the transcript file
 */
export function readTranscript(transcriptPath: string): TranscriptMessage[] {
  try {
    const content = readFileSync(transcriptPath, 'utf-8');
    const parsed = JSON.parse(content);

    // Handle different transcript formats
    if (Array.isArray(parsed)) {
      return parsed as TranscriptMessage[];
    }
    if (parsed.messages && Array.isArray(parsed.messages)) {
      return parsed.messages as TranscriptMessage[];
    }

    logError('Unknown transcript format');
    return [];
  } catch (e) {
    logError(`Failed to read transcript: ${e}`);
    return [];
  }
}

// ============================================================================
// Logging & Exit
// ============================================================================

/**
 * Log a message to stderr (hook output channel)
 */
export function logError(message: string): void {
  console.error(`[Geoffrey Hook] ${message}`);
}

/**
 * Log info to stderr (shown in verbose mode)
 */
export function logInfo(message: string): void {
  console.error(`[Geoffrey Hook] ${message}`);
}

/**
 * Exit with success (operation proceeds)
 */
export function exitSuccess(message?: string): never {
  if (message) {
    console.log(message);
  }
  process.exit(0);
}

/**
 * Exit with non-blocking error (logged but continues)
 */
export function exitWarning(message: string): never {
  logError(`WARNING: ${message}`);
  process.exit(1);
}

/**
 * Exit with blocking error (operation blocked)
 */
export function exitBlock(message: string): never {
  logError(`BLOCKED: ${message}`);
  process.exit(2);
}

// ============================================================================
// Date Utilities
// ============================================================================

/**
 * Get current date in YYYY-MM-DD format
 */
export function getCurrentDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Get current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}
