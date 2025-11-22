#!/usr/bin/env bun

/**
 * Take screenshot of a webpage
 *
 * Usage: bun screenshot.js <url> [output.png] [--full]
 *
 * Options:
 *   --full    Capture full page (not just viewport)
 *
 * Examples:
 *   bun screenshot.js https://www.marriott.com
 *   bun screenshot.js https://www.marriott.com hotel.png --full
 */

import puppeteer from 'puppeteer-core';
import path from 'path';

const CDP_ENDPOINT = 'http://127.0.0.1:9222';

async function screenshot(url, outputPath, options = {}) {
  let browser;

  try {
    browser = await puppeteer.connect({
      browserURL: CDP_ENDPOINT,
      defaultViewport: null
    });

    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Default output path
    if (!outputPath) {
      const urlObj = new URL(url);
      outputPath = `screenshot-${urlObj.hostname}-${Date.now()}.png`;
    }

    // Take screenshot
    await page.screenshot({
      path: outputPath,
      fullPage: options.fullPage || false
    });

    const title = await page.title();

    return {
      success: true,
      url,
      title,
      screenshot: path.resolve(outputPath),
      fullPage: options.fullPage || false,
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
    if (browser) {
      browser.disconnect();
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const url = args[0];

  if (!url) {
    console.error(JSON.stringify({
      error: 'Missing URL',
      usage: 'bun screenshot.js <url> [output.png] [--full]'
    }));
    process.exit(1);
  }

  // Parse args
  let outputPath = null;
  const options = {};

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--full') {
      options.fullPage = true;
    } else if (!args[i].startsWith('--')) {
      outputPath = args[i];
    }
  }

  const result = await screenshot(url, outputPath, options);
  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    process.exit(1);
  }
}

main();
