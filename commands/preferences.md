---
description: View and manage your learned preferences and knowledge
---

# Preferences Command

Read and display all stored preferences from Geoffrey's knowledge base.

## What This Command Does

The `/preferences` command shows you everything Geoffrey has learned about you, including:
- All stored preferences organized by category
- Confidence scores for each preference
- When each preference was learned
- How each preference was learned (explicit, pattern, conversation)

## Location

Preferences are stored in:
```
~/Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/knowledge/preferences.json
```

## How to Use

### View all preferences:
```
/preferences
```

Shows all preferences across all categories with confidence scores.

### View by category:
```
/preferences travel
/preferences work
/preferences communication
```

Shows only preferences in the specified category.

## What You'll See

```
Geoffrey's Knowledge Base
Last updated: 2025-11-17 10:30 AM

Travel Preferences:
  Hotels:
    - Primary chain: Marriott
    - Loyalty tier: Platinum Elite
    - Room preferences: High floor, away from elevator
    - Confidence: 1.0 (explicitly stated)
    - Learned from: explicit:2025-11-17

  Airlines:
    - Primary: Alaska Airlines
    - Seat preference: Aisle
    - Time preference: Morning flights
    - Confidence: 0.8 (strong pattern)
    - Learned from: booking:2025-10-15, booking:2025-09-20

Work Preferences:
  Communication:
    - Email tone: Professional but friendly
    - Confidence: 0.6 (moderate pattern)
    - Learned from: conversation:2025-11-10

Total preferences: 8
High confidence (>0.8): 5
Moderate confidence (0.6-0.8): 2
Low confidence (<0.6): 1
```

## Actions You Can Take

After viewing preferences, you can:

1. **Teach Geoffrey something new**:
   ```
   "I prefer window seats on flights, not aisle"
   ```

2. **Update existing preferences**:
   ```
   "Actually, I prefer Hilton over Marriott now"
   ```

3. **Delete preferences**:
   ```
   "Forget my airline preferences"
   ```

4. **Ask questions**:
   ```
   "Why do you think I prefer morning flights?"
   "How confident are you about my hotel preferences?"
   ```

## File Format

The preferences.json file has this structure:
```json
{
  "version": "1.0",
  "last_updated": "2025-11-17T10:30:00Z",
  "preferences": {
    "travel": {
      "hotels": {
        "primary_chain": "Marriott",
        "loyalty_tier": "Platinum Elite",
        "room_preferences": ["high floor", "away from elevator"],
        "confidence": 1.0,
        "learned_from": ["explicit:2025-11-17"],
        "last_updated": "2025-11-17T10:30:00Z"
      }
    }
  }
}
```

## Privacy & Security

- **Local storage only**: Preferences stored in your iCloud, not on any server
- **Syncs across your devices**: Via iCloud Drive
- **You control the data**: Edit or delete the JSON file directly if needed
- **No analytics**: Geoffrey never sends your preferences anywhere

## Troubleshooting

**If /preferences shows nothing:**
- Check if the knowledge file exists
- Initialize with: `mkdir -p ~/Library/Mobile\ Documents/com~apple~CloudDocs/Geoffrey/knowledge`
- Teach Geoffrey something to create initial file

**If file is corrupted:**
- Backup: `cp preferences.json preferences.backup.json`
- Fix JSON formatting or reset to empty: `{}`

**If preferences not syncing:**
- Verify iCloud Drive is enabled
- Check iCloud storage space
- Wait a few minutes for sync

## Implementation Notes

This command should:
1. Read the preferences.json file
2. Parse and format for display
3. Show confidence scores with visual indicators
4. Group by category
5. Provide summary statistics
6. Offer next action suggestions
