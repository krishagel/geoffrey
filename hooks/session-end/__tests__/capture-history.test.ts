/**
 * Tests for Capture History Hook
 *
 * Run with: bun test hooks/session-end/__tests__/capture-history.test.ts
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, existsSync, readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { spawn } from 'bun';

// ============================================================================
// Test Setup
// ============================================================================

const TEST_ROOT = '/tmp/geoffrey-history-test';
const TEST_HISTORY_PATH = resolve(TEST_ROOT, 'Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/knowledge');

beforeEach(() => {
  // Set HOME to test root
  process.env.HOME = TEST_ROOT;
  mkdirSync(TEST_ROOT, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_ROOT, { recursive: true, force: true });
  delete process.env.HOME;
});

// ============================================================================
// Helper Functions
// ============================================================================

function createTestTranscript(messages: Array<{ role: string; content: string }>): string {
  const transcriptPath = resolve(TEST_ROOT, 'transcript.json');
  Bun.write(transcriptPath, JSON.stringify(messages));
  return transcriptPath;
}

async function executeHook(input: Record<string, unknown>): Promise<{ exitCode: number; stderr: string }> {
  const hookPath = resolve(import.meta.dir, '..', 'capture-history.ts');

  const proc = spawn({
    cmd: ['bun', hookPath],
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, HOME: TEST_ROOT },
  });

  proc.stdin.write(JSON.stringify(input));
  proc.stdin.end();

  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  return { exitCode, stderr };
}

// ============================================================================
// JSONL Structure Tests
// ============================================================================

describe('JSONL History Capture', () => {
  test('creates YYYY-MM directory structure', async () => {
    const transcriptPath = createTestTranscript([
      { role: 'user', content: 'Test message' },
    ]);

    const input = {
      session_id: 'test-session-001',
      transcript_path: transcriptPath,
      cwd: '/tmp',
      hook_event_name: 'SessionEnd',
    };

    const { exitCode } = await executeHook(input);

    expect(exitCode).toBe(0);

    const rawDir = resolve(TEST_HISTORY_PATH, 'history', 'raw');
    expect(existsSync(rawDir)).toBe(true);

    const monthDirs = readdirSync(rawDir);
    expect(monthDirs.length).toBe(1);
    expect(monthDirs[0]).toMatch(/^\d{4}-\d{2}$/);
  });

  test('creates session-{id}.jsonl file', async () => {
    const transcriptPath = createTestTranscript([
      { role: 'user', content: 'Test' },
    ]);

    const input = {
      session_id: 'abc-123-def',
      transcript_path: transcriptPath,
      cwd: '/tmp',
      hook_event_name: 'SessionEnd',
    };

    await executeHook(input);

    const rawDir = resolve(TEST_HISTORY_PATH, 'history', 'raw');
    const monthDir = readdirSync(rawDir)[0];
    const files = readdirSync(resolve(rawDir, monthDir));

    expect(files.some((f) => f.includes('abc-123-def'))).toBe(true);
    expect(files[0]).toMatch(/\.jsonl$/);
  });

  test('writes one JSON object per line', async () => {
    const transcriptPath = createTestTranscript([
      { role: 'user', content: 'Question 1' },
      { role: 'assistant', content: 'Answer 1' },
      { role: 'user', content: 'Question 2' },
    ]);

    const input = {
      session_id: 'multi-message',
      transcript_path: transcriptPath,
      cwd: '/tmp',
      hook_event_name: 'SessionEnd',
    };

    await executeHook(input);

    const rawDir = resolve(TEST_HISTORY_PATH, 'history', 'raw');
    const monthDir = readdirSync(rawDir)[0];
    const files = readdirSync(resolve(rawDir, monthDir));
    const jsonlPath = resolve(rawDir, monthDir, files[0]);

    const content = readFileSync(jsonlPath, 'utf-8');
    const lines = content.trim().split('\n');

    // 3 messages + 1 summary = 4 lines
    expect(lines.length).toBe(4);

    // Each line should be valid JSON
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  test('includes required fields in message events', async () => {
    const transcriptPath = createTestTranscript([
      { role: 'user', content: 'Test question' },
    ]);

    const input = {
      session_id: 'field-test',
      transcript_path: transcriptPath,
      cwd: '/tmp',
      hook_event_name: 'SessionEnd',
    };

    await executeHook(input);

    const rawDir = resolve(TEST_HISTORY_PATH, 'history', 'raw');
    const monthDir = readdirSync(rawDir)[0];
    const files = readdirSync(resolve(rawDir, monthDir));
    const jsonlPath = resolve(rawDir, monthDir, files[0]);

    const content = readFileSync(jsonlPath, 'utf-8');
    const lines = content.trim().split('\n');
    const messageEvent = JSON.parse(lines[0]);

    expect(messageEvent.session_id).toBe('field-test');
    expect(messageEvent.event_type).toBe('message');
    expect(messageEvent.role).toBe('user');
    expect(messageEvent.content).toBe('Test question');
    expect(messageEvent.turn).toBe(1);
    expect(messageEvent.timestamp).toBeTruthy();
  });

  test('includes session summary as final line', async () => {
    const transcriptPath = createTestTranscript([
      { role: 'user', content: 'Test' },
      { role: 'assistant', content: 'Response' },
    ]);

    const input = {
      session_id: 'summary-test',
      transcript_path: transcriptPath,
      cwd: '/test/cwd',
      hook_event_name: 'SessionEnd',
    };

    await executeHook(input);

    const rawDir = resolve(TEST_HISTORY_PATH, 'history', 'raw');
    const monthDir = readdirSync(rawDir)[0];
    const files = readdirSync(resolve(rawDir, monthDir));
    const jsonlPath = resolve(rawDir, monthDir, files[0]);

    const content = readFileSync(jsonlPath, 'utf-8');
    const lines = content.trim().split('\n');
    const summary = JSON.parse(lines[lines.length - 1]);

    expect(summary.event_type).toBe('session_summary');
    expect(summary.session_id).toBe('summary-test');
    expect(summary.message_count).toBe(2);
    expect(summary.turn_count).toBe(1);
    expect(summary.cwd).toBe('/test/cwd');
    expect(summary.classification).toBeTruthy();
    expect(summary.classification.category).toBeTruthy();
  });
});

// ============================================================================
// Content Handling Tests
// ============================================================================

describe('JSONL Content Handling', () => {
  test('handles unicode content correctly', async () => {
    const transcriptPath = createTestTranscript([
      { role: 'user', content: '日本語 français émojis 🚀 中文' },
    ]);

    const input = {
      session_id: 'unicode-test',
      transcript_path: transcriptPath,
      cwd: '/tmp',
      hook_event_name: 'SessionEnd',
    };

    await executeHook(input);

    const rawDir = resolve(TEST_HISTORY_PATH, 'history', 'raw');
    const monthDir = readdirSync(rawDir)[0];
    const files = readdirSync(resolve(rawDir, monthDir));
    const jsonlPath = resolve(rawDir, monthDir, files[0]);

    const content = readFileSync(jsonlPath, 'utf-8');
    const messageEvent = JSON.parse(content.trim().split('\n')[0]);

    expect(messageEvent.content).toBe('日本語 français émojis 🚀 中文');
  });

  test('escapes newlines in content', async () => {
    const transcriptPath = createTestTranscript([
      { role: 'user', content: 'Line 1\nLine 2\nLine 3' },
    ]);

    const input = {
      session_id: 'newline-test',
      transcript_path: transcriptPath,
      cwd: '/tmp',
      hook_event_name: 'SessionEnd',
    };

    await executeHook(input);

    const rawDir = resolve(TEST_HISTORY_PATH, 'history', 'raw');
    const monthDir = readdirSync(rawDir)[0];
    const files = readdirSync(resolve(rawDir, monthDir));
    const jsonlPath = resolve(rawDir, monthDir, files[0]);

    const content = readFileSync(jsonlPath, 'utf-8');
    const lines = content.trim().split('\n');

    // Should be 2 lines (1 message + 1 summary), not 4
    expect(lines.length).toBe(2);

    // Content should contain the newlines when parsed
    const messageEvent = JSON.parse(lines[0]);
    expect(messageEvent.content).toContain('\n');
  });

  test('sanitizes session ID in filename', async () => {
    const transcriptPath = createTestTranscript([
      { role: 'user', content: 'Test' },
    ]);

    const input = {
      session_id: 'bad/path/../../../etc/passwd',
      transcript_path: transcriptPath,
      cwd: '/tmp',
      hook_event_name: 'SessionEnd',
    };

    await executeHook(input);

    const rawDir = resolve(TEST_HISTORY_PATH, 'history', 'raw');
    const monthDir = readdirSync(rawDir)[0];
    const files = readdirSync(resolve(rawDir, monthDir));

    // Should not create path traversal
    expect(files[0]).not.toContain('/');
    expect(files[0]).not.toContain('..');
    expect(existsSync('/etc/passwd.jsonl')).toBe(false);
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Error Handling', () => {
  test('handles empty transcript gracefully', async () => {
    const transcriptPath = createTestTranscript([]);

    const input = {
      session_id: 'empty-test',
      transcript_path: transcriptPath,
      cwd: '/tmp',
      hook_event_name: 'SessionEnd',
    };

    const { exitCode, stderr } = await executeHook(input);

    expect(exitCode).toBe(0); // Non-blocking
    expect(stderr).toContain('Empty transcript');
  });

  test('handles missing transcript file gracefully', async () => {
    const input = {
      session_id: 'missing-transcript',
      transcript_path: '/nonexistent/path/transcript.json',
      cwd: '/tmp',
      hook_event_name: 'SessionEnd',
    };

    const { exitCode } = await executeHook(input);

    expect(exitCode).toBe(0); // Non-blocking
  });

  test('exits 0 even on errors (non-blocking)', async () => {
    // Invalid JSON in stdin
    const hookPath = resolve(import.meta.dir, '..', 'capture-history.ts');

    const proc = spawn({
      cmd: ['bun', hookPath],
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, HOME: TEST_ROOT },
    });

    proc.stdin.write('invalid json {{{');
    proc.stdin.end();

    const exitCode = await proc.exited;

    // Should exit 0 to not block session
    expect(exitCode).toBe(0);
  });
});

// ============================================================================
// Classification Integration Tests
// ============================================================================

describe('Classification in JSONL', () => {
  test('includes classification in session summary', async () => {
    const transcriptPath = createTestTranscript([
      { role: 'user', content: 'Research the best cloud providers for 2025' },
      { role: 'assistant', content: 'Based on my analysis...' },
    ]);

    const input = {
      session_id: 'classification-test',
      transcript_path: transcriptPath,
      cwd: '/tmp',
      hook_event_name: 'SessionEnd',
    };

    await executeHook(input);

    const rawDir = resolve(TEST_HISTORY_PATH, 'history', 'raw');
    const monthDir = readdirSync(rawDir)[0];
    const files = readdirSync(resolve(rawDir, monthDir));
    const jsonlPath = resolve(rawDir, monthDir, files[0]);

    const content = readFileSync(jsonlPath, 'utf-8');
    const lines = content.trim().split('\n');
    const summary = JSON.parse(lines[lines.length - 1]);

    expect(summary.classification.category).toBe('research');
    expect(summary.classification.confidence).toBeGreaterThan(0.5);
    expect(summary.classification.topics).toBeDefined();
  });
});
