#!/bin/bash
# Captures session learnings automatically on stop
# Only triggers for sessions with substantial work

# Read conversation from stdin
CONVERSATION=$(cat)

# Check if session had meaningful work (rough heuristic: >2000 chars)
CHAR_COUNT=${#CONVERSATION}
if [ "$CHAR_COUNT" -lt 2000 ]; then
  exit 0
fi

# Extract any explicit learnings mentioned
# This is a lightweight capture - full /compound is manual
echo "Session complete. Consider running /compound if significant learnings emerged."
exit 0
