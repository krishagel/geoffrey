/**
 * Content Classifier for Geoffrey Session Analysis
 *
 * Classifies conversation transcripts into categories:
 * - research: Exploratory queries, investigations, analysis
 * - decision: Choice-making, comparisons, approach selection
 * - daily-log: General tasks, commands, brief interactions
 *
 * Also extracts topics for folder routing (especially Research/{topic}/)
 */

import type { TranscriptMessage } from './utils';

// ============================================================================
// Types
// ============================================================================

export type ContentCategory = 'research' | 'decision' | 'daily-log';

export interface ClassificationResult {
  category: ContentCategory;
  topics: string[];
  topicSlug: string;
  confidence: number;
  metadata: {
    messageCount: number;
    turnCount: number;
    keywordsFound: string[];
    primaryTopic: string;
  };
}

interface KeywordPattern {
  keywords: string[];
  weight: number;
}

// ============================================================================
// Classification Patterns
// ============================================================================

const RESEARCH_PATTERNS: KeywordPattern = {
  keywords: [
    'research',
    'investigate',
    'analyze',
    'explore',
    'compare',
    'study',
    'examine',
    'look into',
    'find out',
    'what is',
    'how does',
    'why does',
    'understand',
    'learn about',
  ],
  weight: 1.0,
};

const DECISION_PATTERNS: KeywordPattern = {
  keywords: [
    'decide',
    'choose',
    'should i',
    'which one',
    'better option',
    'approach',
    'strategy',
    'recommend',
    'prefer',
    'between',
    'versus',
    'vs',
    'pros and cons',
    'trade-off',
    'tradeoff',
  ],
  weight: 0.9,
};

// Keywords that reduce confidence in research/decision classification
const DAILY_INDICATORS: string[] = [
  'add task',
  'create task',
  'omnifocus',
  'email',
  'send',
  'update',
  'fix',
  'run',
  'execute',
  'commit',
  'push',
  'deploy',
];

// ============================================================================
// Classification Logic
// ============================================================================

/**
 * Classify a conversation transcript into a content category
 */
export function classifyContent(messages: TranscriptMessage[]): ClassificationResult {
  if (!messages || messages.length === 0) {
    return createDefaultResult();
  }

  // Combine all user messages for analysis
  const userMessages = messages.filter((m) => m.role === 'user');
  const allUserText = userMessages.map((m) => m.content || '').join(' ').toLowerCase();

  // Count keyword matches
  const researchMatches = countKeywordMatches(allUserText, RESEARCH_PATTERNS.keywords);
  const decisionMatches = countKeywordMatches(allUserText, DECISION_PATTERNS.keywords);
  const dailyMatches = countKeywordMatches(allUserText, DAILY_INDICATORS);

  // Calculate scores
  const researchScore = researchMatches.count * RESEARCH_PATTERNS.weight;
  const decisionScore = decisionMatches.count * DECISION_PATTERNS.weight;
  const dailyPenalty = dailyMatches.count * 0.5;

  // Extract topics
  const topics = extractTopics(userMessages);
  const primaryTopic = topics[0] || 'general';
  const topicSlug = generateTopicSlug(primaryTopic);

  // Determine category and confidence
  let category: ContentCategory;
  let confidence: number;
  const allKeywords = [...researchMatches.keywords, ...decisionMatches.keywords];

  if (researchScore > decisionScore && researchScore > dailyPenalty) {
    category = 'research';
    confidence = Math.min(0.95, 0.5 + researchScore * 0.1);
  } else if (decisionScore > researchScore && decisionScore > dailyPenalty) {
    category = 'decision';
    confidence = Math.min(0.9, 0.5 + decisionScore * 0.1);
  } else {
    category = 'daily-log';
    confidence = 0.7;
  }

  // Reduce confidence if mixed signals
  if (researchScore > 0 && decisionScore > 0) {
    confidence *= 0.9;
  }

  return {
    category,
    topics,
    topicSlug,
    confidence,
    metadata: {
      messageCount: messages.length,
      turnCount: Math.ceil(userMessages.length),
      keywordsFound: allKeywords,
      primaryTopic,
    },
  };
}

/**
 * Count keyword matches in text
 */
function countKeywordMatches(
  text: string,
  keywords: string[]
): { count: number; keywords: string[] } {
  const found: string[] = [];
  let count = 0;

  for (const keyword of keywords) {
    // Use word boundary matching for more accuracy
    const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches) {
      count += matches.length;
      found.push(keyword);
    }
  }

  return { count, keywords: found };
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// Topic Extraction
// ============================================================================

/**
 * Extract topics from user messages
 */
function extractTopics(messages: TranscriptMessage[]): string[] {
  if (messages.length === 0) return ['general'];

  const topics: string[] = [];
  const firstUserMessage = messages.find((m) => m.role === 'user');

  if (!firstUserMessage?.content) return ['general'];

  // Pattern 1: Explicit research/investigate patterns
  const explicitPattern =
    /(?:research|investigate|analyze|explore|compare|study)\s+(?:the\s+)?([a-z0-9][a-z0-9\s'-]{2,50}?)(?:\s+for|\s+in|\s+vs|\s+versus|\.|\,|\?|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = explicitPattern.exec(firstUserMessage.content)) !== null) {
    const topic = match[1]?.trim();
    if (topic && topic.length >= 3) {
      topics.push(topic);
    }
  }

  // Pattern 2: "About X" or "regarding X" patterns
  const aboutPattern =
    /(?:about|regarding|concerning|on\s+the\s+topic\s+of)\s+([a-z0-9][a-z0-9\s'-]{2,50}?)(?:\s+for|\s+in|\.|\,|\?|$)/gi;
  while ((match = aboutPattern.exec(firstUserMessage.content)) !== null) {
    const topic = match[1]?.trim();
    if (topic && topic.length >= 3 && !topics.includes(topic)) {
      topics.push(topic);
    }
  }

  // Pattern 3: Fallback to first meaningful noun phrase
  if (topics.length === 0) {
    const words = firstUserMessage.content
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 5);
    const fallbackTopic = words.join(' ').slice(0, 50);
    if (fallbackTopic) {
      topics.push(fallbackTopic);
    }
  }

  return topics.length > 0 ? topics : ['general'];
}

/**
 * Generate a URL-safe slug from a topic
 */
export function generateTopicSlug(topic: string): string {
  if (!topic || !topic.trim()) return 'general';

  const slug = topic
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .trim()
    .replace(/\s+/g, '-') // Spaces to hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .slice(0, 50) // Limit length
    .replace(/^-|-$/g, ''); // Trim hyphens

  return slug || 'general';
}

/**
 * Create a default classification result for empty transcripts
 */
function createDefaultResult(): ClassificationResult {
  return {
    category: 'daily-log',
    topics: ['general'],
    topicSlug: 'general',
    confidence: 0.5,
    metadata: {
      messageCount: 0,
      turnCount: 0,
      keywordsFound: [],
      primaryTopic: 'general',
    },
  };
}

// ============================================================================
// Utility Exports
// ============================================================================

/**
 * Check if a classification is high-confidence
 */
export function isHighConfidence(result: ClassificationResult): boolean {
  return result.confidence >= 0.8;
}

/**
 * Get human-readable category description
 */
export function getCategoryDescription(category: ContentCategory): string {
  switch (category) {
    case 'research':
      return 'Research & Analysis';
    case 'decision':
      return 'Decision Making';
    case 'daily-log':
      return 'Daily Activity';
  }
}
