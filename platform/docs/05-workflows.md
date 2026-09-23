# 5. Workflows

These describe the **current build**. Steps marked *(planned)* are not built.

## Roles and access

| Role | Can | Cannot |
|---|---|---|
| Student | See own assignments, work, versions, feedback, confirmed and provisional levels; run approved AI; record external tool output; challenge assessments; export portfolio | See other students' work; see anything outside their courses |
| Educator | For courses they teach: create assignments, import rosters, review all student work, approve, edit or withhold feedback, confirm levels, answer challenges, see cohort gaps, export course report | See courses they don't teach, or other institutions |
| Institution administrator | Settings (provider, model, monthly limit, alert threshold, retention, data rule, speech input); create courses and invite educators; aggregate report; delete learner data | See individual student work (reports are aggregated with small numbers suppressed) |
| Platform administrator | Create institutions; see pilot requests | — (does not automatically see institution data) |

All checks run on the server. A user has one role per institution.

## Student

1. Open the invitation link and set a password.
2. The dashboard lists assignments with the AI rule and status, progress by criterion (confirmed levels separate from provisional ones), and portfolio export.
3. Open an assignment and read the **AI rule in plain language**, any educator note, and **"What is saved and who can see it"**.
4. Read the lesson (worked example, sources, the answer to check), then work through the steps. **Save draft** at any time; drafts survive reloads.
5. In practice mode, **Show a hint** reveals one hint at a time; hints are recorded.
6. If AI is permitted and available, **Run** the prompt. The output is saved with the model identifier. If the provider isn't configured or the monthly limit is reached, the page says so, and the student can record output from an approved tool with its name.
7. Write a **disclosure** (required, even if it is "I didn't use AI"). Submit.
8. Practice mode shows provisional feedback straight away: at most two issues, why they matter, and the next step. Assessment mode shows it after educator review.
9. **Start a new version** to revise. Earlier versions stay saved and visible. Revisions are blocked after the deadline.
10. See the example answer when the educator's setting allows it (never, after first submission, or after the deadline).
11. See confirmed levels and educator feedback, and **challenge** an assessment if needed.
12. **Export portfolio** (HTML) with own work, AI output and feedback labelled separately.

Speech input *(optional; off by default)*: where the institution enables it and the browser supports it, a **Dictate** button fills a text field for the student to review. Its use is recorded but never affects scores.

## Educator

1. Accept the invitation from the institution administrator. The course appears on the dashboard.
2. **Import students**: paste `name,email` lines. The result shows who was enrolled, lines that failed and one-time invitation links to share. *(Automatic email: planned.)*
3. **Assign a lesson**: choose the lesson, title, deadline, **AI rule** (prohibited, limited purposes, broadly permitted or required) with a note of permitted purposes, **mode** (practice or assessment), **example answer visibility** and the **criteria to assess**, plus optional extra instructions.
4. **Review**: per assignment, a table shows each student's versions, hints and provisional or confirmed levels, and flags open challenges. There is no ranking.
5. **Student detail**: every version (read-only), evidence checks against the key, model runs with prompts, outputs and model IDs, automated feedback (**approve, withhold or replace with your own wording**), educator feedback per version, and the **assessment form** (a reason is required when you differ from the provisional level).
6. **Respond to challenges** and resolve them.
7. **Cohort skill gaps**: level distributions per criterion and the most common issues across latest submissions, with a suggested teaching focus. No names.
8. **Export course report (CSV)**: one row per student per assignment with versions, hints, claims correct, independent item result, and confirmed and provisional levels by criterion.

## Institution administrator

1. Accept the invitation from the platform administrator.
2. **Settings**: approved provider (none or Anthropic), model identifier, monthly model-run limit (0 = off), alert threshold, retention days (minimum 30), the data rule shown to students, and speech input.
3. **Usage**: runs this month against the limit, with alert and limit-reached states shown in words.
4. **Create a course** and invite its educator (the invitation link is shown once).
5. **Institution report (CSV)**: per course and criterion, counts of confirmed levels and provisional-only rows; counts from 1 to 4 appear as `<5`.
6. **Delete learner data**: type the learner's email to confirm. This deletes their work, feedback, assessments and challenges in this institution only, and removes the account if no other institution uses it. The deletion is audit-logged.
7. **Retention**: run `npm run retention` on a schedule. It deletes records older than each institution's period. *(Scheduling it is part of deployment and is a launch blocker.)*

## Platform administrator

- `npm run create-institution -- "Name" "Admin Name" admin@uni.edu [--platform-admin]`, or the platform page, to create an institution and its first administrator.
- The platform page lists pilot and demonstration requests from `/contact`.

## Critical journey (tested end to end)

Institution created → administrator creates a course and invites an educator → educator imports roster → educator assigns Module 4 → student saves a draft, uses a hint, submits (feedback names the invented reference) → student revises (feedback shows issues resolved; both versions kept) → educator reviews evidence, approves feedback, adds feedback, confirms levels (an override without a reason is rejected) → student sees levels and challenges → educator resolves the challenge → course CSV and institution CSV exported → student exports portfolio. See `test/journey.test.js`.
