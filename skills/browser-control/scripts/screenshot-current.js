#!/usr/bin/env bun

/**
 * Screenshot the current browser page (no navigation)
 *
 * Usage: bun screenshot-current.js [output.png]
 */

import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { unlink } from 'fs/promises';

const CDP_ENDPOINT = 'http://127.0.0.1:9222';

async function screenshotCurrent(outputPath) {
  let browser;

  try {
    browser = await puppeteer.connect({
      browserURL: CDP_ENDPOINT,
      defaultViewport: null
    });

    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();

    const url = await page.url();
    const title = await page.title();

    // Default output path
    if (!outputPath) {
      outputPath = `/tmp/screenshot-${Date.now()}.png`;
    }

    // Take screenshot of current viewport
    await page.screenshot({
      path: outputPath,
      fullPage: false
    });

    // Check dimensions and resize if needed
    const MAX_DIMENSION = 7500;
    const metadata = await sharp(outputPath).metadata();

    let originalDimensions = {
      width: metadata.width,
      height: metadata.height
    };

    let width = originalDimensions.width;
    let height = originalDimensions.height;
    let scaled = false;

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const scale = Math.min(
        MAX_DIMENSION / width,
        MAX_DIMENSION / height
      );
      width = Math.floor(width * scale);
      height = Math.floor(height * scale);

      const tempPath = outputPath + '.resized';

      await sharp(outputPath)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toFile(tempPath);

      await Bun.write(outputPath, await Bun.file(tempPath).arrayBuffer());

      try {
        await unlink(tempPath);
      } catch (e) {
        // Ignore cleanup errors
      }

      scaled = true;
    }

    return {
      success: true,
      url,
      title,
      screenshot: outputPath,
      dimensions: { width, height },
      originalDimensions,
      scaled,
      safeToRead: true,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      success: false,
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
  const outputPath = args[0];

  const result = await screenshotCurrent(outputPath);
  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    process.exit(1);
  }
}

main();
