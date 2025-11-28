#!/usr/bin/env python3
# /// script
# dependencies = ["httpx>=0.25.0", "pyyaml>=6.0", "python-dotenv>=1.0.0"]
# ///
"""
Multi-Model Research Agent - External API Orchestrator

This script calls external LLM APIs (GPT, Gemini, Perplexity, Grok) in parallel
and returns their responses as JSON. The orchestration and synthesis happens in
Geoffrey/Claude running in Claude Code.

Usage:
    uv run research.py --query "Your research question" --models gpt,gemini,perplexity,grok --output responses.json
"""

import asyncio
import argparse
import json
import yaml
from pathlib import Path
from llm_client import MultiModelClient
from citation_tracker import CitationTracker, Citation


def load_config() -> dict:
    """Load configuration from config.yaml."""
    config_path = Path(__file__).parent.parent / "config.yaml"
    with open(config_path) as f:
        return yaml.safe_load(f)


def load_system_prompts() -> dict:
    """Load system prompts from prompts/system_prompts.yaml."""
    prompts_path = Path(__file__).parent.parent / "prompts/system_prompts.yaml"
    if prompts_path.exists():
        with open(prompts_path) as f:
            return yaml.safe_load(f)
    return {}


async def fetch_external_responses(
    query: str,
    models: list[str],
    config: dict,
    system_prompts: dict
) -> dict:
    """
    Fetch responses from external LLM APIs in parallel.

    Args:
        query: The research question
        models: List of model keys to query (gpt, gemini, perplexity, grok)
        config: Configuration dict from config.yaml
        system_prompts: System prompts dict from prompts/system_prompts.yaml

    Returns:
        Dict with responses from each model
    """
    client = MultiModelClient()
    citation_tracker = CitationTracker()

    # Build requests for each model
    requests = []
    for model_key in models:
        if model_key not in config["models"]:
            print(f"Warning: Unknown model '{model_key}', skipping")
            continue

        model_config = config["models"][model_key]
        if not model_config.get("enabled", True):
            print(f"Warning: Model '{model_key}' is disabled in config, skipping")
            continue

        # Get system prompt for this model
        system_prompt = system_prompts.get("research", {}).get(model_key)
        if not system_prompt:
            system_prompt = system_prompts.get("research", {}).get("default", "You are a research assistant.")

        requests.append({
            "key": model_key,
            "provider": model_config["provider"],
            "model": model_config["model_id"],
            "messages": [{"role": "user", "content": query}],
            "system_prompt": system_prompt,
            "kwargs": {
                "max_tokens": model_config.get("max_tokens", 8192),
                "temperature": model_config.get("temperature", 0.7),
            }
        })

    # Execute all requests in parallel
    print(f"Querying {len(requests)} models in parallel...")
    responses = await client.parallel_chat(requests)

    # Format results
    results = {}
    for model_key, response in responses.items():
        if response is None:
            results[model_key] = {
                "error": "Failed to get response",
                "content": None,
                "citations": []
            }
            continue

        # Extract citations
        citations = []
        if response.citations:
            # Perplexity provides citations
            for cite in response.citations:
                if isinstance(cite, dict):
                    citations.append({
                        "url": cite.get("url", ""),
                        "title": cite.get("title", "Source"),
                        "snippet": cite.get("snippet", "")
                    })
                else:
                    citations.append({"url": str(cite), "title": "Source"})
        else:
            # Extract URLs from content for other models
            urls = citation_tracker.extract_citations_from_text(response.content)
            for url in urls:
                citations.append({"url": url, "title": "Source"})

        results[model_key] = {
            "content": response.content,
            "model": response.model,
            "provider": response.provider,
            "citations": citations,
            "usage": response.usage,
        }

    return results


async def main():
    parser = argparse.ArgumentParser(description="Multi-Model Research Agent - External API Orchestrator")
    parser.add_argument("--query", "-q", required=True, help="Research query")
    parser.add_argument("--models", "-m", required=True, help="Comma-separated list of models (gpt,gemini,perplexity,grok)")
    parser.add_argument("--output", "-o", default="/tmp/research_responses.json", help="Output file path for JSON responses")

    args = parser.parse_args()

    # Parse models
    models = [m.strip() for m in args.models.split(",")]

    # Load config and prompts
    config = load_config()
    system_prompts = load_system_prompts()

    # Fetch responses
    results = await fetch_external_responses(args.query, models, config, system_prompts)

    # Save to JSON
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w") as f:
        json.dump({
            "query": args.query,
            "models": models,
            "responses": results
        }, f, indent=2)

    print(f"\nResponses saved to: {output_path}")
    print(f"Models queried: {', '.join(results.keys())}")
    print(f"Successful: {sum(1 for r in results.values() if r.get('content'))}")
    print(f"Failed: {sum(1 for r in results.values() if not r.get('content'))}")


if __name__ == "__main__":
    asyncio.run(main())
