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
version: 1.0.0
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

All 7 advisors deliberate in sequence, followed by facilitator synthesis. Use this for important decisions where thoroughness matters.

### Individual Advisor

Consult a single advisor when you need one specific perspective. User specifies which advisor by name or color.

**Example:** "What would the Critic say about this plan?" or "Give me the Red Hat perspective."

## Deliberation Sequence

The sequence is intentional - each advisor builds on what came before:

1. **Facilitator (Blue)** - Frames the decision, clarifies scope, identifies key tensions
2. **Analyst (White)** - Establishes facts, data, knowns and unknowns
3. **Intuitive (Red)** - Surfaces emotions, gut reactions, unspoken concerns
4. **Innovator (Green)** - Expands the option space, proposes alternatives
5. **Advocate (Yellow)** - Builds the positive case for each option
6. **Critic (Black)** - Stress-tests every option, finds failure modes
7. **Stakeholder (Orange)** - Maps who is affected, surfaces equity concerns
8. **Facilitator (Blue)** - Synthesizes all perspectives into recommendation

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

**Full Council:** Run through all 8 steps (7 advisors + synthesis). Each advisor speaks in their distinct voice.

**Individual Advisor:** Only the requested advisor speaks.

### Step 5: Invite Follow-Up

After the council delivers its recommendation, invite the user to:
- Ask a specific advisor to elaborate
- Challenge a particular point
- Run the council on a follow-up question
- Request the dissenting view

## Output Format

### Each Advisor's Entry

```
### [Emoji] [Advisor Name] ([Color]) — [Core Question]

[2-3 paragraphs of analysis in the advisor's voice and tone]

**Key Points:**
- [Bullet 1]
- [Bullet 2]
- [Bullet 3]
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

```
---

## 🔵 Facilitator Synthesis

### Consensus
[Where the advisors agree]

### Key Tensions
[Where the advisors disagree and why]

### Recommendation
[The facilitator's recommended path forward]

### Conditions for Success
- [What must be true for the recommendation to work]

### Next Steps
1. [Concrete action 1]
2. [Concrete action 2]
3. [Concrete action 3]
```
