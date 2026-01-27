#!/usr/bin/env osascript -l JavaScript

/**
 * Create OmniFocus projects and tasks from Priority Goals (annual review)
 *
 * Usage:
 *   osascript -l JavaScript scripts/sync_to_omnifocus.js '{json_data}'
 *
 * Input: JSON with goals array containing:
 *   - domain: Domain name
 *   - goals: Array of goals with indicators, actions, milestones
 *
 * Output: JSON with success status and created projects
 *
 * Pattern: Pure JXA (no URL scheme) to avoid security popups
 */

function run(argv) {
    const app = Application('OmniFocus');
    app.includeStandardAdditions = true;

    // Parse input
    let input;
    try {
        input = JSON.parse(argv[0]);
    } catch (e) {
        return JSON.stringify({
            success: false,
            error: `Invalid JSON input: ${e.message}`
        });
    }

    const defaultDoc = app.defaultDocument;
    const results = {
        success: true,
        projects_created: [],
        tasks_created: 0,
        errors: []
    };

    try {
        // Get or create "Strategic Goals" folder
        let goalsFolder;
        const existingFolders = defaultDoc.folders.whose({ name: "Strategic Goals" });

        if (existingFolders.length > 0) {
            goalsFolder = existingFolders[0];
        } else {
            goalsFolder = defaultDoc.makeFolderWithProperties({
                name: "Strategic Goals"
            });
        }

        // Get or create year-specific tag (e.g., "2026 Goals")
        const year = input.year || new Date().getFullYear();
        const yearTagName = `${year} Goals`;
        let yearTag;

        const existingYearTags = defaultDoc.flattenedTags.whose({ name: yearTagName });
        if (existingYearTags.length > 0) {
            yearTag = existingYearTags[0];
        } else {
            yearTag = defaultDoc.makeFlattenedTagWithProperties({
                name: yearTagName
            });
        }

        // Process each domain's goals
        const domains = input.domains || [];

        domains.forEach(domainData => {
            const domainName = domainData.domain || "Unknown";
            const goals = domainData.goals || [];

            // Get or create domain tag
            let domainTag;
            const existingDomainTags = defaultDoc.flattenedTags.whose({ name: domainName });

            if (existingDomainTags.length > 0) {
                domainTag = existingDomainTags[0];
            } else {
                domainTag = defaultDoc.makeFlattenedTagWithProperties({
                    name: domainName
                });
            }

            // Create project for each goal
            goals.forEach((goal, goalIndex) => {
                const goalName = goal.statement || goal.name || `Goal ${goalIndex + 1}`;
                const projectName = `[${domainName}] ${goalName}`;

                try {
                    // Create project in Strategic Goals folder
                    const project = goalsFolder.makeProjectWithProperties({
                        name: projectName,
                        note: goal.description || ""
                    });

                    // Add tags to project
                    app.add(yearTag, { to: project.tags });
                    app.add(domainTag, { to: project.tags });

                    results.projects_created.push({
                        name: projectName,
                        domain: domainName,
                        goal: goalName
                    });

                    // Add Success Indicators as tasks (optional - for reference)
                    const indicators = goal.indicators || [];
                    if (indicators.length > 0) {
                        const indicatorTask = project.makeTaskWithProperties({
                            name: "📊 Success Indicators (Reference)",
                            note: indicators.map(ind =>
                                `${ind.name}: ${ind.current} → ${ind.target}`
                            ).join('\n')
                        });
                        results.tasks_created++;
                    }

                    // Add Key Actions as tasks
                    const actions = goal.actions || [];
                    actions.forEach(action => {
                        const actionNote = [
                            action.owner ? `Owner: ${action.owner}` : '',
                            action.dependencies ? `Dependencies: ${action.dependencies}` : '',
                            action.timeline ? `Timeline: ${action.timeline}` : ''
                        ].filter(Boolean).join('\n');

                        const task = project.makeTaskWithProperties({
                            name: action.action || action.name || "Action",
                            note: actionNote
                        });

                        // Set due date if timeline mentions specific quarter
                        const timeline = action.timeline || "";
                        if (timeline.includes("Q1")) {
                            task.deferDate = new Date(`${year}-01-01`);
                            task.dueDate = new Date(`${year}-03-31`);
                        } else if (timeline.includes("Q2")) {
                            task.deferDate = new Date(`${year}-04-01`);
                            task.dueDate = new Date(`${year}-06-30`);
                        } else if (timeline.includes("Q3")) {
                            task.deferDate = new Date(`${year}-07-01`);
                            task.dueDate = new Date(`${year}-09-30`);
                        } else if (timeline.includes("Q4")) {
                            task.deferDate = new Date(`${year}-10-01`);
                            task.dueDate = new Date(`${year}-12-31`);
                        }

                        results.tasks_created++;
                    });

                    // Add Quarterly Milestones as tasks
                    const milestones = goal.milestones || {};

                    if (milestones.Q1) {
                        const q1Task = project.makeTaskWithProperties({
                            name: `✓ Q1 Milestone: ${milestones.Q1}`,
                            dueDate: new Date(`${year}-03-31`)
                        });
                        results.tasks_created++;
                    }

                    if (milestones.Q2) {
                        const q2Task = project.makeTaskWithProperties({
                            name: `✓ Q2 Milestone: ${milestones.Q2}`,
                            dueDate: new Date(`${year}-06-30`)
                        });
                        results.tasks_created++;
                    }

                    if (milestones.Q3) {
                        const q3Task = project.makeTaskWithProperties({
                            name: `✓ Q3 Milestone: ${milestones.Q3}`,
                            dueDate: new Date(`${year}-09-30`)
                        });
                        results.tasks_created++;
                    }

                    if (milestones.Q4) {
                        const q4Task = project.makeTaskWithProperties({
                            name: `✓ Q4 Milestone: ${milestones.Q4}`,
                            dueDate: new Date(`${year}-12-31`)
                        });
                        results.tasks_created++;
                    }

                } catch (e) {
                    results.errors.push({
                        goal: goalName,
                        domain: domainName,
                        error: e.message
                    });
                }
            });
        });

        // Set success to false if any errors occurred
        if (results.errors.length > 0) {
            results.success = false;
        }

    } catch (e) {
        return JSON.stringify({
            success: false,
            error: `Failed to create OmniFocus projects: ${e.message}`
        });
    }

    return JSON.stringify(results, null, 2);
}
