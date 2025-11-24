// Geoffrey Export Inbox - Drafts Action
// Exports all inbox drafts to JSON file for Geoffrey to analyze
//
// To install:
// 1. Create new action in Drafts named "Geoffrey Export Inbox"
// 2. Add a "Script" step
// 3. Paste this code

// Query inbox drafts (not archived, not trashed)
let drafts = Draft.query("", "inbox", [], [], "modified", true, false);

// Build export data
let exportData = {
    exported: new Date().toISOString(),
    count: drafts.length,
    drafts: []
};

// Process each draft
drafts.forEach(d => {
    exportData.drafts.push({
        uuid: d.uuid,
        title: d.title || "(untitled)",
        content: d.content,
        tags: d.tags,
        createdAt: d.createdAt.toISOString(),
        modifiedAt: d.modifiedAt.toISOString(),
        isFlagged: d.isFlagged,
        wordCount: d.content.split(/\s+/).filter(w => w.length > 0).length
    });
});

// Write to iCloud Documents folder
let fm = FileManager.createCloud();
let exportPath = "geoffrey-export.json";
let jsonContent = JSON.stringify(exportData, null, 2);

let success = fm.writeString(exportPath, jsonContent);

if (success) {
    // Show confirmation
    app.displayInfoMessage("Exported " + drafts.length + " drafts for Geoffrey");

    // Set draft content to summary (for callback if needed)
    draft.content = JSON.stringify({
        status: "success",
        count: drafts.length,
        path: exportPath
    });
} else {
    app.displayErrorMessage("Failed to write export file");
    context.fail("Export failed");
}
