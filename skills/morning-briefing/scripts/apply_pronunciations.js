#!/usr/bin/env bun
/**
 * Apply pronunciation substitutions to podcast text
 * Usage: bun apply_pronunciations.js < input.txt > output.txt
 *        bun apply_pronunciations.js --file /path/to/podcast.txt
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const guideFile = join(__dirname, '..', 'pronunciation_guide.json');

function loadPronunciations() {
  try {
    const guide = JSON.parse(readFileSync(guideFile, 'utf-8'));
    return guide.names || {};
  } catch (e) {
    console.error(`Warning: Could not load pronunciation guide: ${e.message}`);
    return {};
  }
}

function applyPronunciations(text, pronunciations) {
  let result = text;

  for (const [original, phonetic] of Object.entries(pronunciations)) {
    // Replace whole word matches (case-insensitive, preserve case of first letter)
    const regex = new RegExp(`\\b${original}\\b`, 'gi');
    result = result.replace(regex, (match) => {
      // Preserve capitalization
      if (match[0] === match[0].toUpperCase()) {
        return phonetic.charAt(0).toUpperCase() + phonetic.slice(1);
      }
      return phonetic.toLowerCase();
    });
  }

  return result;
}

// Main
const pronunciations = loadPronunciations();
const args = process.argv.slice(2);

if (args.includes('--file')) {
  const fileIndex = args.indexOf('--file') + 1;
  const filePath = args[fileIndex];

  if (!filePath) {
    console.error('Error: --file requires a path argument');
    process.exit(1);
  }

  const text = readFileSync(filePath, 'utf-8');
  const result = applyPronunciations(text, pronunciations);
  writeFileSync(filePath, result);
  console.error(`Applied ${Object.keys(pronunciations).length} pronunciation rules to ${filePath}`);
} else if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Apply pronunciation substitutions to podcast text.

Usage:
  bun apply_pronunciations.js --file /path/to/podcast.txt  # Modify file in-place
  cat podcast.txt | bun apply_pronunciations.js            # Pipe mode

Pronunciation guide: ${guideFile}
`);
} else {
  // Pipe mode - read from stdin
  const text = readFileSync(0, 'utf-8'); // 0 = stdin
  const result = applyPronunciations(text, pronunciations);
  process.stdout.write(result);
}
