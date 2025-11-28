#!/usr/bin/env python3
"""
Citation Tracker

Manages source provenance, deduplication, and citation formatting for research reports.
"""

from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime
import hashlib
import re


@dataclass
class Citation:
    """Represents a single citation/source."""
    url: str
    title: str
    snippet: Optional[str] = None
    date_accessed: str = field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d"))
    source_model: Optional[str] = None

    @property
    def id(self) -> str:
        """Generate unique ID based on URL."""
        return hashlib.md5(self.url.encode()).hexdigest()[:8]


class CitationTracker:
    """Tracks and manages citations across the research process."""

    def __init__(self):
        self.citations: dict[str, Citation] = {}

    def add_citation(self, citation: Citation) -> int:
        """Add a citation and return its numeric index."""
        if citation.id not in self.citations:
            self.citations[citation.id] = citation
        return list(self.citations.keys()).index(citation.id) + 1

    def add_from_perplexity(self, perplexity_citations: list) -> list[int]:
        """Import citations from Perplexity response."""
        indices = []
        for cite in perplexity_citations:
            if isinstance(cite, dict):
                citation = Citation(
                    url=cite.get("url", ""),
                    title=cite.get("title", "Unknown Source"),
                    snippet=cite.get("snippet"),
                    source_model="perplexity"
                )
            else:
                citation = Citation(url=str(cite), title="Source", source_model="perplexity")
            indices.append(self.add_citation(citation))
        return indices

    def extract_citations_from_text(self, text: str) -> list[str]:
        """Extract URLs mentioned in text for potential citation."""
        url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
        return re.findall(url_pattern, text)

    def format_inline(self, citation_indices: list[int]) -> str:
        """Format citations for inline use: [1][2]"""
        return "".join(f"[{i}]" for i in citation_indices)

    def format_references_section(self) -> str:
        """Generate the references section for the report."""
        if not self.citations:
            return ""

        lines = ["## References\n"]
        for i, (cid, cite) in enumerate(self.citations.items(), 1):
            line = f"[{i}] {cite.title}"
            if cite.url:
                line += f" - {cite.url}"
            if cite.date_accessed:
                line += f" (accessed {cite.date_accessed})"
            lines.append(line)

        return "\n".join(lines)

    def get_all_citations(self) -> list[Citation]:
        """Get all tracked citations."""
        return list(self.citations.values())
