# Peer Review Prompt

You are evaluating research responses to the following query:

**QUERY:** {query}

Below are anonymized responses from different AI research assistants labeled A, B, C, etc. Your task is to review each one critically and provide a ranking.

## Responses

{responses}

---

## Your Review Task

1. **Rank the responses** from best to worst (by letter ID: A, B, C, etc.)

2. **Evaluation criteria:**
   - Factual accuracy and reliability
   - Depth and completeness of coverage
   - Quality of reasoning and analysis
   - Clarity and organization
   - Appropriate use of sources/citations
   - Practical usefulness

3. **Note any concerns:**
   - Factual errors or unsupported claims
   - Important gaps or omissions
   - Potential biases or one-sided coverage
   - Conflicts between sources

## Response Format

Provide your evaluation in this JSON format:

```json
{
  "ranking": ["A", "B", "C"],
  "best_response_strengths": "What made the top response stand out",
  "areas_for_improvement": "What could be better across all responses",
  "factual_concerns": ["List any factual issues noted"],
  "confidence": "high/medium/low"
}
```

Be specific and constructive in your feedback. Identify concrete examples to support your rankings.
