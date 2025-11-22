#!/usr/bin/env node

/**
 * Edit Google Doc with Markdown Formatting
 *
 * Usage: bun edit_doc.js <account> <document-id> --append <markdown>
 *        bun edit_doc.js <account> <document-id> --replace <old> --with <new>
 *
 * Options:
 *   --raw    Don't apply markdown formatting (plain text)
 *
 * Examples:
 *   bun edit_doc.js psd DOC_ID --append "## New Section\n\nContent here"
 *   bun edit_doc.js psd DOC_ID --append "Plain text" --raw
 */

const { google } = require('googleapis');
const path = require('path');
const { getAuthClient } = require(path.join(__dirname, '..', 'auth', 'token_manager'));
const { parseMarkdown } = require(path.join(__dirname, '..', 'utils', 'markdown_to_docs'));

/**
 * Parse markdown with custom start index (for appending)
 */
function parseMarkdownAtIndex(markdown, startIndex) {
  const requests = [];
  let plainText = '';
  let currentIndex = startIndex;

  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Horizontal rule
    if (line.match(/^---+$/)) {
      const ruleLine = '─'.repeat(50) + '\n';
      plainText += ruleLine;
      currentIndex += ruleLine.length;
      continue;
    }

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const headerContent = headerMatch[2];
      const { plainText: processedText, requests: inlineRequests } =
        processInlineFormattingAtIndex(headerContent, currentIndex);

      const fullLine = processedText + '\n';
      const headingStyle = level === 1 ? 'HEADING_1' :
                          level === 2 ? 'HEADING_2' :
                          level === 3 ? 'HEADING_3' : 'HEADING_4';

      requests.push({
        updateParagraphStyle: {
          range: { startIndex: currentIndex, endIndex: currentIndex + fullLine.length },
          paragraphStyle: { namedStyleType: headingStyle },
          fields: 'namedStyleType',
        },
      });
      requests.push(...inlineRequests);
      plainText += fullLine;
      currentIndex += fullLine.length;
      continue;
    }

    // Bullet lists
    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      const { plainText: processedText, requests: inlineRequests } =
        processInlineFormattingAtIndex(bulletMatch[1], currentIndex + 2);
      const fullLine = '• ' + processedText + '\n';
      plainText += fullLine;
      requests.push(...inlineRequests);
      currentIndex += fullLine.length;
      continue;
    }

    // Numbered lists
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      const prefix = numberedMatch[1] + '. ';
      const { plainText: processedText, requests: inlineRequests } =
        processInlineFormattingAtIndex(numberedMatch[2], currentIndex + prefix.length);
      const fullLine = prefix + processedText + '\n';
      plainText += fullLine;
      requests.push(...inlineRequests);
      currentIndex += fullLine.length;
      continue;
    }

    // Regular line
    const { plainText: processedText, requests: inlineRequests } =
      processInlineFormattingAtIndex(line, currentIndex);
    const fullLine = processedText + '\n';
    plainText += fullLine;
    requests.push(...inlineRequests);
    currentIndex += fullLine.length;
  }

  return { text: plainText, requests };
}

function processInlineFormattingAtIndex(text, startIndex) {
  const requests = [];
  let plainText = '';
  let charIndex = startIndex;
  let remaining = text;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      plainText += boldMatch[1];
      requests.push({
        updateTextStyle: {
          range: { startIndex: charIndex, endIndex: charIndex + boldMatch[1].length },
          textStyle: { bold: true },
          fields: 'bold',
        },
      });
      charIndex += boldMatch[1].length;
      remaining = remaining.substring(boldMatch[0].length);
      continue;
    }

    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      plainText += linkMatch[1];
      requests.push({
        updateTextStyle: {
          range: { startIndex: charIndex, endIndex: charIndex + linkMatch[1].length },
          textStyle: { link: { url: linkMatch[2] } },
          fields: 'link',
        },
      });
      charIndex += linkMatch[1].length;
      remaining = remaining.substring(linkMatch[0].length);
      continue;
    }

    plainText += remaining[0];
    charIndex++;
    remaining = remaining.substring(1);
  }

  return { plainText, requests };
}

async function editDoc(account, documentId, options) {
  const auth = await getAuthClient(account);
  const docs = google.docs({ version: 'v1', auth });

  if (options.append) {
    // Get document to find end index
    const doc = await docs.documents.get({ documentId });
    const endIndex = doc.data.body.content[doc.data.body.content.length - 1].endIndex - 1;

    if (options.raw) {
      // Plain text append
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [{
            insertText: {
              location: { index: endIndex },
              text: '\n' + options.append,
            },
          }],
        },
      });
      return {
        success: true,
        account,
        documentId,
        updates: 1,
        metadata: { timestamp: new Date().toISOString() }
      };
    }

    // Formatted append
    const { text, requests } = parseMarkdownAtIndex(options.append, endIndex + 1);

    // Insert text
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [{
          insertText: {
            location: { index: endIndex },
            text: '\n' + text,
          },
        }],
      },
    });

    // Apply formatting
    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: { requests },
      });
    }

    return {
      success: true,
      account,
      documentId,
      updates: 1 + requests.length,
      formatting: { textLength: text.length, formattingRequests: requests.length },
      metadata: { timestamp: new Date().toISOString() }
    };
  }

  if (options.replace && options.with) {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [{
          replaceAllText: {
            containsText: { text: options.replace, matchCase: true },
            replaceText: options.with,
          },
        }],
      },
    });

    return {
      success: true,
      account,
      documentId,
      updates: 1,
      metadata: { timestamp: new Date().toISOString() }
    };
  }

  return { success: false, error: 'No edit operation specified' };
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const account = args[0];
  const documentId = args[1];

  if (!account || !documentId) {
    console.error(JSON.stringify({
      error: 'Missing arguments',
      usage: 'bun edit_doc.js <account> <document-id> --append <markdown>'
    }));
    process.exit(1);
  }

  const options = {};
  for (let i = 2; i < args.length; i++) {
    switch (args[i]) {
      case '--append': options.append = args[++i]; break;
      case '--replace': options.replace = args[++i]; break;
      case '--with': options.with = args[++i]; break;
      case '--raw': options.raw = true; break;
    }
  }

  try {
    const result = await editDoc(account, documentId, options);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      error: error.message,
      account,
      documentId,
    }));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { editDoc };
