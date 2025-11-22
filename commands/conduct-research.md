# Conduct Research Command

Orchestrate parallel multi-LLM research on a topic.

## Usage
```
/conduct-research [topic or question]
```

## Workflow

### Step 1: Query Decomposition

Break the research topic into 3-7 focused sub-queries. Consider:
- **Factual**: What are the basic facts?
- **Current**: What's the latest information?
- **Comparative**: How does it compare to alternatives?
- **Practical**: How does it work in practice?
- **Optimization**: What are the best strategies?
- **Gotchas**: What are common mistakes or pitfalls?

Example for "maximize Alaska Airlines miles for Japan":
1. Current Alaska redemption rates to Japan partners
2. JAL vs Cathay vs other OneWorld options for Japan routes
3. Best credit card strategies for earning Alaska miles
4. Award availability patterns and booking tips
5. Recent program changes or devaluations

### Step 2: Parallel Agent Execution

Launch researcher agents in parallel using the Task tool. Each agent gets relevant sub-queries:

**Perplexity Agent** (current info)
- Sub-queries about recent changes, current rates, latest news

**Gemini Agent** (comparisons)
- Sub-queries comparing options, trade-offs

**OpenAI Agent** (structure)
- Sub-queries about processes, frameworks, how things work

**Claude Agent** (synthesis)
- Sub-queries about recommendations, implications

Use this pattern:
```
Launch 4 Task agents in parallel:
- Task: perplexity-researcher with [sub-queries 1, 2]
- Task: gemini-researcher with [sub-queries 3, 4]
- Task: openai-researcher with [sub-query 5]
- Task: claude-researcher with [synthesis query]
```

### Step 3: Result Collection

Gather results from all agents (typically 15-45 seconds).

### Step 4: Synthesis

Combine all findings into a cohesive report:

1. **Identify Consensus** - What do multiple sources agree on?
2. **Flag Conflicts** - Where do sources disagree?
3. **Score Confidence** - High (4/4 agree), Medium (3/4), Low (2/4 or conflicting)
4. **Extract Actions** - What should the user actually do?

### Step 5: Final Report

Format output as:

```markdown
## Research Report: [Topic]

### Executive Summary
[2-3 sentence overview of key findings]

### Key Findings

#### High Confidence (Multiple Sources Agree)
- Finding 1
- Finding 2

#### Medium Confidence
- Finding 3
- Finding 4

#### Needs Verification
- Finding 5 (sources conflict)

### Detailed Analysis
[Organized by sub-topic with source attribution]

### Sources
- [Source 1](url) - via Perplexity
- [Source 2](url) - via Gemini
- etc.

### Recommendations
1. **Do This First**: [Action]
2. **Then Consider**: [Action]
3. **Watch Out For**: [Gotcha]

### Research Metadata
- Agents used: Perplexity, Gemini, OpenAI, Claude
- Time: [X seconds]
- Date: [Today's date]
- Confidence: Overall High/Medium/Low
```

## API Requirements

Ensure these are configured in `~/Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/secrets/.env`:
- PERPLEXITY_API_KEY
- GEMINI_API_KEY
- OPENAI_API_KEY

## Notes

- If an API fails, continue with remaining agents
- Note which agents were used in final report
- For time-sensitive topics, prioritize Perplexity results
- Consider user preferences when making recommendations (check knowledge-manager)
