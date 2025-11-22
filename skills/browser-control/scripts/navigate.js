#!/usr/bin/env bun

/**
 * Navigate to URL and return page content
 *
 * Connects to Geoffrey's Chrome profile via CDP and navigates to the specified URL.
 * Returns page title, URL, and text content.
 *
 * Usage: bun navigate.js <url> [--wait <selector>]
 *
 * Examples:
 *   bun navigate.js https://www.marriott.com
 *   bun navigate.js https://flyertalk.com/forum --wait ".post-content"
 */

import { chromium } from 'playwright';

const CDP_URL = 'http://127.0.0.1:9222';

async function navigate(url, options = {}) {
  let browser;

  try {
    // Connect to existing Chrome instance
    browser = await chromium.connectOverCDP(CDP_URL);

    // Get existing context or create new one
    const contexts = browser.contexts();
    const context = contexts[0] || await browser.newContext();

    // Create new page
    const page = await context.newPage();

    // Navigate to URL
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait for specific selector if provided
    if (options.waitFor) {
      await page.waitForSelector(options.waitFor, { timeout: 10000 });
    }

    // Get page info
    const title = await page.title();
    const content = await page.evaluate(() => {
      // Get main content, avoiding nav/footer
      const main = document.querySelector('main') ||
                   document.querySelector('article') ||
                   document.querySelector('#content') ||
                   document.body;
      return main.innerText.substring(0, 10000); // Limit content size
    });

    // Get current URL (may have redirected)
    const finalUrl = page.url();

    await page.close();

    return {
      success: true,
      url: finalUrl,
      title,
      content,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      success: false,
      url,
      error: error.message,
      hint: error.message.includes('connect')
        ? 'Is Chrome running? Start with: ./scripts/launch-chrome.sh'
        : null,
      timestamp: new Date().toISOString()
    };
  } finally {
    // Don't close browser - we're connecting to existing instance
    if (browser) {
      browser.disconnect();
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const url = args[0];

  if (!url) {
    console.error(JSON.stringify({
      error: 'Missing URL',
      usage: 'bun navigate.js <url> [--wait <selector>]'
    }));
    process.exit(1);
  }

  // Parse options
  const options = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--wait') {
      options.waitFor = args[++i];
    }
  }

  const result = await navigate(url, options);
  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    process.exit(1);
  }
}

main();
