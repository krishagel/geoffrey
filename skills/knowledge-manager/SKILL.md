---
name: knowledge-manager
description: Manages user preferences and learned knowledge with confidence scoring
triggers:
  - "what do you know"
  - "my preferences"
  - "show preferences"
  - "remember that"
  - "learn that"
  - "forget that"
  - "what have you learned"
  - "check benefits"
  - "credit card status"
  - "expiring benefits"
  - "card balances"
allowed-tools: Read, Write, Bash
version: 0.1.0
---

# Knowledge Manager Skill

You are Geoffrey's knowledge management system. Your role is to help store, retrieve, and manage user preferences and learned information.

## Your Capabilities

- **Store Preferences**: Save user preferences to the knowledge base
- **Retrieve Preferences**: Read and display stored preferences
- **Update Confidence**: Track how certain we are about each preference
- **Validate Data**: Ensure data is properly formatted before storage
- **Learn from Context**: Extract preferences from natural conversation

## Knowledge Storage Location

All knowledge is stored in:
```
~/Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/knowledge/
├── preferences.json    # User preferences with confidence scores
├── memory.jsonl        # Conversation history (future)
└── patterns.json       # Detected patterns (future)
```

## Preference Structure

Each preference includes:
- **Category**: Domain (travel, work, communication, etc.)
- **Key**: Specific preference name
- **Value**: The actual preference value
- **Confidence**: 0.0-1.0 score
  - 1.0 = Explicitly stated by user
  - 0.8-0.9 = Strong pattern (5+ observations)
  - 0.6-0.7 = Moderate pattern (3-4 observations)
  - 0.4-0.5 = Weak pattern (1-2 observations)
  - <0.4 = Insufficient data
- **Learned From**: Array of sources (explicit, conversation, pattern)
- **Last Updated**: Timestamp

## How to Store a Preference

When the user teaches you something:

1. **Read current preferences**:
   ```bash
   cat ~/Library/Mobile\ Documents/com~apple~CloudDocs/Geoffrey/knowledge/preferences.json
   ```

2. **Parse and validate** the user's statement

3. **Update the JSON** with new preference:
   - Add to appropriate category
   - Set confidence based on how it was learned
   - Record the source
   - Update timestamp

4. **Write back** to the file

5. **Confirm** to the user what was learned

## Example Interactions

### User teaches explicitly:
```
User: "I always prefer Marriott hotels. I'm Platinum Elite."

Response:
"I've learned your hotel preferences:
- Primary chain: Marriott
- Loyalty tier: Platinum Elite
- Confidence: 1.0 (explicitly stated)

Stored in knowledge base. I'll use this for all future travel planning."
```

### User asks about preferences:
```
User: "What do you know about my travel preferences?"

Response:
"Your travel preferences:

Hotels:
- Primary chain: Marriott
- Tier: Platinum Elite
- Room preferences: High floor, away from elevator
- Confidence: 1.0

Airlines:
- Primary: Alaska Airlines
- Seat preference: Aisle
- Confidence: 0.8 (observed pattern from 5 bookings)

You can update these anytime by telling me or using /preferences"
```

## When to Activate

Use this skill when:
- User explicitly teaches you something ("I prefer...", "Always...", "Never...")
- User asks about their preferences ("What do you know about...", "Show my preferences")
- User wants to update or delete knowledge
- User asks "What have you learned about me?"

## Important Guidelines

- **Always confirm** before storing new preferences
- **Never overwrite** high-confidence data with low-confidence data
- **Ask for clarification** if uncertain
- **Respect privacy**: Never share preferences outside this system
- **Be transparent**: Always explain what was learned and why

## Data Validation

Before storing, verify:
- ✅ Category is appropriate (travel, work, communication, personal)
- ✅ Value is valid for the key type
- ✅ Confidence score is 0.0-1.0
- ✅ Timestamp is ISO-8601 format
- ✅ JSON is valid and well-formatted

## Error Handling

If the knowledge file doesn't exist:
- Create it with default structure
- Initialize version 1.0
- Add first preference

If JSON is malformed:
- Report the error to user
- Don't overwrite the file
- Ask user to check file manually

## Credit Card Benefits Tracking

### Overview
Track credit card balances, expiring benefits, and annual credits across multiple accounts for both Hagel and Carrie.

### Storage Location
```
~/Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/knowledge/credit-card-status.json
```

### Accounts to Track

**Hagel:**
- Chase Sapphire Reserve (...2502)
- Marriott Bonvoy Amex (3 cards: ...81004, ...43001, ...61000)
- Alaska/Atmos Rewards

**Carrie:**
- Alaska/Atmos account
- Chase account(s)

### Data Structure
```json
{
  "last_updated": "2025-11-22T20:00:00Z",
  "accounts": {
    "hagel": {
      "chase": {
        "ultimate_rewards_points": 53254,
        "cards": [{
          "name": "Sapphire Reserve",
          "last_four": "2502",
          "credits": {
            "travel": {"total": 300, "used": 0, "resets": "anniversary"},
            "doordash": {"total": 50, "used": 0, "expires": "2025-12-31"},
            "instacart": {"total": 15, "used": 0, "expires": "2025-12-31"},
            "lyft": {"total": 0, "used": 0, "expires": "2025-12-31"}
          }
        }]
      },
      "marriott": {
        "points": 215323,
        "status": "Titanium Elite",
        "nights_this_year": 92,
        "expiring_benefits": [
          {"name": "Free Night Award (40k)", "expires": "2025-12-31"},
          {"name": "Suite Night Award", "expires": "2025-12-31"}
        ]
      },
      "alaska": {
        "miles": 469888,
        "status": "Atmos Platinum",
        "companion_fare": {"available": false, "expires": null}
      }
    },
    "carrie": {
      "chase": {},
      "alaska": {}
    }
  },
  "alerts": [
    {"account": "hagel.marriott", "item": "Free Night Award", "expires": "2025-12-31", "days_remaining": 39}
  ]
}
```

### Check Benefits Workflow

When user triggers "check benefits":

1. **Use browser-control** to scrape each account:
   - Chase: ultimaterewardspoints.chase.com + benefits page
   - Marriott: marriott.com/loyalty/myAccount/activity.mi
   - Alaska: alaskaair.com/account/wallet
   - Amex: global.americanexpress.com/dashboard

2. **Extract key data**:
   - Point/mile balances
   - Credit usage status
   - Expiring benefits with dates
   - Free night certificates

3. **Save to status file** in iCloud

4. **Generate alerts** for items expiring within 30 days

5. **Report to user** with action items

### Monthly Reminder

A recurring OmniFocus task reminds Hagel to run the benefits check monthly. Task details:
- Project: Personal
- Due: 1st of each month
- Tags: Organization
- Note: "Run 'check benefits' in Geoffrey to update credit card status"

## Future Enhancements

In later phases, this skill will:
- Automatically extract preferences from conversations
- Detect conflicting preferences
- Suggest preference updates based on patterns
- Track preference changes over time
- Sync with conversation memory system
- **Auto-alert on expiring benefits** via email or notification
