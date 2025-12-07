#!/usr/bin/env bun

/**
 * Extract Social Media Post Samples for Voice Analysis
 *
 * Fetches social media posts from LinkedIn and X/Twitter using browser-control.
 * Requires Geoffrey Chrome profile to be running with user logged in.
 *
 * Usage:
 *   # LinkedIn
 *   bun scripts/extract-social-samples.js \
 *     --platform linkedin \
 *     --profile-url "https://linkedin.com/in/krishagel" \
 *     --max-posts 50 \
 *     --output "/tmp/social-linkedin.json"
 *
 *   # Twitter/X
 *   bun scripts/extract-social-samples.js \
 *     --platform twitter \
 *     --profile-url "https://x.com/KrisHagel" \
 *     --max-posts 50 \
 *     --output "/tmp/social-twitter.json"
 *
 * Arguments:
 *   --platform     Platform: linkedin or twitter
 *   --profile-url  User profile URL
 *   --max-posts    Maximum posts to extract (default: 50)
 *   --output       Output JSON file path
 *
 * Prerequisites:
 *   - Geoffrey Chrome profile must be running: ./scripts/launch-chrome.sh
 *   - User must be logged into the platform in Geoffrey Chrome
 */

import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    platform: null,
    profileUrl: null,
    maxPosts: 50,
    output: null,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--platform':
        config.platform = args[++i].toLowerCase();
        break;
      case '--profile-url':
        config.profileUrl = args[++i];
        break;
      case '--max-posts':
        config.maxPosts = parseInt(args[++i]);
        break;
      case '--output':
        config.output = args[++i];
        break;
    }
  }

  if (!config.platform || !config.profileUrl || !config.output) {
    console.error(JSON.stringify({
      error: 'Missing required arguments',
      usage: 'bun scripts/extract-social-samples.js --platform <platform> --profile-url <url> --output <path>',
      required: {
        platform: 'Platform (linkedin or twitter)',
        profileUrl: 'User profile URL',
        output: 'Output JSON file path',
      },
      optional: {
        maxPosts: `Maximum posts to extract (default: ${config.maxPosts})`,
      },
      prerequisites: [
        'Geoffrey Chrome must be running: ./scripts/launch-chrome.sh',
        'You must be logged into the platform in Geoffrey Chrome',
      ]
    }, null, 2));
    process.exit(1);
  }

  if (!['linkedin', 'twitter'].includes(config.platform)) {
    console.error(JSON.stringify({
      error: `Invalid platform: ${config.platform}`,
      supported: ['linkedin', 'twitter'],
    }, null, 2));
    process.exit(1);
  }

  return config;
}

// Platform-specific selectors and logic
const PLATFORM_CONFIG = {
  linkedin: {
    postSelector: '.feed-shared-update-v2, .feed-shared-update',
    textSelector: '.feed-shared-inline-show-more-text, .feed-shared-text, .break-words',
    authorSelector: '.update-components-actor__name',
    dateSelector: '.update-components-actor__sub-description time',
    scrollContainer: 'main',
  },
  twitter: {
    postSelector: 'article[data-testid="tweet"]',
    textSelector: '[data-testid="tweetText"]',
    authorSelector: '[data-testid="User-Name"]',
    dateSelector: 'time',
    scrollContainer: 'main',
  },
};

// Extract posts from platform
async function extractPosts(browser, config) {
  const platformConfig = PLATFORM_CONFIG[config.platform];
  const page = await browser.newPage();

  console.error(`Navigating to ${config.profileUrl}...`);
  await page.goto(config.profileUrl, { waitUntil: 'networkidle' });

  // Wait for posts to load
  console.error(`Waiting for posts to load...`);
  try {
    await page.waitForSelector(platformConfig.postSelector, { timeout: 10000 });
  } catch (error) {
    throw new Error(`Posts not found. Are you logged in to ${config.platform}? Selector: ${platformConfig.postSelector}`);
  }

  const posts = [];
  let scrollAttempts = 0;
  const maxScrollAttempts = 20;

  while (posts.length < config.maxPosts && scrollAttempts < maxScrollAttempts) {
    // Extract visible posts
    const newPosts = await page.evaluate(({ postSelector, textSelector, authorSelector, dateSelector }) => {
      const postElements = document.querySelectorAll(postSelector);
      const extracted = [];

      for (const post of postElements) {
        // Skip if already processed (mark with data attribute)
        if (post.dataset.extracted) continue;

        const textEl = post.querySelector(textSelector);
        const dateEl = post.querySelector(dateSelector);

        if (!textEl) continue;

        const text = textEl.innerText.trim();
        const date = dateEl ? (dateEl.getAttribute('datetime') || dateEl.innerText) : null;

        if (text.length > 10) {  // Skip very short posts
          extracted.push({
            text,
            date,
            char_count: text.length,
          });

          // Mark as extracted
          post.dataset.extracted = 'true';
        }
      }

      return extracted;
    }, platformConfig);

    for (const post of newPosts) {
      if (posts.length < config.maxPosts) {
        posts.push(post);
        console.error(`Extracted post ${posts.length}/${config.maxPosts}: ${post.text.substring(0, 50)}...`);
      }
    }

    // Scroll to load more
    if (posts.length < config.maxPosts) {
      console.error(`Scrolling to load more posts... (${posts.length}/${config.maxPosts})`);
      await page.evaluate((selector) => {
        const container = document.querySelector(selector) || window;
        if (container === window) {
          window.scrollBy(0, window.innerHeight);
        } else {
          container.scrollBy(0, container.clientHeight);
        }
      }, platformConfig.scrollContainer);

      // Wait for new posts to load
      await page.waitForTimeout(2000);
    }

    scrollAttempts++;
  }

  await page.close();

  return posts;
}

// Count words
function countWords(text) {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

async function main() {
  const config = parseArgs();

  console.error(`Extracting ${config.platform} posts from ${config.profileUrl}...`);
  console.error(`Max posts: ${config.maxPosts}`);
  console.error(`\nConnecting to Geoffrey Chrome profile...`);

  let browser;
  try {
    // Connect to Geoffrey Chrome via CDP
    browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  } catch (error) {
    console.error(JSON.stringify({
      error: 'Failed to connect to Geoffrey Chrome',
      message: error.message,
      solution: 'Run: ./scripts/launch-chrome.sh',
    }, null, 2));
    process.exit(1);
  }

  try {
    const posts = await extractPosts(browser, config);

    if (posts.length === 0) {
      console.error(JSON.stringify({
        error: 'No posts extracted',
        platform: config.platform,
        profile_url: config.profileUrl,
        troubleshooting: [
          'Ensure you are logged into ' + config.platform,
          'Check if the profile URL is correct',
          'Verify the page loads posts in Geoffrey Chrome',
        ]
      }, null, 2));
      process.exit(1);
    }

    // Add word counts and metadata
    const samples = posts.map((post, index) => ({
      platform: config.platform,
      post_number: index + 1,
      date: post.date,
      text: post.text,
      char_count: post.char_count,
      word_count: countWords(post.text),
      extracted_at: new Date().toISOString(),
    }));

    // Write output
    const output = {
      success: true,
      platform: config.platform,
      profile_url: config.profileUrl,
      metadata: {
        total_extracted: samples.length,
        requested: config.maxPosts,
        extraction_date: new Date().toISOString(),
      },
      samples,
    };

    writeFileSync(config.output, JSON.stringify(output, null, 2));

    console.error(`\nExtraction complete!`);
    console.error(`Posts extracted: ${samples.length}`);
    console.error(`Output written to: ${config.output}`);

    // Output success JSON to stdout
    console.log(JSON.stringify({
      success: true,
      samples_count: samples.length,
      output_file: config.output,
    }, null, 2));

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    error: error.message,
    stack: error.stack,
  }, null, 2));
  process.exit(1);
});
