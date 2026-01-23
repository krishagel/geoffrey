# Eleven Labs Voice Reference

## Curated Voices

Six voices selected for variety in podcast-style content:

### Female Voices

| Voice | ID | Description | Best For |
|-------|-----|-------------|----------|
| **Rachel** | `21m00Tcm4TlvDq8ikWAM` | Calm, clear, neutral American accent | Narration, podcasts, general purpose (default) |
| **Bella** | `EXAVITQu4vr4xnSDxMaL` | Soft, gentle, soothing tone | Storytelling, meditation, ASMR |
| **Elli** | `MF3mGyEYCl7XYWbV9V6O` | Young, energetic, expressive | Casual content, tutorials, social media |

### Male Voices

| Voice | ID | Description | Best For |
|-------|-----|-------------|----------|
| **Josh** | `TxGEqnHWrfWFTfGW9XjX` | Deep, authoritative, confident | News, announcements, professional content |
| **Adam** | `pNInz6obpgDQGcFmaJgB` | Middle-aged, clear, articulate | Business, documentaries, educational |
| **Antoni** | `ErXwobaYiN019PkySvjV` | Warm, well-rounded, friendly | General purpose, conversational |

## Discovering More Voices

List all available voices:
```bash
uv run scripts/list_voices.py --all
```

The API provides many more voices including:
- Different accents (British, Australian, etc.)
- Character voices
- Professional narrator voices
- Community-created voices

## Using Custom Voice IDs

You can use any voice ID directly:
```bash
uv run scripts/generate_audio.py --text "Hello" --voice YOUR_VOICE_ID
```

Voice IDs can be found via `list_voices.py` or in the Eleven Labs Voice Library.

## Voice Settings

The script uses balanced settings:
- **Stability**: 0.5 (balanced between consistent and expressive)
- **Similarity Boost**: 0.75 (closer to original voice)

These can be modified in `generate_audio.py` if needed.

## Voice Selection Tips

1. **Match content tone**: Use Josh for serious news, Bella for gentle content
2. **Consider length**: Rachel handles long-form content well
3. **Test first**: Generate a short sample before committing to a long piece
4. **Variety in podcasts**: Use different voices for different segments

## Multi-Voice Content

For podcast-style content with multiple speakers:
1. Generate each segment with a different voice
2. Save as separate files
3. Combine using audio editing software or ffmpeg:
   ```bash
   ffmpeg -i "concat:intro.mp3|segment1.mp3|segment2.mp3" -acodec copy output.mp3
   ```
