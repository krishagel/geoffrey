#!/usr/bin/env bun
/**
 * SessionEnd Hook: Extract Learnings
 *
 * Parses the conversation transcript to identify user preferences
 * and updates the preferences.json file.
 *
 * Preference extraction is rule-based (Phase 1):
 * - Looks for explicit preference statements
 * - Identifies corrections and clarifications
 * - Extracts behavioral patterns
 *
 * Exit codes:
 * - 0: Success (learnings extracted or none found)
 * - 1: Non-blocking error (logged but continues)
 */

import { resolve } from 'path';
import {
  parseStdin,
  readTranscript,
  readJsonFile,
  writeJsonFile,
  getKnowledgePath,
  logInfo,
  logError,
  exitSuccess,
  exitWarning,
  getCurrentTimestamp,
  type SessionEndInput,
  type TranscriptMessage,
} from '../shared/utils';

// ============================================================================
// Types
// ============================================================================

interface PreferenceEntry {
  category: string;
  preference: string;
  confidence: number; // 0.0-1.0
  lastUpdated: string;
  source?: string; // session_id that created/updated
}

interface PreferencesFile {
  version: string;
  lastUpdated: string;
  preferences: PreferenceEntry[];
}

interface ExtractedPreference {
  category: string;
  preference: string;
  confidence: number;
}

// ============================================================================
// Preference Extraction Patterns
// ============================================================================

const PREFERENCE_PATTERNS = [
  // Explicit preference statements
  {
    pattern: /(?:always|never|prefer|want you to|please always|don't|do not)\s+(.{10,100})/gi,
    category: 'behavior',
    confidence: 0.9,
  },
  // Call me / name preferences
  {
    pattern: /(?:call me|my name is|i'm|i am)\s+([A-Z][a-z]+)/gi,
    category: 'identity',
    confidence: 0.95,
  },
  // Tool/runtime preferences
  {
    pattern: /(?:use|prefer|switch to|run with)\s+(bun|node|npm|yarn|pnpm)(?:\s|$)/gi,
    category: 'development',
    confidence: 0.85,
  },
  // Format preferences
  {
    pattern: /(?:format|output|respond|write)(?:\s+\w+)?\s+(?:in|as|using)\s+(markdown|json|yaml|bullet|list)/gi,
    category: 'format',
    confidence: 0.8,
  },
  // Corrections (high signal)
  {
    pattern: /(?:no,?\s+)?(?:actually|instead|rather|correct(?:ion)?)\s*[,:]\s*(.{10,100})/gi,
    category: 'correction',
    confidence: 0.95,
  },
  // Style preferences
  {
    pattern: /(?:keep|make)\s+(?:it|responses?|answers?)\s+(short|brief|concise|detailed|verbose)/gi,
    category: 'style',
    confidence: 0.85,
  },
];

// Categories to skip (not user preferences)
const SKIP_CATEGORIES = ['task', 'question', 'clarification'];

// ============================================================================
// Extraction Logic
// ============================================================================

/**
 * Extract preferences from a single message
 */
function extractFromMessage(message: TranscriptMessage): ExtractedPreference[] {
  if (message.role !== 'user') return [];

  const content = message.content;
  const preferences: ExtractedPreference[] = [];

  for (const { pattern, category, confidence } of PREFERENCE_PATTERNS) {
    const regex = new RegExp(pattern);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      const extracted = match[1]?.trim();
      if (extracted && extracted.length >= 5 && extracted.length <= 200) {
        preferences.push({
          category,
          preference: normalizePreference(extracted, category),
          confidence,
        });
      }
    }
  }

  return preferences;
}

/**
 * Normalize extracted preference text
 */
function normalizePreference(text: string, category: string): string {
  // Remove trailing punctuation
  let normalized = text.replace(/[.,;:!?]+$/, '').trim();

  // Capitalize first letter
  normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);

  // Add context for corrections
  if (category === 'correction') {
    normalized = `User corrected: ${normalized}`;
  }

  return normalized;
}

/**
 * Deduplicate and merge preferences
 */
function mergePreferences(
  existing: PreferenceEntry[],
  newPrefs: ExtractedPreference[],
  sessionId: string
): PreferenceEntry[] {
  const merged = [...existing];
  const timestamp = getCurrentTimestamp();

  for (const newPref of newPrefs) {
    // Check for similar existing preference
    const existingIndex = merged.findIndex(
      (e) =>
        e.category === newPref.category &&
        isSimilar(e.preference, newPref.preference)
    );

    if (existingIndex >= 0) {
      // Update existing preference if new one has higher confidence
      if (newPref.confidence > merged[existingIndex].confidence) {
        merged[existingIndex] = {
          ...merged[existingIndex],
          preference: newPref.preference,
          confidence: newPref.confidence,
          lastUpdated: timestamp,
          source: sessionId,
        };
      }
    } else {
      // Add new preference
      merged.push({
        category: newPref.category,
        preference: newPref.preference,
        confidence: newPref.confidence,
        lastUpdated: timestamp,
        source: sessionId,
      });
    }
  }

  return merged;
}

/**
 * Check if two preferences are similar (fuzzy match)
 */
function isSimilar(a: string, b: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const aNorm = normalize(a);
  const bNorm = normalize(b);

  // Exact match after normalization
  if (aNorm === bNorm) return true;

  // One contains the other
  if (aNorm.includes(bNorm) || bNorm.includes(aNorm)) return true;

  // TODO: Add Levenshtein distance for fuzzy matching

  return false;
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
      logInfo('Empty transcript, no learnings to extract');
      exitSuccess();
    }

    // Extract preferences from all user messages
    const allPreferences: ExtractedPreference[] = [];
    for (const message of transcript) {
      const prefs = extractFromMessage(message);
      allPreferences.push(...prefs);
    }

    if (allPreferences.length === 0) {
      logInfo('No preferences detected in session');
      exitSuccess();
    }

    // Load existing learned preferences (separate from manual preferences.json)
    const preferencesPath = resolve(getKnowledgePath(), 'learned-preferences.json');
    const existingFile = readJsonFile<PreferencesFile>(preferencesPath);

    const existingPrefs = existingFile?.preferences ?? [];

    // Merge preferences
    const mergedPrefs = mergePreferences(existingPrefs, allPreferences, input.session_id);

    // Write updated preferences
    const updatedFile: PreferencesFile = {
      version: '1.0.0',
      lastUpdated: getCurrentTimestamp(),
      preferences: mergedPrefs,
    };

    writeJsonFile(preferencesPath, updatedFile);

    logInfo(
      `Extracted ${allPreferences.length} preferences, ` +
        `total: ${mergedPrefs.length} (${mergedPrefs.length - existingPrefs.length} new)`
    );

    exitSuccess();
  } catch (e) {
    // Log error but don't block
    logError(`Failed to extract learnings: ${e instanceof Error ? e.message : 'unknown error'}`);
    exitSuccess();
  }
}

main();
