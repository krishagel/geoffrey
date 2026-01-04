# Installing Drafts Actions

These actions must be installed in Drafts before the drafts-manager skill can work.

## Quick Install

### Geoffrey Export Inbox

1. Open Drafts on your Mac
2. Go to **Drafts → Settings → Actions → Manage Actions**
3. Click the **+** button to create a new action
4. Set the name to: `Geoffrey Export Inbox`
5. Click **Steps** → Add **Script** step
6. Copy the entire contents of `geoffrey-export-inbox.js` into the script editor
7. Click **Done** to save

### Geoffrey Process Draft

1. Create another new action
2. Set the name to: `Geoffrey Process Draft`
3. Click **Steps** → Add **Script** step
4. Copy the entire contents of `geoffrey-process-draft.js` into the script editor
5. **Important:** Click the gear icon on the action and set:
   - After Success: **Do Nothing** (don't archive the draft - the script handles this)
6. Click **Done** to save

## Verification

Test that the export action works:

```bash
open "drafts://x-callback-url/runAction?action=Geoffrey%20Export%20Inbox"
```

Check for the export file:

```bash
ls -la ~/Library/Mobile\ Documents/iCloud~com~agiletortoise~Drafts5/Documents/geoffrey-export.json
```

If the file exists and was recently modified, the action is working.

## Troubleshooting

### "Action not found" error

- Make sure the action names match exactly:
  - `Geoffrey Export Inbox`
  - `Geoffrey Process Draft`
- Check for extra spaces or different capitalization

### Export file not created

- Open Drafts manually and run the action from the action list
- Check for script errors in Drafts' action log

### OmniFocus tasks not created

- Make sure OmniFocus is running
- The OmniFocus URL scheme needs the app to be open

### Obsidian notes not created

- Make sure Obsidian is running
- Verify the vault name is "Personal_Notes"
- Check that the folder path exists

## Action Configuration

### Template Tags

The process action uses Drafts template tags to receive parameters. When called via URL:

```
drafts://x-callback-url/runAction?action=Geoffrey%20Process%20Draft&uuid=ABC&destination=omnifocus
```

The parameters become available as template tags in the script.

### Customization

The action uses the Obsidian URL scheme, so it automatically finds your vault. No path configuration needed.

To change the default Obsidian folder, edit:

```javascript
let folder = draft.getTemplateTag("folder") || "Geoffrey/Inbox";
```

## URL Scheme Reference

### Export

```
drafts://x-callback-url/runAction?action=Geoffrey%20Export%20Inbox
```

### Process to OmniFocus

```
drafts://x-callback-url/runAction?action=Geoffrey%20Process%20Draft&uuid=UUID&destination=omnifocus&project=Project&tags=Tag1,Tag2&dueDate=2025-11-30
```

### Process to Obsidian

```
drafts://x-callback-url/runAction?action=Geoffrey%20Process%20Draft&uuid=UUID&destination=obsidian&folder=Meetings
```

### Archive

```
drafts://x-callback-url/runAction?action=Geoffrey%20Process%20Draft&uuid=UUID&destination=archive
```

### Trash

```
drafts://x-callback-url/runAction?action=Geoffrey%20Process%20Draft&uuid=UUID&destination=trash
```
