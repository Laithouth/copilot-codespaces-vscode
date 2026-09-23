# 2. Curriculum: foundation course

**Using AI well for academic and professional tasks.** Eight modules, estimated 8–12 hours of learning and practice. *The estimate is to be validated in the pilot.*

| # | Module | Time (est.) | Status | Deliverable | Rubric criteria |
|---|---|---|---|---|---|
| 1 | Understanding AI and choosing suitable tasks | 60–75 min | **Built** | Task suitability decision with explanation | Tool selection, Responsible use |
| 2 | Defining a useful request | 75–90 min | **Built** | Task brief, initial prompt, evaluation, one revision, judgement | Task definition, Instruction quality, Revision |
| 3 | Examples and structured outputs | 60–90 min | Specified | Checked structured result from a supplied source | Instruction quality, Verification |
| 4 | Checking claims and sources | 60–90 min | **Built** (also the public sample) | Annotated answer, corrected answer, uncertainty statement | Verification, Revision, Responsible use |
| 5 | Working with numbers and code | 60–90 min | **Built** | Definition, handling of the missing value, figures, an independent check, and a recommendation with limitations | Task definition, Verification, Responsible use |
| 6 | Research and communication | 60–90 min | Specified | Short evidence-based brief | Instruction quality, Verification |
| 7 | Responsible workflows | 60–75 min | Specified | Revised workflow with disclosure | Responsible use, Tool selection |
| 8 | Independent application | 90–120 min | Specified | Final work, prompts, checks, revisions, explanation | All six |

Total: 8.5 hours (lower estimates) to 12 hours (upper estimates).

**Every module follows the same practice sequence:** a worked example, a partially supported exercise (hints available in practice mode and recorded), an independent exercise without hints, and a later task in a different context (Module 8 and the delayed transfer check).

**Principles, not product tricks.** Lessons teach decisions that transfer between tools: when to use AI, how to brief it, how to check it, how to revise and how to disclose. Tool-specific guidance is dated (content reviewed September 2026) and reviewed when capabilities change. Model comparison is taught with task and materials held constant, the model and settings recorded, and repeated trials where feasible. One good output is not proof that a prompt is reliably better.

**Source of truth.** For built modules, the complete lesson content (lesson text, worked example, materials, hints, example responses, common mistakes, accessibility alternative, instructor notes) is in [`src/content/lessons.js`](../src/content/lessons.js) and is rendered on the site. Module metadata is in [`src/content/curriculum.js`](../src/content/curriculum.js). This document summarises the built modules and fully specifies the others.

---

## Module 1. Understanding AI and choosing suitable tasks (built)

- **Lesson:** What chat tools do well (drafting, rephrasing, brainstorming, explaining, transforming supplied text) and where they are unreliable (facts, current information, citations, exact calculations, knowledge of your rules). Four questions: **Rules, Information, Checking, Value.**
- **Worked example:** translating a thank-you note, with each question answered.
- **Student task:** six scenario decisions (five guided, one independent), then a decision for a task from the student's own course.
- **Supplied materials:** the scenarios (text).
- **Example response, common mistakes, accessibility alternative, instructor notes:** in `lessons.js` and on the educator's lesson view.
- **Assessment:** decision accuracy against a key (S2 and S3 are critical), reasons that name the deciding factor, and an own-course decision citing at least two of the four questions. Provisional level for *Tool and approach selection*.

## Module 2. Defining a useful request (built; the "prompt improvement" demonstration)

- **Lesson:** a brief makes the model's guesses explicit and gives you criteria to judge the output. No single correct prompt.
- **Worked example:** "help me study for my stats exam" → brief → revised request.
- **Student task:** a vague tutor exercise ("write something about social media for small businesses") becomes a 300-word client briefing for a fictional bakery. The student writes the brief, writes prompt v1, runs it (or records output from an approved tool), evaluates it against their own success criteria, changes one thing, runs v2 and judges whether it helped. Both versions are kept as separate model runs.
- **Supplied materials:** P1 business profile, P2 owner's notes, P3 tutor's marking guidance (all fictional).
- **Assessment:** brief completeness and checkable success criteria (*Task definition*); constraints and inputs carried into the prompt, not length (*Instruction quality*); a targeted change with an evidence-based judgement (*Revision*).

## Module 3. Examples and structured outputs (specified)

- **Outcomes:** use examples to show the expected form; separate instructions from supplied documents; specify tables and formats; check extracted values against the source.
- **Lesson:** why examples shape format more than wording does; delimiting documents (for example, tags or headed sections) so instructions and data aren't confused; asking for a fixed table schema; why every extracted cell still needs checking.
- **Worked example:** extracting three fields from a short (fictional) event invoice with a one-row example, then checking each cell.
- **Student task (guided):** extract parties, start and end dates, payment terms and three obligations from a two-page fictional supplier agreement into a given table, then mark each cell as checked or corrected.
- **Independent exercise:** the same extraction for a different fictional agreement, without hints.
- **Supplied materials:** two fictional agreements (≈700 words each) with deliberately tricky features: a date written in words, an obligation in a footnote, and an amended clause that overrides an earlier one.
- **Example response:** a completed table with the amended clause's value, and a note that the footnote obligation was missed by the first extraction.
- **Common mistakes:** trusting a neatly formatted table; not re-checking values after changing the prompt; examples that accidentally leak the answer; not saying what to do when a field is missing.
- **Rubric:** *Instruction quality* (clear boundaries, schema, handling of missing fields); *Verification* (cell accuracy against the key, checks recorded).
- **Accessibility alternative:** tables as accessible HTML with headers; students can submit the extraction as a list instead of a table; agreements available as plain text.
- **Instructor notes:** emphasise that structure makes errors easier to check, not less likely. The amended-clause trap is the most instructive: discuss why the model may take the first value it finds.

## Module 4. Checking claims and sources (built; the public sample lesson)

- **Lesson:** fabricated references, numbers that differ from the source, over-generalisation, omissions; how to record a check.
- **Worked example:** one claim checked in four steps.
- **Student task:** verify six claims in an intentionally flawed AI-style answer against three fictional sources, write a corrected answer, state what remains uncertain, and complete one independent check without hints. Optional AI step: ask the approved model to rewrite from the sources, then check the rewrite.
- **Supplied materials:** Source A (library annual report), B (self-selected resident survey), C (budget note), all fictional. The fabricated reference is labelled as invented in the answer key and instructor notes.
- **Assessment:** claim verdicts against the key (C5 invented reference and C6 cost contradiction are critical); corrected answer checked for retained fabrication, misstated figures, causal overclaims and the omitted cost; uncertainty statement. Provisional level for *Verification* (capped at "substantial support" if the invented reference is accepted and "not yet" if it is kept in the answer; capped at "limited support" when hints or revisions were used). *Revision* credit depends on resolving the issues flagged last time.
- **Complete lesson plan:** `/curriculum/sample-lesson`.

## Module 5. Working with numbers and code (built; the business analysis demonstration)

- **Lesson:** AI can write a correct formula and still answer the wrong question, or quietly treat a blank as zero. Four checks: **Definition, Data, Check, Limits.**
- **Worked example:** an AI-suggested `=AVERAGE(B2:B20)` for average order value, tested on three rows worked out by hand; it gives revenue per row, not per order. The fix `=SUM(B)/SUM(C)` matches the hand calculation.
- **Student task:** the business analysis demonstration in [03-demonstration-activities.md](03-demonstration-activities.md). The student clarifies what "top performer" means, finds and handles the missing East Q2 revenue, notices East's high returns, enters a figure per region for their chosen definition, recalculates one figure independently, and writes a recommendation of no more than 150 words with limitations. Optional AI step: ask the approved model for a formula or analysis (the dataset is attached, with the blank left blank), then test what it gives.
- **Independent exercise (no hints):** an AI-suggested pounds-to-kilograms formula `=B2*2.2046` that multiplies instead of dividing. The student says whether it is correct, converts 10 lb (4.54 kg) and gives the right formula.
- **Supplied materials:** Dataset D ([`materials/module5-sales-synthetic.csv`](materials/module5-sales-synthetic.csv), shown as an accessible table and downloadable) and the manager's note.
- **Assessment:** any of the three definitions is accepted if it is stated and justified and the figures match it (±1% for revenue, ±0.6 points for growth). The checks flag, in priority order: blank counted as zero (caps verification at 0); missing value not found; leaving the quarter out; no definition or reason; wrong figures; top region inconsistent with the definition; no or wrong independent recalculation; returns missed; estimate not disclosed; no limitations; over 150 words. Provisional levels for *Task definition* and *Verification*; the educator judges *Responsible use*.
- **Example response, common mistakes, accessibility alternative, instructor notes:** in `lessons.js` and on the educator's view.

## Module 6. Research and communication (specified)

- **Outcomes:** compare and summarise sources faithfully; adapt to an audience without changing what the evidence supports; separate evidence from interpretation.
- **Lesson:** summarisation drift (hedges lost, numbers rounded into different claims); audience adaptation vs. distortion; marking interpretation explicitly.
- **Worked example:** two summaries of the same paragraph, one faithful and one that drops a caveat.
- **Student task:** a 250-word evidence brief for a non-specialist manager from a pack of three short fictional reports on hybrid working at a (fictional) firm, which partly disagree.
- **Independent exercise:** rewrite the same brief for a specialist audience and list what changed and what must not change.
- **Supplied materials:** three fictional reports (≈400 words each) with one methodological weakness each.
- **Example response:** a brief that reports the disagreement, labels one interpretation as such and flags the weakest source.
- **Common mistakes:** "averaging" conflicting sources; losing caveats for a lay audience; presenting the AI's framing as the evidence.
- **Rubric:** *Verification* (faithfulness per claim); *Instruction quality* (audience, length and fidelity constraints given to the model).
- **Accessibility alternative:** audio-friendly plain-text sources; the brief can be delivered as a recorded two-minute explanation.
- **Instructor notes:** ask students to highlight each sentence as evidence or interpretation; it makes drift visible quickly.

## Module 7. Responsible workflows (specified)

- **Outcomes:** decide what information may go to which tool under course and institution rules; check outputs for bias and misrepresentation relevant to the task; write an accurate disclosure.
- **Lesson:** data categories (public, own work, others' personal data, confidential, assessed work of others); approved tools; ownership and attribution; bias checks tied to the task; disclosure that someone could audit against the record.
- **Worked example:** a group project workflow redesigned so that no teammate's personal data leaves the approved tool.
- **Student task:** a fictional classmate's workflow pasted group members' names, phone numbers and grades into an unapproved tool to "organise the team". Revise the workflow, then write a disclosure for the revised version.
- **Independent exercise:** assess a second workflow (drafting job-application feedback for a friend) for data, bias and ownership issues.
- **Supplied materials:** the two workflows and a fictional institutional AI policy excerpt.
- **Example response:** a revised workflow using initials and an approved tool, with a disclosure naming tool, purpose, checks and what remained the student's own.
- **Common mistakes:** anonymising names but keeping identifying details; disclosures that say only "used AI"; assuming a paid tool is automatically approved.
- **Rubric:** *Responsible use* (rules and data limits followed, auditable disclosure); *Tool selection*.
- **Accessibility alternative:** workflows as numbered text steps; disclosure can be completed from a template.
- **Instructor notes:** connect to your institution's actual policy; the platform shows the institution's data rule on every workspace.

## Module 8. Independent application (specified)

- **Outcomes:** complete an unfamiliar task with approved tools and reduced coaching; show prompts, checks and revisions; explain decisions concisely.
- **Lesson:** a one-page recap of the method; no worked example of the specific task.
- **Student task:** an unfamiliar, discipline-specific task set by the educator from a template (for example, a policy memo, a data summary or a literature comparison), in assessment mode with no hints.
- **Supplied materials:** chosen or adapted by the educator; templates provided for business, health sciences, humanities and engineering.
- **Example response:** provided per template, visible according to the educator's setting.
- **Common mistakes:** reverting to a single long prompt; not recording checks; explanation that restates the output instead of the decisions.
- **Rubric:** all six criteria, educator-assessed. This is the main evidence of *independent use on a new task*.
- **Accessibility alternative:** extended time; oral explanation of decisions accepted in place of written explanation.
- **Instructor notes:** use a task students have not practised. It pairs with the delayed transfer check four to six weeks later.

---

## Proposed alignment with UNESCO's AI Competency Framework for Students

UNESCO's framework (2024) has 12 competencies across four dimensions and three progression levels. The table is our proposed alignment. It is **not** UNESCO approval, endorsement or certification, and the course does **not** implement the whole framework. Competency names follow the published framework; re-check them against the official document before each public revision.

| Dimension | Level | Competency | Coverage | Modules | Notes |
|---|---|---|---|---|---|
| Human-centred mindset | Understand | Human agency | Partial | 1, 7 | Students decide when not to use AI; no societal framing |
| Human-centred mindset | Apply | Human accountability | Addressed | 7, 8 | Responsibility for final work; disclosure |
| Human-centred mindset | Create | Citizenship in the era of AI | **Gap** | — | Not covered |
| Ethics of AI | Understand | Embodied ethics | Partial | 7 | Bias, ownership, privacy in coursework only |
| Ethics of AI | Apply | Safe and responsible use | Addressed | 1, 4, 7 | Privacy decisions, approved data, verification |
| Ethics of AI | Create | Ethics by design | **Gap** | — | Students don't design AI systems |
| AI techniques and applications | Understand | AI foundations | Partial | 1 | Practical capabilities and limits only |
| AI techniques and applications | Apply | Application skills | Addressed | 2–6, 8 | The core of the course |
| AI techniques and applications | Create | Creating AI tools | **Gap** | — | Not covered |
| AI system design | Understand | Problem scoping | Partial | 1, 2 | Scoping tasks, not AI systems |
| AI system design | Apply | Architecture design | **Gap** | — | Not covered |
| AI system design | Create | Iteration and feedback loops | Partial | 2, 8 | Iterating on instructions and checks |

Four competencies are gaps and five are partial. The framework was designed mainly for school curricula; a university AI-use course would not be expected to cover AI system design.
