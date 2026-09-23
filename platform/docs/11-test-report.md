# 11. Test report

Date: 23 September 2026. Environment: Node.js 22.22, SQLite 3.51 (`node:sqlite`), Chromium via Playwright 1.56, axe-core 4.x.

## How to run

```bash
npm test            # 53 automated tests (node:test)
npm run test:a11y   # browser accessibility checks (needs Chromium; set CHROMIUM_PATH if not on PATH)
```

## Results

| Suite | Tests | Result |
|---|---|---|
| `test/feedback.test.js`: feedback rules and provisional levels | 13 | Pass |
| `test/journey.test.js`: critical journey, assessment mode, deadlines | 3 | Pass |
| `test/access.test.js`: access boundaries and security basics | 10 | Pass |
| `test/ai-and-data.test.js`: model failures, budgets, retention, deletion, contact, stateless sample | 13 | Pass |
| `test/numbers.test.js`: Module 5 feedback rules and workspace flow | 14 | Pass |
| **Total** | **53** | **53 pass, 0 fail** |
| `scripts/a11y-check.js`: axe WCAG 2.0/2.1/2.2 A+AA and 320 px reflow | 112 page states | 112 pass |
| `scripts/a11y-check.js`: keyboard-only sample lesson | 1 walkthrough | Pass |

## What was tested

**Critical journey** (`journey.test.js`), over real HTTP with sessions and CSRF tokens:
institution created → administrator accepts invite → creates course and invites educator → educator accepts → imports a roster (a malformed line is reported, not imported) → assigns Module 4 (limited AI, practice) → student accepts invite, sees the AI rule, the educator's note and the "what is saved" notice → **saves a draft and reloads it** → uses a hint → submitting without a disclosure is refused → submits version 1 (feedback names the invented reference first; example answer appears) → starts and submits version 2 (resolved issues shown; both versions kept) → educator sees provisional level and evidence checks, approves automated feedback, adds feedback → **an override without a reason is rejected**; confirmation with reasons succeeds → student sees confirmed level and feedback → challenge raised and resolved → **course CSV** has the confirmed levels and claim accuracy → cohort gaps show no names → **institution CSV** is aggregated with `<5` suppression and no names → **portfolio** labels own work, AI output and feedback separately and states the credential limits.

Also: assessment mode (no hints, even with a forged hint request; feedback hidden until the educator edits it, and the student sees the edited text), and past-deadline submission blocked.

**Access boundaries** (`access.test.js`): signed-out redirects for every workspace route; educators cannot see another institution's courses, assignments, students or reports, nor courses in their own institution they don't teach, nor a student outside the course; students cannot open review, admin, platform or other institutions' pages, and cannot see a classmate's work; institution administrators are limited to their institution and cannot see individual work; a forged CSRF token is rejected with no write; login rate limiting and lockout; HTML escaping of user input; security headers.

**Model failures and budgets** (`ai-and-data.test.js`): no credentials → an honest "not configured" message, no run button, a run recorded as `unavailable`; a successful run records requested and served model, purpose and prompt (with sources attached) and saves the draft first; both prompt versions stored as separate runs; provider exception (HTTP 529) → error recorded and work kept; model refusal → recorded and shown; prohibited assignments never call the provider, even with forged run or paste requests; the monthly limit alerts at the threshold, stops at the cap without calling the provider, and shows students and administrators clear states; recording output from another tool keeps the stated name.

**Data**: retention deletes only records older than each institution's own period; learner deletion is scoped to one institution and removes the account only when no memberships remain; the admin deletion page requires the email confirmation and writes an audit entry; the contact form validates with accessible errors, stores and confirms; **if storage fails, a 503 is shown with no confirmation**; the public sample lesson gives hints, feedback, the example and revision tracking **without changing any database row**.

**Feedback rules** (`feedback.test.js`): fully correct and example answers produce no issues; priority order (invented reference first); at most two issues shown; keeping the invented figure caps at level 0 and accepting it caps at level 1; hints and revisions cap at level 2; revision credit depends on resolving the issues shown; saying a figure was removed is not flagged; a correction of the 16% figure is not flagged, while "caused" is; suitability and brief examples pass; **a long generic prompt is not rewarded**.

**Module 5** (`numbers.test.js`): the answer key gives three different top regions for the three definitions; the example response passes with top levels; each accepted definition passes when its figures match; number parsing (£, commas, %); blank-as-zero is flagged first (explicitly, or implied by an East gross total of £32,500) and caps verification at 0; leaving the quarter out, wrong figures, an inconsistent top region, a failed recalculation, missed returns, an undisclosed estimate, missing limitations and over-length recommendations are flagged; the independent formula item; hint capping. Over HTTP: the dataset renders with the blank as an empty cell; the AI request carries the dataset with the blank still blank; blank-as-zero feedback, revision with resolved issues, the answer key after submission; course CSV columns for definition, figures correct and handling; the CSV download.

**Accessibility** (`a11y-check.js`): axe-core with WCAG 2.0, 2.1 and 2.2 A and AA tags on 15 public pages, the sample lesson after submission, and the student, educator and administrator workspace pages, in light and dark colour schemes at 1280 px and 320 px width (112 page states). There is no horizontal scrolling at 320 px. Keyboard-only: the skip link is the first tab stop, a claim verdict can be chosen with arrow keys, submit is reachable, focus moves to the feedback after submitting, and focus is visible throughout. Problems found and fixed during testing: in Module 5, the hint's example figures were real answers and the table caption announced the blank cell (both removed); scrollable tables were not keyboard-focusable; several pages overflowed at 320 px; long status labels didn't wrap; and the page gutter was zero on phones.

**Checked by hand** (not automated): the backup was restored and the app ran from it (row counts matched, integrity check ok); the Anthropic adapter's request shape and response handling against a local stub server; screenshots of the home page, sample lesson, student workspace and educator review at desktop and phone widths.

## Not verified

- **No request to the real Anthropic API** has been made (no credentials). Model output quality, latency, refusal rates and real token costs are unknown.
- **Screen readers** (NVDA, JAWS, VoiceOver), voice control, and **testing with disabled students**. Automated checks find only some accessibility problems.
- **Speech input** with real speech in real browsers.
- **Load and concurrency**: single-process SQLite; no load test. The budget cap can be exceeded by one run under simultaneous requests.
- **Security**: no penetration test or dependency audit beyond `npm audit` at install (0 vulnerabilities reported).
- **Learning effectiveness**: nothing here shows that students learn. That requires the pilot evaluation.
- **Educator usability and review time**: not measured.
- **Rubric validity and reliability**: not calibrated.
- **Content accuracy review** by subject experts; UNESCO competency names against the official PDF; full-text checks of research sources; the EU AI Act text on EUR-Lex.
- **Cross-browser**: only Chromium was tested.
