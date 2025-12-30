#!/usr/bin/env bun
/**
 * SessionEnd Hook: Create Daily Log
 *
 * Creates or appends to an Obsidian daily log summarizing the session.
 * Routes content to Daily-Logs folder with YYYY-MM-DD.md format.
 *
 * Exit codes:
 * - 0: Success (log created/appended)
 * - 1: Non-blocking error (logged but continues)
 */

import { resolve, basename } from 'path';
import { existsSync, readFileSync } from 'fs';
import {
  parseStdin,
  readTranscript,
  appendToFile,
  writeJsonFile,
  getObsidianVaultPath,
  getKnowledgePath,
  logInfo,
  logError,
  exitSuccess,
  getCurrentDate,
  getCurrentTimestamp,
  type SessionEndInput,
  type TranscriptMessage,
} from '../shared/utils';

// ============================================================================
// Types
// ============================================================================

interface SessionSummary {
  sessionId: string;
  timestamp: string;
  duration: string;
  messageCount: number;
  userMessages: number;
  assistantMessages: number;
  topics: string[];
  filesModified: string[];
  toolsUsed: string[];
  summary: string;
}

interface RawLogEntry {
  sessionId: string;
  timestamp: string;
  transcriptPath: string;
  cwd: string;
  summary: SessionSummary;
}

// ============================================================================
// Content Analysis
// ============================================================================

/**
 * Extract topics from transcript using keyword detection
 */
function extractTopics(messages: TranscriptMessage[]): string[] {
  const topicKeywords: Record<string, string[]> = {
    'code-review': ['review', 'pr', 'pull request', 'code review'],
    'debugging': ['bug', 'error', 'fix', 'debug', 'issue'],
    'feature-dev': ['implement', 'feature', 'add', 'create', 'build'],
    'research': ['research', 'investigate', 'explore', 'analyze'],
    'documentation': ['docs', 'document', 'readme', 'explain'],
    'testing': ['test', 'spec', 'coverage', 'unit test'],
    'refactoring': ['refactor', 'cleanup', 'improve', 'optimize'],
    'configuration': ['config', 'setup', 'install', 'configure'],
    'task-management': ['task', 'omnifocus', 'todo', 'reminder'],
    'email': ['email', 'gmail', 'mail', 'message'],
  };

  const allText = messages.map((m) => m.content.toLowerCase()).join(' ');
  const foundTopics: string[] = [];

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some((kw) => allText.includes(kw))) {
      foundTopics.push(topic);
    }
  }

  return foundTopics.length > 0 ? foundTopics : ['general'];
}

/**
 * Extract modified files from transcript
 */
function extractModifiedFiles(messages: TranscriptMessage[]): string[] {
  const files = new Set<string>();
  const filePattern = /(?:created?|modified?|updated?|wrote|edited?)\s+(?:file\s+)?["`']?([^\s"`']+\.[a-z]{1,10})["`']?/gi;

  for (const message of messages) {
    if (message.role !== 'assistant') continue;

    let match: RegExpExecArray | null;
    while ((match = filePattern.exec(message.content)) !== null) {
      const file = match[1];
      if (file && !file.includes('...') && file.length < 200) {
        files.add(file);
      }
    }
  }

  return Array.from(files).slice(0, 20); // Limit to 20 files
}

/**
 * Extract tools used from transcript
 */
function extractToolsUsed(messages: TranscriptMessage[]): string[] {
  const tools = new Set<string>();
  const toolPattern = /(?:using|ran|executed?|called?)\s+(?:the\s+)?(\w+)\s+tool/gi;

  for (const message of messages) {
    if (message.role !== 'assistant') continue;

    let match: RegExpExecArray | null;
    while ((match = toolPattern.exec(message.content)) !== null) {
      tools.add(match[1]);
    }
  }

  return Array.from(tools);
}

/**
 * Generate a brief summary of the session
 */
function generateSummary(messages: TranscriptMessage[], topics: string[]): string {
  // Use first user message as context
  const firstUserMessage = messages.find((m) => m.role === 'user');
  if (!firstUserMessage) return 'No user messages in session';

  const firstLine = firstUserMessage.content.split('\n')[0].substring(0, 100);
  const topicsStr = topics.join(', ');

  return `Session focused on ${topicsStr}. Started with: "${firstLine}${firstLine.length >= 100 ? '...' : ''}"`;
}

/**
 * Calculate session duration from timestamps
 */
function calculateDuration(messages: TranscriptMessage[]): string {
  if (messages.length < 2) return 'brief';

  const first = messages[0]?.timestamp;
  const last = messages[messages.length - 1]?.timestamp;

  if (!first || !last) return 'unknown';

  try {
    const start = new Date(first).getTime();
    const end = new Date(last).getTime();
    const minutes = Math.round((end - start) / 60000);

    if (minutes < 1) return 'brief';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  } catch {
    return 'unknown';
  }
}

// ============================================================================
// Markdown Generation
// ============================================================================

/**
 * Generate markdown content for the daily log entry
 */
function generateMarkdownEntry(summary: SessionSummary): string {
  const lines: string[] = [];

  lines.push(`\n## ${summary.timestamp.split('T')[1]?.split('.')[0] || 'Session'}`);
  lines.push('');
  lines.push(`**Session ID:** \`${summary.sessionId}\``);
  lines.push(`**Duration:** ${summary.duration}`);
  lines.push(`**Messages:** ${summary.messageCount} (${summary.userMessages} user, ${summary.assistantMessages} assistant)`);
  lines.push('');
  lines.push(`### Topics`);
  lines.push(summary.topics.map((t) => `- ${t}`).join('\n'));
  lines.push('');
  lines.push(`### Summary`);
  lines.push(summary.summary);

  if (summary.filesModified.length > 0) {
    lines.push('');
    lines.push(`### Files Modified`);
    lines.push(summary.filesModified.map((f) => `- \`${f}\``).join('\n'));
  }

  if (summary.toolsUsed.length > 0) {
    lines.push('');
    lines.push(`### Tools Used`);
    lines.push(summary.toolsUsed.map((t) => `- ${t}`).join('\n'));
  }

  lines.push('');
  lines.push('---');

  return lines.join('\n');
}

/**
 * Generate daily note header with frontmatter
 */
function generateDailyNoteHeader(date: string): string {
  return `---
date: ${date}
type: daily-log
tags: [geoffrey, session-log]
---

# ${date} - Session Log

`;
}

// ============================================================================
// Main Hook Logic
// ============================================================================

async function main(): Promise<void> {
  try {
    // Parse stdin
    const input = await parseStdin<SessionEndInput>();

    // Read transcript
    const transcript = readTranscript(input.transcript_path);

    if (transcript.length === 0) {
      logInfo('Empty transcript, skipping daily log');
      exitSuccess();
    }

    // Analyze transcript
    const topics = extractTopics(transcript);
    const filesModified = extractModifiedFiles(transcript);
    const toolsUsed = extractToolsUsed(transcript);
    const duration = calculateDuration(transcript);
    const summary = generateSummary(transcript, topics);

    const sessionSummary: SessionSummary = {
      sessionId: input.session_id,
      timestamp: getCurrentTimestamp(),
      duration,
      messageCount: transcript.length,
      userMessages: transcript.filter((m) => m.role === 'user').length,
      assistantMessages: transcript.filter((m) => m.role === 'assistant').length,
      topics,
      filesModified,
      toolsUsed,
      summary,
    };

    // Generate markdown entry
    const markdownEntry = generateMarkdownEntry(sessionSummary);

    // Determine file path
    const date = getCurrentDate();
    const vaultPath = getObsidianVaultPath();
    const dailyLogPath = resolve(vaultPath, 'Daily-Logs', `${date}.md`);

    // Create or append to daily log
    if (!existsSync(dailyLogPath)) {
      // Create new file with header
      const header = generateDailyNoteHeader(date);
      appendToFile(dailyLogPath, header + markdownEntry);
      logInfo(`Created daily log: ${dailyLogPath}`);
    } else {
      // Append to existing file
      appendToFile(dailyLogPath, markdownEntry);
      logInfo(`Appended to daily log: ${dailyLogPath}`);
    }

    // Also store raw JSONL for future ML
    const rawLogPath = resolve(
      getKnowledgePath(),
      'history',
      'raw',
      `${date.substring(0, 7)}`, // YYYY-MM
      `sessions.jsonl`
    );

    const rawEntry: RawLogEntry = {
      sessionId: input.session_id,
      timestamp: getCurrentTimestamp(),
      transcriptPath: input.transcript_path,
      cwd: input.cwd,
      summary: sessionSummary,
    };

    appendToFile(rawLogPath, JSON.stringify(rawEntry) + '\n');

    exitSuccess();
  } catch (e) {
    // Log error but don't block
    logError(`Failed to create daily log: ${e instanceof Error ? e.message : 'unknown error'}`);
    exitSuccess();
  }
}

main();
