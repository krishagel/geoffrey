#!/usr/bin/env node

/**
 * Geoffrey Secrets Manager
 *
 * Loads secrets exclusively from 1Password CLI.
 *
 * Usage:
 *   const { getSecret, requireSecret, SECRETS } = require('./secrets.js');
 *   const apiKey = requireSecret('OPENAI_API_KEY');
 *   // Or use pre-defined accessors:
 *   const { domain, apiKey } = SECRETS.freshservice;
 *
 * 1Password Setup:
 *   1. Install: brew install --cask 1password-cli
 *   2. Enable CLI integration in 1Password desktop app settings
 *   3. Create "Geoffrey" vault with items matching VAULT_MAP below
 *   4. See docs/1password-setup.md for detailed setup guide
 */

const { spawnSync } = require('child_process');

// Map environment variable names to 1Password secret references
// Format: op://vault/item/field
const VAULT_MAP = {
  // Freshservice
  FRESHSERVICE_DOMAIN: 'op://Geoffrey/Freshservice/domain',
  FRESHSERVICE_API_KEY: 'op://Geoffrey/Freshservice/api-key',

  // Research LLMs
  OPENAI_API_KEY: 'op://Geoffrey/OpenAI/api-key',
  GEMINI_API_KEY: 'op://Geoffrey/Gemini/api-key',
  PERPLEXITY_API_KEY: 'op://Geoffrey/Perplexity/api-key',
  XAI_API_KEY: 'op://Geoffrey/XAI/api-key',

  // Google Workspace
  GOOGLE_CLIENT_ID: 'op://Geoffrey/Google-Workspace/client-id',
  GOOGLE_CLIENT_SECRET: 'op://Geoffrey/Google-Workspace/client-secret',

  // ElevenLabs
  ELEVENLABS_API_KEY: 'op://Geoffrey/ElevenLabs/api-key',

  // Obsidian MCP
  OBSIDIAN_API_KEY: 'op://Geoffrey/Obsidian-MCP/api-key',

  // Red Rover
  REDROVER_USERNAME: 'op://Geoffrey/RedRover/username',
  REDROVER_PASSWORD: 'op://Geoffrey/RedRover/password',
  REDROVER_API_KEY: 'op://Geoffrey/RedRover/api-key',
};

// Cache for loaded secrets (avoid repeated CLI calls)
const secretsCache = new Map();

// Track 1Password availability check
let _1pChecked = false;
let _1pAvailable = false;

/**
 * Check if 1Password CLI is available and authenticated
 */
function is1PasswordAvailable() {
  if (_1pChecked) return _1pAvailable;

  try {
    const result = spawnSync('op', ['account', 'list'], { encoding: 'utf8' });
    _1pAvailable = result.status === 0;
  } catch {
    _1pAvailable = false;
  }
  _1pChecked = true;
  return _1pAvailable;
}

/**
 * Ensure 1Password is available, throw helpful error if not
 */
function ensure1Password() {
  if (!is1PasswordAvailable()) {
    throw new Error(
      '1Password CLI is not available or not authenticated.\n\n' +
        'Setup required:\n' +
        '  1. Install: brew install --cask 1password-cli\n' +
        '  2. Enable CLI integration in 1Password app:\n' +
        '     Settings → Developer → Enable CLI integration\n' +
        '  3. Authenticate: op signin\n\n' +
        'See docs/1password-setup.md for detailed instructions.'
    );
  }
}

/**
 * Load a secret from 1Password
 */
function loadFrom1Password(secretRef) {
  try {
    const result = spawnSync('op', ['read', secretRef], {
      encoding: 'utf8',
      timeout: 10000,
    });
    if (result.status === 0 && result.stdout) {
      return result.stdout.trim();
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get a single secret by name
 *
 * @param {string} name - Environment variable name (e.g., 'OPENAI_API_KEY')
 * @returns {string|null} - Secret value or null if not found
 */
function getSecret(name) {
  // Check cache first
  if (secretsCache.has(name)) {
    return secretsCache.get(name);
  }

  // Ensure 1Password is available
  ensure1Password();

  // Get 1Password reference
  const secretRef = VAULT_MAP[name];
  if (!secretRef) {
    throw new Error(
      `Unknown secret: ${name}\n` +
        `Available secrets: ${Object.keys(VAULT_MAP).join(', ')}`
    );
  }

  // Load from 1Password
  const value = loadFrom1Password(secretRef);

  // Cache the result
  if (value) {
    secretsCache.set(name, value);
  }

  return value;
}

/**
 * Load multiple secrets at once
 *
 * @param {string[]} names - Array of environment variable names
 * @returns {Object} - Object with secret names as keys
 */
function loadSecrets(names) {
  const result = {};
  for (const name of names) {
    result[name] = getSecret(name);
  }
  return result;
}

/**
 * Get all configured secrets (useful for debugging)
 */
function listAvailableSecrets() {
  return Object.keys(VAULT_MAP);
}

/**
 * Require a secret (throws if not found)
 *
 * @param {string} name - Environment variable name
 * @returns {string} - Secret value
 * @throws {Error} - If secret is not found
 */
function requireSecret(name) {
  const value = getSecret(name);
  if (!value) {
    const opRef = VAULT_MAP[name] || 'not configured';
    throw new Error(
      `Missing required secret: ${name}\n` +
        `1Password reference: ${opRef}\n\n` +
        'To add this secret:\n' +
        `  1. Open 1Password\n` +
        `  2. Create/edit item in Geoffrey vault matching: ${opRef}\n` +
        `  3. See docs/1password-setup.md for vault structure`
    );
  }
  return value;
}

// Pre-defined secret accessors for common use cases
const SECRETS = {
  get freshservice() {
    return {
      domain: requireSecret('FRESHSERVICE_DOMAIN'),
      apiKey: requireSecret('FRESHSERVICE_API_KEY'),
    };
  },
  get openai() {
    return requireSecret('OPENAI_API_KEY');
  },
  get gemini() {
    return requireSecret('GEMINI_API_KEY');
  },
  get perplexity() {
    return requireSecret('PERPLEXITY_API_KEY');
  },
  get xai() {
    return requireSecret('XAI_API_KEY');
  },
  get google() {
    return {
      clientId: requireSecret('GOOGLE_CLIENT_ID'),
      clientSecret: requireSecret('GOOGLE_CLIENT_SECRET'),
    };
  },
  get elevenlabs() {
    return requireSecret('ELEVENLABS_API_KEY');
  },
  get obsidian() {
    return requireSecret('OBSIDIAN_API_KEY');
  },
  get redrover() {
    return {
      username: requireSecret('REDROVER_USERNAME'),
      password: requireSecret('REDROVER_PASSWORD'),
      apiKey: requireSecret('REDROVER_API_KEY'),
    };
  },
};

module.exports = {
  getSecret,
  loadSecrets,
  requireSecret,
  listAvailableSecrets,
  is1PasswordAvailable,
  ensure1Password,
  SECRETS,
  VAULT_MAP,
};
