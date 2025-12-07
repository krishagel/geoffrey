#!/usr/bin/env bun

/**
 * Extract Email Samples for Voice Analysis
 *
 * Fetches sent emails from Gmail accounts and prepares them for voice profile analysis.
 * Filters out automated emails, signatures, and quoted content.
 *
 * Usage:
 *   bun scripts/extract-email-samples.js \
 *     --account psd \
 *     --date-range "2024-06-01:2025-12-06" \
 *     --min-words 50 \
 *     --max-samples 100 \
 *     --output "/tmp/email-samples-psd.json"
 *
 * Arguments:
 *   --account      Gmail account (psd, kh, hrg)
 *   --date-range   Date range in format "YYYY-MM-DD:YYYY-MM-DD"
 *   --min-words    Minimum word count (default: 50)
 *   --max-samples  Maximum samples to extract (default: 100)
 *   --output       Output JSON file path
 */

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import path from 'path';

// Helper to run node scripts from google-workspace
function runGmailScript(scriptName, args) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(
      process.env.HOME,
      'non-ic-code/geoffrey/skills/google-workspace/gmail',
      scriptName
    );

    const child = spawn('node', [scriptPath, ...args]);

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
    account: null,
    dateRange: null,
    minWords: 50,
    maxSamples: 100,
    output: null,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--account':
        config.account = args[++i];
        break;
      case '--date-range':
        config.dateRange = args[++i];
        break;
      case '--min-words':
        config.minWords = parseInt(args[++i]);
        break;
      case '--max-samples':
        config.maxSamples = parseInt(args[++i]);
        break;
      case '--output':
        config.output = args[++i];
        break;
    }
  }

  if (!config.account || !config.dateRange || !config.output) {
    console.error(JSON.stringify({
      error: 'Missing required arguments',
      usage: 'bun scripts/extract-email-samples.js --account <account> --date-range "YYYY-MM-DD:YYYY-MM-DD" --output <path>',
      required: {
        account: 'Gmail account (psd, kh, hrg)',
        dateRange: 'Date range in format "YYYY-MM-DD:YYYY-MM-DD"',
        output: 'Output JSON file path',
      },
      optional: {
        minWords: `Minimum word count (default: ${config.minWords})`,
        maxSamples: `Maximum samples (default: ${config.maxSamples})`,
      }
    }, null, 2));
    process.exit(1);
  }

  return config;
}

// Clean email body: remove signatures, quoted replies, HTML
function cleanEmailBody(body, isHtml) {
  let text = body;

  // Strip HTML if needed
  if (isHtml) {
    text = text
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<script[^>]*>.*?<\/script>/gs, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"');
  }

  // Remove common signature patterns
  const signaturePatterns = [
    /^--\s*$/m,
    /^Sent from my iPhone$/m,
    /^Sent from my iPad$/m,
    /^Get Outlook for iOS$/m,
    /^This email may contain confidential/m,
  ];

  for (const pattern of signaturePatterns) {
    const match = text.match(pattern);
    if (match) {
      text = text.substring(0, match.index);
    }
  }

  // Remove quoted replies (lines starting with >)
  text = text
    .split('\n')
    .filter(line => !line.trim().startsWith('>'))
    .join('\n');

  // Remove "On ... wrote:" patterns
  text = text.replace(/On .* wrote:/g, '');

  // Remove forwarded message markers
  text = text.replace(/---------- Forwarded message ---------/g, '');
  text = text.replace(/Begin forwarded message:/g, '');

  // Clean up whitespace
  text = text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  return text;
}

// Filter automated/system emails
function isAutomatedEmail(from, subject, body) {
  const automatedPatterns = [
    /noreply@/i,
    /no-reply@/i,
    /donotreply@/i,
    /notifications@/i,
    /alerts@/i,
    /calendar-notification@/i,
  ];

  if (automatedPatterns.some(pattern => pattern.test(from))) {
    return true;
  }

  const automatedSubjects = [
    /calendar/i,
    /out of office/i,
    /automatic reply/i,
  ];

  if (automatedSubjects.some(pattern => pattern.test(subject))) {
    return true;
  }

  return false;
}

// Count words in text
function countWords(text) {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

async function main() {
  const config = parseArgs();

  console.error(`Extracting email samples from ${config.account}...`);
  console.error(`Date range: ${config.dateRange}`);
  console.error(`Min words: ${config.minWords}`);
  console.error(`Max samples: ${config.maxSamples}`);

  // Parse date range
  const [startDate, endDate] = config.dateRange.split(':');

  // Build Gmail search query
  const query = `in:sent after:${startDate.replace(/-/g, '/')}${endDate ? ` before:${endDate.replace(/-/g, '/')}` : ''}`;

  console.error(`Search query: ${query}`);

  // Step 1: Search for sent messages
  console.error('Searching for sent messages...');
  const searchResult = await runGmailScript('search_messages.js', [
    config.account,
    query,
    String(config.maxSamples * 5), // Fetch extra to account for filtering
  ]);

  if (!searchResult.success || searchResult.messages.length === 0) {
    console.error(JSON.stringify({
      error: 'No messages found',
      query,
      account: config.account,
    }, null, 2));
    process.exit(1);
  }

  console.error(`Found ${searchResult.messages.length} messages. Fetching details...`);

  // Step 2: Fetch full message bodies
  const samples = [];

  for (const msg of searchResult.messages) {
    if (samples.length >= config.maxSamples) break;

    try {
      const messageResult = await runGmailScript('read_message.js', [
        config.account,
        msg.id,
      ]);

      if (!messageResult.success) continue;

      const message = messageResult.message;

      // Filter automated emails
      if (isAutomatedEmail(message.from, message.subject, message.body)) {
        console.error(`Skipping automated email: ${message.subject}`);
        continue;
      }

      // Clean body
      const cleanedBody = cleanEmailBody(message.body, message.isHtml);
      const wordCount = countWords(cleanedBody);

      // Filter by word count
      if (wordCount < config.minWords) {
        console.error(`Skipping short email (${wordCount} words): ${message.subject}`);
        continue;
      }

      // Add to samples
      samples.push({
        id: message.id,
        date: message.date,
        subject: message.subject,
        to: message.to,
        cc: message.cc,
        body: cleanedBody,
        word_count: wordCount,
        has_attachments: message.attachments.length > 0,
      });

      console.error(`Added sample ${samples.length}/${config.maxSamples}: ${message.subject} (${wordCount} words)`);

    } catch (error) {
      console.error(`Error reading message ${msg.id}: ${error.message}`);
    }
  }

  // Step 3: Write output
  const output = {
    success: true,
    account: config.account,
    date_range: config.dateRange,
    filters: {
      min_words: config.minWords,
      max_samples: config.maxSamples,
    },
    metadata: {
      total_found: searchResult.messages.length,
      total_extracted: samples.length,
      extraction_date: new Date().toISOString(),
    },
    samples,
  };

  writeFileSync(config.output, JSON.stringify(output, null, 2));

  console.error(`\nExtraction complete!`);
  console.error(`Samples extracted: ${samples.length}`);
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
