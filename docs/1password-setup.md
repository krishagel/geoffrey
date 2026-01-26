# 1Password Setup for Geoffrey

Geoffrey uses 1Password CLI to securely manage API keys and secrets. This replaces the previous `.env` file approach.

## Prerequisites

1. **Install 1Password CLI**
   ```bash
   brew install --cask 1password-cli
   ```

2. **Enable CLI Integration in 1Password App**
   - Open 1Password app
   - Go to Settings → Developer
   - Enable "Integrate with 1Password CLI"

3. **Authenticate**
   ```bash
   op signin
   ```

## Required 1Password Items

Create the following items in a vault named "Geoffrey" (or update `VAULT_MAP` in `scripts/secrets.js` if using a different vault):

### Freshservice
- **Item name:** `Freshservice`
- **Fields:**
  - `domain` - Your Freshservice domain (e.g., `yourcompany.freshservice.com`)
  - `api-key` - Your Freshservice API key

### OpenAI
- **Item name:** `OpenAI`
- **Fields:**
  - `api-key` - Your OpenAI API key

### Gemini
- **Item name:** `Gemini`
- **Fields:**
  - `api-key` - Your Google Gemini API key

### Perplexity
- **Item name:** `Perplexity`
- **Fields:**
  - `api-key` - Your Perplexity API key

### XAI (Grok)
- **Item name:** `XAI`
- **Fields:**
  - `api-key` - Your xAI API key

### ElevenLabs
- **Item name:** `ElevenLabs`
- **Fields:**
  - `api-key` - Your ElevenLabs API key

### Google Workspace
- **Item name:** `Google-Workspace`
- **Fields:**
  - `client-id` - Your Google OAuth client ID
  - `client-secret` - Your Google OAuth client secret

### Obsidian MCP
- **Item name:** `Obsidian-MCP`
- **Fields:**
  - `api-key` - Your Obsidian Local REST API key

## Secret References

The centralized secrets module (`scripts/secrets.js` and `scripts/secrets.py`) maps environment variable names to 1Password secret references:

| Secret Name | 1Password Reference |
|-------------|---------------------|
| `FRESHSERVICE_DOMAIN` | `op://Geoffrey/Freshservice/domain` |
| `FRESHSERVICE_API_KEY` | `op://Geoffrey/Freshservice/api-key` |
| `OPENAI_API_KEY` | `op://Geoffrey/OpenAI/api-key` |
| `GEMINI_API_KEY` | `op://Geoffrey/Gemini/api-key` |
| `PERPLEXITY_API_KEY` | `op://Geoffrey/Perplexity/api-key` |
| `XAI_API_KEY` | `op://Geoffrey/XAI/api-key` |
| `GOOGLE_CLIENT_ID` | `op://Geoffrey/Google-Workspace/client-id` |
| `GOOGLE_CLIENT_SECRET` | `op://Geoffrey/Google-Workspace/client-secret` |
| `ELEVENLABS_API_KEY` | `op://Geoffrey/ElevenLabs/api-key` |
| `OBSIDIAN_API_KEY` | `op://Geoffrey/Obsidian-MCP/api-key` |

## Testing

Verify your setup by running:

```bash
# Test that 1Password CLI is working
op whoami

# Test secret retrieval
op read "op://Geoffrey/Freshservice/api-key"
```

## Troubleshooting

### "1Password CLI is not available or not authenticated"

1. Ensure 1Password CLI is installed: `which op`
2. Ensure CLI integration is enabled in 1Password app settings
3. Sign in: `op signin`

### "Secret not found"

1. Verify the item exists in your 1Password vault
2. Check that the vault name matches (default: "Geoffrey")
3. Check that field names match (use lowercase with hyphens)

### Changing the Vault Name

If your vault has a different name, update `VAULT_MAP` in both:
- `scripts/secrets.js`
- `scripts/secrets.py`

Replace `op://Geoffrey/...` with `op://YourVaultName/...`

## Migration from .env

If you previously used the `.env` file approach:

1. Create the required items in 1Password (see above)
2. Copy your API keys from `.env` to the corresponding 1Password fields
3. Verify scripts work with `bun` or `uv run`
4. Delete the old `.env` file from iCloud

The `.env` file location was: `~/Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/secrets/.env`
