# Assistant Architect JSON Import Specification

## JSON Schema Reference

### Root Structure

```json
{
  "version": "1.0",
  "exported_at": "2025-01-23T10:30:00.000Z",
  "export_source": "Geoffrey Assistant Architect",
  "assistants": [...]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | **Yes** | Must be exactly `"1.0"` |
| `exported_at` | string | No | ISO-8601 timestamp |
| `export_source` | string | No | Identifier for the generating system |
| `assistants` | array | **Yes** | Array of assistant objects |

### Assistant Object

```json
{
  "name": "My Assistant",
  "description": "Analyzes documents and provides summaries",
  "status": "approved",
  "image_path": "/images/icons/document.png",
  "is_parallel": false,
  "timeout_seconds": 300,
  "prompts": [...],
  "input_fields": [...]
}
```

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `name` | string | **Yes** | - | Min 3 characters |
| `description` | string | No | `""` | Purpose/description |
| `status` | string | No | - | **Ignored on import** (always `pending_approval`) |
| `image_path` | string | No | `null` | Path to assistant icon |
| `is_parallel` | boolean | No | `false` | Enable parallel prompt execution |
| `timeout_seconds` | number | No | `null` | Max: 900 (15 minutes) |
| `prompts` | array | **Yes** | - | 1-20 prompts required |
| `input_fields` | array | **Yes** | - | Can be empty array `[]` |

### Prompt Object

```json
{
  "name": "analyze",
  "content": "Analyze the following document:\n\n{{document_content}}",
  "system_context": "You are an expert document analyst.",
  "model_name": "gpt-4o",
  "position": 0,
  "parallel_group": null,
  "input_mapping": null,
  "timeout_seconds": 120
}
```

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `name` | string | **Yes** | - | Internal identifier |
| `content` | string | **Yes** | - | Supports `{{variables}}` |
| `system_context` | string | No | `null` | System prompt prepended |
| `model_name` | string | **Yes** | - | See Model Mapping below |
| `position` | number | **Yes** | - | 0-based execution order |
| `parallel_group` | number | No | `null` | Group ID for parallel execution |
| `input_mapping` | object | No | `null` | Variable substitution mappings |
| `timeout_seconds` | number | No | `null` | Per-prompt timeout |

### Input Field Object

```json
{
  "name": "document",
  "label": "Upload Document",
  "field_type": "file_upload",
  "position": 0,
  "options": {...}
}
```

| Field | Type | Required |
|-------|------|----------|
| `name` | string | **Yes** |
| `label` | string | **Yes** |
| `field_type` | enum | **Yes** |
| `position` | number | **Yes** |
| `options` | object | No |

## Field Types

### `short_text`
```json
{
  "name": "title",
  "label": "Document Title",
  "field_type": "short_text",
  "position": 0,
  "options": {
    "placeholder": "Enter a title...",
    "required": true,
    "maxLength": 200
  }
}
```

### `long_text`
```json
{
  "name": "content",
  "label": "Document Content",
  "field_type": "long_text",
  "position": 1,
  "options": {
    "placeholder": "Paste content here...",
    "required": true,
    "rows": 10
  }
}
```

### `select`
```json
{
  "name": "output_format",
  "label": "Output Format",
  "field_type": "select",
  "position": 2,
  "options": {
    "choices": [
      { "value": "summary", "label": "Summary" },
      { "value": "detailed", "label": "Detailed Analysis" }
    ],
    "default": "summary"
  }
}
```

### `multi_select`
```json
{
  "name": "analysis_types",
  "label": "Analysis Types",
  "field_type": "multi_select",
  "position": 3,
  "options": {
    "choices": [
      { "value": "sentiment", "label": "Sentiment Analysis" },
      { "value": "entities", "label": "Entity Extraction" }
    ],
    "minSelections": 1,
    "maxSelections": 3
  }
}
```

### `file_upload`
```json
{
  "name": "document",
  "label": "Upload Document",
  "field_type": "file_upload",
  "position": 4,
  "options": {
    "accept": ".pdf,.docx,.txt,.md",
    "maxSize": 10485760,
    "multiple": false
  }
}
```

## Model Mapping

| Portable Name | Description |
|---------------|-------------|
| `gpt-4o` | OpenAI GPT-4o |
| `gpt-4o-mini` | OpenAI GPT-4o Mini |
| `gpt-4-turbo` | OpenAI GPT-4 Turbo |
| `claude-3-5-sonnet` | Anthropic Claude 3.5 Sonnet |
| `claude-3-opus` | Anthropic Claude 3 Opus |
| `claude-3-haiku` | Anthropic Claude 3 Haiku |
| `gemini-1.5-pro` | Google Gemini 1.5 Pro |
| `gemini-1.5-flash` | Google Gemini 1.5 Flash |

## Variable Substitution

### Input Field Variables
Reference user input: `{{field_name}}`

### Prompt Output Variables
Reference previous prompt output: `{{prompt_N_output}}` (0-based)

### Input Mapping
```json
{
  "input_mapping": {
    "analysis": "{{prompt_0_output}}"
  }
}
```

## Execution Patterns

### Sequential (default)
Prompts execute in order by `position`.

### Parallel
Set `is_parallel: true` and same `parallel_group` for concurrent prompts.

### Chained
Each prompt uses `{{prompt_N_output}}` from previous.

## Validation Checklist

### Structure
- `version` is exactly `"1.0"`
- `assistants` is a non-empty array
- Each assistant has `name` (min 3 chars)
- Each assistant has `prompts` array (1-20)
- Each assistant has `input_fields` array (can be empty)

### Prompts
- Each has `name`, `content`, `model_name`, `position`
- `position` values sequential from 0
- Variables reference valid fields or `prompt_N_output`

### Input Fields
- Each has `name`, `label`, `field_type`, `position`
- `field_type` is: `short_text`, `long_text`, `select`, `multi_select`, `file_upload`
- `position` values sequential from 0
- Select fields have `options.choices` array
