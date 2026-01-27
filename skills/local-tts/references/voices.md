# Kokoro Voice Reference

## Voice Naming Convention

Format: `{accent}{gender}_{name}`

- **Accent**: `a` = American, `b` = British
- **Gender**: `f` = female, `m` = male

## American English Female (af_)

| Voice | Style | Best For |
|-------|-------|----------|
| `af_heart` | Warm, friendly | **Morning briefings (default)** |
| `af_bella` | Soft, calm | Meditation, relaxation |
| `af_nicole` | Soft, hesitant | Conversational, casual |
| `af_nova` | Clear, professional | News, business content |
| `af_river` | Clear, confident | Instructions, how-to |
| `af_sarah` | Soft, expressive | Storytelling, narrative |
| `af_sky` | Youthful, energetic | Casual, upbeat content |

## American English Male (am_)

| Voice | Style | Best For |
|-------|-------|----------|
| `am_adam` | Clear, professional | Formal presentations |
| `am_echo` | Deep, smooth | Narration, documentaries |
| `am_eric` | Deep, measured | Serious content |
| `am_liam` | Articulate, conversational | Podcasts, casual |
| `am_michael` | Soft, measured | Calm delivery |
| `am_onyx` | Deep, resonant | Dramatic, impactful |

## British English Female (bf_)

| Voice | Style | Best For |
|-------|-------|----------|
| `bf_emma` | Clear, refined | Professional UK content |
| `bf_isabella` | Refined, elegant | Formal, upscale |
| `bf_lily` | Soft, gentle | Calming content |

## British English Male (bm_)

| Voice | Style | Best For |
|-------|-------|----------|
| `bm_daniel` | Clear, professional | UK business content |
| `bm_fable` | Narrative, storytelling | Audiobooks, stories |
| `bm_george` | Distinguished | Formal, authoritative |
| `bm_lewis` | Warm, friendly | Casual UK content |

## Recommendations by Use Case

| Use Case | Recommended Voice | Why |
|----------|-------------------|-----|
| Morning briefings | `af_heart` | Warm, engaging, easy to listen to |
| News summaries | `af_nova` or `am_adam` | Clear, professional |
| Audiobooks | `bm_fable` or `af_sarah` | Narrative style |
| Instructions | `af_river` or `bf_emma` | Clear articulation |
| Meditation | `af_bella` or `bf_lily` | Soft, calming |
| Podcasts | `am_liam` or `af_heart` | Conversational |

## Language Codes

When using the API directly:
- `a` = American English (use with af_*, am_* voices)
- `b` = British English (use with bf_*, bm_* voices)

The generate_audio.py script auto-detects from voice prefix.

## Additional Languages (Kokoro supports)

Kokoro also has voices for:
- Japanese (ja)
- Mandarin Chinese (zh)
- French (fr)
- Spanish (es)
- Italian (it)
- Portuguese (pt)
- Hindi (hi)

These use different voice IDs. See mlx-audio documentation for full list.
