# 1. Product definition

*Practicum is a working name.* Status: pilot prototype, September 2026.

## What it is

A licensed AI skills course that lecturers embed in an existing subject. Students practise realistic tasks, check AI output against sources, revise their approach and explain their own contribution. Educators set the AI rules for each assignment, see the decisions behind the work and confirm evidence of skill. Institutions manage providers, usage limits, retention and reporting.

The central promise: students learn to **define a task, choose an appropriate tool, give useful instructions, evaluate the result, improve their approach and explain their own contribution.**

The product separates *completing a task with AI* from *learning a transferable skill*. That separation runs through the assessment design (three separate outcomes), the reporting (only educator-confirmed evidence counts) and the evaluation plan.

## Intended users

| User | Who | What they need |
|---|---|---|
| Student | University students aged 18+, including beginners with no technical background | Realistic practice, specific feedback, clear rules, a portfolio they own |
| Educator | Lecturers embedding a short AI skills course in an existing subject | Ready lessons, per-assignment AI rules, visibility of decisions, fast review, reports |
| Institution administrator | Teaching and learning or learning-technology staff | Approved providers, usage caps, retention, deletion, aggregate reports |
| Buyer | Academic teaching leads and learning-support teams first; IT, procurement and data protection review | Curriculum, demonstration, evidence plan, data handling, feature status |

**Not yet for:** school students (under 18). That needs age-appropriate content, permissions, controls and review first.

## Primary learning outcomes

Observable competencies, grouped into six rubric criteria (see [04-rubric-and-assessment.md](04-rubric-and-assessment.md)):

1. Recognise when AI is appropriate and when another method is better. *(Tool and approach selection)*
2. Define objectives, inputs, constraints and success criteria. *(Task definition)*
3. Select tools and divide a task into manageable steps. *(Tool and approach selection)*
4. Construct and revise instructions suited to the task. *(Instruction quality, Revision)*
5. Check accuracy, sources, calculations, assumptions and omissions. *(Verification)*
6. Integrate useful output while keeping responsibility for the final work. *(Responsible use and integration)*
7. Explain AI use and follow the assignment's academic integrity rules. *(Responsible use and integration)*

## Website structure

All copy is live in the app (`src/routes/public.js`). Every page ends with a relevant next action.

| Page | Path | Purpose | Main next action |
|---|---|---|---|
| Home | `/` | Promise, method, a two-minute sample activity, who it is for, problem statement, honest "no results yet" | Try a sample lesson |
| How it works | `/how-it-works` | The six-stage cycle, what is saved, what educators review, practice and assessment modes | Try a sample lesson |
| Curriculum | `/curriculum`, `/curriculum/module-N` | Eight modules with outcomes, time, prerequisites, tasks, assessment, build status; UNESCO alignment with gaps | View the complete sample lesson |
| Complete sample lesson | `/curriculum/sample-lesson` | The full Module 4 lesson plan, including answer key, rubric and instructor notes | Try the lesson as a student |
| Rubric | `/curriculum/rubric` | Six criteria × four levels, with calibration status | — |
| For institutions | `/institutions` | Delivery, controls, reporting, policies, onboarding, purchasing, pilot, each with a status label | Request an institutional pilot |
| Research and evidence | `/research` | Checked third-party summaries with limitations, corrections to the source synthesis, our evaluation plan, policy context kept separate | Request an institutional pilot |
| Plans and pilot | `/plans` | Pilot, department and institution licences; what determines price | Request a quote |
| Trust and accessibility | `/trust` | Actual data handling, provider use, retention, security, accessibility test scope, student rights | Contact |
| Resources and FAQ | `/resources` | Evaluation checklist, assignment AI-use wording, disclosure template, example tasks, FAQs | Try a sample lesson |
| Feature status | `/status` | Built and tested / built / pilot setup needed / planned | — |
| Contact | `/contact` | Working pilot and demo request form; no false confirmation | — |
| Sample lesson | `/try` | Module 4 end to end, no account, nothing stored | Request an institutional pilot |

## Assumptions

These are planning assumptions to be tested, not facts.

- Lecturers will give 8–12 hours of course time (or set it as independent study) for a foundation course. *Validate in the pilot.*
- Business and general academic tasks are a good first context and can be adapted to other disciplines.
- A pilot can start with roster import and CSV export; single sign-on and LMS integration can follow buyer demand.
- Rule-based provisional feedback linked to answer keys is good enough for formative use, with educators reviewing it. *Validate with educator moderation in the pilot.*
- One AI provider, behind a replaceable adapter, is sufficient for a pilot.
- Institutions will pay for a structured curriculum, educator tooling and evidence of independent skill. *Test through buyer conversations and pilot decisions. No willingness-to-pay figures are assumed.*

## Scope changes from the brief, and why

- **Repository.** The repository contained a GitHub Copilot tutorial template, not a website. The platform is built in `platform/` and the original template is left untouched.
- **Three modules built (1, 2, 4), not a full course.** The brief asked for three fully developed modules in the first release. Module 4 is also the public end-to-end demonstration.
- **Business analysis demonstration (Module 5) is fully specified, with its dataset, but not interactive.** This follows the brief's rule to fully build one demonstration before expanding the catalogue. The prompt-improvement demonstration is built as the Module 2 lesson.
- **No live AI grading.** Provisional feedback is deterministic and rule-based. It is cheaper, testable and cannot invent feedback. AI-generated formative feedback can be added later behind the same educator review.
- **No email.** Invitation links are shown to the educator or administrator to share. Automatic email is planned.
