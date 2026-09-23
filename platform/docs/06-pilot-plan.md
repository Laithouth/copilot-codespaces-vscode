# 6. Pilot and institutional sales plan

All numbers here are **planning assumptions**, to be agreed with the pilot institution, not validated requirements.

## Proposed pilot

| Item | Proposal |
|---|---|
| Scope | One department, one to three courses |
| Learners | Roughly 50–150 adult students |
| Staff | A small group of instructors (2–5) and one institutional contact |
| Duration | Six to eight weeks of teaching, plus a delayed transfer check four to six weeks later |
| Content | Modules 1, 2, 4 and 5 (built), plus any modules completed and reviewed before the pilot starts |
| Mode | Practice mode for learning, assessment mode for pre, post and delayed tasks |

## Agree before starting

- Learning objectives and which rubric criteria are assessed.
- Allowed tools: whether the live AI step is on, the approved provider and model, the monthly run limit, and the data rule shown to students.
- Staff time: onboarding (about one hour), weekly review time, and a moderation session.
- Baseline measures and the pre-course task.
- Support arrangements: named contact, response times and an escalation route.
- **Success criteria**, written down before the pilot. For example: educators judge the materials usable without major rework; median review time per submission is acceptable to staff; there are no unresolved accessibility blockers; source-checking accuracy on the post-task is higher than on the pre-task on equivalent materials; and cost per active learner is within the agreed allowance. The actual thresholds are set with the institution.
- Data protection review, the data processing agreement, and the IT and security questionnaire.

## What we measure

| Measure | How |
|---|---|
| Completion | Submitted assignments / enrolled learners (context only, not skill) |
| Independent task performance | Pre, post and delayed tasks in assessment mode, scored with the moderated rubric |
| Source-checking accuracy | Claim verdicts against the key on equivalent pre and post materials |
| Transfer to new tasks | Delayed task in a new context, four to six weeks later |
| Understanding without AI | A short no-AI item (explain a decision, find an error) |
| Educator workload | Time logs for review and moderation; a short survey |
| Accessibility issues | Issue log, a student survey item, and any adjustments requested |
| Reliability | Uptime, errors, provider failures (from `model_runs`) |
| Cost per active learner | Model-run costs + hosting + support time, divided by learners with at least one submission |

## Comparison

Where practical, compare with an existing course section or a comparison group doing equivalent pre and post tasks without the course. Record differences in student experience, assessment conditions, attrition and tool versions (model identifiers are recorded for every run). **If a comparison isn't feasible, results are described as preliminary observations**, with sample sizes and limitations, and never as proof that the platform improves learning.

## Rubric calibration

Before any results are reported: two or more educators independently score a sample of anonymised submissions, discuss disagreements, revise the descriptors, and record agreement. Automated provisional levels are compared with educator levels to find rules that misfire.

## Evaluation outputs

A written pilot report for the institution: what was measured, sample sizes, attrition, results with limitations, educator workload, accessibility findings, costs, and decisions. Publication on our site only with the institution's agreement, and labelled as a single pilot.

## Procurement pack (on request)

1. Curriculum (this repository's `docs/02-curriculum.md`) and the complete sample lesson.
2. A live demonstration (public sample lesson, plus the demo institution run locally or on a staging server).
3. Implementation plan: setup, roster import, onboarding, timeline.
4. Feature status (`/status`), including what is planned.
5. Data handling: what is stored, where, who can see it, retention, deletion, sub-processors (AI provider and host), and the provider's actual terms.
6. Accessibility information: target (WCAG 2.2 AA), what has been tested, and known gaps.
7. Support scope and hours.
8. The evaluation plan (this document).

## Who we approach first

Academic teaching leads (for example, heads of teaching and learning, or programme directors in business schools) and learning-support teams. We then work with them through the IT, procurement and data-protection reviews their institution requires. We identify those reviews early for each institution rather than assuming them.

We do not assume a budget or sales timeline. Willingness to pay is tested in buyer conversations and in the decision to fund a paid pilot.

## Before approaching a pilot institution

Complete the launch blockers in [10-feature-status-and-launch.md](10-feature-status-and-launch.md), particularly hosting, backups, the data processing agreement, the provider contract terms, and screen-reader testing.
