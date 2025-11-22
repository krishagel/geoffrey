#!/usr/bin/env node

/**
 * Markdown to Google Docs Converter
 *
 * Converts markdown text to Google Docs API requests for proper formatting.
 *
 * Supports:
 * - Headers (# ## ###)
 * - Bold (**text**)
 * - Links [text](url)
 * - Bullet lists (- item)
 * - Numbered lists (1. item)
 * - Horizontal rules (---)
 */

/**
 * Process inline formatting (bold, links) and return plain text + formatting requests
 */
function processInlineFormatting(text, startIndex) {
  const requests = [];
  let plainText = '';
  let charIndex = startIndex;
  let remaining = text;

  while (remaining.length > 0) {
    // Check for bold
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      const boldText = boldMatch[1];
      plainText += boldText;
      requests.push({
        updateTextStyle: {
          range: {
            startIndex: charIndex,
            endIndex: charIndex + boldText.length,
          },
          textStyle: {
            bold: true,
          },
          fields: 'bold',
        },
      });
      charIndex += boldText.length;
      remaining = remaining.substring(boldMatch[0].length);
      continue;
    }

    // Check for links
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      const linkText = linkMatch[1];
      const linkUrl = linkMatch[2];
      plainText += linkText;
      requests.push({
        updateTextStyle: {
          range: {
            startIndex: charIndex,
            endIndex: charIndex + linkText.length,
          },
          textStyle: {
            link: {
              url: linkUrl,
            },
          },
          fields: 'link',
        },
      });
      charIndex += linkText.length;
      remaining = remaining.substring(linkMatch[0].length);
      continue;
    }

    // Regular character
    plainText += remaining[0];
    charIndex++;
    remaining = remaining.substring(1);
  }

  return { plainText, requests, endIndex: charIndex };
}

/**
 * Parse markdown and return plain text + formatting requests
 * @param {string} markdown - The markdown text
 * @returns {Object} { text: string, requests: Array }
 */
function parseMarkdown(markdown) {
  const requests = [];
  let plainText = '';
  let currentIndex = 1; // Google Docs starts at index 1

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

      // Process inline formatting in header
      const { plainText: processedText, requests: inlineRequests } =
        processInlineFormatting(headerContent, currentIndex);

      const fullLine = processedText + '\n';

      const headingStyle = level === 1 ? 'HEADING_1' :
                          level === 2 ? 'HEADING_2' :
                          level === 3 ? 'HEADING_3' :
                          level === 4 ? 'HEADING_4' :
                          level === 5 ? 'HEADING_5' : 'HEADING_6';

      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + fullLine.length,
          },
          paragraphStyle: {
            namedStyleType: headingStyle,
          },
          fields: 'namedStyleType',
        },
      });

      requests.push(...inlineRequests);
      plainText += fullLine;
      currentIndex += fullLine.length;
      continue;
    }

    // Bullet lists - process inline formatting within
    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      const bulletContent = bulletMatch[1];
      const { plainText: processedText, requests: inlineRequests } =
        processInlineFormatting(bulletContent, currentIndex + 2); // +2 for "• "

      const fullLine = '• ' + processedText + '\n';
      plainText += fullLine;
      requests.push(...inlineRequests);
      currentIndex += fullLine.length;
      continue;
    }

    // Numbered lists - process inline formatting within
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      const num = numberedMatch[1];
      const listContent = numberedMatch[2];
      const prefix = num + '. ';
      const { plainText: processedText, requests: inlineRequests } =
        processInlineFormatting(listContent, currentIndex + prefix.length);

      const fullLine = prefix + processedText + '\n';
      plainText += fullLine;
      requests.push(...inlineRequests);
      currentIndex += fullLine.length;
      continue;
    }

    // Regular line - process inline formatting
    const { plainText: processedText, requests: inlineRequests } =
      processInlineFormatting(line, currentIndex);

    const fullLine = processedText + '\n';
    plainText += fullLine;
    requests.push(...inlineRequests);
    currentIndex += fullLine.length;
  }

  return { text: plainText, requests };
}

/**
 * Create a formatted Google Doc from markdown
 * @param {Object} docs - Google Docs API instance
 * @param {string} documentId - Document ID
 * @param {string} markdown - Markdown content
 */
async function insertFormattedContent(docs, documentId, markdown) {
  const { text, requests } = parseMarkdown(markdown);

  // First, insert the plain text
  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [{
        insertText: {
          location: { index: 1 },
          text,
        },
      }],
    },
  });

  // Then apply formatting if there are any requests
  if (requests.length > 0) {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests },
    });
  }

  return { textLength: text.length, formattingRequests: requests.length };
}

// CLI test
async function main() {
  const testMarkdown = `# Main Title

## Section One

This is **bold text** and this is a [link](https://example.com).

- First bullet with [a link](https://test.com)
- Second bullet with **bold**
- Third bullet

### Subsection

1. Numbered item with [link](https://one.com)
2. Numbered item two

---

## Sources

- [Source One](https://source1.com)
- [Source Two](https://source2.com)
`;

  const result = parseMarkdown(testMarkdown);
  console.log('Plain text:');
  console.log(result.text);
  console.log('\nFormatting requests:', result.requests.length);
  console.log('\nSample requests:');
  result.requests.slice(0, 3).forEach(r => console.log(JSON.stringify(r, null, 2)));
}

if (require.main === module) {
  main();
}

module.exports = { parseMarkdown, insertFormattedContent };
