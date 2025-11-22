---
name: research
description: Multi-LLM parallel research with query decomposition and synthesis
triggers:
  - "research"
  - "find out about"
  - "investigate"
  - "look into"
  - "what do you know about"
  - "deep dive"
  - "analyze"
  - "compare"
  - "find information"
  - "learn about"
allowed-tools: Read, Bash, WebSearch, WebFetch, Task
version: 0.1.0
---

# Research Skill

Multi-source research using parallel LLM agents for comprehensive, current information gathering.

## When to Activate

Use this skill when user needs:
- Current information (credit card perks, travel deals, policies)
- Multi-perspective analysis (comparing options)
- Deep investigation of complex topics
- Fact-checking or verification
- Market research or trend analysis

## Architecture

### Query Decomposition
Break complex questions into 3-7 sub-queries covering different angles:
- Factual/definitional
- Comparative
- Current state
- Expert opinions
- User experiences
- Edge cases

### Parallel Agent Execution
Launch multiple researcher agents simultaneously:
- **Perplexity** - Best for current web information, citations
- **Gemini** - Good for multi-perspective synthesis
- **OpenAI** - Strong structured analysis
- **Claude** - Deep reasoning, nuanced analysis

### Result Synthesis
- Collect all findings
- Identify consensus vs conflicts
- Score confidence per finding
- Cite sources
- Provide actionable recommendations

## Available Agents

Agents are in `/agents/` directory:

| Agent | Best For | API Required |
|-------|----------|--------------|
| `perplexity-researcher.md` | Current web info, citations | PERPLEXITY_API_KEY |
| `gemini-researcher.md` | Multi-angle comparison | GEMINI_API_KEY |
| `openai-researcher.md` | Structured analysis | OPENAI_API_KEY |
| `claude-researcher.md` | Deep reasoning | Native (Claude Code) |

## Usage

### Basic Research
```
User: "Research the best ways to maximize Alaska Airlines miles for Japan flights"

Geoffrey:
1. Decomposes into sub-queries:
   - Current Alaska redemption rates to Japan
   - Partner airline options (JAL, etc.)
   - Sweet spots and award availability patterns
   - Credit card earning strategies
   - Recent devaluations or changes

2. Launches 4 agents in parallel

3. Synthesizes findings with confidence scores
```

### Workflow Command
Use `/conduct-research [topic]` to trigger full parallel research workflow.

## Output Format

```markdown
## Research: [Topic]

### Key Findings
- Finding 1 (High confidence - 4/4 sources agree)
- Finding 2 (Medium confidence - 3/4 sources)
- Finding 3 (Low confidence - conflicting info)

### Detailed Analysis
[Synthesized information organized by sub-topic]

### Sources
- [Source 1](url) - via Perplexity
- [Source 2](url) - via Gemini
- etc.

### Confidence Assessment
Overall: High/Medium/Low
- What we're confident about
- What needs verification
- What's still unclear

### Recommendations
1. Actionable next step
2. Another action
```

## API Configuration

Keys stored in: `~/Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/secrets/.env`

```bash
PERPLEXITY_API_KEY=pplx-...
GEMINI_API_KEY=...
OPENAI_API_KEY=sk-...
# Note: Claude runs natively in Claude Code, no API key needed
```

## Performance

- **Speed**: 15-45 seconds for full parallel research
- **Depth**: 4 independent perspectives
- **Accuracy**: Cross-referenced with confidence scoring

## Limitations

- API rate limits may throttle parallel requests
- Costs accrue per API call
- Not all agents may have access to same sources
- Real-time data (stock prices, availability) needs direct API access

## Future Enhancements

- Caching frequent research topics
- Learning which agents are best for which domains
- Automatic source credibility scoring
- Research history and versioning
