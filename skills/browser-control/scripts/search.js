#!/usr/bin/env bun

/**
 * Perform searches on common travel sites
 *
 * Usage: bun search.js <site> <query> [options]
 *
 * Sites:
 *   marriott    Search Marriott hotels
 *   alaska      Search Alaska Airlines flights
 *   flyertalk   Search FlyerTalk forums
 *   tripadvisor Search TripAdvisor
 *   reddit      Search Reddit
 *   google      General Google search
 *
 * Examples:
 *   bun search.js marriott "Westin Rusutsu"
 *   bun search.js flyertalk "Japan ski redemption"
 *   bun search.js reddit "Hakuba vs Niseko"
 */

import { chromium } from 'playwright';

const CDP_URL = 'http://127.0.0.1:9222';

const SITES = {
  marriott: {
    url: 'https://www.marriott.com/search/default.mi',
    searchSelector: '#search-destination-input',
    submitSelector: '.m-button-primary',
    resultSelector: '.property-card'
  },
  alaska: {
    url: 'https://www.alaskaair.com/',
    searchSelector: '#prior-search-destination',
    submitSelector: '.search-button',
    resultSelector: '.flight-result'
  },
  flyertalk: {
    url: (q) => `https://www.flyertalk.com/forum/search.php?searchJSON={"type":"all","terms":"${encodeURIComponent(q)}"}`,
    resultSelector: '.searchresult'
  },
  tripadvisor: {
    url: (q) => `https://www.tripadvisor.com/Search?q=${encodeURIComponent(q)}`,
    resultSelector: '.search-result'
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

    browser = await chromium.connectOverCDP(CDP_URL);
    const contexts = browser.contexts();
    const context = contexts[0] || await browser.newContext();
    const page = await context.newPage();

    // Navigate to search URL
    const url = typeof site.url === 'function' ? site.url(query) : site.url;
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // If site requires form filling
    if (site.searchSelector && typeof site.url === 'string') {
      await page.waitForSelector(site.searchSelector, { timeout: 10000 });
      await page.fill(site.searchSelector, query);

      if (site.submitSelector) {
        await page.click(site.submitSelector);
        await page.waitForLoadState('domcontentloaded');
      }
    }

    // Wait for results
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
      // No results or timeout - not fatal
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

  if (!result.success) {
    process.exit(1);
  }
}

main();
