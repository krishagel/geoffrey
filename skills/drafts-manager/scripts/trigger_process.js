#!/usr/bin/env bun
// Trigger Geoffrey Process Draft action in Drafts
// Usage: bun trigger_process.js '<json-params>'
//
// JSON params:
// {
//   "uuid": "ABC123",
//   "destination": "omnifocus|obsidian|archive|trash",
//   "project": "Project Name",       // for omnifocus
//   "tags": "Tag1,Tag2",              // for omnifocus
//   "dueDate": "2025-11-30",          // for omnifocus
//   "folder": "Geoffrey/Inbox"        // for obsidian
// }

const { execSync } = require("child_process");

// Parse arguments
const args = process.argv.slice(2);
if (args.length === 0) {
    console.error(JSON.stringify({
        error: "Missing parameters",
        usage: 'bun trigger_process.js \'{"uuid":"...","destination":"..."}\''
    }));
    process.exit(1);
}

let params;
try {
    params = JSON.parse(args[0]);
} catch (e) {
    console.error(JSON.stringify({
        error: "Invalid JSON parameters",
        details: e.message
    }));
    process.exit(1);
}

// Validate required parameters
if (!params.uuid) {
    console.error(JSON.stringify({ error: "Missing uuid parameter" }));
    process.exit(1);
}

if (!params.destination) {
    console.error(JSON.stringify({ error: "Missing destination parameter" }));
    process.exit(1);
}

const validDestinations = ["omnifocus", "obsidian", "archive", "trash"];
if (!validDestinations.includes(params.destination)) {
    console.error(JSON.stringify({
        error: "Invalid destination",
        valid: validDestinations
    }));
    process.exit(1);
}

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

// Build URL with JSON in text parameter
const jsonPayload = JSON.stringify(params);
const actionUrl = "drafts://x-callback-url/runAction?action=" +
    encodeURIComponent("Geoffrey Process Draft") +
    "&text=" + encodeURIComponent(jsonPayload);

// Trigger the action
try {
    execSync(`open "${actionUrl}"`, { stdio: "pipe" });

    // Give Drafts a moment to process
    execSync("sleep 1");

    console.log(JSON.stringify({
        status: "success",
        uuid: params.uuid,
        destination: params.destination,
        details: params
    }));
} catch (e) {
    console.error(JSON.stringify({
        error: "Failed to trigger Drafts action",
        details: e.message
    }));
    process.exit(1);
}
