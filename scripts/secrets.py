#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""
Geoffrey Secrets Manager (Python)

Loads secrets exclusively from 1Password CLI.

Usage:
    from secrets import get_secret, require_secret, SECRETS
    api_key = require_secret('OPENAI_API_KEY')
    # Or use pre-defined accessors:
    api_key = SECRETS.openai

1Password Setup:
    1. Install: brew install --cask 1password-cli
    2. Enable CLI integration in 1Password desktop app settings
    3. Create "Geoffrey" vault with items matching VAULT_MAP below
    4. See docs/1password-setup.md for detailed setup guide
"""

import subprocess
import sys
from functools import lru_cache
from typing import Optional

# Map environment variable names to 1Password secret references
# Format: op://vault/item/field
VAULT_MAP = {
    # Freshservice
    "FRESHSERVICE_DOMAIN": "op://Geoffrey/Freshservice/domain",
    "FRESHSERVICE_API_KEY": "op://Geoffrey/Freshservice/api-key",

    # Research LLMs
    "OPENAI_API_KEY": "op://Geoffrey/OpenAI/api-key",
    "GEMINI_API_KEY": "op://Geoffrey/Gemini/api-key",
    "PERPLEXITY_API_KEY": "op://Geoffrey/Perplexity/api-key",
    "XAI_API_KEY": "op://Geoffrey/XAI/api-key",

    # Google Workspace
    "GOOGLE_CLIENT_ID": "op://Geoffrey/Google-Workspace/client-id",
    "GOOGLE_CLIENT_SECRET": "op://Geoffrey/Google-Workspace/client-secret",

    # ElevenLabs
    "ELEVENLABS_API_KEY": "op://Geoffrey/ElevenLabs/api-key",

    # Obsidian MCP
    "OBSIDIAN_API_KEY": "op://Geoffrey/Obsidian-MCP/api-key",
}

# Cache for loaded secrets
_secrets_cache: dict[str, str] = {}


@lru_cache(maxsize=1)
def is_1password_available() -> bool:
    """Check if 1Password CLI is available and authenticated."""
    try:
        subprocess.run(
            ["op", "account", "list"],
            capture_output=True,
            check=True,
            timeout=5,
        )
        return True
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        return False


def ensure_1password() -> None:
    """Ensure 1Password is available, raise helpful error if not."""
    if not is_1password_available():
        raise RuntimeError(
            "1Password CLI is not available or not authenticated.\n\n"
            "Setup required:\n"
            "  1. Install: brew install --cask 1password-cli\n"
            "  2. Enable CLI integration in 1Password app:\n"
            "     Settings → Developer → Enable CLI integration\n"
            "  3. Authenticate: op signin\n\n"
            "See docs/1password-setup.md for detailed instructions."
        )


def _load_from_1password(secret_ref: str) -> Optional[str]:
    """Load a secret from 1Password."""
    try:
        result = subprocess.run(
            ["op", "read", secret_ref],
            capture_output=True,
            text=True,
            check=True,
            timeout=10,
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        return None


def get_secret(name: str) -> Optional[str]:
    """
    Get a single secret by name.

    Args:
        name: Environment variable name (e.g., 'OPENAI_API_KEY')

    Returns:
        Secret value or None if not found
    """
    # Check cache first
    if name in _secrets_cache:
        return _secrets_cache[name]

    # Ensure 1Password is available
    ensure_1password()

    # Get 1Password reference
    secret_ref = VAULT_MAP.get(name)
    if not secret_ref:
        raise ValueError(
            f"Unknown secret: {name}\n"
            f"Available secrets: {', '.join(VAULT_MAP.keys())}"
        )

    # Load from 1Password
    value = _load_from_1password(secret_ref)

    # Cache the result
    if value:
        _secrets_cache[name] = value

    return value


def load_secrets(names: list[str]) -> dict[str, Optional[str]]:
    """
    Load multiple secrets at once.

    Args:
        names: List of environment variable names

    Returns:
        Dict with secret names as keys
    """
    return {name: get_secret(name) for name in names}


def require_secret(name: str) -> str:
    """
    Require a secret (raises if not found).

    Args:
        name: Environment variable name

    Returns:
        Secret value

    Raises:
        ValueError: If secret is not found
    """
    value = get_secret(name)
    if not value:
        op_ref = VAULT_MAP.get(name, "not configured")
        raise ValueError(
            f"Missing required secret: {name}\n"
            f"1Password reference: {op_ref}\n\n"
            f"To add this secret:\n"
            f"  1. Open 1Password\n"
            f"  2. Create/edit item in Geoffrey vault matching: {op_ref}\n"
            f"  3. See docs/1password-setup.md for vault structure"
        )
    return value


def list_available_secrets() -> list[str]:
    """Get all configured secret names."""
    return list(VAULT_MAP.keys())


class SecretsAccessor:
    """Pre-defined secret accessors for common use cases."""

    @property
    def freshservice_domain(self) -> str:
        return require_secret("FRESHSERVICE_DOMAIN")

    @property
    def freshservice_api_key(self) -> str:
        return require_secret("FRESHSERVICE_API_KEY")

    @property
    def openai(self) -> str:
        return require_secret("OPENAI_API_KEY")

    @property
    def gemini(self) -> str:
        return require_secret("GEMINI_API_KEY")

    @property
    def perplexity(self) -> str:
        return require_secret("PERPLEXITY_API_KEY")

    @property
    def xai(self) -> str:
        return require_secret("XAI_API_KEY")

    @property
    def google_client_id(self) -> str:
        return require_secret("GOOGLE_CLIENT_ID")

    @property
    def google_client_secret(self) -> str:
        return require_secret("GOOGLE_CLIENT_SECRET")

    @property
    def elevenlabs(self) -> str:
        return require_secret("ELEVENLABS_API_KEY")

    @property
    def obsidian(self) -> str:
        return require_secret("OBSIDIAN_API_KEY")


# Singleton accessor
SECRETS = SecretsAccessor()


if __name__ == "__main__":
    # CLI for testing
    import argparse

    parser = argparse.ArgumentParser(description="Geoffrey Secrets Manager")
    parser.add_argument("--list", action="store_true", help="List available secrets")
    parser.add_argument("--get", metavar="NAME", help="Get a specific secret")
    parser.add_argument("--check-1p", action="store_true", help="Check 1Password availability")

    args = parser.parse_args()

    if args.list:
        print("Available secrets:")
        for name in list_available_secrets():
            print(f"  {name}: {VAULT_MAP[name]}")
    elif args.get:
        try:
            value = require_secret(args.get)
            # Mask middle of secret for security
            if len(value) > 8:
                masked = value[:4] + "..." + value[-4:]
            else:
                masked = "***"
            print(f"{args.get}: {masked}")
        except (ValueError, RuntimeError) as e:
            print(str(e), file=sys.stderr)
            sys.exit(1)
    elif args.check_1p:
        available = is_1password_available()
        print(f"1Password CLI: {'available' if available else 'not available'}")
        sys.exit(0 if available else 1)
    else:
        parser.print_help()
