# Local TTS Setup Guide

## Quick Start (Any Mac with Apple Silicon)

1. **Ensure uv is installed**
   ```bash
   # Check if installed
   uv --version

   # Install if needed
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

2. **Test generation**
   ```bash
   uv run --with mlx-audio --with pydub skills/local-tts/scripts/generate_audio.py \
       --text "Hello, this is a test." \
       --output ~/Desktop/test.mp3
   ```

3. **Play the audio**
   ```bash
   afplay ~/Desktop/test.mp3
   ```

## First Run (Model Download)

On first run, the following are downloaded automatically:

| Component | Size | Location |
|-----------|------|----------|
| Kokoro-82M model | ~200MB | `~/.cache/huggingface/hub/` |
| spaCy en_core_web_sm | ~13MB | uv cache |
| espeak-ng data | ~10MB | uv cache |

Total: ~225MB on first run, cached for subsequent runs.

## Hardware Requirements

| Mac | RAM | Performance | Notes |
|-----|-----|-------------|-------|
| M1/M2 Mac Mini (8GB) | OK | ~1.5x realtime | Sufficient for briefings |
| M1/M2 Mac Mini (16GB) | Good | ~2x realtime | Comfortable headroom |
| M3/M4 MacBook Pro (18GB+) | Excellent | ~3-4x realtime | Fast generation |
| M3/M4 Pro/Max (36GB+) | Excellent | ~4x+ realtime | Very fast |

**Realtime factor**: 2x means 10 minutes of audio generates in 5 minutes.

## Troubleshooting

### "No module named pip" warning
This is harmless - mlx-audio tries to use pip for optional deps but uv handles everything.

### Model download fails
```bash
# Clear and retry
rm -rf ~/.cache/huggingface/hub/models--mlx-community--Kokoro-82M-bf16
uv run --with mlx-audio --with pydub skills/local-tts/scripts/generate_audio.py \
    --text "test" --output /tmp/test.mp3
```

### pydub SyntaxWarning
```
SyntaxWarning: invalid escape sequence '\('
```
This is a pydub bug with Python 3.13+. Harmless, audio still generates correctly.

### Audio sounds choppy
- Increase chunk size in script (default 400 chars)
- Longer chunks = smoother but may hit model limits

### MP3 not generating (only WAV works)
Ensure ffmpeg is installed:
```bash
brew install ffmpeg
```

### Out of memory on 8GB Mac
- Close other applications
- Kokoro-82M uses ~0.8GB peak
- Should work on 8GB with headroom

## Mac Mini Setup (Home Automation)

For dedicated Mac Minis running morning briefings:

1. **Initial setup** (one time):
   ```bash
   # Install uv
   curl -LsSf https://astral.sh/uv/install.sh | sh

   # Prime the cache by running once
   uv run --with mlx-audio --with pydub skills/local-tts/scripts/generate_audio.py \
       --text "Hello, this is a setup test." \
       --output /tmp/setup_test.mp3
   ```

2. **Verify cache populated**:
   ```bash
   ls ~/.cache/huggingface/hub/models--mlx-community--Kokoro-82M-bf16
   ```

3. **Add to cron/launchd as needed**

## Updating

To get newer models or library updates:
```bash
# Clear uv cache for mlx-audio
uv cache clean mlx-audio

# Run again to download fresh
uv run --with mlx-audio --with pydub skills/local-tts/scripts/generate_audio.py \
    --text "test" --output /tmp/test.mp3
```

## Alternative Models

Kokoro-82M is default. Other options in mlx-community:

| Model | Size | Speed | Quality | Use Case |
|-------|------|-------|---------|----------|
| Kokoro-82M-bf16 | 82M | Fastest | High | **Default - briefings** |
| Chatterbox | 350M | Fast | Highest | Emotion tags, cloning |
| Dia | 1.6B | Medium | Very High | Premium quality |

To use a different model:
```bash
uv run --with mlx-audio --with pydub skills/local-tts/scripts/generate_audio.py \
    --model mlx-community/Chatterbox-bf16 \
    --text "Hello" --output ~/test.mp3
```
