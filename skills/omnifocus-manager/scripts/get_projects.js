#!/usr/bin/env osascript -l JavaScript

// Get all OmniFocus projects with full folder hierarchy
// Returns JSON with project names, folders, and structure

function run() {
    const app = Application('OmniFocus');
    app.includeStandardAdditions = true;

    const doc = app.defaultDocument;
    const folders = doc.folders();
    const projects = doc.flattenedProjects();

    // Build folder structure
    const folderStructure = [];

    function processFolder(folder, depth = 0) {
        const folderInfo = {
            id: folder.id(),
            name: folder.name(),
            depth: depth,
            projects: [],
            subfolders: []
        };

        // Get projects in this folder
        try {
            const folderProjects = folder.projects();
            for (let i = 0; i < folderProjects.length; i++) {
                const proj = folderProjects[i];
                folderInfo.projects.push({
                    id: proj.id(),
                    name: proj.name(),
                    status: proj.status(),
                    taskCount: proj.numberOfAvailableTasks()
                });
            }
        } catch (e) {
            // No projects in folder
        }

        // Get subfolders
        try {
            const subfolders = folder.folders();
            for (let i = 0; i < subfolders.length; i++) {
                folderInfo.subfolders.push(processFolder(subfolders[i], depth + 1));
            }
        } catch (e) {
            // No subfolders
        }

        return folderInfo;
    }

    // Process top-level folders
    for (let i = 0; i < folders.length; i++) {
        folderStructure.push(processFolder(folders[i], 0));
    }

    // Get standalone projects (not in folders)
    const standaloneProjects = [];
    for (let i = 0; i < projects.length; i++) {
        const proj = projects[i];
        try {
            const container = proj.container();
            // If container is the document itself, it's standalone
            if (container.class() === 'document') {
                standaloneProjects.push({
                    id: proj.id(),
                    name: proj.name(),
                    status: proj.status(),
                    taskCount: proj.numberOfAvailableTasks()
                });
            }
        } catch (e) {
            // Skip if can't determine container
        }
    }

    // Build flat list for easy lookup
    const flatList = [];

    function flattenStructure(folders, path = '') {
        for (const folder of folders) {
            const currentPath = path ? `${path} > ${folder.name}` : folder.name;

            for (const proj of folder.projects) {
                flatList.push({
                    id: proj.id,
                    name: proj.name,
                    path: `${currentPath} > ${proj.name}`,
                    folder: folder.name,
                    status: proj.status,
                    taskCount: proj.taskCount
                });
            }

            if (folder.subfolders.length > 0) {
                flattenStructure(folder.subfolders, currentPath);
            }
        }
    }

    flattenStructure(folderStructure);

    // Add standalone projects
    for (const proj of standaloneProjects) {
        flatList.push({
            id: proj.id,
            name: proj.name,
            path: proj.name,
            folder: null,
            status: proj.status,
            taskCount: proj.taskCount
        });
    }

    const result = {
        total_projects: flatList.length,
        folder_structure: folderStructure,
        standalone_projects: standaloneProjects,
        flat_list: flatList
    };

    return JSON.stringify(result, null, 2);
}
