#!/usr/bin/env bun
/**
 * SessionEnd Hook: Save Working Memory State
 *
 * Extracts active task context from the conversation and persists it
 * to ~/.geoffrey/state/current-work.json for cross-session continuity.
 *
 * Detects:
 * - Active tasks being worked on (files modified, descriptions)
 * - Last skill used
 * - Pending actions mentioned
 *
 * Exit codes:
 * - 0: Success (non-blocking)
 * - 1: Non-blocking error (logged but continues)
 */

import { resolve } from 'path';
import {
  parseStdin,
  readTranscript,
  writeJsonFile,
  logInfo,
  logError,
  exitSuccess,
  getCurrentTimestamp,
  type SessionEndInput,
  type TranscriptMessage,
} from '../shared/utils';

// ============================================================================
// Types
// ============================================================================

interface CurrentWork {
  version: string;
  lastUpdated: string;
  sessionId: string;
  activeTask: {
    description: string;
    status: string;
    files: string[];
    notes?: string;
  } | null;
  recentContext: {
    lastSkillUsed?: string;
    lastProject?: string;
    pendingActions?: string[];
  } | null;
}

// ============================================================================
// Extraction Logic
// ============================================================================

const STATE_DIR = resolve(process.env.HOME || '~', '.geoffrey', 'state');
const CURRENT_WORK_PATH = resolve(STATE_DIR, 'current-work.json');

/**
 * Extract files mentioned as modified in assistant messages
 */
function extractModifiedFiles(messages: TranscriptMessage[]): string[] {
  const files = new Set<string>();
  const patterns = [
    /(?:created?|modified?|updated?|wrote|edited?|writing)\s+(?:file\s+)?["`']?([^\s"`'\n]+\.[a-z]{1,10})["`']?/gi,
    /(?:Write|Edit)\s+(?:to\s+)?["`']?([^\s"`'\n]+\.[a-z]{1,10})["`']?/gi,
  ];

  for (const message of messages) {
    if (message.role !== 'assistant') continue;
    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(message.content)) !== null) {
        const file = match[1];
        if (file && !file.includes('...') && file.length < 200) {
          files.add(file);
        }
      }
    }
  }

  return Array.from(files).slice(0, 10);
}

/**
 * Extract the last skill invoked (if any)
 */
function extractLastSkill(messages: TranscriptMessage[]): string | undefined {
  const skillPattern = /(?:\/|Skill\()(?:geoffrey:)?([a-z-]+)/gi;
  let lastSkill: string | undefined;

  for (const msg of messages) {
    let match: RegExpExecArray | null;
    while ((match = skillPattern.exec(msg.content)) !== null) {
      lastSkill = match[1];
    }
  }

  return lastSkill;
}

/**
 * Extract pending actions from the last assistant message
 */
function extractPendingActions(messages: TranscriptMessage[]): string[] {
  const actions: string[] = [];
  const assistantMessages = messages.filter((m) => m.role === 'assistant');
  const lastAssistant = assistantMessages[assistantMessages.length - 1];

  if (!lastAssistant?.content) return actions;

  // Look for "Next Steps" or "TODO" sections
  const nextStepsPattern = /(?:next steps?|todo|pending|follow.?up)[:\s]*\n((?:[-*•]\s+.+\n?)+)/gi;
  let match: RegExpExecArray | null;

  while ((match = nextStepsPattern.exec(lastAssistant.content)) !== null) {
    const items = match[1].split('\n')
      .map(line => line.replace(/^[-*•]\s+/, '').trim())
      .filter(line => line.length > 5 && line.length < 200);
    actions.push(...items);
  }

  return actions.slice(0, 5);
}

/**
 * Generate a brief task description from the first user message
 */
function extractTaskDescription(messages: TranscriptMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser?.content) return '';

  const firstLine = firstUser.content.split('\n')[0]?.trim() || '';
  return firstLine.slice(0, 200);
}

/**
 * Detect the project being worked on from cwd
 */
function extractProject(cwd: string): string | undefined {
  // Extract the last directory component as project name
  const parts = cwd.split('/').filter(Boolean);
  return parts[parts.length - 1];
}

// ============================================================================
// Main Hook Logic
// ============================================================================

async function main(): Promise<void> {
  try {
    const input = await parseStdin<SessionEndInput>();
    const messages = readTranscript(input.transcript_path);

    if (messages.length === 0) {
      logInfo('Empty transcript, skipping state save');
      exitSuccess();
    }

    // Only save state for substantial sessions (>4 messages)
    if (messages.length < 4) {
      logInfo('Short session, skipping state save');
      exitSuccess();
    }

    const files = extractModifiedFiles(messages);
    const lastSkill = extractLastSkill(messages);
    const pendingActions = extractPendingActions(messages);
    const taskDescription = extractTaskDescription(messages);
    const project = extractProject(input.cwd);

    const state: CurrentWork = {
      version: '1.0.0',
      lastUpdated: getCurrentTimestamp(),
      sessionId: input.session_id,
      activeTask: taskDescription ? {
        description: taskDescription,
        status: 'in-progress',
        files,
        notes: pendingActions.length > 0 ? `Pending: ${pendingActions.join('; ')}` : undefined,
      } : null,
      recentContext: {
        lastSkillUsed: lastSkill,
        lastProject: project,
        pendingActions: pendingActions.length > 0 ? pendingActions : undefined,
      },
    };

    writeJsonFile(CURRENT_WORK_PATH, state);
    logInfo(`Saved working memory state (${files.length} files, skill: ${lastSkill || 'none'})`);

    exitSuccess();
  } catch (e) {
    logError(`Failed to save state: ${e instanceof Error ? e.message : 'unknown error'}`);
    exitSuccess();
  }
}

main();
