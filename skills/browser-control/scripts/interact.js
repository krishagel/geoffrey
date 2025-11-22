#!/usr/bin/env bun

/**
 * Interact with webpage elements (click, type, select)
 *
 * Usage: bun interact.js <url> <action> <selector> [value]
 *
 * Actions:
 *   click <selector>           Click an element
 *   type <selector> <text>     Type text into input
 *   select <selector> <value>  Select dropdown option
 *   check <selector>           Check a checkbox
 *   uncheck <selector>         Uncheck a checkbox
 *
 * Examples:
 *   bun interact.js https://marriott.com click "#search-button"
 *   bun interact.js https://marriott.com type "#destination" "Tokyo"
 *   bun interact.js https://marriott.com select "#guests" "2"
 */

import { chromium } from 'playwright';

const CDP_URL = 'http://127.0.0.1:9222';

async function interact(url, action, selector, value = null) {
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

    let result;

    switch (action) {
      case 'click':
        await page.click(selector);
        result = 'clicked';
        break;

      case 'type':
        await page.fill(selector, value);
        result = `typed: ${value}`;
        break;

      case 'select':
        await page.selectOption(selector, value);
        result = `selected: ${value}`;
        break;

      case 'check':
        await page.check(selector);
        result = 'checked';
        break;

      case 'uncheck':
        await page.uncheck(selector);
        result = 'unchecked';
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Wait a bit for any resulting changes
    await page.waitForTimeout(1000);

    const title = await page.title();
    const finalUrl = page.url();

    await page.close();

    return {
      success: true,
      url: finalUrl,
      title,
      action,
      selector,
      result,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      success: false,
      url,
      action,
      selector,
      error: error.message,
      hint: error.message.includes('connect')
        ? 'Is Chrome running? Start with: ./scripts/launch-chrome.sh'
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
  const action = args[1];
  const selector = args[2];
  const value = args[3];

  if (!url || !action || !selector) {
    console.error(JSON.stringify({
      error: 'Missing arguments',
      usage: 'bun interact.js <url> <action> <selector> [value]',
      actions: ['click', 'type', 'select', 'check', 'uncheck']
    }));
    process.exit(1);
  }

  if ((action === 'type' || action === 'select') && !value) {
    console.error(JSON.stringify({
      error: `Action '${action}' requires a value`,
      usage: `bun interact.js <url> ${action} <selector> <value>`
    }));
    process.exit(1);
  }

  const result = await interact(url, action, selector, value);
  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    process.exit(1);
  }
}

main();
