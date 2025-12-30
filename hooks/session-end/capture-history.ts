#!/usr/bin/env bun
/**
 * SessionEnd Hook: Capture History
 *
 * Captures raw conversation data to JSONL format for future analysis.
 * Creates per-session files in: ~/Library/.../Geoffrey/history/raw/YYYY-MM/session-{session_id}.jsonl
 *
 * JSONL Format:
 * - One JSON object per line (per message)
 * - Includes session metadata as final line
 * - Enables streaming analysis and pattern detection
 *
 * Exit codes:
 * - 0: Success (non-blocking)
 * - 1: Non-blocking error (logged but continues)
 */

import { resolve } from 'path';
import {
  parseStdin,
  readTranscript,
  appendToFile,
  getKnowledgePath,
  logInfo,
  logError,
  exitSuccess,
  getCurrentTimestamp,
  type SessionEndInput,
  type TranscriptMessage,
} from '../shared/utils';
import { classifyContent, type ClassificationResult } from '../shared/classifier';

// ============================================================================
// Types
// ============================================================================

interface JSONLMessageEvent {
  session_id: string;
  timestamp: string;
  event_type: 'message';
  role: 'user' | 'assistant';
  content: string;
  turn: number;
}

interface JSONLSessionSummary {
  session_id: string;
  timestamp: string;
  event_type: 'session_summary';
  start_time: string;
  end_time: string;
  message_count: number;
  turn_count: number;
  classification: ClassificationResult;
  cwd: string;
  transcript_path: string;
}

// ============================================================================
// JSONL Generation
// ============================================================================

/**
 * Generate JSONL content from transcript messages
 */
function generateJSONLContent(
  input: SessionEndInput,
  messages: TranscriptMessage[],
  classification: ClassificationResult
): string {
  const lines: string[] = [];
  const endTime = getCurrentTimestamp();

  // Write per-message events
  let turn = 0;
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg?.content) continue;

    // Increment turn on user messages
    if (msg.role === 'user') {
      turn++;
    }

    const event: JSONLMessageEvent = {
      session_id: input.session_id,
      timestamp: msg.timestamp || endTime,
      event_type: 'message',
      role: msg.role,
      content: msg.content,
      turn,
    };

    lines.push(JSON.stringify(event));
  }

  // Write session summary as final line
  const firstMessage = messages[0];
  const summary: JSONLSessionSummary = {
    session_id: input.session_id,
    timestamp: endTime,
    event_type: 'session_summary',
    start_time: firstMessage?.timestamp || endTime,
    end_time: endTime,
    message_count: messages.length,
    turn_count: turn,
    classification,
    cwd: input.cwd,
    transcript_path: input.transcript_path,
  };

  lines.push(JSON.stringify(summary));

  return lines.join('\n') + '\n';
}

/**
 * Generate the JSONL file path for a session
 */
function getJSONLPath(sessionId: string): string {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Sanitize session ID for filename
  const safeSessionId = sessionId.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 100);

  return resolve(
    getKnowledgePath(),
    'history',
    'raw',
    yearMonth,
    `session-${safeSessionId}.jsonl`
  );
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
      logInfo('Empty transcript, skipping history capture');
      exitSuccess();
    }

    // Classify content for metadata
    const classification = classifyContent(messages);

    // Generate JSONL content
    const jsonlContent = generateJSONLContent(input, messages, classification);

    // Write to file
    const jsonlPath = getJSONLPath(input.session_id);
    appendToFile(jsonlPath, jsonlContent);

    logInfo(
      `Captured ${messages.length} messages to ${jsonlPath} ` +
        `(classified as ${classification.category}, confidence: ${classification.confidence.toFixed(2)})`
    );

    exitSuccess();
  } catch (e) {
    // Log error but don't block session end
    logError(`Failed to capture history: ${e instanceof Error ? e.message : 'unknown error'}`);
    exitSuccess();
  }
}

main();
