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
    let lineRequests = [];
    let processedLine = '';

    // Horizontal rule
    if (line.match(/^---+$/)) {
      processedLine = '─'.repeat(50) + '\n';
      plainText += processedLine;
      currentIndex += processedLine.length;
      continue;
    }

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const text = headerMatch[2];
      processedLine = text + '\n';

      const headingStyle = level === 1 ? 'HEADING_1' :
                          level === 2 ? 'HEADING_2' :
                          level === 3 ? 'HEADING_3' :
                          level === 4 ? 'HEADING_4' :
                          level === 5 ? 'HEADING_5' : 'HEADING_6';

      lineRequests.push({
        updateParagraphStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + processedLine.length,
          },
          paragraphStyle: {
            namedStyleType: headingStyle,
          },
          fields: 'namedStyleType',
        },
      });

      plainText += processedLine;
      requests.push(...lineRequests);
      currentIndex += processedLine.length;
      continue;
    }

    // Bullet lists
    if (line.match(/^[-*]\s+/)) {
      processedLine = line.replace(/^[-*]\s+/, '• ') + '\n';
      plainText += processedLine;
      currentIndex += processedLine.length;
      continue;
    }

    // Numbered lists
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      processedLine = numberedMatch[1] + '. ' + numberedMatch[2] + '\n';
      plainText += processedLine;
      currentIndex += processedLine.length;
      continue;
    }

    // Process inline formatting (bold, links)
    let charIndex = currentIndex;
    let remaining = line;
    processedLine = '';

    while (remaining.length > 0) {
      // Check for bold
      const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
      if (boldMatch) {
        const boldText = boldMatch[1];
        processedLine += boldText;
        lineRequests.push({
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
      const linkMatch = remaining.match(/^\[(.+?)\]\((.+?)\)/);
      if (linkMatch) {
        const linkText = linkMatch[1];
        const linkUrl = linkMatch[2];
        processedLine += linkText;
        lineRequests.push({
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
      processedLine += remaining[0];
      charIndex++;
      remaining = remaining.substring(1);
    }

    processedLine += '\n';
    plainText += processedLine;
    requests.push(...lineRequests);
    currentIndex += processedLine.length;
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

- First bullet
- Second bullet
- Third bullet

### Subsection

1. Numbered item one
2. Numbered item two

---

## Another Section

More content here with **important** information.
`;

  const result = parseMarkdown(testMarkdown);
  console.log('Plain text:');
  console.log(result.text);
  console.log('\nFormatting requests:', result.requests.length);
}

if (require.main === module) {
  main();
}

module.exports = { parseMarkdown, insertFormattedContent };
