/**
 * Tests for Content Classifier
 *
 * Run with: bun test hooks/session-end/__tests__/classifier.test.ts
 */

import { describe, test, expect } from 'bun:test';
import {
  classifyContent,
  generateTopicSlug,
  isHighConfidence,
  getCategoryDescription,
  type ClassificationResult,
} from '../../shared/classifier';
import type { TranscriptMessage } from '../../shared/utils';

// ============================================================================
// Test Fixtures
// ============================================================================

const RESEARCH_TRANSCRIPT: TranscriptMessage[] = [
  {
    role: 'user',
    content: 'Research the best TypeScript testing frameworks for 2025',
    timestamp: '2025-12-29T10:00:00Z',
  },
  {
    role: 'assistant',
    content: 'Based on my analysis of testing frameworks, here are the top options:\n- Bun test (built-in)\n- Vitest (fast, Vite-native)\n- Jest (mature ecosystem)',
    timestamp: '2025-12-29T10:01:00Z',
  },
];

const DECISION_TRANSCRIPT: TranscriptMessage[] = [
  {
    role: 'user',
    content: 'Help me decide between PostgreSQL and MongoDB for this project',
    timestamp: '2025-12-29T10:00:00Z',
  },
  {
    role: 'assistant',
    content: 'Let me compare these options based on your requirements. PostgreSQL is better for relational data...',
    timestamp: '2025-12-29T10:01:00Z',
  },
];

const DAILY_LOG_TRANSCRIPT: TranscriptMessage[] = [
  {
    role: 'user',
    content: 'Add a task to OmniFocus for the team meeting tomorrow',
    timestamp: '2025-12-29T10:00:00Z',
  },
  {
    role: 'assistant',
    content: 'Task added successfully to OmniFocus.',
    timestamp: '2025-12-29T10:00:30Z',
  },
];

// ============================================================================
// Classification Tests
// ============================================================================

describe('Content Classification', () => {
  test('classifies research conversations by keywords', () => {
    const result = classifyContent(RESEARCH_TRANSCRIPT);

    expect(result.category).toBe('research');
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.metadata.keywordsFound).toContain('research');
  });

  test('classifies decision conversations', () => {
    const result = classifyContent(DECISION_TRANSCRIPT);

    expect(result.category).toBe('decision');
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.metadata.keywordsFound).toContain('decide');
  });

  test('defaults to daily-log for general conversations', () => {
    const result = classifyContent(DAILY_LOG_TRANSCRIPT);

    expect(result.category).toBe('daily-log');
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  test('handles empty transcripts', () => {
    const result = classifyContent([]);

    expect(result.category).toBe('daily-log');
    expect(result.confidence).toBe(0.5);
    expect(result.topics).toContain('general');
  });

  test('handles transcripts with missing content', () => {
    const malformed: TranscriptMessage[] = [
      { role: 'user', content: '' },
      { role: 'assistant', content: '' },
    ];

    const result = classifyContent(malformed);

    expect(result.category).toBe('daily-log');
    expect(result.topicSlug).toBe('general');
  });

  test('keyword matching is case-insensitive', () => {
    const uppercase: TranscriptMessage[] = [
      { role: 'user', content: 'RESEARCH THIS TOPIC' },
    ];

    const result = classifyContent(uppercase);

    expect(result.category).toBe('research');
  });

  test('research takes priority over decision when both present', () => {
    const mixed: TranscriptMessage[] = [
      {
        role: 'user',
        content: 'Research options to help decide on cloud provider',
      },
    ];

    const result = classifyContent(mixed);

    // Research has weight 1.0, decision 0.9, so research wins
    expect(result.category).toBe('research');
  });

  test('reduces confidence for mixed signals', () => {
    const mixed: TranscriptMessage[] = [
      { role: 'user', content: 'Research and decide on the best approach' },
    ];

    const mixedResult = classifyContent(mixed);

    // Mixed signals should have reduced confidence due to the 0.9 multiplier
    // The confidence should be less than 0.95 (max research confidence)
    expect(mixedResult.confidence).toBeLessThan(0.95);
    // But still classified as something
    expect(['research', 'decision', 'daily-log']).toContain(mixedResult.category);
  });
});

// ============================================================================
// Topic Extraction Tests
// ============================================================================

describe('Topic Extraction', () => {
  test('extracts topic from research query', () => {
    const transcript: TranscriptMessage[] = [
      { role: 'user', content: 'Research Whistler ski season 2026' },
    ];

    const result = classifyContent(transcript);

    expect(result.topics.length).toBeGreaterThan(0);
    expect(result.topicSlug).not.toBe('general');
  });

  test('extracts topic from analyze/investigate patterns', () => {
    const transcript: TranscriptMessage[] = [
      { role: 'user', content: 'Investigate GraphQL performance issues' },
    ];

    const result = classifyContent(transcript);

    expect(result.metadata.primaryTopic).toBeTruthy();
    expect(result.metadata.primaryTopic).not.toBe('general');
  });

  test('handles multi-turn conversations', () => {
    const transcript: TranscriptMessage[] = [
      { role: 'user', content: 'Tell me about React' },
      { role: 'assistant', content: 'React is a JavaScript library...' },
      { role: 'user', content: 'Now compare it to Vue' },
      { role: 'assistant', content: 'Vue differs in several ways...' },
    ];

    const result = classifyContent(transcript);

    expect(result.metadata.turnCount).toBe(2);
  });

  test('limits topic length', () => {
    const longTopic: TranscriptMessage[] = [
      {
        role: 'user',
        content: 'Research ' + 'a'.repeat(200) + ' very long topic name',
      },
    ];

    const result = classifyContent(longTopic);

    expect(result.topicSlug.length).toBeLessThanOrEqual(50);
  });
});

// ============================================================================
// Topic Slug Generation Tests
// ============================================================================

describe('Topic Slug Generation', () => {
  test('generates URL-safe slugs', () => {
    const slug = generateTopicSlug('GraphQL Performance Testing');

    expect(slug).toBe('graphql-performance-testing');
    expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  test('handles special characters', () => {
    const slug = generateTopicSlug('C++ vs Rust: A Comparison!');

    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(slug).not.toContain('+');
    expect(slug).not.toContain(':');
    expect(slug).not.toContain('!');
  });

  test('handles unicode/diacritics', () => {
    const slug = generateTopicSlug('café management système');

    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(slug).toContain('cafe');
    expect(slug).toContain('systeme');
  });

  test('collapses multiple hyphens', () => {
    const slug = generateTopicSlug('foo   ---   bar');

    expect(slug).not.toContain('--');
    expect(slug).toBe('foo-bar');
  });

  test('trims leading/trailing hyphens', () => {
    const slug = generateTopicSlug('  -topic name-  ');

    expect(slug).not.toMatch(/^-/);
    expect(slug).not.toMatch(/-$/);
  });

  test('returns general for empty input', () => {
    expect(generateTopicSlug('')).toBe('general');
    expect(generateTopicSlug('   ')).toBe('general');
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('Utility Functions', () => {
  test('isHighConfidence returns true for >= 0.8', () => {
    const highConfidence: ClassificationResult = {
      category: 'research',
      topics: ['test'],
      topicSlug: 'test',
      confidence: 0.85,
      metadata: {
        messageCount: 2,
        turnCount: 1,
        keywordsFound: ['research'],
        primaryTopic: 'test',
      },
    };

    const lowConfidence: ClassificationResult = {
      ...highConfidence,
      confidence: 0.6,
    };

    expect(isHighConfidence(highConfidence)).toBe(true);
    expect(isHighConfidence(lowConfidence)).toBe(false);
  });

  test('getCategoryDescription returns readable strings', () => {
    expect(getCategoryDescription('research')).toBe('Research & Analysis');
    expect(getCategoryDescription('decision')).toBe('Decision Making');
    expect(getCategoryDescription('daily-log')).toBe('Daily Activity');
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  test('handles only assistant messages (no user input)', () => {
    const onlyAssistant: TranscriptMessage[] = [
      { role: 'assistant', content: 'Hello, how can I help?' },
    ];

    const result = classifyContent(onlyAssistant);

    expect(result.category).toBe('daily-log');
    expect(result.confidence).toBeLessThan(0.8);
  });

  test('handles very short messages', () => {
    const short: TranscriptMessage[] = [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello' },
    ];

    const result = classifyContent(short);

    expect(result.category).toBe('daily-log');
  });

  test('handles messages with only special characters', () => {
    const special: TranscriptMessage[] = [
      { role: 'user', content: '!@#$%^&*()' },
    ];

    const result = classifyContent(special);

    expect(result.category).toBe('daily-log');
    expect(result.topicSlug).toBe('general');
  });

  test('handles undefined content gracefully', () => {
    const undefined_content: TranscriptMessage[] = [
      { role: 'user', content: undefined as unknown as string },
    ];

    // Should not throw
    const result = classifyContent(undefined_content);

    expect(result.category).toBe('daily-log');
  });
});
