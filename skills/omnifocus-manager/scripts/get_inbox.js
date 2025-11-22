#!/usr/bin/env osascript -l JavaScript

// Get remaining inbox tasks (matches OmniFocus Inbox perspective)
// Usage: osascript -l JavaScript get_inbox.js

function run(argv) {
    var app = Application("OmniFocus");
    var doc = app.defaultDocument;

    var now = new Date();
    var tasks = doc.inboxTasks().filter(function(t) {
        return t.assignedContainer() === null &&
               !t.completed() &&
               !t.dropped() &&
               (t.deferDate() === null || t.deferDate() <= now);
    }).map(function(t) {
        return {
            id: t.id(),
            name: t.name(),
            note: t.note() ? t.note().substring(0, 200) : "",
            tags: t.tags().map(function(tag) { return tag.name(); }),
            dueDate: t.dueDate() ? t.dueDate().toISOString().split("T")[0] : null
        };
    });

    return JSON.stringify({
        count: tasks.length,
        tasks: tasks
    }, null, 2);
}
