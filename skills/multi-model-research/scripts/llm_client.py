#!/usr/bin/env python3
# /// script
# dependencies = ["httpx>=0.25.0"]
# ///
"""
Universal LLM Client for Multi-Model Research

Provides unified async interface to call GPT-5.1, Gemini 3.0 Pro, Perplexity Sonar, and Grok 4.1
with provider-specific formatting handled internally.
"""

import sys
import asyncio
import httpx
from pathlib import Path
from typing import Optional
from dataclasses import dataclass

# Add scripts directory to path for secrets module import
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "scripts"))
from secrets import get_secret


@dataclass
class LLMResponse:
    """Standardized response from any LLM provider."""
    content: str
    model: str
    provider: str
    citations: Optional[list] = None
    usage: Optional[dict] = None
    raw_response: Optional[dict] = None


class MultiModelClient:
    """Unified async client for multiple LLM providers."""

    def __init__(self, timeout: int = 120):
        self.keys = {
            "openai": get_secret("OPENAI_API_KEY"),
            "google": get_secret("GEMINI_API_KEY"),
            "perplexity": get_secret("PERPLEXITY_API_KEY"),
            "xai": get_secret("XAI_API_KEY"),
        }
        self.timeout = timeout

    async def chat(
        self,
        provider: str,
        model: str,
        messages: list[dict],
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> LLMResponse:
        """
        Send a chat completion request to the specified provider.

        Args:
            provider: Provider name (openai, google, perplexity, xai)
            model: Model ID
            messages: List of {"role": "user/assistant", "content": "..."}
            system_prompt: Optional system prompt
            **kwargs: Provider-specific overrides

        Returns:
            LLMResponse with standardized fields
        """
        if not self.keys.get(provider):
            raise ValueError(f"Missing API key for {provider}. Set {provider.upper()}_API_KEY")

        # Dispatch to provider-specific handler
        handlers = {
            "openai": self._call_openai,
            "google": self._call_google,
            "perplexity": self._call_perplexity,
            "xai": self._call_xai,
        }

        if provider not in handlers:
            raise ValueError(f"Unknown provider: {provider}")

        return await handlers[provider](model, messages, system_prompt, **kwargs)

    async def _call_openai(self, model: str, messages: list[dict], system_prompt: Optional[str], **kwargs):
        """Call OpenAI GPT API using Responses API for GPT-5.1+."""
        headers = {
            "Authorization": f"Bearer {self.keys['openai']}",
            "Content-Type": "application/json",
        }

        # GPT-5.1 should use Responses API for better performance
        use_responses_api = "gpt-5" in model.lower()

        if use_responses_api:
            # Responses API format - different parameter names
            body = {
                "model": model,
                "input": messages,  # 'input' not 'messages'
                "max_output_tokens": kwargs.get("max_tokens", 8192),  # 'max_output_tokens' not 'max_completion_tokens'
                "temperature": kwargs.get("temperature", 0.7),
            }

            # Add system instruction if provided (use 'instructions' parameter)
            if system_prompt:
                body["instructions"] = system_prompt

            # Add reasoning effort for GPT-5.1
            if "reasoning_effort" in kwargs:
                body["reasoning_effort"] = kwargs["reasoning_effort"]

            # Add extended caching for better performance
            body["prompt_cache_retention"] = "24h"

            endpoint = "https://api.openai.com/v1/responses"
        else:
            # Chat Completions API format (for older models)
            if system_prompt:
                messages = [{"role": "system", "content": system_prompt}] + messages

            body = {
                "model": model,
                "messages": messages,
                "max_tokens": kwargs.get("max_tokens", 8192),
                "temperature": kwargs.get("temperature", 0.7),
            }

            endpoint = "https://api.openai.com/v1/chat/completions"

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(endpoint, headers=headers, json=body)
            if resp.status_code != 200:
                print(f"OpenAI API Error {resp.status_code}: {resp.text}")
            resp.raise_for_status()
            data = resp.json()

        # Parse response based on API type
        if use_responses_api:
            # Responses API - extract text from nested structure
            # output -> message -> content -> output_text -> text
            content = ""
            if "output" in data and isinstance(data["output"], list):
                for message in data["output"]:
                    if isinstance(message, dict) and message.get("type") == "message":
                        # Extract text from content array
                        for content_item in message.get("content", []):
                            if isinstance(content_item, dict) and content_item.get("type") == "output_text":
                                content += content_item.get("text", "")
            if not content:
                raise ValueError(f"Could not extract text from Responses API response")
        else:
            content = data["choices"][0]["message"]["content"]

        return LLMResponse(
            content=content,
            model=model,
            provider="openai",
            usage=data.get("usage"),
            raw_response=data,
        )

    async def _call_google(self, model: str, messages: list[dict], system_prompt: Optional[str], **kwargs):
        """Call Google Gemini API."""
        api_key = self.keys["google"]
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

        # Convert messages to Gemini format
        contents = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})

        body = {"contents": contents}

        if system_prompt:
            body["systemInstruction"] = {"parts": [{"text": system_prompt}]}

        body["generationConfig"] = {
            "maxOutputTokens": kwargs.get("max_tokens", 8192),
            "temperature": kwargs.get("temperature", 0.7),
        }

        headers = {"Content-Type": "application/json"}

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, headers=headers, json=body)
            resp.raise_for_status()
            data = resp.json()

        return LLMResponse(
            content=data["candidates"][0]["content"]["parts"][0]["text"],
            model=model,
            provider="google",
            usage=data.get("usageMetadata"),
            raw_response=data,
        )

    async def _call_perplexity(self, model: str, messages: list[dict], system_prompt: Optional[str], **kwargs):
        """Call Perplexity Sonar API with search capabilities."""
        headers = {
            "Authorization": f"Bearer {self.keys['perplexity']}",
            "Content-Type": "application/json",
        }

        if system_prompt:
            messages = [{"role": "system", "content": system_prompt}] + messages

        body = {
            "model": model,
            "messages": messages,
            "max_tokens": kwargs.get("max_tokens", 4096),
            "temperature": kwargs.get("temperature", 0.7),
            "return_citations": kwargs.get("return_citations", True),
            "search_context_size": kwargs.get("search_context_size", "high"),
        }

        # Optional search filters
        if "search_domain_filter" in kwargs:
            body["search_domain_filter"] = kwargs["search_domain_filter"]
        if "search_recency_filter" in kwargs:
            body["search_recency_filter"] = kwargs["search_recency_filter"]

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post("https://api.perplexity.ai/chat/completions", headers=headers, json=body)
            resp.raise_for_status()
            data = resp.json()

        return LLMResponse(
            content=data["choices"][0]["message"]["content"],
            model=model,
            provider="perplexity",
            citations=data.get("citations", []),
            usage=data.get("usage"),
            raw_response=data,
        )

    async def _call_xai(self, model: str, messages: list[dict], system_prompt: Optional[str], **kwargs):
        """Call xAI Grok API with optional tool use."""
        headers = {
            "Authorization": f"Bearer {self.keys['xai']}",
            "Content-Type": "application/json",
        }

        if system_prompt:
            messages = [{"role": "system", "content": system_prompt}] + messages

        body = {
            "model": model,
            "messages": messages,
            "max_tokens": kwargs.get("max_tokens", 8192),
            "temperature": kwargs.get("temperature", 0.7),
        }

        # Add tools if specified (X search, web search, code execution)
        if "tools" in kwargs:
            body["tools"] = kwargs["tools"]

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post("https://api.x.ai/v1/chat/completions", headers=headers, json=body)
            resp.raise_for_status()
            data = resp.json()

        return LLMResponse(
            content=data["choices"][0]["message"]["content"],
            model=model,
            provider="xai",
            usage=data.get("usage"),
            raw_response=data,
        )

    async def parallel_chat(
        self,
        requests: list[dict],
    ) -> dict[str, LLMResponse]:
        """
        Send multiple queries to different models in parallel.

        Args:
            requests: List of dicts with keys: provider, model, messages, system_prompt, etc.

        Returns:
            Dict mapping request index/key to LLMResponse
        """
        tasks = []
        keys = []

        for i, req in enumerate(requests):
            key = req.get("key", f"request_{i}")
            keys.append(key)
            tasks.append(self.chat(
                provider=req["provider"],
                model=req["model"],
                messages=req["messages"],
                system_prompt=req.get("system_prompt"),
                **req.get("kwargs", {})
            ))

        results = {}
        responses = await asyncio.gather(*tasks, return_exceptions=True)

        for key, response in zip(keys, responses):
            if isinstance(response, Exception):
                print(f"Warning: {key} failed with {response}")
                results[key] = None
            else:
                results[key] = response

        return results


if __name__ == "__main__":
    # Simple test
    async def test():
        client = MultiModelClient()
        response = await client.chat(
            provider="perplexity",
            model="sonar-pro",
            messages=[{"role": "user", "content": "What is the capital of France?"}]
        )
        print(f"Response: {response.content}")
        if response.citations:
            print(f"Citations: {response.citations}")

    asyncio.run(test())
