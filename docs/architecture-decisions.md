# Architecture Decisions

All decisions reference [Founding Principles](../README.md#founding-principles).

---

## Why No MCP Server for OmniFocus?

**Principles:** [#2 Code Before AI](../README.md#2-code-before-ai), [#5 UNIX Philosophy](../README.md#5-unix-philosophy)

**Decision:** Write our own AppleScript/JXA scripts instead of using existing MCP servers.

**Rationale:**
- Existing MCP servers truncate tag names
- Can't get full tag hierarchy with groupings
- We need exactly what we need, nothing more
- Scripts live inside skills for portability
- **Principle #2:** Deterministic scripts are more reliable than general-purpose tools
- **Principle #5:** Each script does one thing well

---

## Preferences Must Stay Lean

**Principles:** [#4 Progressive Disclosure](../README.md#4-progressive-disclosure), [#1 Scaffolding Over Model](../README.md#1-scaffolding-over-model)

**Decision:** preferences.json contains only behavioral rules, not data.

**Wrong:**
```json
{
  "omnifocus": {
    "all_129_tags": [...huge array...]
  }
}
```

**Right:**
```json
{
  "omnifocus_philosophy": {
    "task_creation": "Always assign to project + due date"
  }
}
```

**Rationale:**
- Prevents context window bloat as Geoffrey learns more
- **Principle #4:** Context is precious; Tier 1 stays under 100 lines
- **Principle #1:** Lean scaffold enables better AI performance

---

## Skills Fetch Data On-Demand

**Principles:** [#3 Deterministic Systems](../README.md#3-deterministic-systems), [#4 Progressive Disclosure](../README.md#4-progressive-disclosure)

**Decision:** Scripts query external systems (OmniFocus, etc.) at runtime.

**Rationale:**
- Data is always current (no stale caches)
- Context stays lean (Tier 3 just-in-time)
- Performance when needed, not always
- **Principle #3:** Runtime fetching is deterministic and always accurate
- **Principle #4:** Load only what's needed, when it's needed

---

## When to Cache

**Principles:** [#3 Deterministic Systems](../README.md#3-deterministic-systems), [#4 Progressive Disclosure](../README.md#4-progressive-disclosure)

Only cache if:
- Data rarely changes
- Fetching is very slow (>5 seconds)
- Multiple skills need same data frequently

Even then, keep cache separate from preferences.

**Principle #3:** Caches introduce staleness—prefer runtime fetching when feasible.

---

## Monitoring PAI Updates

**Principles:** [#1 Scaffolding Over Model](../README.md#1-scaffolding-over-model)

Regularly check https://github.com/danielmiessler/Personal_AI_Infrastructure for:
- New skills to adapt
- Architectural patterns
- Best practices updates

**Principle #1:** Learn from proven scaffolding patterns.

---

## OmniFocus Tag System

**Principles:** [#7 Skill Management](../README.md#7-skill-management), [#9 Identity-First Design](../README.md#9-identity-first-design)

User has 129 tags organized hierarchically:
- **Activity**: Creative, Leisure, Bills, Writing, Reading, Research, Health, Organization, Chores, Coding
- **Energy**: Low, High, Brain Dead, Full Focus, Short Dashes, Routines, Hanging Around
- **Location**: Grocery Stores, PSD Sites, Home, Other Shopping
- **People**: Personal (family), PSD (Tech, DCRC, Comms, ESC, SSOs)
- **Groups**: DLI Admin, FLT, MTSS Core Team, Engineering Team, etc.
- **Time**: Morning, Afternoon, Evening
- **Standalone**: Follow Up, Waiting For, Waiting, Kiwanis

**Principle #9:** Tag structure reflects user's identity and workflow patterns.

---

## Task Creation Philosophy

**Principles:** [#9 Identity-First Design](../README.md#9-identity-first-design), [#10 Evidence-Driven Development](../README.md#10-evidence-driven-development)

- Always assign to a project (never leave in Inbox)
- Always set expected completion date
- Tag with person + "Follow Up" for 1:1 discussions
- Use location tags for shopping tasks

**Principle #9:** Rules encode user's preferred workflow.
**Principle #10:** Verify tasks are properly tagged before confirming creation.
