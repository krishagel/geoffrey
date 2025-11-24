#!/usr/bin/env bun
// Trigger Geoffrey Export Inbox action in Drafts
// Usage: bun trigger_export.js
//
// This triggers the Drafts action and waits for the export file to be created.
// Returns the path to the export file.

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Export file location
const exportPath = path.join(
    process.env.HOME,
    "Library/Mobile Documents/iCloud~com~agiletortoise~Drafts5/Documents/geoffrey-export.json"
);

// Check if Drafts is running
try {
    execSync('pgrep -x "Drafts"', { stdio: "pipe" });
} catch (e) {
    console.error(JSON.stringify({
        error: "Drafts is not running",
        suggestion: "Please open Drafts and try again"
    }));
    process.exit(1);
}

// Get current file modification time (if exists)
let oldMtime = 0;
try {
    const stats = fs.statSync(exportPath);
    oldMtime = stats.mtimeMs;
} catch (e) {
    // File doesn't exist yet, that's fine
}

// Trigger the export action
const actionUrl = "drafts://x-callback-url/runAction?action=" +
    encodeURIComponent("Geoffrey Export Inbox");

try {
    execSync(`open "${actionUrl}"`, { stdio: "pipe" });
} catch (e) {
    console.error(JSON.stringify({
        error: "Failed to trigger Drafts action",
        details: e.message
    }));
    process.exit(1);
}

// Wait for the export file to be updated (max 10 seconds)
const maxWait = 10000;
const checkInterval = 500;
let waited = 0;

while (waited < maxWait) {
    try {
        const stats = fs.statSync(exportPath);
        if (stats.mtimeMs > oldMtime) {
            // File was updated, success!
            const data = JSON.parse(fs.readFileSync(exportPath, "utf-8"));
            console.log(JSON.stringify({
                status: "success",
                path: exportPath,
                count: data.count,
                exported: data.exported
            }));
            process.exit(0);
        }
    } catch (e) {
        // File doesn't exist yet, keep waiting
    }

    // Sleep
    execSync(`sleep ${checkInterval / 1000}`);
    waited += checkInterval;
}

// Timeout
console.error(JSON.stringify({
    error: "Timeout waiting for export file",
    suggestion: "Check if the 'Geoffrey Export Inbox' action is installed in Drafts"
}));
process.exit(1);
