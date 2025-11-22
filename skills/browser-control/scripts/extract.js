#!/usr/bin/env bun

/**
 * Extract content from webpage using CSS selectors
 *
 * Usage: bun extract.js <url> <selector> [--all] [--attr <attribute>]
 *
 * Options:
 *   --all           Get all matching elements (default: first only)
 *   --attr <name>   Get attribute value instead of text
 *
 * Examples:
 *   bun extract.js https://flyertalk.com ".post-content" --all
 *   bun extract.js https://marriott.com ".room-rate" --attr data-price
 */

import { chromium } from 'playwright';

const CDP_URL = 'http://127.0.0.1:9222';

async function extract(url, selector, options = {}) {
  let browser;

  try {
    browser = await chromium.connectOverCDP(CDP_URL);
    const contexts = browser.contexts();
    const context = contexts[0] || await browser.newContext();
    const page = await context.newPage();

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait for selector
    await page.waitForSelector(selector, { timeout: 10000 });

    let extracted;

    if (options.all) {
      // Get all matching elements
      extracted = await page.$$eval(selector, (elements, attr) => {
        return elements.map(el => {
          if (attr) {
            return el.getAttribute(attr);
          }
          return el.innerText.trim();
        });
      }, options.attr);
    } else {
      // Get first matching element
      extracted = await page.$eval(selector, (el, attr) => {
        if (attr) {
          return el.getAttribute(attr);
        }
        return el.innerText.trim();
      }, options.attr);
    }

    const title = await page.title();
    await page.close();

    return {
      success: true,
      url,
      title,
      selector,
      extracted,
      count: options.all ? extracted.length : 1,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      success: false,
      url,
      selector,
      error: error.message,
      hint: error.message.includes('connect')
        ? 'Is Chrome running? Start with: ./scripts/launch-chrome.sh'
        : error.message.includes('selector')
        ? 'Selector not found on page'
        : null,
      timestamp: new Date().toISOString()
    };
  } finally {
    if (browser) {
      browser.disconnect();
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const url = args[0];
  const selector = args[1];

  if (!url || !selector) {
    console.error(JSON.stringify({
      error: 'Missing arguments',
      usage: 'bun extract.js <url> <selector> [--all] [--attr <name>]'
    }));
    process.exit(1);
  }

  // Parse options
  const options = {};
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--all') {
      options.all = true;
    } else if (args[i] === '--attr') {
      options.attr = args[++i];
    }
  }

  const result = await extract(url, selector, options);
  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    process.exit(1);
  }
}

main();
