#!/usr/bin/env bun

/**
 * Capture current page state (no navigation)
 *
 * Usage: bun capture.js [output.png]
 */

import puppeteer from 'puppeteer-core';
import path from 'path';

const CDP_ENDPOINT = 'http://127.0.0.1:9222';

async function capture(outputPath) {
  let browser;

  try {
    browser = await puppeteer.connect({
      browserURL: CDP_ENDPOINT,
      defaultViewport: null
    });

    const pages = await browser.pages();
    if (pages.length === 0) {
      throw new Error('No pages open in browser');
    }

    const page = pages[0];
    const url = page.url();
    const title = await page.title();

    // Take screenshot if output path provided
    if (outputPath) {
      await page.screenshot({ path: outputPath });
    }

    // Get content
    const content = await page.evaluate(() => {
      const main = document.querySelector('main') ||
                   document.querySelector('article') ||
                   document.querySelector('#content') ||
                   document.body;
      return main.innerText.substring(0, 10000);
    });

    return {
      success: true,
      url,
      title,
      content,
      screenshot: outputPath ? path.resolve(outputPath) : null,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  } finally {
    if (browser) {
      browser.disconnect();
    }
  }
}

async function main() {
  const outputPath = process.argv[2] || null;
  const result = await capture(outputPath);
  console.log(JSON.stringify(result, null, 2));
  if (!result.success) process.exit(1);
}

main();
