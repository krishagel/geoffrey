#!/usr/bin/osascript

-- Create OmniFocus projects inside a folder using AppleScript
-- This is the CORRECT way - JXA external scripts cannot reliably create projects in folders
--
-- Usage: osascript create_projects_in_folder.applescript '{
--   "folderName": "2026 Goals",
--   "projects": [
--     {
--       "name": "Project 1",
--       "note": "Description",
--       "tasks": ["Task 1", "Task 2"]
--     }
--   ]
-- }'

on run argv
	set jsonInput to item 1 of argv

	-- Parse JSON (simplified - in production use JSON Helper or similar)
	-- For now, this script shows the PATTERN

	tell application "OmniFocus"
		tell default document
			-- CRITICAL: Create folder FIRST, then create projects inside it
			-- Use "make new folder" not "new app.Folder()"
			set targetFolder to make new folder with properties {name:"Example Folder"}

			-- CRITICAL: Use "tell targetFolder" then "make new project"
			-- This ensures projects are created INSIDE the folder
			tell targetFolder
				set proj1 to make new project with properties {name:"Example Project", note:"Example note"}

				-- Add tasks to the project
				tell proj1
					make new task with properties {name:"Example Task 1"}
					make new task with properties {name:"Example Task 2"}
				end tell
			end tell

			return "Success: Created folder with projects"
		end tell
	end tell
end run

-- LESSONS LEARNED:
--
-- 1. EXTERNAL JXA (osascript -l JavaScript) DOES NOT WORK RELIABLY
--    - Using parentFolder property creates projects at root level
--    - Using app.Project constructor and push() fails
--    - Projects appear created but are not in the folder
--
-- 2. USE APPLESCRIPT FOR FOLDER/PROJECT CREATION
--    - AppleScript "tell folder" + "make new project" works correctly
--    - Projects are actually created inside the folder
--    - More verbose but reliable
--
-- 3. DELETION IS TRICKY
--    - Projects: Use "mark dropped" command (not "delete" or status property)
--    - Folders: Cannot be deleted via AppleScript - must be done manually in UI
--    - Empty folders persist even after all projects dropped
--
-- 4. VERIFICATION IS ESSENTIAL
--    - Always verify projects are in folder: "projects of folder X"
--    - Check for duplicate folders before creating
--    - Clean up test artifacts immediately
--
-- 5. FOR COMPLEX CREATION:
--    - Build AppleScript string dynamically
--    - Use heredoc for multi-line scripts
--    - Validate input before running osascript
--
-- CORRECT PATTERN:
--   osascript << 'EOF'
--   tell application "OmniFocus"
--     tell default document
--       set myFolder to make new folder with properties {name:"Folder Name"}
--       tell myFolder
--         set proj to make new project with properties {name:"Project Name"}
--         tell proj
--           make new task with properties {name:"Task Name"}
--         end tell
--       end tell
--     end tell
--   end tell
--   EOF
