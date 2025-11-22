#!/usr/bin/env bun

/**
 * Perform searches on common travel sites
 *
 * Usage: bun search.js <site> <query>
 */

import puppeteer from 'puppeteer-core';

const CDP_ENDPOINT = 'http://127.0.0.1:9222';

const SITES = {
  marriott: {
    url: (q) => `https://www.marriott.com/search/default.mi?keywords=${encodeURIComponent(q)}`,
    resultSelector: '.property-card, .l-container'
  },
  alaska: {
    url: 'https://www.alaskaair.com/',
    resultSelector: '.search-results'
  },
  flyertalk: {
    url: (q) => `https://www.flyertalk.com/forum/search.php?do=process&query=${encodeURIComponent(q)}`,
    resultSelector: '.searchresult, .threadbit'
  },
  tripadvisor: {
    url: (q) => `https://www.tripadvisor.com/Search?q=${encodeURIComponent(q)}`,
    resultSelector: '[data-automation="searchResult"]'
  },
  reddit: {
    url: (q) => `https://www.reddit.com/search/?q=${encodeURIComponent(q)}`,
    resultSelector: '[data-testid="post-container"]'
  },
  google: {
    url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
    resultSelector: '.g'
  }
};

async function search(siteName, query) {
  let browser;

  try {
    const site = SITES[siteName.toLowerCase()];
    if (!site) {
      return {
        success: false,
        error: `Unknown site: ${siteName}`,
        availableSites: Object.keys(SITES)
      };
    }

    browser = await puppeteer.connect({
      browserURL: CDP_ENDPOINT,
      defaultViewport: null
    });

    const page = await browser.newPage();
    const url = typeof site.url === 'function' ? site.url(query) : site.url;

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    let results = [];
    try {
      await page.waitForSelector(site.resultSelector, { timeout: 10000 });
      results = await page.$$eval(site.resultSelector, (elements) => {
        return elements.slice(0, 10).map(el => {
          const link = el.querySelector('a');
          return {
            text: el.innerText.substring(0, 500).trim(),
            url: link ? link.href : null
          };
        });
      });
    } catch (e) {
      // No results found
    }

    const title = await page.title();
    const finalUrl = page.url();
    await page.close();

    return {
      success: true,
      site: siteName,
      query,
      url: finalUrl,
      title,
      resultCount: results.length,
      results,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      success: false,
      site: siteName,
      query,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  } finally {
    if (browser) browser.disconnect();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const site = args[0];
  const query = args.slice(1).join(' ');

  if (!site || !query) {
    console.error(JSON.stringify({
      error: 'Missing arguments',
      usage: 'bun search.js <site> <query>',
      availableSites: Object.keys(SITES)
    }));
    process.exit(1);
  }

  const result = await search(site, query);
  console.log(JSON.stringify(result, null, 2));
  if (!result.success) process.exit(1);
}

main();
