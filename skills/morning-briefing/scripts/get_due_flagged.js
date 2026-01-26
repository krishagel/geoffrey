#!/usr/bin/env osascript -l JavaScript

// Get tasks that are due today, overdue, or flagged
// Usage: osascript -l JavaScript get_due_flagged.js
//
// Returns tasks that are:
// - Due today or in the past (overdue)
// - Flagged
// - Available (not blocked, not completed, not dropped, not deferred to future)

function run(argv) {
    var app = Application("OmniFocus");

    // Check if OmniFocus is running
    if (!app.running()) {
        return JSON.stringify({
            error: "OmniFocus is not running",
            suggestion: "Please open OmniFocus and try again"
        }, null, 2);
    }

    var doc = app.defaultDocument;
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    // Get all tasks from the document
    var allTasks = doc.flattenedTasks();

    var dueToday = [];
    var overdue = [];
    var flagged = [];

    for (var i = 0; i < allTasks.length; i++) {
        var t = allTasks[i];

        // Skip completed or dropped tasks
        if (t.completed() || t.dropped()) continue;

        // Skip tasks deferred to the future
        var deferDate = t.deferDate();
        if (deferDate && deferDate > now) continue;

        // Skip tasks in on-hold or dropped projects
        var container = t.containingProject();
        if (container) {
            var status = container.status();
            if (status === "on hold" || status === "dropped") continue;
        }

        var dueDate = t.dueDate();
        var isFlagged = t.flagged();
        var projectName = container ? container.name() : "No Project";

        var taskData = {
            id: t.id(),
            name: t.name(),
            project: projectName,
            dueDate: dueDate ? dueDate.toISOString().split("T")[0] : null,
            flagged: isFlagged,
            tags: t.tags().map(function(tag) { return tag.name(); }),
            note: t.note() ? t.note().substring(0, 100) : ""
        };

        // Categorize by due date
        if (dueDate) {
            if (dueDate < today) {
                taskData.status = "overdue";
                taskData.daysOverdue = Math.floor((today - dueDate) / (24 * 60 * 60 * 1000));
                overdue.push(taskData);
            } else if (dueDate < tomorrow) {
                taskData.status = "due_today";
                dueToday.push(taskData);
            }
        }

        // Track flagged separately (may overlap with due)
        if (isFlagged && !dueDate) {
            // Only add to flagged if not already in due categories
            taskData.status = "flagged";
            flagged.push(taskData);
        } else if (isFlagged && dueDate && dueDate >= tomorrow) {
            // Flagged but due in future
            taskData.status = "flagged_future";
            flagged.push(taskData);
        }
    }

    // Sort overdue by days overdue (most overdue first)
    overdue.sort(function(a, b) { return b.daysOverdue - a.daysOverdue; });

    // Sort due today by project
    dueToday.sort(function(a, b) { return a.project.localeCompare(b.project); });

    // Sort flagged by project
    flagged.sort(function(a, b) { return a.project.localeCompare(b.project); });

    return JSON.stringify({
        generated: now.toISOString(),
        summary: {
            overdue: overdue.length,
            dueToday: dueToday.length,
            flagged: flagged.length,
            total: overdue.length + dueToday.length + flagged.length
        },
        overdue: overdue,
        dueToday: dueToday,
        flagged: flagged
    }, null, 2);
}
