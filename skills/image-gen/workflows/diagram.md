# Diagram Workflow

Create technical diagrams, flowcharts, architecture diagrams, and process visualizations.

## When to Use

- System architecture documentation
- Process flows and workflows
- Technical explanations
- Decision trees
- Network topologies
- Component relationships

## 6-Step Process

### Step 1: Extract Narrative

**Goal:** Understand the system or process being illustrated.

Questions to answer:
- What system/process is being shown?
- What are the key components?
- What are the relationships between components?
- What is the flow direction (if any)?
- What level of detail is needed?

**Output:** Component list and relationship description.

### Step 2: Derive Visual Concept

**Goal:** Choose the right diagram type.

**Diagram types:**
| Type | Use When |
|------|----------|
| Flowchart | Sequential processes with decisions |
| Architecture | System components and connections |
| Sequence | Time-ordered interactions |
| Network | Interconnected nodes |
| Hierarchy | Parent-child relationships |
| Venn | Overlapping categories |

**Output:** Diagram type and layout direction.

### Step 3: Apply Aesthetic

**Goal:** Define visual style for clarity.

Recommended for diagrams:
- **Colors:** Limited palette (3-5 colors max)
- **Style:** Flat, clean, no gradients
- **Lines:** Consistent weight, clear arrows
- **Shapes:** Simple geometric (rectangles, circles)
- **Labels:** Sans-serif, high contrast

**Color coding conventions:**
- Blue: Primary components
- Green: Success/positive flow
- Red: Error/warning
- Orange: External systems
- Gray: Supporting elements

**Output:** Color scheme and style notes.

### Step 4: Construct Prompt

**Goal:** Build the generation prompt.

**Template:**
```
Create a [diagram type] showing [system/process].

Components:
- [Component 1]: [description]
- [Component 2]: [description]
- [Component 3]: [description]

Relationships:
- [Component 1] connects to [Component 2] via [connection type]
- [Component 2] sends data to [Component 3]

Layout: [direction - left-to-right, top-to-bottom, etc.]

Style: [aesthetic from Step 3]

Labels to include:
- [Label 1]
- [Label 2]
```

**Output:** Complete prompt.

### Step 5: Generate

**Command:**
```bash
uv run scripts/generate.py "[prompt]" output.png [aspect_ratio] 2K
```

**Aspect ratio by diagram type:**
- Flowcharts: 3:2 or 16:9 (horizontal flow)
- Architecture: 4:3 or 1:1 (balanced)
- Sequence: 2:3 (vertical flow)
- Network: 1:1 (balanced)

**Settings:**
- Size: **2K minimum** for label clarity
- Model: gemini-3-pro-image-preview

### Step 6: Validate

**Validation criteria:**

| Criterion | Check |
|-----------|-------|
| Completeness | All components present |
| Accuracy | Relationships correctly shown |
| Readability | All labels legible |
| Flow clarity | Direction is obvious |
| Consistency | Shapes/colors used consistently |
| Simplicity | No unnecessary elements |

**If validation fails:**
- Identify missing or incorrect elements
- Adjust prompt
- Regenerate (max 3 iterations)

## Example Workflow

**Request:** Create a diagram showing a CI/CD pipeline.

### Step 1: Extract Narrative
"CI/CD pipeline with: code commit, build, test, deploy to staging, deploy to production. Shows automated flow with manual approval gates."

Components:
- Git repository
- Build server
- Test suite
- Staging environment
- Production environment
- Approval gates

### Step 2: Visual Concept
Flowchart, left-to-right horizontal flow. Linear pipeline with branching for approval.

### Step 3: Aesthetic
- Blue: Pipeline stages
- Green: Success indicators
- Orange: Approval gates
- Gray: Arrows/connectors
- Style: Flat rectangles with rounded corners, clear directional arrows

### Step 4: Prompt
```
Create a flowchart showing a CI/CD pipeline.

Components:
- Git Repository: Code source
- Build Server: Compiles code
- Test Suite: Runs automated tests
- Staging: Pre-production environment
- Production: Live environment
- Approval Gate: Manual review step

Flow:
- Git Repository -> Build Server -> Test Suite -> Staging -> Approval Gate -> Production

Layout: Horizontal left-to-right flow

Style: Flat design with rounded rectangles. Blue for pipeline stages, green checkmarks for success, orange for approval gate, gray arrows between stages.

Labels: "Code", "Build", "Test", "Stage", "Approve", "Deploy"
```

### Step 5: Generate
```bash
uv run scripts/generate.py "Create a flowchart showing a CI/CD pipeline..." cicd.png 16:9 2K
```

### Step 6: Validate
- All 6 stages present
- Flow direction clear
- Labels readable
- Approval gate distinguished

## Tips for Better Results

1. **Keep it simple** - Fewer components = clearer diagram
2. **Be explicit about connections** - State what connects to what
3. **Specify layout direction** - Avoid ambiguous layouts
4. **Use consistent terminology** - Same names throughout prompt
5. **Include all labels** - List exact text for each component

## Common Issues

| Issue | Solution |
|-------|----------|
| Missing components | List every component explicitly |
| Unclear flow | State direction and connections |
| Overlapping elements | Reduce components or use larger aspect ratio |
| Inconsistent styling | Be more explicit about shapes/colors |
| Wrong diagram type | Reconsider which type fits best |

## Alternative: Mermaid Diagrams

For simple diagrams, consider generating Mermaid code instead:
- More precise control
- Version-controllable
- Easily editable

Use image generation for:
- Visual appeal matters
- Marketing/presentation use
- Complex custom styling
