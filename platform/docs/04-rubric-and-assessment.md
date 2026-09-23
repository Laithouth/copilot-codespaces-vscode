# 4. Rubric and assessment

> **Status: proposed rubric, version 0.1.** Not yet calibrated with educators or validated against student work. Pilot institutions moderate it before it informs any grade. The live version is in [`src/content/competencies.js`](../src/content/competencies.js) and at `/curriculum/rubric`.

## Principle

Assess the **result and the decisions behind it**. Prompt length, professional vocabulary and use of a template are not evidence of competence on their own. The automated checks are written so that a long, generic prompt scores lower than a short one that carries the task's constraints; a test covers this.

## Criteria and levels

Four levels: **0 Not yet demonstrated · 1 Demonstrated with substantial support · 2 Demonstrated with limited support · 3 Independently demonstrated.**

| Criterion | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| **Task definition** | No stated objective, or it doesn't match the assignment | Objective and some constraints after hints or feedback; vague or missing success criteria | Objective, audience, inputs and constraints; at least two checkable criteria; minor gaps | Unprompted, complete brief with criteria specific enough for someone else to check |
| **Tool and approach selection** | Uses AI where rules, data sensitivity or verification needs make it unsuitable, or can't explain the choice | Reasonable choice once the key consideration is pointed out; names one factor | Appropriate choices in familiar cases, naming the relevant factors; misses an edge case | Justified choices in unfamiliar cases, including choosing a non-AI method; sequences work into checkable steps |
| **Instruction quality** | Omits task context so output can't meet the assignment | Main request and some context after hints; important constraints or inputs missing | Objective, audience, key constraints and relevant inputs; format mostly specified | Fitted to the task: what the model needs and nothing that shouldn't be shared; length and structure serve the task |
| **Verification** | Accepts output unchecked, or keeps a fabricated or contradicted claim in the final work | Checks some claims after hints; misses unsupported claims or omissions | Checks most claims with recorded evidence; catches fabricated references; misses one subtle issue | Checks every consequential claim, calculation and omission, records evidence, and states what remains uncertain |
| **Revision** | No revision, or resubmits without addressing the issue | Revises in response to specific feedback; partly addresses it | Targeted revision that addresses the issue, with an explanation | Chooses what to change from own evaluation, changes one thing at a time, and judges with evidence whether it helped, including when it didn't |
| **Responsible use and integration** | Breaks the AI rules or data limits, or submits AI output as own work without disclosure | Follows rules when reminded; incomplete disclosure | Follows rules and data limits; disclosure states tool, purpose and checks | Follows rules unprompted, separates own judgement, and writes a disclosure another reader could audit against the record |

## How levels are produced

1. **Provisional (automated).** On submission, rule-based checks against the lesson's answer key propose a level for the criteria they cover (Module 1: tool selection; Module 2: task definition and instruction quality; Module 4: verification; any revision: revision). Hints used or a revision after feedback cap the provisional level at 2. In Module 4, accepting the invented reference caps verification at 1, and keeping it in the answer caps it at 0.
2. **Educator review.** The educator sees every version, model run, evidence check and hint count, and confirms or changes each level. **A reason is required whenever the confirmed level differs from the provisional level.**
3. **Only confirmed levels count** toward a student's demonstrated competency, course reports and institution reports. Provisional levels are always labelled as such.
4. **Challenges.** Students can challenge a confirmed assessment. An educator must respond, and the challenge and response are kept with the record.
5. **Formative and summative stay separate.** Feedback (automated or educator) supports revision; confirmed levels are the assessment record. In assessment mode, automated feedback is hidden from the student until an educator approves or edits it.

## Three outcomes, kept separate

| Outcome | Measured by | Where |
|---|---|---|
| **Task performance while using AI** | Lesson work with the AI step available | Modules 1–7 |
| **Independent use on a new task** | Unfamiliar task, assessment mode, no hints | Independent items in each lesson; Module 8 |
| **Understanding without AI** | Explaining a decision or detecting an error with no AI available | Independent verification items (e.g. C7) and in-class or oral checks set by the educator |

## Before, after and later

- **Pre- and post-course tasks** use *equivalent but different* materials (e.g. a second fictional source pack with the same planted issue types), so gains are not just familiarity with one task.
- **Delayed transfer check** about four to six weeks after the course: a new-context task without hints. *(Designed; not yet built as a scheduled activity.)*

## Automated feedback: scope and limits

- Deterministic rules against an answer key; no model grades student work in this release.
- Shows the one or two most consequential issues, explains why they matter and invites a revision.
- Conservative text heuristics can miss things or misfire. Testing found one false positive (a student *saying* they had removed the invented figure was flagged as keeping it), which was fixed, and the same weakness was fixed in a similar check. Educators can approve, edit or withhold every item.
- AI-generated formative feedback may be added later, behind the same educator review, and only after comparison with educator judgements.

## Credentials

If a certificate or badge is offered, it will state: the issuer (the institution, using this platform), the competencies assessed, the criteria and levels, that levels were confirmed by educators using a proposed rubric, and its limitations. It will not imply external accreditation or universal proof of AI competence. The portfolio export already includes this statement: *"Levels are issued by the student's educators using a proposed rubric that has not yet been externally validated. They are not an accredited qualification."*
