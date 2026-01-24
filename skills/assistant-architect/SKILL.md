---
name: assistant-architect
description: Create AI Studio Assistant Architect JSON import files from screenshots or descriptions. Use when users provide a screenshot of a form/UI to replicate, describe an assistant they want built, or need to generate multi-prompt workflow JSON for PSD AI Studio.
triggers:
  - "create assistant"
  - "build assistant"
  - "assistant architect"
  - "ai studio assistant"
  - "assistant json"
  - "new assistant"
  - "design assistant"
  - "make this into an assistant"
  - "turn this into an assistant"
allowed-tools: Read, Write, AskUserQuestion
version: 1.1.0
---

# Assistant Architect

Create valid JSON import files for PSD AI Studio's Assistant Architect system.

**Spec Reference:** See `references/json-spec.md` for complete field definitions and validation rules.

---

## Input Modes

### From Screenshot

When the user provides a screenshot, extract:

| Element | Maps To |
|---------|---------|
| Text input boxes | `short_text` (single line) or `long_text` (multi-line) |
| Dropdowns/select menus | `select` with choices from visible options |
| Checkboxes/multi-select | `multi_select` |
| File upload areas | `file_upload` |
| Field labels | `label` property |
| Placeholder text | `options.placeholder` |
| Visible instructions | `system_context` or prompt `content` |
| Step numbers/tabs | Multiple prompts in sequence |

Also infer:
- **Assistant name** from title/header
- **Description** from any visible purpose text
- **Prompt content** from visible instructions or "what this does" text

### From Description (Dictation/Rambling)

Parse unstructured input for:

| Look For | Maps To |
|----------|---------|
| "user provides/enters/types..." | Input field |
| "asks for/needs a..." | Input field |
| "choose from/select/pick..." | `select` field |
| "upload/attach file..." | `file_upload` field |
| "then/next/after that..." | Additional prompt (chained) |
| "analyze/summarize/write/create..." | Prompt purpose |
| "should be/must be/format as..." | System context or prompt instructions |

### Smart Defaults

When not specified, use:

| Decision | Default |
|----------|---------|
| Model | `gpt-4o` (complex tasks), `gpt-4o-mini` (simple Q&A) |
| Field type for text | `long_text` with 6 rows |
| Execution | Sequential (single prompt unless steps mentioned) |
| Timeouts | `null` (system default) |
| Required fields | `true` for primary input, `false` for options |

---

## Workflow

### 1. Gather Requirements

**If screenshot provided:** Extract all visible elements per the table above.

**If description provided:** Parse for inputs, outputs, and flow.

**If unclear or incomplete:** Ask targeted questions:
- What should the assistant do?
- What inputs does it need?
- Single or multi-step?

### 2. Design the Assistant

Based on requirements, determine:

| Decision | Options |
|----------|---------|
| Execution pattern | Sequential (default) / Parallel / Chained |
| Model selection | `gpt-4o` (complex) / `gpt-4o-mini` (simple) / `claude-3-5-sonnet` |
| Input fields | `short_text`, `long_text`, `select`, `multi_select`, `file_upload` |
| Timeouts | Default null, max 900 seconds |

### 3. Generate JSON

Build the JSON structure:

```json
{
  "version": "1.0",
  "exported_at": "[ISO-8601 timestamp]",
  "export_source": "Geoffrey Assistant Architect",
  "assistants": [{
    "name": "[Assistant Name]",
    "description": "[Purpose]",
    "is_parallel": false,
    "prompts": [...],
    "input_fields": [...]
  }]
}
```

### 4. Write the File

Save to user's preferred location (default: `~/Downloads/[assistant-name].json`).

---

## Quick Patterns

### Simple Q&A Assistant

```json
{
  "version": "1.0",
  "export_source": "Geoffrey Assistant Architect",
  "assistants": [{
    "name": "Quick Helper",
    "description": "Answers questions clearly",
    "prompts": [{
      "name": "answer",
      "content": "Answer this question:\n\n{{question}}",
      "system_context": "You are a helpful expert.",
      "model_name": "gpt-4o-mini",
      "position": 0
    }],
    "input_fields": [{
      "name": "question",
      "label": "Your Question",
      "field_type": "long_text",
      "position": 0,
      "options": { "required": true, "rows": 6 }
    }]
  }]
}
```

### Document Analyzer (Chained)

```json
{
  "prompts": [
    {
      "name": "extract",
      "content": "Extract key points from:\n\n{{document}}",
      "model_name": "gpt-4o",
      "position": 0
    },
    {
      "name": "analyze",
      "content": "Analyze these points:\n\n{{prompt_0_output}}",
      "model_name": "gpt-4o",
      "position": 1
    }
  ]
}
```

### Transform with Options

```json
{
  "prompts": [{
    "name": "transform",
    "content": "Rewrite in {{style}} style:\n\n{{content}}",
    "model_name": "gpt-4o",
    "position": 0
  }],
  "input_fields": [
    {
      "name": "content",
      "label": "Content",
      "field_type": "long_text",
      "position": 0
    },
    {
      "name": "style",
      "label": "Writing Style",
      "field_type": "select",
      "position": 1,
      "options": {
        "choices": [
          { "value": "formal", "label": "Formal" },
          { "value": "casual", "label": "Casual" },
          { "value": "technical", "label": "Technical" }
        ],
        "default": "formal"
      }
    }
  ]
}
```

---

## Validation Checklist

Before writing the file, verify:

- [ ] `version` is `"1.0"`
- [ ] Each assistant has `name` (min 3 chars), `prompts`, `input_fields`
- [ ] Each prompt has `name`, `content`, `model_name`, `position`
- [ ] Each input field has `name`, `label`, `field_type`, `position`
- [ ] `position` values are sequential starting from 0
- [ ] All `{{variables}}` match input field names or `prompt_N_output`
- [ ] Select/multi-select fields have `options.choices` array

---

## Common Models

| Use Case | Model |
|----------|-------|
| Complex analysis | `gpt-4o` |
| Simple tasks | `gpt-4o-mini` |
| Long context | `claude-3-5-sonnet` |
| Fast responses | `gemini-1.5-flash` |

---

## Output

Write the JSON file to the user's specified path or `~/Downloads/[kebab-case-name].json`.

Confirm:
- File path written
- Assistant name and purpose
- Number of prompts and input fields
- Next step: Import via AI Studio → Assistants → Import
