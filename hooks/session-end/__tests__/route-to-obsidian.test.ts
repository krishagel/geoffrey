/**
 * Tests for Route to Obsidian Hook
 *
 * Run with: bun test hooks/session-end/__tests__/route-to-obsidian.test.ts
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, existsSync, readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { spawn } from 'bun';

// ============================================================================
// Test Setup
// ============================================================================

const TEST_ROOT = '/tmp/geoffrey-obsidian-test';
const TEST_VAULT = resolve(TEST_ROOT, 'vault');
const TEST_KNOWLEDGE = resolve(TEST_ROOT, 'Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/knowledge');

beforeEach(() => {
  process.env.HOME = TEST_ROOT;
  process.env.GEOFFREY_VAULT = TEST_VAULT;
  mkdirSync(TEST_VAULT, { recursive: true });
  mkdirSync(TEST_KNOWLEDGE, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_ROOT, { recursive: true, force: true });
  delete process.env.HOME;
  delete process.env.GEOFFREY_VAULT;
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
  const hookPath = resolve(import.meta.dir, '..', 'route-to-obsidian.ts');

  const proc = spawn({
    cmd: ['bun', hookPath],
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      HOME: TEST_ROOT,
      GEOFFREY_VAULT: TEST_VAULT,
    },
  });

  proc.stdin.write(JSON.stringify(input));
  proc.stdin.end();

  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  return { exitCode, stderr };
}

// ============================================================================
// Research Routing Tests
// ============================================================================

describe('Research Routing', () => {
  test('creates Research/{topic}/ directory structure', async () => {
    const transcriptPath = createTestTranscript([
      { role: 'user', content: 'Research the best TypeScript frameworks' },
      { role: 'assistant', content: 'Based on my analysis...' },
    ]);

    const input = {
      session_id: 'research-test-1',
      transcript_path: transcriptPath,
      cwd: '/tmp',
      hook_event_name: 'SessionEnd',
    };

    await executeHook(input);

    const researchDir = resolve(TEST_VAULT, 'Research');
    expect(existsSync(researchDir)).toBe(true);

    const topicDirs = readdirSync(researchDir);
    expect(topicDirs.length).toBeGreaterThan(0);
  });

  test('generates markdown with frontmatter', async () => {
    const transcriptPath = createTestTranscript([
      { role: 'user', content: 'Research cloud storage options' },
      { role: 'assistant', content: 'Here are the top options:\n- AWS S3\n- Google Cloud Storage\n- Azure Blob' },
    ]);

    const input = {
      session_id: 'frontmatter-test',
      transcript_path: transcriptPath,
      cwd: '/tmp',
      hook_event_name: 'SessionEnd',
    };

    await executeHook(input);

    const researchDir = resolve(TEST_VAULT, 'Research');
    const topicDirs = readdirSync(researchDir);
    const files = readdirSync(resolve(researchDir, topicDirs[0]));
    const mdPath = resolve(researchDir, topicDirs[0], files[0]);

    const content = readFileSync(mdPath, 'utf-8');

    expect(content).toContain('---');
    expect(content).toContain('session_id: frontmatter-test');
    expect(content).toContain('type: research');
    expect(content).toContain('source: geoffrey');
  });

  test('extracts key findings from bullet points', async () => {
    const transcriptPath = createTestTranscript([
      { role: 'user', content: 'Research database options' },
      {
        role: 'assistant',
        content: 'Here are the key findings:\n- PostgreSQL offers excellent ACID compliance\n- MongoDB provides flexible schema design\n- Redis excels at caching scenarios',
      },
    ]);

    const input = {
      session_id: 'findings-test',
      transcript_path: transcriptPath,
      cwd: '/tmp',
      hook_event_name: 'SessionEnd',
    };

    await executeHook(input);

    const researchDir = resolve(TEST_VAULT, 'Research');
    const topicDirs = readdirSync(researchDir);
    const files = readdirSync(resolve(researchDir, topicDirs[0]));
    const mdPath = resolve(researchDir, topicDirs[0], files[0]);

    const content = readFileSync(mdPath, 'utf-8');

    expect(content).toContain('Key Findings');
  });
});

// ============================================================================
// Decision Routing Tests
// ============================================================================

describe('Decision Routing', () => {
  test('creates flat file in Decisions/', async () => {
    const transcriptPath = createTestTranscript([
      { role: 'user', content: 'Help me decide between React and Vue' },
      { role: 'assistant', content: 'Let me compare these frameworks...' },
    ]);

    const input = {
      session_id: 'decision-test-1',
      transcript_path: transcriptPath,
      cwd: '/tmp',
      hook_event_name: 'SessionEnd',
    };

    await executeHook(input);

    const decisionsDir = resolve(TEST_VAULT, 'Decisions');
    expect(existsSync(decisionsDir)).toBe(true);

    const files = readdirSync(decisionsDir);
    expect(files.length).toBe(1);
    expect(files[0]).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(files[0]).toMatch(/\.md$/);
  });

  test('includes context section', async () => {
    const transcriptPath = createTestTranscript([
      { role: 'user', content: 'Should I use PostgreSQL or MongoDB for my e-commerce app?' },
      { role: 'assistant', content: 'Based on your requirements...' },
    ]);

    const input = {
      session_id: 'context-test',
      transcript_path: transcriptPath,
      cwd: '/tmp',
      hook_event_name: 'SessionEnd',
    };

    await executeHook(input);

    const decisionsDir = resolve(TEST_VAULT, 'Decisions');
    const files = readdirSync(decisionsDir);
    const mdPath = resolve(decisionsDir, files[0]);

    const content = readFileSync(mdPath, 'utf-8');

    expect(content).toContain('## Context');
    expect(content).toContain('type: decision');
  });
});

// ============================================================================
// Daily Log Routing Tests
// ============================================================================

describe('Daily Log Routing', () => {
  test('creates YYYY-MM-DD.md file', async () => {
    const transcriptPath = createTestTranscript([
      { role: 'user', content: 'Add a task to OmniFocus' },
      { role: 'assistant', content: 'Task added successfully.' },
    ]);

    const input = {
      session_id: 'daily-test-1',
      transcript_path: transcriptPath,
      cwd: '/tmp',
      hook_event_name: 'SessionEnd',
    };

    await executeHook(input);

    const dailyLogsDir = resolve(TEST_VAULT, 'Daily-Logs');
    expect(existsSync(dailyLogsDir)).toBe(true);

    const files = readdirSync(dailyLogsDir);
    expect(files.length).toBe(1);
    expect(files[0]).toMatch(/^\d{4}-\d{2}-\d{2}\.md$/);
  });

  test('appends to existing daily log', async () => {
    const transcriptPath = createTestTranscript([
      { role: 'user', content: 'First task' },
      { role: 'assistant', content: 'Done' },
    ]);

    const input1 = {
      session_id: 'daily-session-1',
      transcript_path: transcriptPath,
      cwd: '/tmp',
      hook_event_name: 'SessionEnd',
    };

    const input2 = {
      session_id: 'daily-session-2',
      transcript_path: transcriptPath,
      cwd: '/tmp',
      hook_event_name: 'SessionEnd',
    };

    await executeHook(input1);
    await executeHook(input2);

    const dailyLogsDir = resolve(TEST_VAULT, 'Daily-Logs');
    const files = readdirSync(dailyLogsDir);

    // Should still be one file
    expect(files.length).toBe(1);

    const content = readFileSync(resolve(dailyLogsDir, files[0]), 'utf-8');

    // Should contain both session IDs
    expect(content).toContain('daily-session-1');
    expect(content).toContain('daily-session-2');
  });

  test('creates header for new daily log', async () => {
    const transcriptPath = createTestTranscript([
      { role: 'user', content: 'Quick task' },
      { role: 'assistant', content: 'Done' },
    ]);

    const input = {
      session_id: 'header-test',
      transcript_path: transcriptPath,
      cwd: '/tmp',
      hook_event_name: 'SessionEnd',
    };

    await executeHook(input);

    const dailyLogsDir = resolve(TEST_VAULT, 'Daily-Logs');
    const files = readdirSync(dailyLogsDir);
    const content = readFileSync(resolve(dailyLogsDir, files[0]), 'utf-8');

    expect(content).toContain('---');
    expect(content).toContain('type: daily-log');
    expect(content).toContain('# ');
    expect(content).toContain('Session Log');
  });
});

// ============================================================================
// Frontmatter Tests
// ============================================================================

describe('Frontmatter Generation', () => {
  test('includes required fields', async () => {
    const transcriptPath = createTestTranscript([
      { role: 'user', content: 'Research something' },
      { role: 'assistant', content: 'Here is the research...' },
    ]);

    const input = {
      session_id: 'frontmatter-fields',
      transcript_path: transcriptPath,
      cwd: '/tmp',
      hook_event_name: 'SessionEnd',
    };

    await executeHook(input);

    const researchDir = resolve(TEST_VAULT, 'Research');
    const topicDirs = readdirSync(researchDir);
    const files = readdirSync(resolve(researchDir, topicDirs[0]));
    const content = readFileSync(resolve(researchDir, topicDirs[0], files[0]), 'utf-8');

    // Extract frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    expect(frontmatterMatch).toBeTruthy();

    const frontmatter = frontmatterMatch![1];
    expect(frontmatter).toContain('session_id:');
    expect(frontmatter).toContain('date:');
    expect(frontmatter).toContain('type:');
    expect(frontmatter).toContain('topics:');
    expect(frontmatter).toContain('confidence:');
    expect(frontmatter).toContain('created:');
    expect(frontmatter).toContain('source: geoffrey');
    expect(frontmatter).toContain('tags:');
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

    expect(exitCode).toBe(0);
    expect(stderr).toContain('Empty transcript');
  });

  test('exits 0 even on errors (non-blocking)', async () => {
    const hookPath = resolve(import.meta.dir, '..', 'route-to-obsidian.ts');

    const proc = spawn({
      cmd: ['bun', hookPath],
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        HOME: TEST_ROOT,
        GEOFFREY_VAULT: TEST_VAULT,
      },
    });

    proc.stdin.write('invalid json');
    proc.stdin.end();

    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
  });

  test('creates directories if they do not exist', async () => {
    // Remove the vault dir
    rmSync(TEST_VAULT, { recursive: true, force: true });

    const transcriptPath = createTestTranscript([
      { role: 'user', content: 'Test' },
    ]);

    const input = {
      session_id: 'mkdir-test',
      transcript_path: transcriptPath,
      cwd: '/tmp',
      hook_event_name: 'SessionEnd',
    };

    await executeHook(input);

    // Vault should be recreated
    expect(existsSync(TEST_VAULT)).toBe(true);
  });
});

// ============================================================================
// Content Extraction Tests
// ============================================================================

describe('Content Extraction', () => {
  test('extracts questions from user messages', async () => {
    const transcriptPath = createTestTranscript([
      { role: 'user', content: 'Research GraphQL. What are the benefits? How does it compare to REST?' },
      { role: 'assistant', content: 'GraphQL offers...' },
    ]);

    const input = {
      session_id: 'questions-test',
      transcript_path: transcriptPath,
      cwd: '/tmp',
      hook_event_name: 'SessionEnd',
    };

    await executeHook(input);

    const researchDir = resolve(TEST_VAULT, 'Research');
    const topicDirs = readdirSync(researchDir);
    const files = readdirSync(resolve(researchDir, topicDirs[0]));
    const content = readFileSync(resolve(researchDir, topicDirs[0], files[0]), 'utf-8');

    expect(content).toContain('Questions Explored');
  });

  test('limits extracted content length', async () => {
    const longContent = 'A'.repeat(10000);
    const transcriptPath = createTestTranscript([
      { role: 'user', content: `Research ${longContent}` },
      { role: 'assistant', content: longContent },
    ]);

    const input = {
      session_id: 'length-test',
      transcript_path: transcriptPath,
      cwd: '/tmp',
      hook_event_name: 'SessionEnd',
    };

    await executeHook(input);

    const researchDir = resolve(TEST_VAULT, 'Research');
    const topicDirs = readdirSync(researchDir);
    const files = readdirSync(resolve(researchDir, topicDirs[0]));
    const content = readFileSync(resolve(researchDir, topicDirs[0], files[0]), 'utf-8');

    // Content should be reasonable length
    expect(content.length).toBeLessThan(20000);
  });
});
