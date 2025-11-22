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

## Citation Requirements

**CRITICAL:** All research output MUST include citations.

### Inline Citations
Every factual claim must link to its source:
- "The Westin Rusutsu costs 70,000 points peak ([Point Hacks](url))"
- "Shinkansen to Nagano takes 1.5 hours ([Corritrip](url))"

### Source Section
Every research report must end with a complete "Sources" section listing all URLs used.

### Why This Matters
- User needs to verify information
- Information changes frequently (credit card perks, prices)
- Establishes credibility
- Allows deeper exploration

### No Citation = Don't Include
If you can't cite a source for a claim, either:
1. Find a source
2. Mark it as "unverified"
3. Don't include it

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

Agents are in `./agents/` directory:

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
- Finding 1 with inline citation ([Source](url))
- Finding 2 with inline citation ([Source](url))
- Finding 3 - conflicting info ([Source A](url) vs [Source B](url))

### Detailed Analysis

#### Sub-topic 1
Information with citations throughout. For example, "The Westin Rusutsu
costs 70,000 points peak" ([Point Hacks](url)) and "offers ski-in/ski-out
access" ([Marriott](url)).

#### Sub-topic 2
More information with inline citations...

### Confidence Assessment
Overall: High/Medium/Low
- What we're confident about
- What needs verification
- What's still unclear

### Recommendations
1. Actionable next step
2. Another action

### All Sources
Complete list of every URL referenced:
- [Source Name 1](full-url)
- [Source Name 2](full-url)
- [Source Name 3](full-url)
```

**Note:** Every factual claim needs an inline citation. The "All Sources" section at the end provides a consolidated reference list.

## Saving Research Reports

**ALWAYS save research reports to Google Docs** after completing research.

### Default Behavior
1. Create Google Doc in Geoffrey/Research folder
2. Use appropriate account (hrg for personal, psd for work)
3. Apply markdown formatting (headers, bold, links)
4. Return link to user

### How to Save
```bash
cd skills/google-workspace
bun docs/create_doc.js <account> --title "<Research Topic>" --folder Research --content "<markdown>"
```

### Account Selection
- **hrg** - Personal travel, consulting
- **psd** - Work-related research
- **kh** - Personal projects

### Future: Obsidian Integration
Will also save to local Obsidian vault (when skill is built).

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
