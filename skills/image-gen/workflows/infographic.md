# Infographic Workflow

Create data visualizations, explainers, and statistical infographics using the 6-step editorial process.

## When to Use

- Explaining concepts or processes
- Visualizing data or statistics
- Creating how-to guides
- Summarizing reports or research
- Making comparisons

## 6-Step Process

### Step 1: Extract Narrative

**Goal:** Understand the complete story being told.

Questions to answer:
- What is the main concept or data being explained?
- What is the key insight or takeaway?
- Who is the target audience?
- What action should viewers take?

**Output:** 2-3 sentence summary of the narrative.

### Step 2: Derive Visual Concept

**Goal:** Translate narrative into a single visual metaphor.

Guidelines:
- Choose 2-3 physical objects that represent the concept
- Prefer familiar, universal metaphors
- Avoid abstract shapes without meaning
- Consider spatial relationships (hierarchy, flow, comparison)

**Examples:**
- Data growth → Plant/tree growing
- Security → Shield/lock
- Process → Pipeline/conveyor belt
- Comparison → Balance scale

**Output:** Visual metaphor description.

### Step 3: Apply Aesthetic

**Goal:** Define the visual style.

Recommended for infographics:
- **Colors:** Muted palette with 1-2 accent colors
- **Style:** Flat design, clean lines
- **Typography:** Sans-serif, clear hierarchy
- **Layout:** Clear sections, visual flow
- **Icons:** Simple, consistent style

**Output:** Style description (2-3 sentences).

### Step 4: Construct Prompt

**Goal:** Build the generation prompt.

**Template:**
```
Create an infographic explaining [topic].

Visual concept: [metaphor from Step 2]

Key elements:
- [Main data point or concept]
- [Supporting element 1]
- [Supporting element 2]

Style: [aesthetic from Step 3]

Layout: [horizontal/vertical], [sections description]

Text to include:
- Title: "[title]"
- Key stat: "[number or fact]"
- [Other text elements]
```

**Output:** Complete prompt.

### Step 5: Generate

**Command:**
```bash
uv run scripts/generate.py "[prompt]" output.png 16:9 2K
```

**Settings for infographics:**
- Aspect ratio: **16:9** (landscape) - best for infographics
- Size: **2K minimum** - ensures text readability
- Model: gemini-3-pro-image-preview (Nano Banana Pro)

### Step 6: Validate

**Validation criteria:**

| Criterion | Check |
|-----------|-------|
| Text legibility | All text is readable at 100% zoom |
| Data accuracy | Numbers/facts are displayed correctly |
| Visual hierarchy | Eye naturally flows through content |
| Color contrast | Sufficient contrast for accessibility |
| Completeness | All key elements are present |
| Brand alignment | Matches intended style |

**If validation fails:**
- Identify specific issues
- Modify prompt to address them
- Regenerate
- Maximum 3 iterations

## Example Workflow

**Request:** Create an infographic about how neural networks learn.

### Step 1: Extract Narrative
"Neural networks learn by adjusting connection weights through forward propagation and backpropagation. Key insight: the process is iterative and improves over time. Audience: Technical beginners."

### Step 2: Visual Concept
"A network of interconnected nodes with signals flowing through, showing adjustment dials on connections. Like a city's road network with traffic lights being adjusted."

### Step 3: Aesthetic
"Flat design with dark blue background, bright connection lines in cyan and orange. Minimal, clean style with clear node shapes."

### Step 4: Prompt
```
Create an infographic explaining how neural networks learn.

Visual concept: Network of connected nodes with adjustment dials on connections, signals flowing through like traffic.

Key elements:
- Input layer with data entering
- Hidden layers with connection weights
- Output layer with result
- Feedback loop showing backpropagation

Style: Dark blue background, cyan and orange accents, flat design, clean minimalist style.

Layout: Horizontal flow from left (input) to right (output), with backpropagation arrow below.

Text to include:
- Title: "How Neural Networks Learn"
- Labels: "Input", "Hidden Layers", "Output", "Backpropagation"
```

### Step 5: Generate
```bash
uv run scripts/generate.py "Create an infographic explaining how neural networks learn..." neural_network.png 16:9 2K
```

### Step 6: Validate
- Text readable
- Flow is clear left-to-right
- Colors have good contrast
- All labels present

## Tips for Better Results

1. **Simple prompts often work best** - "Infographic explaining X" can produce excellent results
2. **Model understands context** - It will add relevant icons/imagery automatically
3. **Be specific about text** - Include exact wording for titles and labels
4. **Iterate with conversation** - Ask for specific changes after initial generation
5. **Use reference images** - For style consistency across multiple infographics

## Common Issues

| Issue | Solution |
|-------|----------|
| Text too small | Increase size to 4K or reduce text amount |
| Cluttered layout | Simplify to fewer elements |
| Wrong style | Be more explicit about aesthetic |
| Missing elements | List all required elements explicitly |
