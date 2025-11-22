#!/bin/bash

# Launch Geoffrey Chrome Profile with Remote Debugging
#
# This starts a dedicated Chrome profile for Geoffrey's browser automation.
# The profile persists logins, cookies, and extensions between sessions.
#
# Usage: ./launch-chrome.sh [--headless]

PROFILE_DIR="$HOME/.brave-geoffrey"
PORT=9222

# Check if Chrome is already running with debugging
if lsof -i :$PORT > /dev/null 2>&1; then
    echo '{"status": "already_running", "port": '$PORT', "profile": "'$PROFILE_DIR'"}'
    exit 0
fi

# Create profile directory if it doesn't exist
if [ ! -d "$PROFILE_DIR" ]; then
    mkdir -p "$PROFILE_DIR"
    echo "Created new Geoffrey Chrome profile at $PROFILE_DIR"
    echo "Please log into your accounts (Marriott, Alaska, etc.) on first run."
fi

# Check for headless flag
HEADLESS=""
if [ "$1" = "--headless" ]; then
    HEADLESS="--headless=new"
fi

# Launch Brave Nightly with remote debugging (bypasses district MDM)
/Applications/Brave\ Browser\ Nightly.app/Contents/MacOS/Brave\ Browser\ Nightly \
    --remote-debugging-port=$PORT \
    --user-data-dir="$PROFILE_DIR" \
    $HEADLESS \
    --no-first-run \
    --no-default-browser-check \
    &

# Wait for Chrome to start
sleep 2

# Verify it's running
if lsof -i :$PORT > /dev/null 2>&1; then
    echo '{"status": "started", "port": '$PORT', "profile": "'$PROFILE_DIR'", "headless": "'$HEADLESS'"}'
else
    echo '{"status": "failed", "error": "Chrome did not start on port '$PORT'"}'
    exit 1
fi
