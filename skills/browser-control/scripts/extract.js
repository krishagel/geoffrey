#!/usr/bin/env bun

/**
 * Extract content from webpage using CSS selectors
 *
 * Usage: bun extract.js <url> <selector> [--all] [--attr <attribute>]
 */

import puppeteer from 'puppeteer-core';

const CDP_ENDPOINT = 'http://127.0.0.1:9222';

async function extract(url, selector, options = {}) {
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

    let extracted;

    if (options.all) {
      extracted = await page.$$eval(selector, (elements, attr) => {
        return elements.map(el => attr ? el.getAttribute(attr) : el.innerText.trim());
      }, options.attr);
    } else {
      extracted = await page.$eval(selector, (el, attr) => {
        return attr ? el.getAttribute(attr) : el.innerText.trim();
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
      timestamp: new Date().toISOString()
    };
  } finally {
    if (browser) browser.disconnect();
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

  const options = {};
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--all') options.all = true;
    else if (args[i] === '--attr') options.attr = args[++i];
  }

  const result = await extract(url, selector, options);
  console.log(JSON.stringify(result, null, 2));
  if (!result.success) process.exit(1);
}

main();
