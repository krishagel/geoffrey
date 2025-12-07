# Writer Skill Scripts

Sample extraction scripts for voice profile creation.

## Prerequisites

### For Email Extraction
- Google Workspace Gmail access configured
- OAuth tokens in macOS Keychain
- Accounts: `psd`, `kh`, `hrg`

### For Blog Extraction
- Geoffrey Chrome profile (for sites that block WebFetch)
- Browser-control skill available

### For Social Extraction
- Geoffrey Chrome profile running: `./scripts/launch-chrome.sh`
- Manually logged into LinkedIn and X/Twitter in Geoffrey Chrome
- Playwright installed (via bun)

## Scripts

### extract-email-samples.js

Fetches sent emails from Gmail accounts.

**Usage**:
```bash
bun extract-email-samples.js \
  --account psd \
  --date-range "2024-06-01:2025-12-06" \
  --min-words 50 \
  --max-samples 100 \
  --output "/tmp/email-samples-psd.json"
```

**Arguments**:
- `--account`: Gmail account (psd, kh, hrg)
- `--date-range`: Date range "YYYY-MM-DD:YYYY-MM-DD"
- `--min-words`: Minimum word count (default: 50)
- `--max-samples`: Maximum samples (default: 100)
- `--output`: Output JSON file path

**Filters**:
- Excludes automated emails (noreply@, calendar notifications)
- Removes signatures, quoted replies, forwarded content
- Filters emails shorter than min-words

**Output Format**:
```json
{
  "success": true,
  "account": "psd",
  "date_range": "2024-06-01:2025-12-06",
  "metadata": {
    "total_found": 245,
    "total_extracted": 100
  },
  "samples": [
    {
      "id": "18d123...",
      "date": "Mon, 15 Jan 2024 10:30:00 -0800",
      "subject": "AI Policy Update",
      "to": "team@psd.org",
      "body": "...",
      "word_count": 187
    }
  ]
}
```

---

### extract-blog-samples.js

Fetches blog posts using browser-control.

**Usage**:
```bash
bun extract-blog-samples.js \
  --urls "https://psd401.ai/blog/post1,https://blog.krishagel.com/post2" \
  --output "/tmp/blog-samples.json"
```

**Arguments**:
- `--urls`: Comma-separated blog post URLs
- `--output`: Output JSON file path

**Extraction Method**:
1. Try `navigate.js` (primary)
2. Fallback to `extract.js` with domain-specific selectors
3. Clean content (remove nav, headers, footers)

**Domain-Specific Selectors**:
- Medium/blog.krishagel.com: `article`, `.post-content`
- psd401.ai: `article`, `.blog-post`
- Generic: `article`, `main`, `.entry-content`

**Output Format**:
```json
{
  "success": true,
  "metadata": {
    "total_urls": 4,
    "total_extracted": 4
  },
  "samples": [
    {
      "url": "https://...",
      "title": "Post Title",
      "date": "2024-11-15",
      "content": "...",
      "word_count": 847
    }
  ]
}
```

---

### extract-social-samples.js

Fetches social media posts from LinkedIn or X/Twitter.

**Usage**:
```bash
# LinkedIn
bun extract-social-samples.js \
  --platform linkedin \
  --profile-url "https://linkedin.com/in/krishagel" \
  --max-posts 50 \
  --output "/tmp/social-linkedin.json"

# Twitter/X
bun extract-social-samples.js \
  --platform twitter \
  --profile-url "https://x.com/KrisHagel" \
  --max-posts 50 \
  --output "/tmp/social-twitter.json"
```

**Arguments**:
- `--platform`: `linkedin` or `twitter`
- `--profile-url`: User profile URL
- `--max-posts`: Maximum posts to extract (default: 50)
- `--output`: Output JSON file path

**Prerequisites**:
1. Geoffrey Chrome running: `cd ~/non-ic-code/geoffrey/skills/browser-control && ./scripts/launch-chrome.sh`
2. Manually log into LinkedIn/X in Geoffrey Chrome browser

**Extraction Method**:
1. Connect to Geoffrey Chrome via CDP (port 9222)
2. Navigate to profile
3. Scroll and extract posts (handles lazy-loading)
4. Extract post text, date, engagement (optional)

**Platform-Specific Selectors**:
- LinkedIn: `.feed-shared-update-v2`, `.feed-shared-text`
- Twitter: `article[data-testid="tweet"]`, `[data-testid="tweetText"]`

**Output Format**:
```json
{
  "success": true,
  "platform": "linkedin",
  "profile_url": "https://linkedin.com/in/krishagel",
  "metadata": {
    "total_extracted": 48
  },
  "samples": [
    {
      "platform": "linkedin",
      "post_number": 1,
      "date": "2024-12-01",
      "text": "...",
      "word_count": 145
    }
  ]
}
```

---

## Troubleshooting

### Email Extraction

**Error**: "Failed to connect to Gmail"
- **Solution**: Check OAuth tokens in macOS Keychain
- **Solution**: Re-authenticate account via google-workspace skill

**Error**: "No messages found"
- **Solution**: Verify date range format: "YYYY-MM-DD:YYYY-MM-DD"
- **Solution**: Check if account has sent emails in that range

---

### Blog Extraction

**Error**: "Failed to fetch URL (403)"
- **Solution**: Use browser-control (Geoffrey Chrome) instead of WebFetch
- **Solution**: Ensure Geoffrey Chrome is running

**Error**: "Too short (X words)"
- **Solution**: Content extraction may have failed - check selectors
- **Solution**: Try different URL or manual inspection

---

### Social Extraction

**Error**: "Failed to connect to Geoffrey Chrome"
- **Solution**: Run `./scripts/launch-chrome.sh` in browser-control directory
- **Solution**: Check port 9222 not in use: `lsof -i :9222`

**Error**: "Posts not found. Are you logged in?"
- **Solution**: Manually open Geoffrey Chrome and log into LinkedIn/X
- **Solution**: Verify posts load in browser before running script
- **Solution**: Selectors may have changed - update in script

---

## Initial Setup Workflow

**Full sample gathering for all 6 profiles**:

```bash
cd ~/non-ic-code/geoffrey/skills/writer/scripts

# 1. Email samples (3 accounts)
bun extract-email-samples.js --account psd --date-range "2024-06-01:2025-12-06" --max-samples 100 --output "/tmp/email-psd.json"
bun extract-email-samples.js --account kh --date-range "2024-06-01:2025-12-06" --max-samples 50 --output "/tmp/email-kh.json"
bun extract-email-samples.js --account hrg --date-range "2024-06-01:2025-12-06" --max-samples 50 --output "/tmp/email-hrg.json"

# 2. Blog samples
cd ~/non-ic-code/geoffrey/skills/browser-control
./scripts/launch-chrome.sh  # If needed

cd ~/non-ic-code/geoffrey/skills/writer/scripts
bun extract-blog-samples.js \
  --urls "https://psd401.ai/blog/stanford-ai-tinkery-2025,https://psd401.ai/blog/why-this-website,https://blog.krishagel.com/post1,https://blog.krishagel.com/post2" \
  --output "/tmp/blog-samples.json"

# 3. Social samples (requires manual login first!)
# Open Geoffrey Chrome, log into LinkedIn and X
bun extract-social-samples.js --platform linkedin --profile-url "https://linkedin.com/in/krishagel" --max-posts 50 --output "/tmp/social-linkedin.json"
bun extract-social-samples.js --platform twitter --profile-url "https://x.com/KrisHagel" --max-posts 50 --output "/tmp/social-twitter.json"

# 4. Ask Geoffrey to analyze
# Tell Claude Code: "Analyze my writing samples and create voice profiles"
# Provide paths to all JSON files
```

**Estimated time**: 30-45 minutes

---

## Notes

- Scripts output JSON to stdout (success/error) and detailed logs to stderr
- All scripts support `bun` runtime (not `node`)
- Email extraction integrates with existing google-workspace Gmail scripts
- Blog/social extraction uses browser-control Playwright scripts
- Social extraction may violate LinkedIn/X ToS - user accepted risk
