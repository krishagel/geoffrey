#!/usr/bin/env bun
/**
 * SessionStart Hook: Load Context
 *
 * Loads working memory state from ~/.geoffrey/state/current-work.json
 * and displays it at session start for continuity.
 *
 * Output on stdout is shown to the user as a system message.
 *
 * Exit codes:
 * - 0: Success
 * - 1: Non-blocking error (logged but continues)
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import {
  logInfo,
  logError,
  exitSuccess,
} from '../shared/utils';

// ============================================================================
// Types
// ============================================================================

interface CurrentWork {
  version: string;
  lastUpdated: string;
  sessionId?: string;
  activeTask?: {
    description: string;
    status: string;
    files: string[];
    notes?: string;
  };
  recentContext?: {
    lastSkillUsed?: string;
    lastProject?: string;
    pendingActions?: string[];
  };
}

// ============================================================================
// State Loading
// ============================================================================

const STATE_DIR = resolve(process.env.HOME || '~', '.geoffrey', 'state');
const CURRENT_WORK_PATH = resolve(STATE_DIR, 'current-work.json');

/**
 * Load current work state if it exists
 */
function loadCurrentWork(): CurrentWork | null {
  try {
    if (!existsSync(CURRENT_WORK_PATH)) {
      return null;
    }
    const content = readFileSync(CURRENT_WORK_PATH, 'utf-8');
    return JSON.parse(content) as CurrentWork;
  } catch (e) {
    logError(`Failed to load working memory: ${e instanceof Error ? e.message : 'unknown'}`);
    return null;
  }
}

/**
 * Check if the state is stale (older than 24 hours)
 */
function isStale(lastUpdated: string): boolean {
  try {
    const updated = new Date(lastUpdated).getTime();
    const now = Date.now();
    const hoursSince = (now - updated) / (1000 * 60 * 60);
    return hoursSince > 24;
  } catch {
    return true;
  }
}

/**
 * Format time since last update as human-readable string
 */
function timeSince(lastUpdated: string): string {
  try {
    const updated = new Date(lastUpdated).getTime();
    const now = Date.now();
    const minutes = Math.floor((now - updated) / (1000 * 60));

    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return 'unknown';
  }
}

// ============================================================================
// Main Hook Logic
// ============================================================================

async function main(): Promise<void> {
  try {
    const work = loadCurrentWork();

    if (!work) {
      // No working memory - clean start, nothing to display
      exitSuccess();
    }

    // Check staleness
    if (isStale(work.lastUpdated)) {
      logInfo('Working memory is stale (>24h), skipping display');
      exitSuccess();
    }

    // Build context message for Claude
    const lines: string[] = [];
    lines.push('[Geoffrey Working Memory]');

    if (work.activeTask) {
      lines.push(`Active task: ${work.activeTask.description} (${work.activeTask.status})`);
      if (work.activeTask.files.length > 0) {
        lines.push(`Files: ${work.activeTask.files.join(', ')}`);
      }
      if (work.activeTask.notes) {
        lines.push(`Notes: ${work.activeTask.notes}`);
      }
    }

    if (work.recentContext) {
      const ctx = work.recentContext;
      if (ctx.lastSkillUsed) {
        lines.push(`Last skill: ${ctx.lastSkillUsed}`);
      }
      if (ctx.lastProject) {
        lines.push(`Last project: ${ctx.lastProject}`);
      }
      if (ctx.pendingActions && ctx.pendingActions.length > 0) {
        lines.push(`Pending: ${ctx.pendingActions.join('; ')}`);
      }
    }

    lines.push(`Updated: ${timeSince(work.lastUpdated)}`);

    // Only output if there's meaningful context
    if (lines.length > 2) {
      console.log(lines.join('\n'));
    }

    exitSuccess();
  } catch (e) {
    logError(`Session start hook error: ${e instanceof Error ? e.message : 'unknown'}`);
    exitSuccess();
  }
}

main();
