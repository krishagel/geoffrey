---
name: seven-advisors
description: Seven Advisors decision council - structured multi-perspective deliberation for important decisions. Use when facing complex choices, strategic decisions, or when you need to think through a problem from multiple angles.
triggers:
  - "seven advisors"
  - "thinking hats"
  - "decision council"
  - "advisors council"
  - "deliberation"
  - "think through this decision"
  - "multiple perspectives"
allowed-tools: Read
version: 1.1.0
---

# Seven Advisors Decision Council

Structured multi-perspective deliberation framework adapted from de Bono's Six Thinking Hats with a 7th Stakeholder perspective. Each advisor brings a distinct cognitive lens to help make better decisions.

## The Seven Advisors

| # | Advisor | Color | Focus | Core Question |
|---|---------|-------|-------|---------------|
| 1 | Facilitator | Blue | Process & framing | "What exactly are we deciding?" |
| 2 | Analyst | White | Facts & data | "What do we actually know?" |
| 3 | Intuitive | Red | Emotions & gut feel | "How does this feel?" |
| 4 | Innovator | Green | Creative alternatives | "What else could we do?" |
| 5 | Advocate | Yellow | Benefits & optimism | "What's the best case?" |
| 6 | Critic | Black | Risks & pitfalls | "What could go wrong?" |
| 7 | Stakeholder | Orange | Affected parties | "Who is impacted and how?" |

## Modes

### Full Council (Default)

All 7 advisors deliberate, followed by facilitator synthesis. Use this for important decisions where thoroughness matters.

### Individual Advisor

Consult a single advisor when you need one specific perspective. User specifies which advisor by name or color.

**Example:** "What would the Critic say about this plan?" or "Give me the Red Hat perspective."

## Deliberation Sequence

The Facilitator opens by framing the decision. Then all six advisors analyze **simultaneously** — each works only from the Facilitator's framing, not from each other's output. This parallel structure is intentional: it prevents groupthink and anchoring bias. Each advisor delivers an independent perspective uncontaminated by the others.

Finally, the Facilitator returns to synthesize all six perspectives into a single recommendation with cross-references, a decision matrix, and concrete next steps.

**Execution flow:**

1. **Facilitator (Blue)** — Frames the decision, lists options, defines success criteria, assesses stakes
2. **Six Advisors in parallel:**
   - **Analyst (White)** — Facts, evidence quality, assumptions audit, data gaps
   - **Intuitive (Red)** — Emotions, gut reactions, unspoken concerns, emotional forecast
   - **Innovator (Green)** — Alternatives, constraint inversion, hybrid approaches, wild cards
   - **Advocate (Yellow)** — Best cases, hidden strengths, compounding benefits, values alignment
   - **Critic (Black)** — Pre-mortem, failure modes, mitigation paths, reversibility assessment
   - **Stakeholder (Orange)** — Power/interest map, equity audit, missing voices, communication needs
3. **Facilitator Synthesis (Blue)** — Cross-references all six, builds decision matrix, delivers recommendation

**Why parallel?** Sequential deliberation causes anchoring — the Analyst's facts shape the Intuitive's feelings, the Critic's fears constrain the Innovator's ideas. Parallel execution means each advisor gives their honest, independent read.

**AI Studio:** A JSON export is available for running this council in PSD AI Studio, where the parallel execution is handled natively. See `~/Downloads/seven-advisors-council.json`.

## Workflow

### Step 1: Receive the Decision

User presents a decision or dilemma. Can be:
- A binary choice ("Should I X or Y?")
- An open question ("How should I approach X?")
- A strategic direction ("What's the right move for X?")

### Step 2: Determine Mode

- If user asks for a specific advisor → **Individual Advisor** mode
- Otherwise → **Full Council** mode

### Step 3: Load Advisor Profiles

Read `skills/seven-advisors/references/advisor-profiles.md` for detailed advisor personas.

### Step 4: Execute Deliberation

**Full Council:** Run through all 8 steps (facilitator open → 6 advisors → facilitator synthesis). Each advisor speaks in their distinct voice and provides structured analysis (400-600 words per advisor, 800-1200 words for synthesis).

**Individual Advisor:** Only the requested advisor speaks.

### Step 5: Invite Follow-Up

After the council delivers its recommendation, invite the user to:
- Ask a specific advisor to elaborate
- Challenge a particular point
- Run the council on a follow-up question
- Request the dissenting view

## Output Format

### Each Advisor's Entry

Each advisor provides structured sections specific to their lens (not just prose + bullets). See advisor profiles for section details. General format:

```
### [Emoji] [Advisor Name] ([Color]) — [Core Question]

**1. [Section Name]**
[Structured analysis]

**2. [Section Name]**
[Structured analysis]

... (5-7 sections per advisor, 400-600 words total)
```

**Advisor Emojis:**
- Facilitator: `🔵`
- Analyst: `⚪`
- Intuitive: `🔴`
- Innovator: `🟢`
- Advocate: `🟡`
- Critic: `⚫`
- Stakeholder: `🟠`

### Facilitator Synthesis (Final Step)

The synthesis is the crown jewel — the longest and most detailed output (800-1200 words). It cross-references advisor arguments by name and builds a decision matrix.

```
---

## 🔵 Facilitator Synthesis

### Advisor Highlights
[Single most critical insight from each advisor, cited by name]

### Consensus
[Points of convergence across 3+ advisors]

### Key Tensions
[Where advisors disagree, naming specific advisors and their arguments]

### Decision Matrix
| Option | Feasibility | Risk Level | Stakeholder Impact | Upside Potential | Values Alignment |
|--------|------------|------------|-------------------|-----------------|-----------------|

### Recommendation
[Decisive recommended path — WHAT, WHY (citing advisors), WHEN]

### The Strongest Counter-Argument
[Best argument AGAINST the recommendation, citing which advisor made it, and why this path is still recommended despite it]

### Conditions for Success
[Critical assumptions and prerequisites]

### Risk Mitigation Plan
[Critic's top 3 concerns with specific mitigation actions]

### Stakeholder Safeguards
[Stakeholder's equity concerns with protective actions]

### What We Still Don't Know
[Analyst's unresolved unknowns that could change the recommendation]

### Next Steps
1. [Concrete, specific, time-bound action]
2. [Concrete, specific, time-bound action]
3. [Concrete, specific, time-bound action]
```
