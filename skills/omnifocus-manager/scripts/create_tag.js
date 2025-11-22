#!/usr/bin/env osascript -l JavaScript

// Create a new tag in OmniFocus
// Usage: osascript -l JavaScript create_tag.js '{"name":"Tag Name","parent":"Parent Tag Name"}'

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
            error: "Invalid JSON input. Expected: {name, parent (optional)}"
        });
    }

    const tagName = input.name;
    const parentName = input.parent;

    if (!tagName) {
        return JSON.stringify({
            success: false,
            error: "Tag name is required"
        });
    }

    try {
        // Check if tag already exists
        const existing = doc.flattenedTags.whose({name: tagName});
        if (existing.length > 0) {
            return JSON.stringify({
                success: true,
                tag: {
                    id: existing[0].id(),
                    name: existing[0].name(),
                    existed: true
                }
            });
        }

        // Create new tag
        const newTag = app.Tag({name: tagName});

        if (parentName) {
            // Find parent tag and add as child
            const parents = doc.flattenedTags.whose({name: parentName});
            if (parents.length === 0) {
                return JSON.stringify({
                    success: false,
                    error: "Parent tag not found: " + parentName
                });
            }
            parents[0].tags.push(newTag);
        } else {
            // Add to root tags
            doc.tags.push(newTag);
        }

        return JSON.stringify({
            success: true,
            tag: {
                id: newTag.id(),
                name: newTag.name(),
                parent: parentName || null,
                existed: false
            }
        });

    } catch (e) {
        return JSON.stringify({
            success: false,
            error: "Failed to create tag: " + e.message
        });
    }
}
