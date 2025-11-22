#!/usr/bin/env osascript -l JavaScript

// Get all OmniFocus tags with full hierarchy
// Returns JSON with tag names, parents, children, and groupings

function run() {
    const app = Application('OmniFocus');
    app.includeStandardAdditions = true;

    const doc = app.defaultDocument;
    const flattenedTags = doc.flattenedTags();

    const tags = [];

    for (let i = 0; i < flattenedTags.length; i++) {
        const tag = flattenedTags[i];

        const tagInfo = {
            id: tag.id(),
            name: tag.name(),
            parent: null,
            children: [],
            availableTaskCount: tag.availableTaskCount(),
            remainingTaskCount: tag.remainingTaskCount()
        };

        // Get parent tag if exists
        try {
            const parent = tag.container();
            if (parent && parent.name) {
                tagInfo.parent = parent.name();
            }
        } catch (e) {
            // No parent (top-level tag)
        }

        // Get child tags
        try {
            const children = tag.tags();
            for (let j = 0; j < children.length; j++) {
                tagInfo.children.push(children[j].name());
            }
        } catch (e) {
            // No children
        }

        tags.push(tagInfo);
    }

    // Build hierarchy structure
    const hierarchy = {};
    const topLevel = [];

    for (const tag of tags) {
        if (!tag.parent) {
            topLevel.push(tag.name);
            if (tag.children.length > 0) {
                hierarchy[tag.name] = tag.children;
            }
        }
    }

    const result = {
        total_tags: tags.length,
        top_level_tags: topLevel,
        hierarchy: hierarchy,
        all_tags: tags
    };

    return JSON.stringify(result, null, 2);
}
