#!/usr/bin/env osascript -l JavaScript

// Add a task to OmniFocus using pure JXA (no URL scheme, no popups)
// Usage: osascript -l JavaScript add_task.js '{"name":"Task name","project":"Project Name","tags":["Tag1","Tag2"],"dueDate":"2025-11-25","note":"Optional note"}'

function run(argv) {
    const app = Application('OmniFocus');
    app.includeStandardAdditions = true;

    const doc = app.defaultDocument;

    // Parse input
    let input;
    try {
        input = JSON.parse(argv[0]);
    } catch (e) {
        return JSON.stringify({
            success: false,
            error: "Invalid JSON input. Expected: {name, project, tags, dueDate, note}"
        });
    }

    const taskName = input.name;
    const projectName = input.project;
    const tagNames = input.tags || [];
    const dueDateStr = input.dueDate;
    const noteText = input.note || "";
    const deferDateStr = input.deferDate;
    const flagged = input.flagged || false;

    if (!taskName) {
        return JSON.stringify({
            success: false,
            error: "Task name is required"
        });
    }

    try {
        // Build task properties
        const taskProps = {
            name: taskName,
            note: noteText,
            flagged: flagged
        };

        // Set dates if provided
        if (dueDateStr) {
            taskProps.dueDate = new Date(dueDateStr);
        }
        if (deferDateStr) {
            taskProps.deferDate = new Date(deferDateStr);
        }

        let task;
        let targetLocation = "Inbox";

        // Always create in inbox first
        task = app.InboxTask(taskProps);
        doc.inboxTasks.push(task);

        // Then move to project if specified
        if (projectName) {
            const projects = doc.flattenedProjects.whose({name: projectName});
            if (projects.length === 0) {
                return JSON.stringify({
                    success: false,
                    error: `Project not found: ${projectName}`
                });
            }
            const project = projects[0];
            // Move task to project
            task.assignedContainer = project;
            targetLocation = projectName;
        }

        // Add tags (use app.add for existing objects, not push)
        const addedTags = [];
        for (const tagName of tagNames) {
            const tags = doc.flattenedTags.whose({name: tagName});
            if (tags.length > 0) {
                app.add(tags[0], {to: task.tags});
                addedTags.push(tagName);
            }
        }

        return JSON.stringify({
            success: true,
            task: {
                id: task.id(),
                name: task.name(),
                project: targetLocation,
                tags: addedTags,
                dueDate: dueDateStr || null,
                deferDate: deferDateStr || null,
                note: noteText || null,
                flagged: flagged
            }
        });

    } catch (e) {
        return JSON.stringify({
            success: false,
            error: `Failed to create task: ${e.message}`
        });
    }
}
