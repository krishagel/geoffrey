---
name: sop-creator
description: Generate Peninsula School District Standard Operating Procedures using the official PSD SOP template and conventions. Conducts a structured interview to gather all required information before drafting. Use when creating new SOPs, updating existing procedures, or drafting operational documentation for any district department. Triggers on requests to create SOPs, standard operating procedures, operational procedures, process documentation, or procedural guides for PSD.
---

# PSD Standard Operating Procedure Creator

Interview-driven SOP generator that matches the format, conventions, and quality of existing Peninsula School District operational documents.

## Workflow

### Phase 1: Interview — Identify the Procedure

Start with the core question: **"What procedure or process do you need documented?"**

Based on the answer, ask follow-ups to determine the SOP category:

**Round 1 — Basics:**
1. What specific process or procedure needs documenting?
2. Which department owns this? (Athletics & Activities, Teaching & Learning, Employee Support Services, Safety & Security, Finance & Operations, Technology, Communications, Governance & Leadership)
3. Who is the primary audience? (all employees, specific roles, building-level staff, etc.)

**Round 2 — Process Details:**
4. Walk me through the procedure step by step — what happens first, then what?
5. Are there decision points where different paths are taken? (e.g., severity levels, different scenarios)
6. Who is responsible at each step? (specific roles, not people)
7. What triggers this procedure? (event, request, schedule, incident)
8. What's the expected outcome when the procedure is completed?

**Round 3 — Compliance & Safety:**
9. Are there board policies, RCWs, WACs, or CBA sections that apply?
10. Are there safety considerations or risks involved?
11. Who monitors compliance? How often? What does auditing look like?
12. Are there related SOPs this should cross-reference?

**Round 4 — Complexity Assessment:**
13. Does this need a classification system? (e.g., Minor/Moderate/Severe)
14. Are there forms, checklists, or templates needed?
15. Does this involve multiple PSD systems? Which ones? (Freshservice, PowerSchool, Skyward, RedRover, ParentSquare, Nav360, etc.)
16. Are there roles that need defining in a glossary?

Do NOT ask all 16 questions at once. Ask Rounds 1-2 first. Based on the complexity of answers, decide whether Rounds 3-4 are needed or if enough info has been gathered.

### Phase 2: Determine Complexity & Draft

Read `references/template-guide.md` for the complete template, conventions, department-specific patterns, and examples.

Based on the interview, select the appropriate complexity level:

**Simple** (5-10 steps, single path):
- Template sections only: Title, Scope, Procedure, Safety, QC, References, Revision History
- Examples: Suspicious Vehicle reporting, Badge Photo standards, Building Safety Committee setup

**Moderate** (multi-step with branching or system walkthroughs):
- Add: Purpose, sub-steps, cross-references to other SOPs, compliance section
- Examples: Substitute Release Request, Fingerprinting, Clock Hours, Amazon Business ordering

**Complex** (multi-section with classifications, tables, forms):
- Add: Definitions, Roman numeral sections, severity/classification tables, flowcharts, glossary, addendums, forms
- Examples: Clubs & Athletics, Staff/Student Investigations, Inclement Weather, Emergency Supplies

### Phase 3: Present Draft & Iterate

Present the draft SOP and ask:
- "Are there steps I've missed or gotten wrong?"
- "Are the role assignments correct?"
- "Should any sections have more detail?"
- Mark sections needing stakeholder input with `[NEEDS INPUT: description]` placeholders

### Phase 4: Finalize & Output

End every SOP with `LH_swoop` footer element.

**CRITICAL: SOPs are ONLY created as Google Docs in the shared drive. NEVER write SOPs to the Obsidian vault, local filesystem, or any other location — not even as an intermediate draft.** Draft directly in memory during the interview/iteration phases, then create the Google Doc as the single output.

Save to the **Drafts folder** (`1PLeCQ6DaxWehEbzjzbXU2wLsaLTgv6Ku`) in the SOP shared drive using the Google Workspace skill's `drive/create_file.js` with `--folder 1PLeCQ6DaxWehEbzjzbXU2wLsaLTgv6Ku`. The shared drive requires `supportsAllDrives: true` in API calls. SOPs go through a review process before being moved to their department folder.

Alternative output: Create as .docx using `/docx` skill and upload to the Drafts folder.

## Department Subfolder IDs

| Department | Folder ID |
|-----------|-----------|
| Athletics & Activities | `1E-fmzIAfAXLMVL6brEHkCy1yeZXw-_PC` |
| Appendices & Templates | `180TB_nkv87qU2lwRkCXiWCmzsYgzOyjM` |
| Teaching and Learning | `1lAfAp7FMQJRFL9g-_IaP_fafEnt4d4pG` |
| Employee Support Services | `1ENy54q8vJJ3oekBUXYKiigtLf_aKWBPK` |
| Communications & Public Relations | `1FETCQTIijsSPRj3Kil62qrr0TvGuGDvN` |
| Safety and Security | `1W2bhVKqdWzSVp0B3LD_EQai_M-ur5E92` |
| Finance and Operations | `1XonFKeTqSH_1qBDbLHMWRILr-hb2Pm1Q` |
| Technology | `1j3235TyAzJ2pbNPaSn7dweIvizKmzN5Q` |
| Governance and Leadership | `172c_1A2bXUE14bDNoOIJAeErOocx9auI` |
| Drafts | `1PLeCQ6DaxWehEbzjzbXU2wLsaLTgv6Ku` |
