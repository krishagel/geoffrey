---
name: skill-creator
description: Create new skills, modify and improve existing skills, and measure skill performance. Use when users want to create a skill from scratch, update or optimize an existing skill, run evals to test a skill, benchmark skill performance with variance analysis, or optimize a skill's description for better triggering accuracy. Make sure to use this skill whenever the user mentions creating, building, designing, or improving skills, even if they don't explicitly say "skill-creator".
---

# Skill Creator

A skill for creating new skills and iteratively improving them.

At a high level, the process of creating a skill goes like this:

- Decide what you want the skill to do and roughly how it should do it
- Write a draft of the skill
- Create a few test prompts and run claude-with-access-to-the-skill on them
- Help the user evaluate the results both qualitatively and quantitatively
  - While the runs happen in the background, draft some quantitative evals if there aren't any. Then explain them to the user
  - Use the `eval-viewer/generate_review.py` script to show the user the results, and also let them look at the quantitative metrics
- Rewrite the skill based on feedback from the user's evaluation
- Repeat until satisfied
- Expand the test set and try again at larger scale

Your job is to figure out where the user is in this process and help them progress. Maybe they want to make a skill from scratch, or maybe they already have a draft and want to iterate.

Be flexible -- if the user says "I don't need to run a bunch of evaluations, just vibe with me", do that instead.

After the skill is done (order is flexible), run the skill description improver to optimize triggering.

## Communicating with the user

Pay attention to context cues to understand how to phrase communication. In the default case:

- "evaluation" and "benchmark" are borderline, but OK
- for "JSON" and "assertion" you want to see cues from the user that they know what those things are before using them without explaining

It's OK to briefly explain terms if you're in doubt.

---

## Creating a skill

### Capture Intent

Start by understanding the user's intent. The current conversation might already contain a workflow the user wants to capture (e.g., they say "turn this into a skill"). If so, extract answers from the conversation history first -- the tools used, the sequence of steps, corrections the user made, input/output formats observed. The user may need to fill gaps, and should confirm before proceeding.

1. What should this skill enable Claude to do?
2. When should this skill trigger? (what user phrases/contexts)
3. What's the expected output format?
4. Should we set up test cases to verify the skill works? Skills with objectively verifiable outputs (file transforms, data extraction, code generation) benefit from test cases. Skills with subjective outputs (writing style, art) often don't. Suggest the appropriate default based on skill type, but let the user decide.

### Interview and Research

Proactively ask questions about edge cases, input/output formats, example files, success criteria, and dependencies. Wait to write test prompts until you've got this part ironed out.

Check available MCPs -- if useful for research, research in parallel via subagents if available.

### Initialize the Skill

When creating a new skill from scratch, run the `init_skill.py` script to scaffold the directory structure:

```bash
uv run scripts/init_skill.py <skill-name> --path <output-directory>
```

The script:
- Creates the skill directory at the specified path
- Generates a SKILL.md template with proper frontmatter and TODO placeholders
- Creates example resource directories: `scripts/`, `references/`, and `assets/`
- Automatically registers the skill in CLAUDE.md's Available Skills table

Skip this step if the skill already exists and you're iterating or packaging.

#### Manual Registration

If not using init_skill.py, register in CLAUDE.md manually:
1. Find the "Available Skills" table in the "Skill Locations" section
2. Add a new row: `| {skill-name} | \`skills/{skill-name}/SKILL.md\` |`
3. Keep the table alphabetically sorted

### Write the SKILL.md

Based on the user interview, fill in these components:

- **name**: Skill identifier (kebab-case)
- **description**: When to trigger, what it does. This is the primary triggering mechanism -- include both what the skill does AND specific contexts for when to use it. All "when to use" info goes here, not in the body. Note: Claude tends to "undertrigger" skills. To combat this, make descriptions a little bit "pushy" -- e.g., "Make sure to use this skill whenever the user mentions dashboards, data visualization, internal metrics, or wants to display any kind of company data, even if they don't explicitly ask for a 'dashboard.'"
- **the rest of the skill :)**

### Skill Writing Guide

#### Anatomy of a Skill

```
skill-name/
+-- SKILL.md (required)
|   +-- YAML frontmatter (name, description required)
|   +-- Markdown instructions
+-- Bundled Resources (optional)
    +-- scripts/    - Executable code for deterministic/repetitive tasks
    +-- references/ - Docs loaded into context as needed
    +-- assets/     - Files used in output (templates, icons, fonts)
```

**scripts/**: Executable code (Python/Bash/etc.) for tasks that require deterministic reliability or are repeatedly rewritten. Scripts may be executed without loading into context, but can still be read by Claude for patching.

**references/**: Documentation intended to be loaded as needed into context. Keep in references/ when content is detailed (schemas, API docs, policies). If files are large (>300 lines), include a table of contents. Include grep search patterns in SKILL.md for very large files (>10k words).

**assets/**: Files NOT intended to be loaded into context, but used within output Claude produces (templates, images, fonts, boilerplate).

**Avoid duplication**: Information should live in either SKILL.md or references, not both. Keep SKILL.md lean.

#### Progressive Disclosure

Skills use a three-level loading system:
1. **Metadata** (name + description) - Always in context (~100 words)
2. **SKILL.md body** - In context whenever skill triggers (<500 lines ideal)
3. **Bundled resources** - As needed (unlimited, scripts can execute without loading)

**Key patterns:**
- Keep SKILL.md under 500 lines; split content when approaching this limit
- Reference files clearly from SKILL.md with guidance on when to read them
- For large reference files (>300 lines), include a table of contents
- Avoid deeply nested references -- keep one level deep from SKILL.md

**Domain organization**: When a skill supports multiple domains/frameworks, organize by variant:
```
cloud-deploy/
+-- SKILL.md (workflow + selection)
+-- references/
    +-- aws.md
    +-- gcp.md
    +-- azure.md
```
Claude reads only the relevant reference file.

For more patterns, see `references/workflows.md` (sequential/conditional workflows) and `references/output-patterns.md` (template and example patterns).

#### What Not to Include

A skill should only contain files that directly support its functionality. Do NOT create:
- README.md, INSTALLATION_GUIDE.md, QUICK_REFERENCE.md, CHANGELOG.md, etc.
- Setup and testing procedures, user-facing documentation
- Auxiliary context about the process that went into creating it

#### Writing Style

Try to explain to the model why things are important in lieu of heavy-handed MUSTs. Use theory of mind and try to make the skill general rather than narrow to specific examples. If you find yourself writing ALWAYS or NEVER in all caps, reframe and explain the reasoning so the model understands why it matters. That's more humane, powerful, and effective.

Use imperative form in instructions. Prefer examples over verbose explanations.

**Defining output formats:**
```markdown
## Report structure
ALWAYS use this exact template:
# [Title]
## Executive summary
## Key findings
## Recommendations
```

**Examples pattern:**
```markdown
## Commit message format
**Example 1:**
Input: Added user authentication with JWT tokens
Output: feat(auth): implement JWT-based authentication
```

### Test Cases

After writing the skill draft, come up with 2-3 realistic test prompts -- the kind of thing a real user would actually say. Share them with the user: "Here are a few test cases I'd like to try. Do these look right, or do you want to add more?" Then run them.

Save test cases to `evals/evals.json`. Don't write assertions yet -- just the prompts. Draft assertions in the next step while the runs are in progress.

```json
{
  "skill_name": "example-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "User's task prompt",
      "expected_output": "Description of expected result",
      "files": []
    }
  ]
}
```

See `references/schemas.md` for the full schema (including assertions).

## Running and evaluating test cases

This section is one continuous sequence -- don't stop partway through. Do NOT use `/skill-test` or any other testing skill.

Put results in `<skill-name>-workspace/` as a sibling to the skill directory. Within the workspace, organize results by iteration (`iteration-1/`, `iteration-2/`, etc.) and within that, each test case gets a directory (`eval-0/`, `eval-1/`, etc.). Create directories as you go.

### Step 1: Spawn all runs (with-skill AND baseline) in the same turn

For each test case, spawn two subagents in the same turn -- one with the skill, one without. Launch everything at once so it all finishes around the same time.

**With-skill run:**
```
Execute this task:
- Skill path: <path-to-skill>
- Task: <eval prompt>
- Input files: <eval files if any, or "none">
- Save outputs to: <workspace>/iteration-<N>/eval-<ID>/with_skill/outputs/
- Outputs to save: <what the user cares about>
```

**Baseline run** (same prompt, but depends on context):
- **Creating a new skill**: no skill at all. Same prompt, save to `without_skill/outputs/`.
- **Improving an existing skill**: the old version. Before editing, snapshot the skill, point baseline at the snapshot. Save to `old_skill/outputs/`.

Write an `eval_metadata.json` for each test case with a descriptive name. If this iteration uses new/modified eval prompts, create these files for each new eval directory.

```json
{
  "eval_id": 0,
  "eval_name": "descriptive-name-here",
  "prompt": "The user's task prompt",
  "assertions": []
}
```

### Step 2: While runs are in progress, draft assertions

Draft quantitative assertions for each test case and explain them to the user. Good assertions are objectively verifiable and have descriptive names. Subjective skills are better evaluated qualitatively -- don't force assertions.

Update `eval_metadata.json` files and `evals/evals.json` with the assertions.

### Step 3: As runs complete, capture timing data

When each subagent task completes, you receive `total_tokens` and `duration_ms`. Save immediately to `timing.json` in the run directory:

```json
{
  "total_tokens": 84852,
  "duration_ms": 23332,
  "total_duration_seconds": 23.3
}
```

This is the only opportunity to capture this data -- process each notification as it arrives.

### Step 4: Grade, aggregate, and launch the viewer

Once all runs are done:

1. **Grade each run** -- spawn a grader subagent that reads `agents/grader.md` and evaluates assertions against outputs. Save to `grading.json`. The grading.json expectations array must use fields `text`, `passed`, and `evidence`. For programmatically checkable assertions, write and run a script.

2. **Aggregate into benchmark**:
   ```bash
   python -m scripts.aggregate_benchmark <workspace>/iteration-N --skill-name <name>
   ```
   Produces `benchmark.json` and `benchmark.md`. Put each with_skill version before its baseline.

3. **Do an analyst pass** -- read `agents/analyzer.md` ("Analyzing Benchmark Results" section) for patterns the aggregate stats might hide.

4. **Launch the viewer**:
   ```bash
   nohup python <skill-creator-path>/eval-viewer/generate_review.py \
     <workspace>/iteration-N \
     --skill-name "my-skill" \
     --benchmark <workspace>/iteration-N/benchmark.json \
     > /dev/null 2>&1 &
   VIEWER_PID=$!
   ```
   For iteration 2+, also pass `--previous-workspace <workspace>/iteration-<N-1>`.

   **Headless environments:** Use `--static <output_path>` for standalone HTML.

5. **Tell the user** the results are in their browser with Outputs and Benchmark tabs.

### Step 5: Read the feedback

When the user is done, read `feedback.json`. Empty feedback means the user thought it was fine. Focus improvements on test cases with specific complaints.

Kill the viewer server when done: `kill $VIEWER_PID 2>/dev/null`

---

## Improving the skill

### How to think about improvements

1. **Generalize from feedback.** We're creating skills used across many prompts. Don't put in fiddly overfitty changes or oppressively constrictive MUSTs. If there's a stubborn issue, try different metaphors or patterns.

2. **Keep the prompt lean.** Remove things not pulling their weight. Read the transcripts -- if the skill makes the model waste time on unproductive steps, trim those parts.

3. **Explain the why.** Today's LLMs are smart. When given a good harness they can go beyond rote instructions. Transmit understanding into instructions rather than rigid structures.

4. **Look for repeated work across test cases.** If all test runs independently wrote similar helper scripts, bundle that script in `scripts/`.

### The iteration loop

After improving:
1. Apply improvements to the skill
2. Rerun all test cases into a new `iteration-<N+1>/` directory, including baseline runs
3. Launch the reviewer with `--previous-workspace` pointing at previous iteration
4. Wait for user review
5. Read new feedback, improve again, repeat

Keep going until the user is happy, feedback is all empty, or you're not making meaningful progress.

---

## Advanced: Blind comparison

For rigorous comparison between two skill versions, read `agents/comparator.md` and `agents/analyzer.md`. The basic idea: give two outputs to an independent agent without telling it which is which, and let it judge quality. Then analyze why the winner won.

Optional, requires subagents, most users won't need it.

---

## Description Optimization

The description field is the primary mechanism determining whether Claude invokes a skill. After creating or improving a skill, offer to optimize the description for better triggering.

### Step 1: Generate trigger eval queries

Create 20 eval queries -- a mix of should-trigger (8-10) and should-not-trigger (8-10). Save as JSON:

```json
[
  {"query": "the user prompt", "should_trigger": true},
  {"query": "another prompt", "should_trigger": false}
]
```

Queries must be realistic -- concrete, specific, with file paths, personal context, column names. Some should be casual, have typos, abbreviations. Focus on edge cases rather than clear-cut.

For **should-not-trigger** queries, the most valuable ones are near-misses -- queries sharing keywords with the skill but actually needing something different. Don't make them obviously irrelevant.

### Step 2: Review with user

Present the eval set using the HTML template:
1. Read `assets/eval_review.html`
2. Replace placeholders: `__EVAL_DATA_PLACEHOLDER__`, `__SKILL_NAME_PLACEHOLDER__`, `__SKILL_DESCRIPTION_PLACEHOLDER__`
3. Write to a temp file and open it
4. User edits, then clicks "Export Eval Set" which downloads to `~/Downloads/eval_set.json`

### Step 3: Run the optimization loop

Tell the user this will take some time, then run in background:

```bash
python -m scripts.run_loop \
  --eval-set <path-to-trigger-eval.json> \
  --skill-path <path-to-skill> \
  --model <model-id-powering-this-session> \
  --max-iterations 5 \
  --verbose
```

The loop splits the eval set into 60% train / 40% test, evaluates descriptions (3 runs per query), uses Claude with extended thinking to propose improvements, and iterates up to 5 times. Selects by test score to avoid overfitting.

### How skill triggering works

Skills appear in Claude's `available_skills` list with name + description. Claude only consults skills for tasks it can't easily handle on its own -- simple one-step queries may not trigger even if the description matches. Eval queries should be substantive enough that Claude would benefit from consulting a skill.

### Step 4: Apply the result

Take `best_description` from JSON output and update the skill's SKILL.md frontmatter. Show before/after and report scores.

---

### Package and Present (only if `present_files` tool is available)

Check for `present_files` tool. If available, package and present:

```bash
python -m scripts.package_skill <path/to/skill-folder>
```

The packaging script validates the skill first, then creates a distributable `.skill` file (zip format).

---

## Reference files

The agents/ directory contains instructions for specialized subagents:
- `agents/grader.md` -- Evaluate assertions against outputs
- `agents/comparator.md` -- Blind A/B comparison between two outputs
- `agents/analyzer.md` -- Analyze why one version beat another, or analyze benchmark patterns

The references/ directory has additional documentation:
- `references/schemas.md` -- JSON structures for evals.json, grading.json, benchmark.json, etc.
- `references/workflows.md` -- Sequential and conditional workflow patterns
- `references/output-patterns.md` -- Template and example output patterns

---

Core loop for emphasis:
- Figure out what the skill is about
- Draft or edit the skill
- Run claude-with-access-to-the-skill on test prompts
- With the user, evaluate the outputs (create benchmark.json and run `eval-viewer/generate_review.py`)
- Repeat until satisfied
- Package the final skill
