#!/usr/bin/env bun

/**
 * Navigate to URL and return page content
 *
 * Connects to Geoffrey's browser profile via CDP and navigates to the specified URL.
 * Returns page title, URL, and text content.
 *
 * Usage: bun navigate.js <url> [--wait <selector>]
 *
 * Examples:
 *   bun navigate.js https://www.marriott.com
 *   bun navigate.js https://flyertalk.com/forum --wait ".post-content"
 */

import puppeteer from 'puppeteer-core';

const CDP_ENDPOINT = 'http://127.0.0.1:9222';

async function navigate(url, options = {}) {
  let browser;

  try {
    // Connect to existing browser instance via CDP
    browser = await puppeteer.connect({
      browserURL: CDP_ENDPOINT,
      defaultViewport: null
    });

    // Always create a new page to avoid interfering with user's tabs
    const page = await browser.newPage();

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
      hint: error.message.includes('connect') || error.message.includes('ECONNREFUSED')
        ? 'Is browser running? Start with: ./scripts/launch-chrome.sh'
        : null,
      timestamp: new Date().toISOString()
    };
  } finally {
    // Disconnect (don't close - we want browser to stay open)
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
