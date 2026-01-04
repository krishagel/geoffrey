// Geoffrey Process Draft - Drafts Action
// Processes a single draft based on routing instructions
//
// Call via URL with JSON in text parameter:
// drafts://x-callback-url/runAction?action=Geoffrey%20Process%20Draft&text={"uuid":"...","destination":"..."}
//
// JSON parameters:
// - uuid: Draft UUID to process
// - destination: "omnifocus", "obsidian", "archive", or "trash"
// - project: OmniFocus project name (for omnifocus destination)
// - tags: Comma-separated OmniFocus tags (for omnifocus destination)
// - dueDate: Due date string (for omnifocus destination)
// - folder: Obsidian folder path (for obsidian destination)
//
// To install:
// 1. Create new action in Drafts named "Geoffrey Process Draft"
// 2. Add a "Script" step
// 3. Paste this code

// Parse parameters from draft content (passed as JSON via URL text parameter)
let params;
try {
    params = JSON.parse(draft.content);
} catch (e) {
    app.displayErrorMessage("Invalid JSON parameters: " + e.message);
    context.fail("Invalid JSON");
}

let uuid = params.uuid;
let destination = params.destination;
let project = params.project || "";
let tags = params.tags || "";
let dueDate = params.dueDate || "";
let folder = params.folder || "Geoffrey/Inbox";

// Validate required parameters
if (!uuid) {
    app.displayErrorMessage("Missing uuid parameter");
    context.fail("Missing uuid");
}

if (!destination) {
    app.displayErrorMessage("Missing destination parameter");
    context.fail("Missing destination");
}

// Find the draft to process
let targetDraft = Draft.find(uuid);

if (!targetDraft) {
    app.displayErrorMessage("Draft not found: " + uuid);
    context.fail("Draft not found");
}

let title = targetDraft.title || "(untitled)";
let content = targetDraft.content;
let result = { uuid: uuid, title: title, destination: destination };

// Route based on destination
switch (destination) {
    case "omnifocus":
        // Build OmniFocus URL
        let ofUrl = "omnifocus:///add?";
        let params = [];

        // Task name is first line
        params.push("name=" + encodeURIComponent(title));

        // Note is rest of content
        let noteLines = content.split("\n").slice(1).join("\n").trim();
        if (noteLines) {
            params.push("note=" + encodeURIComponent(noteLines));
        }

        // Project
        if (project) {
            params.push("project=" + encodeURIComponent(project));
        }

        // Due date
        if (dueDate) {
            params.push("due=" + encodeURIComponent(dueDate));
        }

        // Open OmniFocus URL
        let ofCallback = CallbackURL.create();
        ofCallback.baseURL = ofUrl + params.join("&");

        let ofSuccess = ofCallback.open();

        if (ofSuccess) {
            result.status = "success";
            result.project = project;
            result.tags = tags;

            // Tag the draft as processed
            targetDraft.addTag("sent-to-omnifocus");
            targetDraft.isArchived = true;
            targetDraft.update();

            app.displayInfoMessage("Task sent to OmniFocus: " + title);
        } else {
            result.status = "failed";
            result.error = "Failed to open OmniFocus";
            app.displayErrorMessage("Failed to send to OmniFocus");
        }
        break;

    case "obsidian":
        // Build Obsidian file name (vault path not needed - using URL scheme)
        let fileName = title.replace(/[\/\\:*?"<>|]/g, "-") + ".md";

        // Build frontmatter
        let frontmatter = [
            "---",
            "created: " + new Date().toISOString().split("T")[0],
            "source: drafts",
            "draft-uuid: " + uuid,
            "tags: [from-drafts]",
            "---",
            ""
        ].join("\n");

        // Full content with frontmatter
        let obsidianContent = frontmatter + content;

        // Use Obsidian URL scheme to create file
        let obsCallback = CallbackURL.create();
        obsCallback.baseURL = "obsidian://new";
        obsCallback.addParameter("vault", "Personal_Notes");
        obsCallback.addParameter("file", folder + "/" + fileName.replace(".md", ""));
        obsCallback.addParameter("content", obsidianContent);
        obsCallback.addParameter("overwrite", "true");

        let obsSuccess = obsCallback.open();

        if (obsSuccess) {
            result.status = "success";
            result.folder = folder;
            result.file = fileName;

            // Tag the draft as processed
            targetDraft.addTag("sent-to-obsidian");
            targetDraft.isArchived = true;
            targetDraft.update();

            app.displayInfoMessage("Note saved to Obsidian: " + fileName);
        } else {
            result.status = "failed";
            result.error = "Failed to create Obsidian note";
            app.displayErrorMessage("Failed to save to Obsidian");
        }
        break;

    case "archive":
        // Simply archive the draft
        targetDraft.addTag("archived-by-geoffrey");
        targetDraft.isArchived = true;
        targetDraft.update();

        result.status = "success";
        app.displayInfoMessage("Archived: " + title);
        break;

    case "trash":
        // Move to trash
        targetDraft.addTag("trashed-by-geoffrey");
        targetDraft.isTrashed = true;
        targetDraft.update();

        result.status = "success";
        app.displayInfoMessage("Trashed: " + title);
        break;

    default:
        result.status = "failed";
        result.error = "Unknown destination: " + destination;
        app.displayErrorMessage("Unknown destination: " + destination);
        context.fail("Unknown destination");
}

// Set draft content to result (for potential callback)
draft.content = JSON.stringify(result, null, 2);
