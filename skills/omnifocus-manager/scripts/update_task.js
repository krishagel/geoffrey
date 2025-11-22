#!/usr/bin/env osascript -l JavaScript

// Update any task with project, tags, due date
// Usage: osascript -l JavaScript update_task.js '{"name":"Task name","project":"Project Name","tags":["Tag1"],"dueDate":"2025-11-28","deferDate":"2025-01-28"}'
// Can also use "id" instead of "name" to find task by ID

function run(argv) {
    const app = Application('OmniFocus');
    app.includeStandardAdditions = true;
    const doc = app.defaultDocument;

    let input;
    try {
        input = JSON.parse(argv[0]);
    } catch (e) {
        return JSON.stringify({
            success: false,
            error: "Invalid JSON input"
        });
    }

    const taskId = input.id;
    const taskName = input.name;
    const projectName = input.project;
    const tagNames = input.tags || [];
    const dueDateStr = input.dueDate;
    const deferDateStr = input.deferDate;

    if (!taskName && !taskId) {
        return JSON.stringify({
            success: false,
            error: "Task name or id is required"
        });
    }

    try {
        // Find the task - search all tasks, not just inbox
        let tasks;
        if (taskId) {
            tasks = doc.flattenedTasks.whose({id: taskId});
        } else {
            tasks = doc.flattenedTasks.whose({name: taskName});
        }

        if (tasks.length === 0) {
            return JSON.stringify({
                success: false,
                error: "Task not found: " + (taskId || taskName)
            });
        }
        const task = tasks[0];

        // Set dates if provided
        if (dueDateStr) {
            task.dueDate = new Date(dueDateStr);
        }
        if (deferDateStr) {
            task.deferDate = new Date(deferDateStr);
        }

        // Move to project if specified
        let targetLocation = "Inbox";
        if (projectName) {
            const projects = doc.flattenedProjects.whose({name: projectName});
            if (projects.length === 0) {
                return JSON.stringify({
                    success: false,
                    error: "Project not found: " + projectName
                });
            }
            task.assignedContainer = projects[0];
            targetLocation = projectName;
        }

        // Add tags (preserves existing tags)
        const addedTags = [];
        for (const tagName of tagNames) {
            const tags = doc.flattenedTags.whose({name: tagName});
            if (tags.length > 0) {
                app.add(tags[0], {to: task.tags});
                addedTags.push(tagName);
            }
        }

        // Get all current tags on task
        const allTags = task.tags().map(function(t) { return t.name(); });

        return JSON.stringify({
            success: true,
            task: {
                id: task.id(),
                name: task.name(),
                project: targetLocation,
                tags: allTags,
                dueDate: dueDateStr || null,
                deferDate: deferDateStr || null
            }
        });

    } catch (e) {
        return JSON.stringify({
            success: false,
            error: "Failed to update task: " + e.message
        });
    }
}
