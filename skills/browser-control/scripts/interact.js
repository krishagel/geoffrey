#!/usr/bin/env bun

/**
 * Interact with webpage elements (click, type, select)
 *
 * Usage: bun interact.js <url> <action> <selector> [value]
 */

import puppeteer from 'puppeteer-core';

const CDP_ENDPOINT = 'http://127.0.0.1:9222';

async function interact(url, action, selector, value = null) {
  let browser;

  try {
    browser = await puppeteer.connect({
      browserURL: CDP_ENDPOINT,
      defaultViewport: null
    });

    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await page.waitForSelector(selector, { timeout: 10000 });

    let result;

    switch (action) {
      case 'click':
        await page.click(selector);
        result = 'clicked';
        break;
      case 'type':
        await page.type(selector, value);
        result = `typed: ${value}`;
        break;
      case 'select':
        await page.select(selector, value);
        result = `selected: ${value}`;
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

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
      timestamp: new Date().toISOString()
    };
  } finally {
    if (browser) browser.disconnect();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const [url, action, selector, value] = args;

  if (!url || !action || !selector) {
    console.error(JSON.stringify({
      error: 'Missing arguments',
      usage: 'bun interact.js <url> <action> <selector> [value]'
    }));
    process.exit(1);
  }

  const result = await interact(url, action, selector, value);
  console.log(JSON.stringify(result, null, 2));
  if (!result.success) process.exit(1);
}

main();
