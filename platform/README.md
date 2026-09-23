# Practicum: AI skills learning platform (pilot prototype)

*Practicum is a working name.*

A platform that universities license to teach students how to do appropriate tasks with AI: **define the task, choose an appropriate tool, give useful instructions, evaluate the result, improve the approach, and explain their own contribution.** It includes the public website, a public sample lesson, and student, educator and administrator workspaces.

> **Status: pilot prototype.** Four of eight modules are built (1, 2, 4 and 5). It is not ready for large institutional deployment, and it is not ready for a pilot with real students until the [launch blockers](docs/10-feature-status-and-launch.md#launch-blockers-before-the-first-pilot-with-real-students) are closed. The platform has no learning results yet.

## Quick start

Requires Node.js 22.13 or later (uses the built-in `node:sqlite`). The only runtime dependency is the Anthropic SDK.

```bash
cd platform
npm install
DEMO_PASSWORD=choose-a-password npm run seed:demo   # fictional demo institution and accounts
npm start                                           # http://localhost:3000
```

- Public site: `/`, sample lesson: `/try` (no account needed; nothing is saved).
- Demo sign-ins (all use your `DEMO_PASSWORD`): `educator@demo.invalid`, `student1@demo.invalid`, `admin@demo.invalid`, `platform@demo.invalid`.

Create a real institution and its first administrator:

```bash
npm run create-institution -- "University Name" "Admin Name" admin@university.edu
```

This prints a one-time invitation link. Add `--platform-admin` to also make that person a platform administrator.

## Configuration

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | HTTP port | `3000` |
| `DB_FILE` | SQLite database path | `data/practicum.db` |
| `PUBLIC_URL` | Base URL used in invitation links | Derived from the request host |
| `COOKIE_SECURE` | Set to `1` behind HTTPS | Off |
| `ANTHROPIC_API_KEY` | Enables the live AI step (server-side only) | Unset: the live AI step reports that it is unavailable |
| `AI_MODEL` | Default model when an institution hasn't set one | `claude-opus-5` |
| `CONTACT_EMAIL` | Alternative contact shown if a pilot request can't be saved | Unset |
| `BACKUP_DIR` | Where `npm run backup` writes | `data/backups` |

Institutions also need an approved provider and a monthly run limit above 0 (in **Administration → Settings**) before students can run prompts.

## Commands

| Command | What it does |
|---|---|
| `npm start` / `npm run dev` | Run the server (`dev` restarts on file changes) |
| `npm test` | 53 automated tests: critical journey, access boundaries, model failures, budgets, retention, deletion, export, feedback rules |
| `npm run test:a11y` | axe-core WCAG A/AA checks, 320 px reflow check and keyboard walkthrough in Chromium |
| `npm run seed:demo` | Create the fictional demo institution |
| `npm run create-institution` | Create an institution and invite its administrator |
| `npm run backup` | Consistent SQLite snapshot (`VACUUM INTO`) |
| `npm run retention` | Delete records older than each institution's retention period (schedule it daily) |
| `npm run docs:evidence` | Regenerate the evidence register document from `src/content/evidence.js` |

## Project layout

```
src/
  server.js            HTTP server and error handling
  http.js              router, body parsing, CSRF check, security headers, CSV
  db.js                schema (see docs/09-data-model.md)
  auth.js              scrypt passwords, sessions, invitations, login rate limit
  access.js            server-side authorisation helpers
  ai.js                replaceable model adapter, budget caps, model-run records
  feedback.js          rule-based provisional feedback and levels
  work.js              drafts, submissions, revisions, visibility rules
  retention.js         retention job
  content/             curriculum, lessons, rubric, UNESCO alignment, evidence register, feature status
  routes/              public site, sample lesson, accounts, student, educator, admin
  views/               layout and lesson rendering
public/                CSS and a small progressive-enhancement script (the site works without JavaScript)
scripts/               seed, create-institution, backup, retention, a11y check, docs export
test/                  node:test suites
docs/                  product and delivery documents (below)
```

## Documents

1. [Product definition, users, outcomes, site structure, assumptions](docs/01-product-definition.md)
2. [Curriculum: eight modules and the UNESCO alignment with gaps](docs/02-curriculum.md)
3. [Three demonstration activities (with the synthetic dataset)](docs/03-demonstration-activities.md)
4. [Rubric and assessment design](docs/04-rubric-and-assessment.md)
5. [Student, educator and administrator workflows](docs/05-workflows.md)
6. [Pilot and institutional sales plan](docs/06-pilot-plan.md)
7. [Pricing, cost model and usage caps](docs/07-commercial-model.md)
8. [Evidence register, with corrections to the source synthesis](docs/08-evidence-register.md)
9. [Data model](docs/09-data-model.md)
10. [Working features, launch blockers, later improvements](docs/10-feature-status-and-launch.md)
11. [Test report: what was tested and what remains unverified](docs/11-test-report.md)

The public page copy is in `src/routes/public.js` and is what the site renders.
