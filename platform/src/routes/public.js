// Public website pages. Copy is written to be accurate for the current build:
// anything not yet built is labelled, and no results, customers or endorsements
// are claimed.
import { html, raw } from '../html.js';
import { page, chip, PRODUCT } from '../views/layout.js';
import { MODULES, MODULE_STATUS, COURSE, PRACTICE_SEQUENCE } from '../content/curriculum.js';
import { COMPETENCIES, LEVELS, RUBRIC_STATUS, UNESCO_ALIGNMENT, competencyByCode } from '../content/competencies.js';
import { LESSONS } from '../content/lessons.js';
import { EVIDENCE, POLICY, STATUS, REVIEW_DATE } from '../content/evidence.js';
import { FEATURES, FEATURE_STATUS } from '../content/features.js';
import { lessonIntro, materials, aiAnswer, exampleBlock } from '../views/lesson.js';
import { notFound } from '../http.js';

const statusChip = (key) => chip(FEATURE_STATUS[key].label, FEATURE_STATUS[key].kind);
const moduleChip = (m) => chip(MODULE_STATUS[m.status].label, m.status === 'available' ? 'good' : '');
const featureStatus = (name) => FEATURES.find((f) => f.name.startsWith(name))?.status || 'planned';

const PRIMARY_CTAS = html`<div class="actions">
  <a class="button" href="/try">Try a sample lesson</a>
  <a class="button secondary" href="/curriculum">View the curriculum</a>
  <a class="button secondary" href="/contact">Request an institutional pilot</a>
</div>`;

function home(ctx) {
  const c5 = LESSONS['checking-claims-and-sources'].claims.find((c) => c.key === 'C5');
  const body = html`
  <section class="hero"><div class="wrap">
    <h1>Learn to use AI effectively for real academic and professional tasks</h1>
    <p class="lead">Students practise realistic assignments, check what AI gives them and get feedback linked to clear learning objectives. Educators see the decisions behind each piece of work and track evidence of what each student can do.</p>
    ${PRIMARY_CTAS}
  </div></section>

  <section class="wrap section">
    <h2>What students learn to do</h2>
    <p>The course teaches a method that transfers between tools, not tricks for one product.</p>
    <ol class="steps">
      <li><strong>Define the task.</strong> Objective, audience, materials, constraints and what success looks like.</li>
      <li><strong>Choose an appropriate tool</strong>, or decide AI is the wrong method for this task.</li>
      <li><strong>Give useful instructions</strong> that carry the task's context and limits.</li>
      <li><strong>Evaluate the result</strong>: check claims, sources, numbers and omissions.</li>
      <li><strong>Improve the approach</strong> one change at a time, and judge whether it helped.</li>
      <li><strong>Explain their own contribution</strong> and disclose AI use under the assignment's rules.</li>
    </ol>
  </section>

  <section class="wrap section" aria-labelledby="sample-h">
    <h2 id="sample-h">A two-minute sample activity</h2>
    <div class="card">
      <p>An AI assistant wrote this sentence in an answer about whether a (fictional) town library should open on Sundays:</p>
      <p class="ai-output">${c5.text}</p>
      <p><strong>Would you put this sentence in a report to a council committee?</strong></p>
      <details class="disclosure"><summary>What a careful checker does</summary>
        <p>They look for the reference. It is not among the supplied sources, and they cannot find it anywhere else. It was invented for the exercise. A careful checker removes the reference and the 20% figure that depends on it, and says so. The full lesson has five more claims, three sources and a corrected answer to write.</p>
      </details>
      <div class="actions"><a class="button" href="/try">Try the full sample lesson</a><span class="muted small">About 30–45 minutes. No account needed, and nothing you type is saved.</span></div>
    </div>
  </section>

  <section class="wrap section">
    <h2>Who it is for</h2>
    <div class="grid">
      <div class="card"><h3>Students</h3><p>Aged 18 and over, including beginners with no technical background. Practise with realistic business and academic tasks, get specific feedback, and keep a portfolio that shows your work, the AI's output and your checks separately.</p><p><a href="/how-it-works">How the practice works</a></p></div>
      <div class="card"><h3>Educators</h3><p>Embed a short AI skills course in an existing subject. Set the AI rules for each assignment, see students' prompts, checks and revisions, review provisional feedback and confirm rubric levels.</p><p><a href="/resources">Teaching resources</a></p></div>
      <div class="card"><h3>Institutions</h3><p>A consistent approach across courses, with approved AI providers, usage limits, retention settings and reports built on demonstrated skill rather than time spent.</p><p><a href="/institutions">For institutions</a></p></div>
    </div>
  </section>

  <section class="wrap section">
    <h2>The problem we are working on</h2>
    <p>Many students now have access to AI tools. Access is not the same as a reliable method. Students can find it hard to judge which tasks suit AI, to give the context a task needs, to spot errors and invented sources, to protect other people's information and to follow each course's rules. Not every student or course has the same difficulties, and some students are already skilled.</p>
    <p>Educators need practical materials and a way to see students' decisions, not only final text. Institutions need an approach they can deliver consistently and update as tools change.</p>
    <p>Our goal is useful AI-assisted work, with the understanding and judgement to handle unfamiliar tasks. Completing one task with AI and learning a transferable skill are different things, and the course is designed to tell them apart.</p>
  </section>

  <section class="wrap section">
    <div class="note"><p><strong>What we can't tell you yet.</strong> ${PRODUCT} has not yet been piloted with students, so we have no results to report. We are looking for a first department to run a pilot with a published evaluation. <a href="/research">How we will evaluate learning</a>.</p></div>
    ${PRIMARY_CTAS}
  </section>`;
  return page({ title: '', description: 'AI skills practice and assessment for university courses.', body, user: ctx.user, path: '/' });
}

function howItWorks(ctx) {
  const stages = [
    ['Understand the task', 'Students read the brief and supplied materials and write down what the finished work must achieve.', 'The brief they wrote.', 'Whether students understood the objective before starting.'],
    ['Make a plan', 'They decide whether AI suits the task, which tool is allowed, and how they will check the result.', 'Suitability decision and planned checks.', 'Choices about tools, data and rules.'],
    ['Try an approach', 'They write instructions and, where the assignment permits it, run them with the approved model, or record output from another approved tool.', 'Each prompt, the output and the model identifier.', 'Exactly what was asked and what came back.'],
    ['Inspect the output', 'They check claims, sources, numbers and omissions against the materials.', 'Each check, with the verdict and the evidence.', 'Which errors students caught and missed.'],
    ['Revise', 'Feedback names one or two important issues. Students change their approach and submit a new version.', 'Every version, kept side by side.', 'Whether the revision fixed the issue.'],
    ['Demonstrate independently', 'An independent item in each lesson and a final unfamiliar task are done without hints.', 'Independent work and a short explanation of decisions.', 'Evidence of what students can do without coaching.'],
  ];
  const body = html`<section class="wrap section">
    <h1>How it works</h1>
    <p class="lead">Each lesson follows the same cycle, and every step leaves a record the student can see and the educator can review.</p>
    <div class="table-wrap" tabindex="0" role="region" aria-label="Table, scrolls sideways on small screens"><table>
      <caption>The learning cycle</caption>
      <thead><tr><th scope="col">Stage</th><th scope="col">What students do</th><th scope="col">What is saved</th><th scope="col">What educators can review</th></tr></thead>
      <tbody>${stages.map(([a, b, c, d]) => html`<tr><th scope="row">${a}</th><td>${b}</td><td>${c}</td><td>${d}</td></tr>`)}</tbody>
    </table></div>

    <h2>Practice that builds independence</h2>
    <ol class="steps">${PRACTICE_SEQUENCE.map(([a, b]) => html`<li><strong>${a}.</strong> ${b}</li>`)}</ol>
    <p>Students attempt each task before they see an improved answer. Educators decide when example answers become visible: never, after submission, or after the deadline.</p>

    <h2>Two modes</h2>
    <div class="grid two">
      <div class="card"><h3>Practice mode</h3><p>Hints are available one at a time and are recorded. Provisional feedback appears straight after submission. Using hints is fine; it shows up as "with support" in the evidence.</p></div>
      <div class="card"><h3>Assessment mode</h3><p>No hints. Automated feedback is held until the educator has reviewed it. The educator's AI-use rule for the assignment is shown in plain language. The platform records what happens inside the workspace; it cannot prevent use of AI elsewhere, and we don't claim that it can.</p></div>
    </div>

    <h2>What students produce</h2>
    <ul>
      <li>Task briefs, suitability decisions and prompts, with every version kept.</li>
      <li>Annotated checks showing which claims were verified, contradicted or unsupported, and where the evidence is.</li>
      <li>Corrected work, uncertainty statements and AI-use disclosures.</li>
      <li>An exportable portfolio that keeps their own writing, AI output and educator feedback visibly separate.</li>
    </ul>

    <h2>What educators can review</h2>
    <ul>
      <li>Each student's versions, model runs (with model identifiers), evidence checks and hint use.</li>
      <li>Provisional feedback, which they can approve, edit or withhold, and their own feedback.</li>
      <li>Provisional rubric levels, which they confirm or override with a reason. Only educator-confirmed levels count as demonstrated competency.</li>
      <li>Cohort skill gaps suggesting what to teach next. There are no public rankings.</li>
    </ul>

    <h2>Progress means demonstrated skill</h2>
    <p>Progress is shown against the six rubric criteria. Completion counts and time spent are shown as context only; they never stand in for evidence of skill.</p>
    <div class="actions"><a class="button" href="/try">Try a sample lesson</a><a class="button secondary" href="/curriculum/rubric">See the rubric</a></div>
  </section>`;
  return page({ title: 'How it works', description: 'The learning cycle, practice modes and what educators can review.', body, user: ctx.user, path: '/how-it-works' });
}

function moduleCard(m) {
  return html`<article class="card" aria-labelledby="m${m.no}-h">
    <h3 id="m${m.no}-h">Module ${m.no}. ${m.title}</h3>
    <p>${moduleChip(m)} <span class="chip">${m.time}</span></p>
    <p><strong>Deliverable:</strong> ${m.deliverable}</p>
    <p><a href="/curriculum/module-${m.no}">Outcomes, task and assessment<span class="visually-hidden"> for module ${m.no}</span></a></p>
  </article>`;
}

function curriculum(ctx) {
  const body = html`<section class="wrap section">
    <h1>Curriculum</h1>
    <p class="lead">${COURSE.title}. ${COURSE.hours}.</p>
    <p><strong>Audience:</strong> ${COURSE.audience} First examples use business and general academic tasks; the structure is designed to be adapted to other disciplines.</p>
    <div class="note info"><p><strong>What is available now.</strong> Modules 1, 2, 4 and 5 are built for the pilot. The other four are specified below but not yet built, and we won't sell the full course until they are.</p></div>

    <h2>The eight modules</h2>
    <div class="grid">${MODULES.map(moduleCard)}</div>

    <h2>How every module is taught</h2>
    <ol class="steps">${PRACTICE_SEQUENCE.map(([a, b]) => html`<li><strong>${a}.</strong> ${b}</li>`)}</ol>
    <p>Each module includes the lesson, the student task, supplied materials, an example response, common mistakes, rubric criteria, an accessibility alternative and instructor notes.</p>
    <div class="actions"><a class="button" href="/curriculum/sample-lesson">See a complete sample lesson plan</a><a class="button secondary" href="/curriculum/rubric">See the rubric</a></div>

    <h2>Principles that transfer between tools</h2>
    <p>Lessons teach decisions that hold across AI tools: when to use AI, how to brief it, how to check it, how to revise and how to disclose. Tool-specific guidance is dated and reviewed when capabilities change. Content last reviewed: ${COURSE.contentReviewed}.</p>

    <h2 id="unesco">Proposed alignment with UNESCO's AI Competency Framework for Students</h2>
    <p>We have mapped the modules to UNESCO's 2024 framework. This is our own proposed alignment. It is not approval, endorsement or certification by UNESCO, and the course does not implement the whole framework: four of the twelve competencies are not covered at all.</p>
    <div class="table-wrap" tabindex="0" role="region" aria-label="Table, scrolls sideways on small screens"><table>
      <caption>Proposed alignment and gaps</caption>
      <thead><tr><th scope="col">Dimension</th><th scope="col">Level</th><th scope="col">Competency</th><th scope="col">Coverage</th><th scope="col">Modules</th><th scope="col">Notes</th></tr></thead>
      <tbody>${UNESCO_ALIGNMENT.map((u) => html`<tr><td>${u.dimension}</td><td>${u.level}</td><td>${u.competency}</td>
        <td>${u.coverage === 'addressed' ? chip('Addressed', 'good') : u.coverage === 'partial' ? chip('Partly addressed', 'warn') : chip('Gap: not covered', 'bad')}</td>
        <td>${u.modules.length ? u.modules.join(', ') : '—'}</td><td>${u.note}</td></tr>`)}</tbody>
    </table></div>
    ${PRIMARY_CTAS}
  </section>`;
  return page({ title: 'Curriculum', description: 'Eight-module foundation course: outcomes, time, tasks and assessment.', body, user: ctx.user, path: '/curriculum' });
}

function moduleDetail(ctx) {
  const m = MODULES.find((x) => `module-${x.no}` === ctx.params.slug);
  if (!m) throw notFound();
  const body = html`<section class="wrap narrow section">
    <p><a href="/curriculum">Curriculum</a></p>
    <h1>Module ${m.no}. ${m.title}</h1>
    <p>${moduleChip(m)} <span class="muted">${MODULE_STATUS[m.status].note}</span></p>
    <dl class="kv"><dt>Estimated time</dt><dd>${m.time} (to be validated in the pilot)</dd><dt>Prerequisites</dt><dd>${m.prerequisites}</dd></dl>
    <h2>Learning outcomes</h2><ul>${m.outcomes.map((o) => html`<li>${o}</li>`)}</ul>
    <h2>Example task</h2><p>${m.taskExample}</p>
    <h2>Deliverable</h2><p>${m.deliverable}</p>
    <h2>Assessment</h2><ul>${m.assessment.map((a) => html`<li>${a}</li>`)}</ul>
    <h2>Rubric criteria used</h2><ul>${m.competencies.map((c) => html`<li>${competencyByCode[c].title}: ${competencyByCode[c].summary}</li>`)}</ul>
    ${m.lesson === 'checking-claims-and-sources' ? html`<div class="actions"><a class="button" href="/try">Try this lesson now</a><a class="button secondary" href="/curriculum/sample-lesson">Full lesson plan</a></div>` : ''}
  </section>`;
  return page({ title: `Module ${m.no}`, description: m.title, body, user: ctx.user, path: '/curriculum' });
}

function sampleLessonPlan(ctx) {
  const lesson = LESSONS['checking-claims-and-sources'];
  const m = MODULES.find((x) => x.no === lesson.module);
  const body = html`<section class="wrap section">
    <p><a href="/curriculum">Curriculum</a></p>
    <h1>Complete sample lesson: ${lesson.title}</h1>
    <p class="lead">Module ${m.no}. Everything an educator receives for this lesson, on one page. Students do the interactive version in the <a href="/try">sample lesson</a>.</p>
    <dl class="kv"><dt>Time</dt><dd>${lesson.minutes} minutes</dd><dt>Version</dt><dd>${lesson.version}</dd><dt>Prerequisites</dt><dd>${m.prerequisites}</dd><dt>Criteria</dt><dd>${lesson.competencies.map((c) => competencyByCode[c].title).join(', ')}</dd></dl>
    <h2>Learning outcomes</h2><ul>${m.outcomes.map((o) => html`<li>${o}</li>`)}</ul>
    <h2>Lesson</h2>${lessonIntro(lesson)}
    <h2>Student task</h2><p>${lesson.brief}</p>
    ${materials(lesson)}
    ${aiAnswer(lesson)}
    <h3>Hints (practice mode only, one at a time)</h3><ol>${lesson.hints.map((h) => html`<li>${h}</li>`)}</ol>
    <h3>Independent exercise (no hints)</h3><p class="claim-text">${lesson.independent.text}</p>
    ${exampleBlock(lesson)}
    <h2>Assessment rubric</h2>
    <p class="small muted">${RUBRIC_STATUS}</p>
    ${rubricTable(lesson.competencies)}
    <h2>Accessibility alternative</h2><p>${lesson.accessibility}</p>
    <h2>Instructor notes</h2><ul>${lesson.instructorNotes.map((n) => html`<li>${n}</li>`)}</ul>
    <div class="actions"><a class="button" href="/try">Try the lesson as a student</a><a class="button secondary" href="/contact">Request an institutional pilot</a></div>
  </section>`;
  return page({ title: 'Sample lesson plan', description: 'Complete lesson plan for Module 4: Checking claims and sources.', body, user: ctx.user, path: '/curriculum' });
}

export function rubricTable(codes = COMPETENCIES.map((c) => c.code)) {
  return html`<div class="table-wrap" tabindex="0" role="region" aria-label="Table, scrolls sideways on small screens"><table>
    <caption>Rubric: four levels per criterion</caption>
    <thead><tr><th scope="col">Criterion</th>${LEVELS.map((l) => html`<th scope="col">${l.label}</th>`)}</tr></thead>
    <tbody>${codes.map((code) => { const c = competencyByCode[code]; return html`<tr><th scope="row">${c.title}<br><span class="small muted">${c.summary}</span>${c.note ? html`<br><span class="small">${c.note}</span>` : ''}</th>${c.levels.map((d) => html`<td>${d}</td>`)}</tr>`; })}</tbody>
  </table></div>`;
}

function rubric(ctx) {
  const body = html`<section class="wrap section">
    <p><a href="/curriculum">Curriculum</a></p>
    <h1>Assessment rubric</h1>
    <p class="note">${RUBRIC_STATUS}</p>
    <p>The rubric judges the result <em>and</em> the decisions behind it. Prompt length, professional vocabulary and following a template are not evidence of competence on their own.</p>
    ${rubricTable()}
    <h2>Three outcomes, kept separate</h2>
    <ol>
      <li><strong>Task performance while using AI</strong>: the quality of the work produced with AI in the lesson.</li>
      <li><strong>Independent use on a new task</strong>: an unfamiliar task done without the platform's hints or coaching.</li>
      <li><strong>Understanding without AI</strong>: for example, explaining a decision or spotting an error with no AI available.</li>
    </ol>
    <p>Automated checks may propose a provisional level. Educators confirm or override it, giving a reason for any override, and handle student challenges. Levels are capped at "limited support" when hints were used or the work was revised after feedback.</p>
  </section>`;
  return page({ title: 'Rubric', description: 'Proposed six-criterion, four-level rubric.', body, user: ctx.user, path: '/curriculum' });
}

function institutions(ctx) {
  const row = (label, name) => html`<li>${label} ${statusChip(featureStatus(name))}</li>`;
  const body = html`<section class="wrap section">
    <h1>For institutions</h1>
    <p class="lead">A short AI skills course that lecturers can embed in an existing subject, with the controls and evidence an institution needs to adopt it consistently.</p>
    <p>Every capability below is labelled: ${statusChip('tested')} ${statusChip('built')} ${statusChip('pilot')} ${statusChip('planned')}. The <a href="/status">feature status page</a> has the full list.</p>

    <h2>Course delivery</h2>
    <ul class="plain">
      ${row('Lecturers assign lessons inside their own course, with deadlines and course-specific instructions.', 'Assignments with AI-use rules')}
      ${row('Four modules (1, 2, 4 and 5) available now; four more specified.', 'Modules 1, 2, 4 and 5')}
      ${row('Four further modules.', 'Modules 3, 6')}
      ${row('Launch from your learning management system (LTI 1.3).', 'LMS integration')}
    </ul>

    <h2>Teacher controls</h2>
    <ul class="plain">
      ${row('Per-assignment AI rule: prohibited, permitted for limited purposes, broadly permitted, or required, shown to students in plain language.', 'Assignments with AI-use rules')}
      ${row('Practice or assessment mode; control over when example answers appear.', 'Practice mode')}
      ${row('Approve, edit or withhold automated feedback; confirm rubric levels with reasons for overrides.', 'Approve, edit or withhold')}
      ${row('Edit lesson materials and rubrics in the app.', 'Editing lesson materials')}
    </ul>

    <h2>Cohort reporting</h2>
    <ul class="plain">
      ${row('Course reports (CSV) with educator-confirmed levels per criterion.', 'Course report export')}
      ${row('Cohort skill gaps that suggest what to teach next, without rankings.', 'Cohort skill gaps')}
      ${row('Institution-level reports with small numbers suppressed.', 'Institution report export')}
    </ul>

    <h2>Institutional policies</h2>
    <ul class="plain">
      ${row('Approved AI provider and model; monthly model-run limit with an alert threshold.', 'Approved provider')}
      ${row('Retention period for student work, with a retention job; learner data deletion.', 'Retention period')}
      ${row('A note to students on what data may be used in lessons.', 'Approved provider')}
      ${row('Single sign-on.', 'Institutional single sign-on')}
    </ul>

    <h2>Onboarding</h2>
    <p>For a pilot we plan to provide: a setup session for administrators, a one-hour onboarding session for participating educators, a roster import, and a named contact during the pilot. Support hours and response times will be written into the pilot agreement rather than promised here.</p>

    <h2>Purchasing</h2>
    <p>We propose a fixed-scope paid pilot followed, if the pilot meets agreed success criteria, by an annual department or institution licence. Prices are quoted per institution until we have validated costs. <a href="/plans">Plans and what determines price</a>.</p>

    <h2>The proposed pilot</h2>
    <ul>
      <li>One department, roughly 50–150 adult students and a small group of instructors, over six to eight weeks. These are planning assumptions to agree with you, not requirements.</li>
      <li>Before starting we agree learning objectives, allowed tools, staff time, baseline measures, support arrangements and success criteria.</li>
      <li>We measure completion, independent task performance, source-checking accuracy, transfer to new tasks, educator workload, accessibility issues, reliability and cost per active learner.</li>
      <li>Where practical we compare with an existing course or a comparison group. Otherwise results are reported as preliminary observations, with sample sizes and limitations.</li>
    </ul>
    <h2>Procurement pack</h2>
    <p>On request: curriculum, demonstration, implementation plan, feature status, data handling, accessibility information, support scope and the evaluation plan. We will also help identify the IT, procurement and data-protection reviews your institution requires.</p>
    ${PRIMARY_CTAS}
  </section>`;
  return page({ title: 'For institutions', description: 'Course delivery, controls, reporting, policies, onboarding and the proposed pilot.', body, user: ctx.user, path: '/institutions' });
}

function research(ctx) {
  const used = EVIDENCE.filter((e) => e.use);
  const body = html`<section class="wrap section">
    <h1>Research and evidence</h1>
    <p class="lead">Why we think this course is worth testing, what the research does and does not show, and how we will evaluate our own platform.</p>
    <div class="note"><p><strong>Our own results: none yet.</strong> ${PRODUCT} has not been piloted with students. Nothing on this page is evidence that our platform improves learning. That will need our own evaluation, published with sample sizes and limitations.</p></div>

    <h2>Third-party research</h2>
    <p class="small muted">Last reviewed ${REVIEW_DATE}. Figures below were checked against abstracts, proceedings pages or publisher summaries. Full texts were not re-read for this review, so we only quote figures we could confirm.</p>
    ${used.map((e) => html`<article class="card spaced" aria-labelledby="${e.id}-h">
      <h3 id="${e.id}-h">${e.short}</h3>
      <p>${e.use}</p>
      <dl class="kv small">
        <dt>Source</dt><dd><a href="${e.url}">${e.citation}</a></dd>
        <dt>Version</dt><dd>${e.version}</dd>
        <dt>Who or what</dt><dd>${e.population}</dd>
        <dt>Design</dt><dd>${e.design}</dd>
        <dt>Limitations</dt><dd>${e.limitations}</dd>
        <dt>Checked</dt><dd>${STATUS[e.status]}</dd>
      </dl></article>`)}

    <h2>What this research does not show</h2>
    <ul>
      <li>Workplace gains from AI access do not show that teaching prompting causes those gains.</li>
      <li>Model-sensitivity studies are about models, not about whether people can learn to work with that sensitivity.</li>
      <li>A short, uncontrolled classroom pilot does not show lasting skill or transfer to new tasks.</li>
      <li>No study here tests whether structured instruction leaves students better at unassisted or new tasks weeks later. That is the question our evaluation is designed to ask.</li>
    </ul>

    <h2>How we will evaluate learning</h2>
    <ol>
      <li><strong>Three separate outcomes:</strong> task performance with AI; independent use on a new task without coaching; and understanding assessed without AI (explaining a decision, spotting an error).</li>
      <li><strong>Equivalent but different tasks</strong> before and after the course, so improvement is not just familiarity with one task.</li>
      <li><strong>A delayed transfer check</strong> about four to six weeks after the course.</li>
      <li><strong>A comparison</strong> with an existing course or comparison group where feasible, recording differences in student experience, assessment conditions, attrition and tool versions.</li>
      <li><strong>Educator-moderated scoring</strong> with the rubric calibrated before results are reported.</li>
      <li><strong>Publication of sample sizes and limitations</strong> with any finding. Without a comparison, results will be called preliminary observations.</li>
    </ol>

    <h2>Corrections to our starting material</h2>
    <p>This product began from an internal research synthesis. Checking it turned up errors, which we record here rather than repeat:</p>
    <ul>${EVIDENCE.flatMap((e) => e.doNotUse).map((d) => html`<li>${d}</li>`)}</ul>

    <h2>Policy context (not research)</h2>
    ${POLICY.map((p) => html`<div class="card"><h3>${p.title}</h3><p>${p.text}</p><p><strong>Status:</strong> ${p.status}</p><p><strong>Please note:</strong> ${p.caution}</p><p><a href="${p.url}">European Commission AI literacy Q&amp;A</a></p></div>`)}
    <p class="small muted">This is general information, not legal advice.</p>
  </section>`;
  return page({ title: 'Research and evidence', description: 'Sourced research summaries, limitations and our evaluation plan.', body, user: ctx.user, path: '/research' });
}

function plans(ctx) {
  const tiers = [
    ['Individual access', 'Not offered at present.', ['The first release is designed for course delivery. We may offer individual access later.'], null],
    ['Course pilot', 'Fixed scope, paid. About 6–8 weeks.', ['One department, one or more courses', 'Modules 1, 2, 4 and 5, plus modules completed during the pilot', 'Educator workspace, reports and roster import', 'Agreed model-run allowance with alerts', 'Onboarding session and named pilot contact', 'Evaluation plan and a written pilot report'], 'Request a pilot quote'],
    ['Department licence', 'Annual, after a successful pilot.', ['All available modules for one department', 'Defined learner numbers and model-run allowance', 'Educator onboarding and support as agreed', 'Content maintenance and dated tool guidance'], 'Request a quote'],
    ['Institution licence', 'Annual.', ['Multiple departments with central administration', 'Institution policies, retention and reporting', 'Single sign-on and LMS integration once built and tested with your systems', 'Support terms agreed in the contract'], 'Request a quote'],
  ];
  const body = html`<section class="wrap section">
    <h1>Plans and pilot</h1>
    <p class="lead">Prices are quoted for each institution until our costs are validated in a pilot. We don't publish list prices we can't stand behind.</p>
    <div class="grid">${tiers.map(([name, sub, items, cta]) => html`<div class="card"><h2>${name}</h2><p class="muted">${sub}</p><ul>${items.map((i) => html`<li>${i}</li>`)}</ul>${cta ? html`<p><a class="button" href="/contact?interest=pilot">${cta}</a></p>` : ''}</div>`)}</div>

    <h2>What determines price</h2>
    <ul>
      <li><strong>Learner count</strong>: the number of students with access during the term.</li>
      <li><strong>Included model usage</strong>: a monthly allowance of AI runs. Unlimited use isn't financially sustainable, so allowances, caps and alerts are part of every plan.</li>
      <li><strong>Instructor tools</strong>: the number of courses and educators.</li>
      <li><strong>Onboarding</strong>: sessions for administrators and educators.</li>
      <li><strong>Integrations</strong>: single sign-on and LMS integration, when available.</li>
      <li><strong>Support</strong>: hours, response times and named contacts.</li>
      <li><strong>Optional customisation</strong>: discipline-specific tasks and materials.</li>
    </ul>

    <h2>Included in every paid plan</h2>
    <p>Basic accessibility, privacy protections, tenant isolation, backups and deletion, and student data export are included in all plans. They are not premium add-ons.</p>

    <h2>How usage limits work</h2>
    <p>Each institution sets a monthly model-run limit and an alert threshold. Administrators see usage against the limit. When the limit is reached, the live AI step stops working for the rest of the month, and students see a clear message instead of an error. Lessons can still be completed without the live AI step.</p>
    <div class="actions"><a class="button" href="/contact?interest=pilot">Request an institutional pilot</a><a class="button secondary" href="/try">Try a sample lesson</a></div>
  </section>`;
  return page({ title: 'Plans and pilot', description: 'Pilot, department and institution licences and what determines price.', body, user: ctx.user, path: '/plans' });
}

function trust(ctx) {
  const body = html`<section class="wrap section">
    <h1>Trust and accessibility</h1>
    <p class="lead">What happens to data today, what is still planned, and how to reach us. Where something is not built yet, we say so.</p>

    <h2>What we store</h2>
    <ul>
      <li><strong>Accounts</strong>: name, email, a hashed password and your role in each institution and course.</li>
      <li><strong>Learning records</strong>: your answers for each assignment, every version you submit, hints used, prompts you run in the workspace, AI outputs with the model identifier, evidence checks, feedback and rubric levels.</li>
      <li><strong>Pilot requests</strong>: what you enter in the contact form.</li>
    </ul>
    <p>We do not collect browsing history, activity outside the workspace, or private conversations with other AI tools. The public sample lesson saves nothing.</p>

    <h2>Who can see it</h2>
    <ul>
      <li>Students see their own work, feedback and levels, and can export a portfolio.</li>
      <li>Educators see the work of students in their own courses only.</li>
      <li>Institution administrators manage settings and see aggregate reports. They can delete a learner's data, but they do not see individual work in the reports.</li>
      <li>Every access check runs on the server. Data from one institution is never shown to another.</li>
    </ul>

    <h2>AI providers</h2>
    <p>The live AI step uses one provider at a time, through a replaceable adapter. The pilot build supports Anthropic's Claude models. When a student runs a prompt, the prompt and a short system instruction are sent to the provider, and the output is stored with the model identifier. Institutions choose whether the live AI step is enabled at all.</p>
    <p>The provider's handling of that data is governed by its commercial terms and our contract with it. We don't claim zero retention or "no training" unless those are confirmed in the contract for your deployment; we will set out the actual terms in the pilot agreement. Credentials are kept on the server and never sent to browsers.</p>
    <p>Lessons use fictional or approved teaching material by default, and students are told not to enter personal information.</p>

    <h2>Retention, deletion and export</h2>
    <ul class="plain">
      <li>Each institution sets a retention period (default 365 days). A retention job deletes older learning records. ${statusChip('tested')}</li>
      <li>Institution administrators can delete a learner's data. ${statusChip('tested')}</li>
      <li>Students can export their work. Educators and administrators can export reports. ${statusChip('tested')}</li>
      <li>Backups: a manual backup command exists. Scheduled, encrypted, off-site backups with tested restores are required before the first pilot. ${statusChip('planned')}</li>
    </ul>

    <h2>Security measures in this build</h2>
    <ul>
      <li>Passwords hashed with scrypt; session cookies are HTTP-only and same-site; forms are protected against cross-site requests.</li>
      <li>Server-side access checks on every request, and a content security policy that blocks third-party scripts.</li>
      <li>Not yet done: independent security testing, single sign-on, hosting with encryption at rest, and a data processing agreement template. These are listed as launch blockers.</li>
    </ul>

    <h2>Academic integrity</h2>
    <p>Students disclose their AI use in each assignment, and educators set the rules. We do not use AI-writing detection, and nothing in the platform should be treated as proof of misconduct. The platform records work done inside it; it cannot see or prevent AI use elsewhere.</p>

    <h2>Student rights</h2>
    <ul>
      <li>See what is saved about your work and who can see it (shown in every workspace).</li>
      <li>Export your portfolio.</li>
      <li>Challenge an assessment decision; an educator must respond.</li>
      <li>Ask your institution to correct or delete your data. Your institution controls your account and decides on requests under its own policies and law.</li>
    </ul>

    <h2>Accessibility</h2>
    <p>We target WCAG 2.2 level AA. What has been tested so far:</p>
    <ul>
      <li>Automated checks (axe-core) on the public pages, the sample lesson and the main workspace pages. ${statusChip('built')}</li>
      <li>A keyboard-only walkthrough of the sample lesson. ${statusChip('built')}</li>
      <li>Status and feedback are shown in words, not only colour. Pages work at 200% zoom and on small screens, and nothing is timed.</li>
    </ul>
    <p>Not yet tested: screen readers (NVDA, JAWS, VoiceOver), testing with disabled students, and speech input across browsers. We will report the scope honestly as testing proceeds.</p>
    <p>Speech input is optional and off unless an institution turns it on. It uses your browser's speech recognition, which in some browsers sends audio to the browser vendor's service. You always review the text before submitting, and speech input never affects your score. Assessment does not depend on typing speed or accent.</p>

    <h2>Minors</h2>
    <p>The platform is for adults aged 18 and over. Use with school students will need age-appropriate content, permissions and controls, and appropriate review, first.</p>

    <h2>Contact</h2>
    <p>Students should contact their educator or institution first. For questions about data, accessibility or security, use the <a href="/contact">contact form</a> and choose "Question".</p>
  </section>`;
  return page({ title: 'Trust and accessibility', description: 'Data handling, AI providers, retention, accessibility and student rights.', body, user: ctx.user, path: '/trust' });
}

function resources(ctx) {
  const faqs = {
    Students: [
      ['Is using this course "cheating"?', 'No. Your educator sets the AI rules for each assignment, and the workspace shows them. The course teaches you to follow those rules and to disclose AI use accurately.'],
      ['Can my educator see everything I type?', 'Your educator sees the work you do in the workspace for their course: answers, versions, prompts, AI outputs, hints and checks. Nothing outside the workspace is recorded.'],
      ['What if the AI step doesn\'t work?', 'You can still complete the lesson. If the provider is unavailable, or your institution\'s monthly limit has been reached, the workspace says so, and you can record output from a tool your course approves or work with the example output.'],
      ['Do hints count against me?', 'Hints are recorded and mean the work counts as "with support". Using them while you learn is expected. The independent items show what you can do without them.'],
      ['Can I challenge a level I was given?', 'Yes. Use "Challenge this assessment" on the assignment. An educator must respond.'],
      ['Is my voice recorded if I use speech input?', 'We don\'t store audio. Your browser turns speech into text, and in some browsers that sends audio to the browser vendor. Review the text before you submit.'],
    ],
    Educators: [
      ['How much class time does it need?', 'We estimate 8–12 hours for the full course, and 60–90 minutes per module. We will check these estimates in the pilot.'],
      ['Can I use it if AI is banned in my course?', 'Yes. Set the assignment to "AI prohibited". Students still practise defining tasks and checking supplied AI output, and the live AI step is switched off.'],
      ['Is the automated feedback reliable?', 'It is rule-based and conservative, and labelled provisional. It points to one or two likely issues. You can approve, edit or withhold it, and only levels you confirm count.'],
      ['Does it detect AI-written work?', 'No, and we don\'t recommend relying on AI-writing detectors as proof of misconduct.'],
      ['Can I adapt materials to my discipline?', 'Today you can add assignment-specific instructions. Editing lesson materials and rubrics is planned. The curriculum is designed to be adapted to other disciplines.'],
      ['Does it integrate with our LMS?', 'Not yet. LTI 1.3 integration is planned and will be tested with a named LMS before we claim it. Pilots use roster import and report export.'],
    ],
  };
  const policyWording = [
    ['AI prohibited', 'You may not use AI tools for any part of this assignment. You may still use this workspace to check supplied AI output.'],
    ['Permitted for limited purposes', 'You may use approved AI tools only for the purposes listed below. Everything else must be your own work. Disclose what you used and why.'],
    ['Broadly permitted', 'You may use approved AI tools. You are responsible for the accuracy of your submission and must disclose how you used AI.'],
    ['Required', 'This assignment asks you to use an approved AI tool as described. Your record of prompts, checks and revisions is part of the assessment.'],
  ];
  const body = html`<section class="wrap section">
    <h1>Resources and FAQ</h1>
    <p class="lead">Materials you can use now, including outside the platform.</p>

    <h2>Teaching materials</h2>
    <ul>
      <li><a href="/curriculum/sample-lesson">Complete lesson plan: Checking claims and sources</a>, with materials, answer key, common mistakes and instructor notes.</li>
      <li><a href="/curriculum/rubric">The six-criterion rubric</a> (proposed; not yet calibrated).</li>
      <li><a href="/curriculum">Module outcomes, tasks and assessment</a>.</li>
    </ul>

    <h2>Evaluation checklist for any AI output</h2>
    <ol>
      <li>Does it do what the brief asked, for the stated audience?</li>
      <li>Is each consequential claim supported by a source you can see? Does the number match exactly, for the same group and period?</li>
      <li>Can each reference be found? If not, remove it.</li>
      <li>Are calculations reproduced independently, for example in a spreadsheet?</li>
      <li>What is missing: costs, risks, counter-evidence, constraints?</li>
      <li>Is certainty overstated? Does "shows" or "caused" go beyond what the source says?</li>
      <li>Does it include anything you were not allowed to share, or that belongs to someone else?</li>
      <li>Can you explain and defend every sentence you keep?</li>
    </ol>

    <h2>Example tasks for your discipline</h2>
    <ul>
      <li><strong>Business:</strong> check an AI summary of a (fictional) company's annual report against the report itself.</li>
      <li><strong>Health sciences:</strong> decide whether AI may be used with de-identified case notes under your placement's rules.</li>
      <li><strong>Humanities:</strong> brief an AI to compare two supplied primary sources, then check every quotation.</li>
      <li><strong>Engineering:</strong> ask for a spreadsheet formula for a unit conversion and test it against known values.</li>
    </ul>

    <h2>Assignment AI-use wording</h2>
    <p>The four settings available for each assignment, with plain-language wording you can reuse:</p>
    <dl class="kv">${policyWording.map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl>

    <h2>Disclosure template for students</h2>
    <p class="ai-output">I used [tool and model, if known] to [purpose] on [which parts]. I checked [what] against [which sources or methods]. I changed or removed [what]. The final wording and judgements are my own, except [any exceptions].</p>

    ${Object.entries(faqs).map(([group, items]) => html`<h2>Questions from ${group.toLowerCase()}</h2>${items.map(([q, a]) => html`<details class="disclosure"><summary>${q}</summary><p>${a}</p></details>`)}`)}
    ${PRIMARY_CTAS}
  </section>`;
  return page({ title: 'Resources and FAQ', description: 'Teaching materials, checklists, assignment wording and answers to common questions.', body, user: ctx.user, path: '/resources' });
}

function status(ctx) {
  const areas = [...new Set(FEATURES.map((f) => f.area))];
  const body = html`<section class="wrap section">
    <h1>Feature status</h1>
    <p class="lead">What works today, what needs pilot setup and what is planned. Updated with each release. This is a prototype and is not ready for large institutional deployment.</p>
    <dl class="kv">${Object.values(FEATURE_STATUS).map((s) => html`<dt>${chip(s.label, s.kind)}</dt><dd>${s.note}</dd>`)}</dl>
    ${areas.map((a) => html`<div class="table-wrap" tabindex="0" role="region" aria-label="Table, scrolls sideways on small screens"><table><caption>${a}</caption>
      <thead><tr><th scope="col">Capability</th><th scope="col">Status</th><th scope="col">Notes</th></tr></thead>
      <tbody>${FEATURES.filter((f) => f.area === a).map((f) => html`<tr><td>${f.name}</td><td>${statusChip(f.status)}</td><td>${f.note || ''}</td></tr>`)}</tbody></table></div>`)}
  </section>`;
  return page({ title: 'Feature status', description: 'Implemented, tested, pilot-only and planned capabilities.', body, user: ctx.user, path: '/status' });
}

const INTERESTS = [['pilot', 'An institutional pilot'], ['demo', 'A demonstration'], ['question', 'A question (data, accessibility, security or other)']];

function contactForm(ctx, { values = {}, errors = {}, failure = '' } = {}) {
  const v = (k) => values[k] || '';
  const err = (k) => (errors[k] ? html`<p class="error-text" id="${k}-err">${errors[k]}</p>` : '');
  const desc = (k) => (errors[k] ? raw(` aria-describedby="${k}-err" aria-invalid="true"`) : '');
  const interest = values.interest || ctx.query.interest || 'pilot';
  const body = html`<section class="wrap narrow section">
    <h1>Request a pilot or demonstration</h1>
    <p class="lead">Tell us about your course or department. We aim to reply within five working days.</p>
    ${failure ? html`<div class="note bad" role="alert"><p><strong>Your request was not saved.</strong> ${failure}</p></div>` : ''}
    ${Object.keys(errors).length ? html`<div class="note bad" role="alert"><p><strong>Please correct the highlighted fields.</strong></p></div>` : ''}
    <form method="post" action="/contact" novalidate>
      <div class="field"><label for="name">Your name</label>${err('name')}<input type="text" id="name" name="name" autocomplete="name" value="${v('name')}" required${desc('name')}></div>
      <div class="field"><label for="email">Work email</label>${err('email')}<input type="email" id="email" name="email" autocomplete="email" value="${v('email')}" required${desc('email')}></div>
      <div class="field"><label for="institution">Institution</label>${err('institution')}<input type="text" id="institution" name="institution" autocomplete="organization" value="${v('institution')}" required${desc('institution')}></div>
      <div class="field"><label for="role">Your role</label>${err('role')}<input type="text" id="role" name="role" value="${v('role')}" required${desc('role')}><p class="hint-text">For example: lecturer, head of teaching and learning, learning technologist.</p></div>
      <fieldset><legend>I'm interested in</legend><div class="radio-row">
        ${INTERESTS.map(([k, l]) => html`<label><input type="radio" name="interest" value="${k}"${interest === k ? raw(' checked') : ''}> ${l}</label>`)}
      </div></fieldset>
      <div class="field"><label for="learners">Approximate number of students (optional)</label><input type="text" id="learners" name="learners" value="${v('learners')}"></div>
      <div class="field"><label for="message">Anything else (optional)</label><textarea id="message" name="message" rows="5">${v('message')}</textarea><p class="hint-text">Please don't include student information.</p></div>
      <div class="visually-hidden" aria-hidden="true"><label for="website">Leave this empty</label><input type="text" id="website" name="website" tabindex="-1" autocomplete="off"></div>
      <p class="small muted">We use these details only to reply to your request and keep a record of it. We don't add you to a mailing list.</p>
      <button type="submit">Send request</button>
    </form>
  </section>`;
  return page({ title: 'Contact', description: 'Request an institutional pilot or demonstration.', body, user: ctx.user, path: '/contact' });
}

function contactSubmit(ctx) {
  const b = ctx.body;
  const values = Object.fromEntries(['name', 'email', 'institution', 'role', 'interest', 'learners', 'message'].map((k) => [k, typeof b[k] === 'string' ? b[k].trim().slice(0, 4000) : '']));
  if (b.website) return ctx.html(contactForm(ctx, { values, failure: 'The form looked automated. If you are a person, please try again.' }), 400);
  const errors = {};
  if (!values.name) errors.name = 'Enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Enter an email address like name@university.edu.';
  if (!values.institution) errors.institution = 'Enter your institution.';
  if (!values.role) errors.role = 'Enter your role.';
  if (!INTERESTS.some(([k]) => k === values.interest)) values.interest = 'pilot';
  if (Object.keys(errors).length) return ctx.html(contactForm(ctx, { values, errors }), 400);
  let id;
  try {
    id = Number(ctx.db.prepare('INSERT INTO pilot_requests (name, email, institution, role, interest, learners, message) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(values.name, values.email, values.institution, values.role, values.interest, values.learners, values.message).lastInsertRowid);
  } catch (err) {
    console.error('pilot request not saved', err);
    const alt = process.env.CONTACT_EMAIL ? `Please email ${process.env.CONTACT_EMAIL} instead.` : 'No alternative contact address is configured for this deployment yet, so please try again later.';
    return ctx.html(contactForm(ctx, { values, failure: `A server error stopped us saving it. ${alt}` }), 503);
  }
  const body = html`<section class="wrap narrow section">
    <h1>Request received</h1>
    <p class="flash" role="status">Your request has been saved (reference ${id}).</p>
    <p>No confirmation email is sent automatically. We aim to reply to ${values.email} within five working days.</p>
    <div class="actions"><a class="button" href="/try">Try a sample lesson</a><a class="button secondary" href="/curriculum">View the curriculum</a></div>
  </section>`;
  return ctx.html(page({ title: 'Request received', body, user: ctx.user, path: '/contact' }));
}

export function registerPublic(router) {
  const wrap = (fn) => (ctx) => ctx.html(fn(ctx));
  router.get('/', wrap(home));
  router.get('/how-it-works', wrap(howItWorks));
  router.get('/curriculum', wrap(curriculum));
  router.get('/curriculum/rubric', wrap(rubric));
  router.get('/curriculum/sample-lesson', wrap(sampleLessonPlan));
  router.get('/curriculum/:slug', wrap(moduleDetail));
  router.get('/institutions', wrap(institutions));
  router.get('/research', wrap(research));
  router.get('/plans', wrap(plans));
  router.get('/trust', wrap(trust));
  router.get('/resources', wrap(resources));
  router.get('/status', wrap(status));
  router.get('/contact', wrap((ctx) => contactForm(ctx)));
  router.post('/contact', contactSubmit);
}
