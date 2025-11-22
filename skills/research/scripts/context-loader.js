#!/usr/bin/env bun

/**
 * Domain Context Loader
 *
 * Loads relevant user context from preferences based on detected research domain.
 *
 * Usage: bun context-loader.js <domain>
 *
 * Domains: travel, work_education, shopping, ai_coding, consulting
 */

import fs from 'fs';
import path from 'path';

const PREFERENCES_PATH = path.join(
  process.env.HOME,
  'Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/knowledge/preferences.json'
);

function loadPreferences() {
  const content = fs.readFileSync(PREFERENCES_PATH, 'utf-8');
  return JSON.parse(content);
}

function getNestedValue(obj, keyPath) {
  return keyPath.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
}

function detectDomain(query) {
  const queryLower = query.toLowerCase();

  const domainPatterns = {
    travel: ['trip', 'vacation', 'hotel', 'flight', 'points', 'miles', 'ski', 'travel', 'resort', 'airline', 'marriott', 'alaska'],
    work_education: ['school', 'district', 'education', 'udl', 'learning', 'student', 'teacher', 'psd', 'k-12', 'iste', 'cosn'],
    shopping: ['buy', 'purchase', 'product', 'review', 'price', 'deal', 'compare', 'best', 'recommend'],
    ai_coding: ['code', 'programming', 'api', 'framework', 'library', 'github', 'ai', 'llm', 'model', 'development'],
    consulting: ['strategy', 'client', 'engagement', 'project', 'consulting', 'advisory']
  };

  for (const [domain, patterns] of Object.entries(domainPatterns)) {
    if (patterns.some(p => queryLower.includes(p))) {
      return domain;
    }
  }

  return 'general';
}

function loadDomainContext(domain, preferences) {
  const domainConfig = preferences.preferences.research_domains?.[domain];

  if (!domainConfig) {
    return {
      domain,
      context: {},
      patterns: [],
      dynamic_data: []
    };
  }

  // Load context from specified keys
  const context = {};
  for (const keyPath of domainConfig.context_keys || []) {
    const value = getNestedValue(preferences.preferences, keyPath);
    if (value) {
      context[keyPath] = value;
    }
  }

  return {
    domain,
    context,
    patterns: domainConfig.research_patterns || [],
    dynamic_data: domainConfig.fetch_dynamic || []
  };
}

async function main() {
  const args = process.argv.slice(2);
  const domainOrQuery = args.join(' ');

  if (!domainOrQuery) {
    console.error(JSON.stringify({
      error: 'Missing domain or query',
      usage: 'bun context-loader.js <domain or query>',
      domains: ['travel', 'work_education', 'shopping', 'ai_coding', 'consulting']
    }));
    process.exit(1);
  }

  try {
    const preferences = loadPreferences();

    // Check if it's a known domain name or a query to detect from
    const knownDomains = ['travel', 'work_education', 'shopping', 'ai_coding', 'consulting'];
    const domain = knownDomains.includes(domainOrQuery.toLowerCase())
      ? domainOrQuery.toLowerCase()
      : detectDomain(domainOrQuery);

    const result = loadDomainContext(domain, preferences);

    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error(JSON.stringify({
      error: error.message
    }));
    process.exit(1);
  }
}

main();

module.exports = { loadPreferences, detectDomain, loadDomainContext };
