#!/usr/bin/env bun
/**
 * SessionEnd Hook: Route to Obsidian
 *
 * Creates human-readable markdown summaries in Obsidian vault,
 * routed by content type:
 * - Research → Research/{topic}/YYYY-MM-DD-{title}.md
 * - Decision → Decisions/YYYY-MM-DD-{title}.md
 * - Daily Log → Daily-Logs/YYYY-MM-DD.md (append)
 *
 * Exit codes:
 * - 0: Success (non-blocking)
 * - 1: Non-blocking error (logged but continues)
 */

import { resolve, dirname, basename } from 'path';
import { existsSync, readFileSync } from 'fs';
import {
  parseStdin,
  readTranscript,
  appendToFile,
  writeJsonFile,
  getObsidianVaultPath,
  logInfo,
  logError,
  exitSuccess,
  getCurrentDate,
  getCurrentTimestamp,
  type SessionEndInput,
  type TranscriptMessage,
} from '../shared/utils';
import {
  classifyContent,
  generateTopicSlug,
  getCategoryDescription,
  type ClassificationResult,
  type ContentCategory,
} from '../shared/classifier';

// ============================================================================
// Types
// ============================================================================

interface ObsidianNote {
  path: string;
  content: string;
  append: boolean;
}

interface SessionMetadata {
  sessionId: string;
  date: string;
  timestamp: string;
  classification: ClassificationResult;
  messageCount: number;
  firstUserMessage: string;
}

// ============================================================================
// Frontmatter Generation
// ============================================================================

function generateFrontmatter(metadata: SessionMetadata): string {
  const lines = [
    '---',
    `session_id: ${metadata.sessionId}`,
    `date: ${metadata.date}`,
    `type: ${metadata.classification.category}`,
    `topics: [${metadata.classification.topics.map((t) => `"${t}"`).join(', ')}]`,
    `confidence: ${metadata.classification.confidence.toFixed(2)}`,
    `created: ${metadata.timestamp}`,
    'source: geoffrey',
    'tags: [geoffrey, session-log]',
    '---',
    '',
  ];

  return lines.join('\n');
}

// ============================================================================
// Content Generation by Category
// ============================================================================

/**
 * Generate research note content
 */
function generateResearchNote(
  metadata: SessionMetadata,
  messages: TranscriptMessage[]
): string {
  const topic = metadata.classification.metadata.primaryTopic;
  const lines: string[] = [];

  lines.push(generateFrontmatter(metadata));
  lines.push(`# ${topic}`);
  lines.push('');
  lines.push(`> Session from ${metadata.date} - ${getCategoryDescription('research')}`);
  lines.push('');

  // Summary section
  lines.push('## Summary');
  lines.push('');
  const summary = generateSummary(messages);
  lines.push(summary);
  lines.push('');

  // Key points extracted from assistant messages
  const keyPoints = extractKeyPoints(messages);
  if (keyPoints.length > 0) {
    lines.push('## Key Findings');
    lines.push('');
    for (const point of keyPoints) {
      lines.push(`- ${point}`);
    }
    lines.push('');
  }

  // Questions asked
  const questions = extractQuestions(messages);
  if (questions.length > 0) {
    lines.push('## Questions Explored');
    lines.push('');
    for (const q of questions) {
      lines.push(`- ${q}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push(`*Session ID: \`${metadata.sessionId}\`*`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate decision note content
 */
function generateDecisionNote(
  metadata: SessionMetadata,
  messages: TranscriptMessage[]
): string {
  const topic = metadata.classification.metadata.primaryTopic;
  const lines: string[] = [];

  lines.push(generateFrontmatter(metadata));
  lines.push(`# Decision: ${topic}`);
  lines.push('');
  lines.push(`> ${getCategoryDescription('decision')} - ${metadata.date}`);
  lines.push('');

  // Context
  lines.push('## Context');
  lines.push('');
  lines.push(metadata.firstUserMessage.slice(0, 500));
  lines.push('');

  // Options considered (extracted from conversation)
  const options = extractOptions(messages);
  if (options.length > 0) {
    lines.push('## Options Considered');
    lines.push('');
    for (const opt of options) {
      lines.push(`- ${opt}`);
    }
    lines.push('');
  }

  // Summary/Outcome
  lines.push('## Outcome');
  lines.push('');
  lines.push(generateSummary(messages));
  lines.push('');

  lines.push('---');
  lines.push(`*Session ID: \`${metadata.sessionId}\`*`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate daily log entry (appended to existing file)
 */
function generateDailyLogEntry(
  metadata: SessionMetadata,
  messages: TranscriptMessage[]
): string {
  const timeOfDay = metadata.timestamp.split('T')[1]?.split('.')[0] || 'Session';
  const lines: string[] = [];

  lines.push('');
  lines.push(`## ${timeOfDay}`);
  lines.push('');
  lines.push(`**Session ID:** \`${metadata.sessionId}\``);
  lines.push(`**Messages:** ${metadata.messageCount}`);
  lines.push('');

  // Topics if detected
  if (metadata.classification.topics.length > 0 && metadata.classification.topics[0] !== 'general') {
    lines.push(`**Topics:** ${metadata.classification.topics.join(', ')}`);
    lines.push('');
  }

  // Brief summary
  lines.push('### Summary');
  lines.push('');
  lines.push(generateSummary(messages));
  lines.push('');

  lines.push('---');

  return lines.join('\n');
}

/**
 * Generate daily log header (for new files)
 */
function generateDailyLogHeader(date: string): string {
  const lines = [
    '---',
    `date: ${date}`,
    'type: daily-log',
    'tags: [geoffrey, session-log]',
    'source: geoffrey',
    '---',
    '',
    `# ${date} - Session Log`,
    '',
  ];

  return lines.join('\n');
}

// ============================================================================
// Content Extraction Helpers
// ============================================================================

/**
 * Generate a brief summary from the conversation
 */
function generateSummary(messages: TranscriptMessage[]): string {
  const firstUserMessage = messages.find((m) => m.role === 'user');
  if (!firstUserMessage?.content) {
    return 'No user messages in session.';
  }

  // Use first line of first user message, capped at 200 chars
  const firstLine = firstUserMessage.content.split('\n')[0]?.trim() || '';
  const summary = firstLine.slice(0, 200);

  return `Session focused on: "${summary}${summary.length >= 200 ? '...' : ''}"`;
}

/**
 * Extract key points from assistant responses
 */
function extractKeyPoints(messages: TranscriptMessage[]): string[] {
  const points: string[] = [];
  const assistantMessages = messages.filter((m) => m.role === 'assistant');

  for (const msg of assistantMessages) {
    // Look for bullet points in responses
    const bulletPattern = /^[-*•]\s+(.{20,150})$/gm;
    let match: RegExpExecArray | null;

    while ((match = bulletPattern.exec(msg.content)) !== null) {
      const point = match[1]?.trim();
      if (point && !points.includes(point)) {
        points.push(point);
        if (points.length >= 5) break; // Limit to 5 key points
      }
    }

    if (points.length >= 5) break;
  }

  return points;
}

/**
 * Extract questions from user messages
 */
function extractQuestions(messages: TranscriptMessage[]): string[] {
  const questions: string[] = [];
  const userMessages = messages.filter((m) => m.role === 'user');

  for (const msg of userMessages) {
    // Look for question patterns
    const questionPattern = /([^.!]+\?)/g;
    let match: RegExpExecArray | null;

    while ((match = questionPattern.exec(msg.content)) !== null) {
      const question = match[1]?.trim();
      if (question && question.length >= 10 && question.length <= 200) {
        questions.push(question);
        if (questions.length >= 5) break;
      }
    }

    if (questions.length >= 5) break;
  }

  return questions;
}

/**
 * Extract options/alternatives discussed
 */
function extractOptions(messages: TranscriptMessage[]): string[] {
  const options: string[] = [];
  const allText = messages.map((m) => m.content).join(' ');

  // Pattern for "Option 1:", "A)", numbered items
  const optionPatterns = [
    /(?:option\s*\d+[:\s]+)([^.]{10,100})/gi,
    /(?:\d+\.\s+)([A-Z][^.]{10,80})/g,
    /(?:between\s+)([A-Z][a-z]+(?:\s+and\s+[A-Z][a-z]+)+)/gi,
  ];

  for (const pattern of optionPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(allText)) !== null) {
      const option = match[1]?.trim();
      if (option && !options.includes(option)) {
        options.push(option);
        if (options.length >= 5) break;
      }
    }
    if (options.length >= 5) break;
  }

  return options;
}

// ============================================================================
// Routing Logic
// ============================================================================

/**
 * Determine the output path based on classification
 */
function determineOutputPath(
  classification: ClassificationResult,
  sessionId: string
): { path: string; append: boolean } {
  const vaultPath = getObsidianVaultPath();
  const date = getCurrentDate();
  const topicSlug = classification.topicSlug || 'general';

  switch (classification.category) {
    case 'research': {
      // Research/{topic}/YYYY-MM-DD-{topic}.md
      const filename = `${date}-${topicSlug}.md`;
      return {
        path: resolve(vaultPath, 'Research', topicSlug, filename),
        append: false,
      };
    }

    case 'decision': {
      // Decisions/YYYY-MM-DD-{topic}.md
      const filename = `${date}-${topicSlug}.md`;
      return {
        path: resolve(vaultPath, 'Decisions', filename),
        append: false,
      };
    }

    case 'daily-log':
    default: {
      // Daily-Logs/YYYY-MM-DD.md (append)
      const filename = `${date}.md`;
      return {
        path: resolve(vaultPath, 'Daily-Logs', filename),
        append: true,
      };
    }
  }
}

/**
 * Write the Obsidian note
 */
function writeObsidianNote(note: ObsidianNote): void {
  if (note.append && existsSync(note.path)) {
    // Append to existing file
    appendToFile(note.path, note.content);
  } else if (note.append && !existsSync(note.path)) {
    // Create new daily log with header
    const date = getCurrentDate();
    const header = generateDailyLogHeader(date);
    appendToFile(note.path, header + note.content);
  } else {
    // Write new file (uses appendToFile which creates directories)
    appendToFile(note.path, note.content);
  }
}

// ============================================================================
// Main Hook Logic
// ============================================================================

async function main(): Promise<void> {
  try {
    // Parse stdin input
    const input = await parseStdin<SessionEndInput>();

    // Read transcript
    const messages = readTranscript(input.transcript_path);

    if (messages.length === 0) {
      logInfo('Empty transcript, skipping Obsidian routing');
      exitSuccess();
    }

    // Classify content
    const classification = classifyContent(messages);

    // Prepare metadata
    const firstUserMessage = messages.find((m) => m.role === 'user');
    const metadata: SessionMetadata = {
      sessionId: input.session_id,
      date: getCurrentDate(),
      timestamp: getCurrentTimestamp(),
      classification,
      messageCount: messages.length,
      firstUserMessage: firstUserMessage?.content || '',
    };

    // Determine output path
    const { path, append } = determineOutputPath(classification, input.session_id);

    // Generate content based on category
    let content: string;
    switch (classification.category) {
      case 'research':
        content = generateResearchNote(metadata, messages);
        break;
      case 'decision':
        content = generateDecisionNote(metadata, messages);
        break;
      case 'daily-log':
      default:
        content = generateDailyLogEntry(metadata, messages);
        break;
    }

    // Write to Obsidian
    const note: ObsidianNote = { path, content, append };
    writeObsidianNote(note);

    logInfo(
      `Routed ${classification.category} to ${path} ` +
        `(topic: ${classification.topicSlug}, append: ${append})`
    );

    exitSuccess();
  } catch (e) {
    // Log error but don't block session end
    logError(`Failed to route to Obsidian: ${e instanceof Error ? e.message : 'unknown error'}`);
    exitSuccess();
  }
}

main();
