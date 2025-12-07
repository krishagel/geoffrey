#!/usr/bin/env bun

/**
 * Check if quarterly identity review is due
 * Reads identity-core.json and compares next_review date to today
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const IDENTITY_CORE_PATH = join(
  process.env.HOME,
  'Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/knowledge/identity-core.json'
);

function main() {
  try {
    // Read identity-core.json
    const identityCore = JSON.parse(readFileSync(IDENTITY_CORE_PATH, 'utf8'));

    const nextReview = new Date(identityCore.next_review);
    const today = new Date();

    // Calculate days until review
    const msUntilReview = nextReview - today;
    const daysUntilReview = Math.ceil(msUntilReview / (1000 * 60 * 60 * 24));

    const result = {
      next_review_date: identityCore.next_review,
      days_until_review: daysUntilReview,
      is_due: daysUntilReview <= 0,
      is_soon: daysUntilReview <= 7 && daysUntilReview > 0,
      current_version: identityCore.version,
      last_updated: identityCore.last_updated,
      confidence: identityCore.confidence.overall
    };

    console.log(JSON.stringify(result, null, 2));

    // Exit code indicates status
    if (result.is_due) {
      process.exit(1); // Due now
    } else if (result.is_soon) {
      process.exit(2); // Due soon
    } else {
      process.exit(0); // Not due
    }

  } catch (error) {
    console.error(JSON.stringify({
      error: error.message,
      path: IDENTITY_CORE_PATH
    }, null, 2));
    process.exit(3); // Error
  }
}

main();
