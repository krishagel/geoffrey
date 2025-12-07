#!/usr/bin/env bun

/**
 * Extract Blog Post Samples for Voice Analysis
 *
 * Fetches blog posts using browser-control and prepares them for voice profile analysis.
 * Works with both authenticated and public blogs.
 *
 * Usage:
 *   bun scripts/extract-blog-samples.js \
 *     --urls "https://psd401.ai/blog/post1,https://blog.krishagel.com/post2" \
 *     --output "/tmp/blog-samples.json"
 *
 * Arguments:
 *   --urls     Comma-separated list of blog post URLs
 *   --output   Output JSON file path
 */

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import path from 'path';

// Helper to run browser-control scripts
function runBrowserScript(scriptName, args) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(
      process.env.HOME,
      'non-ic-code/geoffrey/skills/browser-control/scripts',
      scriptName
    );

    const child = spawn('bun', [scriptPath, ...args]);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Script failed: ${stderr}`));
      } else {
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${stdout}`));
        }
      }
    });
  });
}

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    urls: null,
    output: null,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--urls':
        config.urls = args[++i].split(',').map(url => url.trim());
        break;
      case '--output':
        config.output = args[++i];
        break;
    }
  }

  if (!config.urls || !config.output) {
    console.error(JSON.stringify({
      error: 'Missing required arguments',
      usage: 'bun scripts/extract-blog-samples.js --urls "url1,url2,..." --output <path>',
      required: {
        urls: 'Comma-separated list of blog post URLs',
        output: 'Output JSON file path',
      },
      example: 'bun scripts/extract-blog-samples.js --urls "https://psd401.ai/blog/post1,https://blog.krishagel.com/post2" --output "/tmp/blog-samples.json"'
    }, null, 2));
    process.exit(1);
  }

  return config;
}

// Extract domain from URL for selector heuristics
function getDomain(url) {
  const match = url.match(/https?:\/\/([^\/]+)/);
  return match ? match[1] : '';
}

// Get appropriate selectors based on domain
function getContentSelectors(url) {
  const domain = getDomain(url);

  // Domain-specific selectors
  if (domain.includes('medium.com') || domain.includes('blog.krishagel.com')) {
    return ['article', '.post-content', '.article-content', 'main'];
  }

  if (domain.includes('psd401.ai')) {
    return ['article', '.blog-post', '.post-content', 'main'];
  }

  // Generic fallbacks
  return ['article', 'main', '.post', '.blog-post', '.entry-content', '.post-content'];
}

// Clean blog content
function cleanBlogContent(content) {
  let text = content;

  // Remove navigation, headers, footers
  text = text
    .replace(/^Home.*?$/gm, '')
    .replace(/^Navigation.*?$/gm, '')
    .replace(/^Share this.*?$/gm, '')
    .replace(/^Posted by.*?$/gm, '');

  // Clean up whitespace
  text = text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  return text;
}

// Count words
function countWords(text) {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

// Extract metadata from content
function extractMetadata(content, url) {
  const lines = content.split('\n').filter(line => line.trim());

  // Try to extract title (usually first non-empty line)
  const title = lines[0] || '';

  // Try to extract date (look for date patterns in first few lines)
  let date = null;
  const datePattern = /\d{1,2}\/\d{1,2}\/\d{4}|\w+ \d{1,2},? \d{4}/;
  for (const line of lines.slice(0, 5)) {
    const match = line.match(datePattern);
    if (match) {
      date = match[0];
      break;
    }
  }

  return { title, date };
}

async function main() {
  const config = parseArgs();

  console.error(`Extracting blog samples from ${config.urls.length} URLs...`);

  const samples = [];

  for (const url of config.urls) {
    console.error(`\nFetching: ${url}`);

    try {
      // Try navigating to the URL
      const result = await runBrowserScript('navigate.js', [url]);

      if (!result.success) {
        console.error(`Failed to fetch ${url}: ${result.error || 'Unknown error'}`);
        continue;
      }

      // Clean the content
      const cleanedContent = cleanBlogContent(result.content || '');
      const wordCount = countWords(cleanedContent);

      if (wordCount < 100) {
        console.error(`Skipping ${url}: Too short (${wordCount} words)`);
        continue;
      }

      // Extract metadata
      const { title, date } = extractMetadata(cleanedContent, url);

      samples.push({
        url,
        title: title || result.title || url,
        date: date || new Date().toISOString().split('T')[0],
        content: cleanedContent,
        word_count: wordCount,
        extracted_at: new Date().toISOString(),
      });

      console.error(`✓ Extracted: ${title || url} (${wordCount} words)`);

    } catch (error) {
      console.error(`Error fetching ${url}: ${error.message}`);

      // Try alternative: extract with specific selectors
      console.error(`Trying alternative extraction method...`);

      try {
        const selectors = getContentSelectors(url);

        for (const selector of selectors) {
          try {
            const extractResult = await runBrowserScript('extract.js', [
              url,
              selector,
            ]);

            if (extractResult.success && extractResult.content) {
              const cleanedContent = cleanBlogContent(extractResult.content);
              const wordCount = countWords(cleanedContent);

              if (wordCount >= 100) {
                const { title, date } = extractMetadata(cleanedContent, url);

                samples.push({
                  url,
                  title: title || extractResult.title || url,
                  date: date || new Date().toISOString().split('T')[0],
                  content: cleanedContent,
                  word_count: wordCount,
                  extracted_at: new Date().toISOString(),
                  extraction_method: `selector: ${selector}`,
                });

                console.error(`✓ Extracted with selector '${selector}': ${title || url} (${wordCount} words)`);
                break;
              }
            }
          } catch (selectorError) {
            // Try next selector
            continue;
          }
        }
      } catch (altError) {
        console.error(`All extraction methods failed for ${url}`);
      }
    }
  }

  if (samples.length === 0) {
    console.error(JSON.stringify({
      error: 'No blog posts extracted',
      attempted_urls: config.urls,
    }, null, 2));
    process.exit(1);
  }

  // Write output
  const output = {
    success: true,
    metadata: {
      total_urls: config.urls.length,
      total_extracted: samples.length,
      extraction_date: new Date().toISOString(),
    },
    samples,
  };

  writeFileSync(config.output, JSON.stringify(output, null, 2));

  console.error(`\nExtraction complete!`);
  console.error(`Samples extracted: ${samples.length}/${config.urls.length}`);
  console.error(`Output written to: ${config.output}`);

  // Output success JSON to stdout
  console.log(JSON.stringify({
    success: true,
    samples_count: samples.length,
    output_file: config.output,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    error: error.message,
    stack: error.stack,
  }, null, 2));
  process.exit(1);
});
