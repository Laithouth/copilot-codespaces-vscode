# 9. Data model

SQLite (via `node:sqlite`), one database per deployment. The schema is in [`src/db.js`](../src/db.js). Foreign keys are enforced, and learner records cascade on delete.

```
institutions ─┬─< memberships >── users ──< sessions
              │                    │
              ├─< courses ─┬─< course_members >─┘
              │            └─< assignments ─┬─< attempts ─┬─< model_runs
              │                             │             ├─< evidence_checks
              │                             │             ├─< feedback
              │                             │             └─< assessments (per competency)
              │                             └─< challenges
              └─< model_runs (institution_id: for budget and retention)

competencies (rubric criteria)      lessons (slug, module, version)
pilot_requests                      audit_log
```

## Tables

| Table | Purpose | Key fields |
|---|---|---|
| `institutions` | Tenant, with its policies | `approved_provider`, `approved_model`, `monthly_model_run_cap`, `budget_alert_percent`, `retention_days`, `allow_dictation`, `permitted_data_note`, `is_demo` |
| `users` | Accounts | `email` (unique, case-insensitive), `password_hash` (scrypt), `invite_token_hash`, `invite_expires_at`, `is_platform_admin` |
| `memberships` | User ↔ institution, one role each | `role` ∈ student, educator, inst_admin |
| `sessions` | Server-side sessions | `token_hash` (SHA-256 of the cookie), `csrf`, `expires_at` |
| `courses` | Course within an institution | `institution_id`, `code`, `title` |
| `course_members` | Enrolment | `role` ∈ educator, student |
| `competencies` | The six rubric criteria (seeded from code) | `code`, `title`, `description` |
| `lessons` | Built lessons (seeded from code) | `slug`, `module_no`, `version` |
| `assignments` | A lesson set in a course | `ai_policy` ∈ prohibited, limited, permitted, required; `ai_policy_note`; `mode` ∈ practice, assessment; `solution_visibility` ∈ never, after_submit, after_due; `competencies` (JSON); `due_at` |
| `attempts` | One row per version of a student's work | `version_no`, `status` ∈ draft, submitted; `response` (JSON: the student's own work); `hints_used`; `dictation_used`; `disclosure` |
| `model_runs` | Every AI request or recorded output | `source` ∈ platform, student_pasted; `provider`; `requested_model`; `served_model`; `settings` (JSON: purpose, limits); `prompt`; `output`; `status` ∈ ok, error, unavailable, budget_exceeded, refused, not_permitted; token counts |
| `evidence_checks` | Per-claim verdicts for verification lessons | `claim_key`, `verdict`, `source_ref`, `note`, `correct` (against the key) |
| `feedback` | Automated or educator feedback on a version | `author_type` ∈ automated, educator; `body` (JSON); `status` ∈ provisional, approved, edited, withheld |
| `assessments` | Rubric level per assignment, student and criterion | `provisional_level`, `level`, `override_reason`, `assessor_id`, `status` ∈ provisional, final |
| `challenges` | Student challenges to assessments | `message`, `status`, `response` |
| `pilot_requests` | Contact form submissions | name, email, institution, role, interest, learners, message |
| `audit_log` | Consequential actions | actor, institution, action, detail (JSON) |

## Design decisions

- **Versions are immutable once submitted.** A revision is a new `attempts` row copied from the last version, so every attempt is preserved.
- **The student's writing, AI output and feedback live in different tables.** The portfolio and review screens can therefore always label who wrote what.
- **Provisional and final assessments share a row but differ in `status`.** Automated re-scoring never overwrites a `final` row. Reports count only `final` rows as demonstrated competency.
- **Model identifiers are recorded twice**: what was requested and what served the request (for example, after a provider fallback), so lessons can be re-run and compared when the provider changes.
- **Tenant isolation.** Every institution-owned row reaches `institution_id` through its course, and all access goes through the helpers in `src/access.js`. Cross-tenant requests return 404 or 403; tests cover each boundary.
- **Public demonstrations never touch the database.** The `/try` lesson is stateless; a test asserts that row counts don't change. Demo institutions are flagged `is_demo` and labelled in the interface.
- **Retention** deletes `attempts` (cascading to runs, checks, feedback and assessments), `challenges` and `model_runs` older than the institution's `retention_days`.
- **Learner deletion** is scoped to one institution and removes the account only when no memberships remain.

## Scaling notes

SQLite with WAL mode suits a single-server pilot. Before multi-server or large deployments: move to a managed Postgres (the SQL is mostly portable), move the login rate limiter to a shared store, and add connection pooling and migrations tooling.
