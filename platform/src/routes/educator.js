import { html, raw, paras } from '../html.js';
import { page, chip, csrfField } from '../views/layout.js';
import { requireUser, requireCourseEducator, requireAssignment, requireStudentInCourse } from '../access.js';
import { LESSONS } from '../content/lessons.js';
import { COMPETENCIES, LEVELS, levelLabel, competencyByCode, RUBRIC_STATUS } from '../content/competencies.js';
import { lessonFields } from '../views/lesson.js';
import { issueInvite } from '../auth.js';
import { audit, tx } from '../db.js';
import { csvRow, badRequest } from '../http.js';
import { rubricTable } from './public.js';
import { AI_POLICY, SOLUTION_VISIBILITY, lessonFor, attemptsFor, feedbackForAttempt, modelRunsForAttempt, evidenceChecksForAttempt } from '../work.js';

const flashOf = (ctx) => String(ctx.query.msg || '').slice(0, 300);
const go = (ctx, path, msg) => ctx.redirect(`${path}${msg ? `?msg=${encodeURIComponent(msg)}` : ''}`);

export function baseUrl(ctx) {
  return process.env.PUBLIC_URL || `http://${ctx.req.headers.host || 'localhost'}`;
}

// Parses "name,email" lines. Returns {rows, errors}.
export function parseRoster(text) {
  const rows = []; const errors = [];
  String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((line, i) => {
    if (i === 0 && /^name\s*,\s*email$/i.test(line)) return;
    const parts = line.split(',').map((s) => s.trim());
    const email = parts.find((p) => p.includes('@')) || '';
    const name = parts.filter((p) => p !== email).join(' ').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) errors.push(`Line ${i + 1}: expected "name,email", got "${line}"`);
    else rows.push({ name: name.slice(0, 200), email: email.toLowerCase().slice(0, 320) });
  });
  return { rows: rows.slice(0, 1000), errors };
}

// Enrols roster rows as students of a course; returns invite links for new accounts.
export function importRoster(db, { course, rows, actorId, base }) {
  const invites = []; const skipped = [];
  tx(db, () => {
    for (const r of rows) {
      const { userId, invite } = issueInvite(db, r);
      const existingRole = db.prepare('SELECT role FROM memberships WHERE user_id = ? AND institution_id = ?').get(userId, course.institution_id)?.role;
      if (existingRole && existingRole !== 'student') { skipped.push(`${r.email} already has the ${existingRole} role in this institution`); continue; }
      if (!existingRole) db.prepare(`INSERT INTO memberships (user_id, institution_id, role) VALUES (?, ?, 'student')`).run(userId, course.institution_id);
      db.prepare(`INSERT OR IGNORE INTO course_members (course_id, user_id, role) VALUES (?, ?, 'student')`).run(course.id, userId);
      if (invite) invites.push({ ...r, link: `${base}/invite/${invite}` });
    }
  });
  audit(db, actorId, course.institution_id, 'roster_imported', { course: course.id, count: rows.length });
  return { invites, skipped };
}

function courseStudents(db, courseId) {
  return db.prepare(`SELECT u.id, u.name, u.email, (u.password_hash IS NOT NULL) AS active FROM course_members cm JOIN users u ON u.id = cm.user_id
    WHERE cm.course_id = ? AND cm.role = 'student' ORDER BY u.name`).all(courseId);
}

function coursePage(ctx, extra = '') {
  const user = requireUser(ctx);
  const course = requireCourseEducator(ctx, ctx.params.id);
  const db = ctx.db;
  const students = courseStudents(db, course.id);
  const assignments = db.prepare('SELECT * FROM assignments WHERE course_id = ? ORDER BY id').all(course.id);
  const submittedCount = (aid) => db.prepare(`SELECT COUNT(DISTINCT student_id) AS n FROM attempts WHERE assignment_id = ? AND status = 'submitted'`).get(aid).n;
  const openChallenges = db.prepare(`SELECT COUNT(*) AS n FROM challenges ch JOIN assignments a ON a.id = ch.assignment_id WHERE a.course_id = ? AND ch.status = 'open'`).get(course.id).n;

  const body = html`<section class="wrap section">
    <p><a href="/app">Dashboard</a></p>
    <h1>${course.code}: ${course.title}</h1>
    ${extra}
    ${openChallenges ? html`<p class="note"><strong>${openChallenges} open student challenge${openChallenges > 1 ? 's' : ''}.</strong> They appear on each student's review page.</p>` : ''}
    <div class="actions"><a class="button secondary" href="/app/courses/${course.id}/gaps">Cohort skill gaps</a><a class="button secondary" href="/app/courses/${course.id}/report.csv">Export course report (CSV)</a></div>

    <h2>Assignments</h2>
    ${assignments.length ? html`<div class="table-wrap" tabindex="0" role="region" aria-label="Table, scrolls sideways on small screens"><table><thead><tr><th scope="col">Assignment</th><th scope="col">Lesson</th><th scope="col">AI rule</th><th scope="col">Mode</th><th scope="col">Due</th><th scope="col">Submitted</th></tr></thead>
      <tbody>${assignments.map((a) => html`<tr><td><a href="/app/assignments/${a.id}/review">${a.title}</a></td><td>${lessonFor(a).title}</td><td>${AI_POLICY[a.ai_policy].label}</td><td>${a.mode}</td><td>${a.due_at || '—'}</td><td>${submittedCount(a.id)} of ${students.length}</td></tr>`)}</tbody></table></div>`
      : html`<p>No assignments yet.</p>`}

    <details class="disclosure"${assignments.length ? '' : raw(' open')}><summary>Assign a lesson</summary>
      <form method="post" action="/app/courses/${course.id}/assignments">${csrfField(user)}
        <div class="field"><label for="lesson">Lesson</label><select id="lesson" name="lesson">${Object.values(LESSONS).map((l) => html`<option value="${l.slug}">Module ${l.module}: ${l.title}</option>`)}</select></div>
        <div class="field"><label for="title">Assignment title</label><input type="text" id="title" name="title" required></div>
        <div class="field"><label for="due_at">Deadline (optional)</label><input type="date" id="due_at" name="due_at"></div>
        <fieldset><legend>AI use for this assignment</legend>${Object.entries(AI_POLICY).map(([k, p]) => html`<label class="check"><input type="radio" name="ai_policy" value="${k}"${k === 'limited' ? raw(' checked') : ''}> <span><strong>${p.label}.</strong> ${p.text}</span></label>`)}</fieldset>
        <div class="field"><label for="ai_policy_note">Permitted purposes or other AI notes (shown to students)</label><input type="text" id="ai_policy_note" name="ai_policy_note" placeholder="For example: only for the rewrite step and checking your own summary"></div>
        <fieldset><legend>Mode</legend><div class="radio-row"><label><input type="radio" name="mode" value="practice" checked> Practice (hints, immediate provisional feedback)</label><label><input type="radio" name="mode" value="assessment"> Assessment (no hints; feedback after your review)</label></div></fieldset>
        <div class="field"><label for="solution_visibility">When may students see the example answer?</label><select id="solution_visibility" name="solution_visibility">${Object.entries(SOLUTION_VISIBILITY).map(([k, v]) => html`<option value="${k}"${k === 'after_submit' ? raw(' selected') : ''}>${v}</option>`)}</select></div>
        <fieldset><legend>Learning objectives to assess</legend><p class="hint-text">Defaults to the lesson's criteria. Only these criteria receive levels for this assignment.</p>
          ${COMPETENCIES.map((c) => html`<label class="check"><input type="checkbox" name="competencies" value="${c.code}"> ${c.title}</label>`)}</fieldset>
        <div class="field"><label for="instructions_note">Additional instructions for students (optional)</label><textarea id="instructions_note" name="instructions_note" rows="3"></textarea></div>
        <button type="submit">Create assignment</button>
      </form></details>

    <h2>Students (${students.length})</h2>
    ${students.length ? html`<div class="table-wrap" tabindex="0" role="region" aria-label="Table, scrolls sideways on small screens"><table><thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Account</th></tr></thead>
      <tbody>${students.map((s) => html`<tr><td>${s.name}</td><td>${s.email}</td><td>${s.active ? chip('Active', 'good') : chip('Invited, not yet signed in', 'warn')}</td></tr>`)}</tbody></table></div>` : html`<p>No students enrolled yet.</p>`}
    <details class="disclosure"><summary>Import students (CSV)</summary>
      <form method="post" action="/app/courses/${course.id}/roster">${csrfField(user)}
        <label for="roster">One student per line: <code>name,email</code></label>
        <p class="hint-text">Accounts are created with invitation links, which you share with students. Emails are not sent automatically yet.</p>
        <textarea id="roster" name="roster" rows="6" placeholder="Alex Example,alex@example.edu"></textarea>
        <button type="submit">Import and enrol</button></form></details>

    <h2>Rubric</h2><p class="small muted">${RUBRIC_STATUS}</p>
    <details class="disclosure"><summary>Show the rubric</summary>${rubricTable()}</details>
  </section>`;
  return page({ title: course.code, body, user, app: true, csrf: user.csrf, flash: flashOf(ctx) });
}

function createAssignment(ctx) {
  const user = requireUser(ctx);
  const course = requireCourseEducator(ctx, ctx.params.id);
  const b = ctx.body;
  const lesson = LESSONS[b.lesson];
  if (!lesson) throw badRequest('Choose a lesson.');
  const title = String(b.title || '').trim().slice(0, 200) || lesson.title;
  if (!AI_POLICY[b.ai_policy] || !['practice', 'assessment'].includes(b.mode) || !SOLUTION_VISIBILITY[b.solution_visibility]) throw badRequest('Choose the AI rule, mode and example-answer setting.');
  const due = /^\d{4}-\d{2}-\d{2}$/.test(b.due_at || '') ? b.due_at : null;
  let comps = [].concat(b.competencies || []).filter((c) => competencyByCode[c]);
  if (!comps.length) comps = lesson.competencies;
  const info = ctx.db.prepare(`INSERT INTO assignments (course_id, lesson_slug, title, instructions_note, due_at, ai_policy, ai_policy_note, mode, solution_visibility, competencies, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(course.id, lesson.slug, title, String(b.instructions_note || '').slice(0, 2000), due, b.ai_policy,
    String(b.ai_policy_note || '').slice(0, 500), b.mode, b.solution_visibility, JSON.stringify(comps), user.id);
  audit(ctx.db, user.id, course.institution_id, 'assignment_created', { id: Number(info.lastInsertRowid) });
  go(ctx, `/app/courses/${course.id}`, `Assignment "${title}" created.`);
}

function rosterPost(ctx) {
  const user = requireUser(ctx);
  const course = requireCourseEducator(ctx, ctx.params.id);
  const { rows, errors } = parseRoster(ctx.body.roster);
  const { invites, skipped } = importRoster(ctx.db, { course, rows, actorId: user.id, base: baseUrl(ctx) });
  const extra = html`<div class="card spaced" role="status"><h2>Import result</h2><p>${rows.length - skipped.length} student${rows.length - skipped.length === 1 ? '' : 's'} enrolled.</p>
    ${errors.length ? html`<p class="error-text">Not imported:</p><ul>${errors.map((e) => html`<li>${e}</li>`)}</ul>` : ''}
    ${skipped.length ? html`<p class="error-text">Skipped:</p><ul>${skipped.map((e) => html`<li>${e}</li>`)}</ul>` : ''}
    ${invites.length ? html`<p><strong>Invitation links</strong> (valid 14 days; shown once, share each only with that student):</p><div class="table-wrap" tabindex="0" role="region" aria-label="Table, scrolls sideways on small screens"><table><thead><tr><th scope="col">Student</th><th scope="col">Link</th></tr></thead><tbody>${invites.map((i) => html`<tr><td>${i.name} (${i.email})</td><td><code>${i.link}</code></td></tr>`)}</tbody></table></div>` : ''}</div>`;
  ctx.html(coursePage(ctx, extra));
}

function reviewList(ctx) {
  const user = requireUser(ctx);
  const { assignment, course } = requireAssignment(ctx, ctx.params.id, 'educator');
  const db = ctx.db;
  const comps = JSON.parse(assignment.competencies);
  const students = courseStudents(db, course.id);
  const body = html`<section class="wrap section">
    <p><a href="/app/courses/${course.id}">${course.code}</a></p>
    <h1>Review: ${assignment.title}</h1>
    <p>${chip(AI_POLICY[assignment.ai_policy].label)} ${chip(assignment.mode === 'practice' ? 'Practice mode' : 'Assessment mode')} ${chip(`Example answer: ${SOLUTION_VISIBILITY[assignment.solution_visibility]}`)}</p>
    <p class="small muted">"P" = provisional level from automated checks (not yet reviewed). Confirmed levels are yours.</p>
    <div class="table-wrap" tabindex="0" role="region" aria-label="Table, scrolls sideways on small screens"><table><thead><tr><th scope="col">Student</th><th scope="col">Versions</th><th scope="col">Hints</th>${comps.map((c) => html`<th scope="col">${competencyByCode[c].title}</th>`)}<th scope="col">Open challenges</th></tr></thead>
    <tbody>${students.map((s) => {
      const attempts = attemptsFor(db, assignment.id, s.id);
      const submitted = attempts.filter((a) => a.status === 'submitted').length;
      const ass = Object.fromEntries(db.prepare('SELECT * FROM assessments WHERE assignment_id = ? AND student_id = ?').all(assignment.id, s.id).map((r) => [r.competency, r]));
      const ch = db.prepare(`SELECT COUNT(*) AS n FROM challenges WHERE assignment_id = ? AND student_id = ? AND status = 'open'`).get(assignment.id, s.id).n;
      return html`<tr><td><a href="/app/assignments/${assignment.id}/students/${s.id}">${s.name}</a></td>
        <td>${submitted ? `${submitted} submitted` : attempts.length ? 'Draft only' : 'Not started'}</td><td>${attempts.reduce((n, a) => n + a.hints_used, 0)}</td>
        ${comps.map((c) => { const r = ass[c]; return html`<td>${!r ? '—' : r.status === 'final' ? chip(`Confirmed: ${LEVELS[r.level].short}`, 'good') : chip(`P: ${LEVELS[r.provisional_level].short}`, 'warn')}</td>`; })}
        <td>${ch ? chip(`${ch} open`, 'bad') : '—'}</td></tr>`;
    })}</tbody></table></div>
  </section>`;
  return page({ title: `Review ${assignment.title}`, body, user, app: true, csrf: user.csrf, flash: flashOf(ctx) });
}

const VERDICT_LABEL = (lesson, v) => lesson.verdicts?.find(([k]) => k === v)?.[1] || v || 'No verdict';

function studentReview(ctx) {
  const user = requireUser(ctx);
  const { assignment, course } = requireAssignment(ctx, ctx.params.id, 'educator');
  const student = requireStudentInCourse(ctx, course.id, ctx.params.sid);
  const db = ctx.db;
  const lesson = lessonFor(assignment);
  const attempts = attemptsFor(db, assignment.id, student.id);
  const comps = JSON.parse(assignment.competencies);
  const ass = Object.fromEntries(db.prepare('SELECT * FROM assessments WHERE assignment_id = ? AND student_id = ?').all(assignment.id, student.id).map((r) => [r.competency, r]));
  const challenges = db.prepare('SELECT * FROM challenges WHERE assignment_id = ? AND student_id = ? ORDER BY id').all(assignment.id, student.id);
  const latestSubmitted = [...attempts].reverse().find((a) => a.status === 'submitted');
  const base = `/app/assignments/${assignment.id}/students/${student.id}`;

  const versions = [...attempts].reverse().map((a) => {
    const fbs = feedbackForAttempt(db, a.id);
    const checks = evidenceChecksForAttempt(db, a.id);
    return html`<details class="disclosure"${a === attempts[attempts.length - 1] ? raw(' open') : ''}><summary>Version ${a.version_no} · ${a.status === 'submitted' ? `submitted ${a.submitted_at} UTC` : 'draft (not submitted)'} · hints ${a.hints_used}${a.dictation_used ? ' · speech input used' : ''}</summary>
      <p class="who student">Student's work</p>
      ${lessonFields(lesson, a.response, { readOnly: true })}
      ${a.response.ai_prompt ? html`<p><strong>Instruction to AI:</strong> ${a.response.ai_prompt}</p><p><strong>Student's check of the AI output:</strong> ${a.response.ai_review || '—'}</p>` : ''}
      <p><strong>Disclosure:</strong> ${a.disclosure || '—'}</p>
      ${checks.length ? html`<div class="table-wrap" tabindex="0" role="region" aria-label="Table, scrolls sideways on small screens"><table><caption>Evidence checks against the answer key</caption><thead><tr><th scope="col">Claim</th><th scope="col">Student verdict</th><th scope="col">Source</th><th scope="col">Note</th><th scope="col">Matches key</th></tr></thead>
        <tbody>${checks.map((c) => html`<tr><th scope="row">${c.claim_key}</th><td>${VERDICT_LABEL(lesson, c.verdict)}</td><td>${c.source_ref || '—'}</td><td>${c.note || '—'}</td><td>${c.correct ? chip('Yes', 'good') : chip('No', 'bad')}</td></tr>`)}</tbody></table></div>` : ''}
      ${modelRunsForAttempt(db, a.id).map((r) => html`<div class="version"><p class="who ai">AI run · ${r.source === 'platform' ? 'platform' : 'recorded by student'} · ${r.status} · model ${r.served_model || r.requested_model || 'unknown'} · ${r.settings.purpose || ''} · ${r.created_at} UTC</p>
        <details><summary>Prompt</summary><p class="ai-output">${r.prompt}</p></details>${r.output ? html`<p class="ai-output">${r.output}</p>` : html`<p class="error-text">${r.error || ''}</p>`}</div>`)}
      ${fbs.map((f) => f.author_type === 'automated' ? html`<div class="card spaced"><p class="who">Automated feedback · ${f.status}</p>
          <ul>${f.body.shown.map((i) => html`<li><strong>${i.title}</strong> ${i.why}</li>`)}</ul>
          ${f.body.issues.length > f.body.shown.length ? html`<details><summary>All ${f.body.issues.length} issues found</summary><ul>${f.body.issues.map((i) => html`<li>${i.title}</li>`)}</ul></details>` : ''}
          ${f.body.edited_text ? html`<p><strong>Your edited version:</strong></p>${paras(f.body.edited_text)}` : ''}
          <form method="post" action="${base}/feedback">${csrfField(user)}<input type="hidden" name="feedback_id" value="${f.id}">
            <div class="actions"><button type="submit" name="action" value="approve" class="secondary">Approve as shown</button><button type="submit" name="action" value="withhold" class="secondary">Withhold from student</button></div>
            <label for="edit-${f.id}">Or replace with your own wording</label><textarea id="edit-${f.id}" name="edited_text" rows="3">${f.body.edited_text || ''}</textarea>
            <button type="submit" name="action" value="edit" class="secondary">Save edited feedback</button></form></div>`
        : html`<div class="card spaced"><p class="who educator">Your feedback · ${f.author_name}</p>${paras(f.body.text)}</div>`)}
      ${a.status === 'submitted' ? html`<form method="post" action="${base}/feedback">${csrfField(user)}<input type="hidden" name="attempt_id" value="${a.id}">
        <label for="fb-${a.id}">Add formative feedback on version ${a.version_no}</label><textarea id="fb-${a.id}" name="text" rows="3"></textarea>
        <button type="submit" name="action" value="add" class="secondary">Add feedback</button></form>` : ''}
    </details>`;
  });

  const body = html`<section class="wrap section">
    <p><a href="/app/assignments/${assignment.id}/review">All students</a></p>
    <h1>${student.name}: ${assignment.title}</h1>
    <p class="small muted">Formative feedback and assessment decisions are separate. Feedback helps the student revise; the confirmed levels below are the assessment record.</p>
    ${challenges.map((c) => html`<div class="note${c.status === 'open' ? ' bad' : ''}"><p><strong>Student challenge (${c.status}):</strong> ${c.message}</p>
      ${c.response ? html`<p><strong>Your response:</strong> ${c.response}</p>` : html`<form method="post" action="${base}/challenge/${c.id}">${csrfField(user)}<label for="ch-${c.id}">Your response</label><textarea id="ch-${c.id}" name="response" rows="3" required></textarea><button type="submit">Respond and resolve</button></form>`}</div>`)}
    <h2>Versions</h2>${versions.length ? versions : html`<p>Not started.</p>`}
    <h2>Assessment</h2>
    <p class="small muted">${RUBRIC_STATUS} A reason is required when your level differs from the provisional level.</p>
    ${latestSubmitted ? html`<form method="post" action="${base}/assess">${csrfField(user)}
      ${comps.map((code) => { const r = ass[code]; const c = competencyByCode[code]; const current = r?.status === 'final' ? r.level : r?.provisional_level ?? '';
        return html`<fieldset><legend>${c.title}</legend>
          <p class="small">${r ? html`Provisional: <strong>${r.provisional_level !== null ? LEVELS[r.provisional_level].label : 'none'}</strong>${r.status === 'final' ? html` · Confirmed: <strong>${levelLabel(r.level)}</strong>` : ''}` : 'No provisional level (automated checks don\'t cover this criterion).'}</p>
          <label for="level_${code}">Level</label><select id="level_${code}" name="level_${code}"><option value="">Not assessed</option>${LEVELS.map((l) => html`<option value="${l.value}"${current === l.value ? raw(' selected') : ''}>${l.label}</option>`)}</select>
          <details><summary>Descriptors</summary><ol start="0">${c.levels.map((d) => html`<li>${d}</li>`)}</ol></details>
          <label for="reason_${code}">Reason or note</label><input type="text" id="reason_${code}" name="reason_${code}" value="${r?.override_reason || ''}"></fieldset>`; })}
      <button type="submit">Confirm levels</button></form>` : html`<p>Nothing submitted yet.</p>`}
  </section>`;
  return page({ title: student.name, body, user, app: true, csrf: user.csrf, flash: flashOf(ctx) });
}

function feedbackPost(ctx) {
  const user = requireUser(ctx);
  const { assignment, course } = requireAssignment(ctx, ctx.params.id, 'educator');
  const student = requireStudentInCourse(ctx, course.id, ctx.params.sid);
  const db = ctx.db;
  const base = `/app/assignments/${assignment.id}/students/${student.id}`;
  const b = ctx.body;
  if (b.action === 'add') {
    const attempt = db.prepare(`SELECT id FROM attempts WHERE id = ? AND assignment_id = ? AND student_id = ? AND status = 'submitted'`).get(b.attempt_id, assignment.id, student.id);
    const text = String(b.text || '').trim().slice(0, 8000);
    if (!attempt || !text) return go(ctx, base, 'Write feedback before adding it.');
    db.prepare(`INSERT INTO feedback (attempt_id, author_type, author_id, body, status) VALUES (?, 'educator', ?, ?, 'approved')`).run(attempt.id, user.id, JSON.stringify({ text }));
    audit(db, user.id, course.institution_id, 'feedback_added', { attempt: attempt.id });
    return go(ctx, base, 'Feedback added. The student can see it now.');
  }
  const fb = db.prepare(`SELECT f.* FROM feedback f JOIN attempts a ON a.id = f.attempt_id WHERE f.id = ? AND a.assignment_id = ? AND a.student_id = ? AND f.author_type = 'automated'`).get(b.feedback_id, assignment.id, student.id);
  if (!fb) return go(ctx, base, 'Feedback not found.');
  const bodyJson = JSON.parse(fb.body);
  if (b.action === 'approve') db.prepare(`UPDATE feedback SET status = 'approved', reviewed_by = ? WHERE id = ?`).run(user.id, fb.id);
  else if (b.action === 'withhold') db.prepare(`UPDATE feedback SET status = 'withheld', reviewed_by = ? WHERE id = ?`).run(user.id, fb.id);
  else if (b.action === 'edit') {
    const text = String(b.edited_text || '').trim().slice(0, 8000);
    if (!text) return go(ctx, base, 'Write the edited feedback first.');
    db.prepare(`UPDATE feedback SET status = 'edited', reviewed_by = ?, body = ? WHERE id = ?`).run(user.id, JSON.stringify({ ...bodyJson, edited_text: text }), fb.id);
  } else return go(ctx, base, '');
  audit(db, user.id, course.institution_id, `feedback_${b.action}`, { feedback: fb.id });
  go(ctx, base, 'Feedback updated.');
}

function assessPost(ctx) {
  const user = requireUser(ctx);
  const { assignment, course } = requireAssignment(ctx, ctx.params.id, 'educator');
  const student = requireStudentInCourse(ctx, course.id, ctx.params.sid);
  const db = ctx.db;
  const base = `/app/assignments/${assignment.id}/students/${student.id}`;
  const latest = db.prepare(`SELECT id FROM attempts WHERE assignment_id = ? AND student_id = ? AND status = 'submitted' ORDER BY version_no DESC LIMIT 1`).get(assignment.id, student.id);
  if (!latest) return go(ctx, base, 'Nothing submitted yet.');
  const comps = JSON.parse(assignment.competencies);
  const problems = [];
  const updates = [];
  for (const code of comps) {
    const rawLevel = ctx.body[`level_${code}`];
    if (rawLevel === '' || rawLevel === undefined) continue;
    const level = Number(rawLevel);
    if (![0, 1, 2, 3].includes(level)) { problems.push(`${competencyByCode[code].title}: invalid level.`); continue; }
    const reason = String(ctx.body[`reason_${code}`] || '').trim().slice(0, 1000);
    const existing = db.prepare('SELECT * FROM assessments WHERE assignment_id = ? AND student_id = ? AND competency = ?').get(assignment.id, student.id, code);
    if (existing && existing.provisional_level !== null && existing.provisional_level !== level && !reason) {
      problems.push(`${competencyByCode[code].title}: give a reason, because your level differs from the provisional level.`);
      continue;
    }
    updates.push({ code, level, reason, existing });
  }
  if (problems.length) return go(ctx, base, `Not saved. ${problems.join(' ')}`);
  tx(db, () => {
    for (const u of updates) {
      db.prepare(`INSERT INTO assessments (assignment_id, student_id, attempt_id, competency, provisional_level, level, override_reason, assessor_id, status)
        VALUES (?, ?, ?, ?, NULL, ?, ?, ?, 'final')
        ON CONFLICT(assignment_id, student_id, competency) DO UPDATE SET level = excluded.level, override_reason = excluded.override_reason,
          assessor_id = excluded.assessor_id, attempt_id = excluded.attempt_id, status = 'final', updated_at = datetime('now')`)
        .run(assignment.id, student.id, latest.id, u.code, u.level, u.reason || null, user.id);
    }
  });
  audit(db, user.id, course.institution_id, 'assessment_confirmed', { assignment: assignment.id, student: student.id, count: updates.length });
  go(ctx, base, `${updates.length} level${updates.length === 1 ? '' : 's'} confirmed.`);
}

function challengeResolve(ctx) {
  const user = requireUser(ctx);
  const { assignment, course } = requireAssignment(ctx, ctx.params.id, 'educator');
  const student = requireStudentInCourse(ctx, course.id, ctx.params.sid);
  const response = String(ctx.body.response || '').trim().slice(0, 4000);
  const base = `/app/assignments/${assignment.id}/students/${student.id}`;
  if (!response) return go(ctx, base, 'Write a response first.');
  const info = ctx.db.prepare(`UPDATE challenges SET status = 'resolved', response = ? WHERE id = ? AND assignment_id = ? AND student_id = ?`).run(response, ctx.params.cid, assignment.id, student.id);
  if (info.changes) audit(ctx.db, user.id, course.institution_id, 'challenge_resolved', { challenge: ctx.params.cid });
  go(ctx, base, info.changes ? 'Challenge resolved.' : 'Challenge not found.');
}

// Cohort skill gaps: distributions and the most common issues across each
// student's latest submission. No individual names are shown.
export function cohortGaps(db, courseId) {
  const assignments = db.prepare('SELECT * FROM assignments WHERE course_id = ?').all(courseId);
  const byComp = {};
  const issueCounts = {};
  let latestSubmissions = 0;
  for (const a of assignments) {
    for (const r of db.prepare('SELECT * FROM assessments WHERE assignment_id = ?').all(a.id)) {
      const d = (byComp[r.competency] ||= { final: [0, 0, 0, 0], provisional: [0, 0, 0, 0] });
      if (r.status === 'final') d.final[r.level]++; else if (r.provisional_level !== null) d.provisional[r.provisional_level]++;
    }
    const latest = db.prepare(`SELECT f.body FROM attempts at JOIN feedback f ON f.attempt_id = at.id AND f.author_type = 'automated'
      WHERE at.assignment_id = ? AND at.status = 'submitted' AND at.version_no = (SELECT MAX(version_no) FROM attempts x WHERE x.assignment_id = at.assignment_id AND x.student_id = at.student_id AND x.status = 'submitted')`).all(a.id);
    for (const row of latest) {
      latestSubmissions++;
      for (const i of JSON.parse(row.body).issues) {
        const key = `${a.lesson_slug}:${i.code}`;
        (issueCounts[key] ||= { count: 0, title: i.title, next: i.next, lesson: LESSONS[a.lesson_slug].title }).count++;
      }
    }
  }
  const topIssues = Object.values(issueCounts).sort((x, y) => y.count - x.count).slice(0, 5);
  return { byComp, topIssues, latestSubmissions };
}

function gapsPage(ctx) {
  const user = requireUser(ctx);
  const course = requireCourseEducator(ctx, ctx.params.id);
  const { byComp, topIssues, latestSubmissions } = cohortGaps(ctx.db, course.id);
  const body = html`<section class="wrap section">
    <p><a href="/app/courses/${course.id}">${course.code}</a></p>
    <h1>Cohort skill gaps</h1>
    <p>Aggregated across ${latestSubmissions} latest submission${latestSubmissions === 1 ? '' : 's'}. No individual students are named and there are no rankings.</p>
    <div class="table-wrap" tabindex="0" role="region" aria-label="Table, scrolls sideways on small screens"><table><caption>Levels by criterion (confirmed, with provisional in brackets)</caption>
      <thead><tr><th scope="col">Criterion</th>${LEVELS.map((l) => html`<th scope="col">${l.short}</th>`)}</tr></thead>
      <tbody>${COMPETENCIES.filter((c) => byComp[c.code]).map((c) => html`<tr><th scope="row">${c.title}</th>${LEVELS.map((l) => html`<td>${byComp[c.code].final[l.value]} <span class="muted">(${byComp[c.code].provisional[l.value]})</span></td>`)}</tr>`)}</tbody></table></div>
    <h2>What to teach next</h2>
    ${topIssues.length ? html`<ol>${topIssues.map((i) => html`<li><strong>${i.title}</strong> (${i.count} of ${latestSubmissions} latest submissions; ${i.lesson}). Suggested focus: ${i.next}</li>`)}</ol>
      <p class="small muted">Based on automated provisional checks of each student's latest submission. Treat these as prompts for your own judgement.</p>` : html`<p>No submissions yet.</p>`}
  </section>`;
  return page({ title: 'Cohort skill gaps', body, user, app: true, csrf: user.csrf });
}

export function courseReportCsv(db, course) {
  const assignments = db.prepare('SELECT * FROM assignments WHERE course_id = ? ORDER BY id').all(course.id);
  const students = courseStudents(db, course.id);
  const lines = [csvRow(['course', 'student_name', 'student_email', 'assignment', 'lesson', 'ai_policy', 'mode', 'versions_submitted', 'last_submitted_utc', 'hints_used', 'claims_correct_latest', 'independent_item_correct_latest',
    ...COMPETENCIES.map((c) => `confirmed_${c.code}`), ...COMPETENCIES.map((c) => `provisional_${c.code}`),
    'numbers_definition_latest', 'numbers_figures_correct_latest', 'numbers_missing_value_handling_latest'])];
  for (const a of assignments) {
    for (const s of students) {
      const attempts = attemptsFor(db, a.id, s.id);
      const submitted = attempts.filter((x) => x.status === 'submitted');
      const last = submitted[submitted.length - 1];
      const ass = Object.fromEntries(db.prepare('SELECT * FROM assessments WHERE assignment_id = ? AND student_id = ?').all(a.id, s.id).map((r) => [r.competency, r]));
      let claims = ''; let independent = '';
      if (last && a.lesson_slug === 'checking-claims-and-sources') {
        const checks = evidenceChecksForAttempt(db, last.id);
        claims = `${checks.filter((c) => c.correct).length}/${checks.length}`;
        independent = last.response.independent?.verdict ? String(LESSONS[a.lesson_slug].independent.expected.includes(last.response.independent.verdict)) : '';
      }
      let numbers = ['', '', ''];
      if (last && LESSONS[a.lesson_slug].type === 'numbers') {
        const m = feedbackForAttempt(db, last.id).find((f) => f.author_type === 'automated')?.body.metrics || {};
        numbers = [m.definition || '', m.valuesCorrect === null || m.valuesCorrect === undefined ? '' : `${m.valuesCorrect}/4`, m.handling || ''];
        independent = m.independentCorrect === null || m.independentCorrect === undefined ? '' : String(m.independentCorrect);
      }
      lines.push(csvRow([course.code, s.name, s.email, a.title, LESSONS[a.lesson_slug].title, a.ai_policy, a.mode, submitted.length, last?.submitted_at || '', attempts.reduce((n, x) => n + x.hints_used, 0), claims, independent,
        ...COMPETENCIES.map((c) => (ass[c.code]?.status === 'final' ? ass[c.code].level : '')),
        ...COMPETENCIES.map((c) => (ass[c.code]?.status === 'provisional' ? ass[c.code].provisional_level : '')), ...numbers]));
    }
  }
  return lines.join('\r\n') + '\r\n';
}

export function registerEducator(router) {
  router.get('/app/courses/:id', (ctx) => ctx.html(coursePage(ctx)));
  router.post('/app/courses/:id/assignments', createAssignment);
  router.post('/app/courses/:id/roster', rosterPost);
  router.get('/app/courses/:id/gaps', (ctx) => ctx.html(gapsPage(ctx)));
  router.get('/app/courses/:id/report.csv', (ctx) => {
    const user = requireUser(ctx);
    const course = requireCourseEducator(ctx, ctx.params.id);
    audit(ctx.db, user.id, course.institution_id, 'course_report_exported', { course: course.id });
    ctx.download(courseReportCsv(ctx.db, course), `${course.code.replace(/[^\w-]/g, '_')}-report.csv`, 'text/csv; charset=utf-8');
  });
  router.get('/app/assignments/:id/review', (ctx) => ctx.html(reviewList(ctx)));
  router.get('/app/assignments/:id/students/:sid', (ctx) => ctx.html(studentReview(ctx)));
  router.post('/app/assignments/:id/students/:sid/feedback', feedbackPost);
  router.post('/app/assignments/:id/students/:sid/assess', assessPost);
  router.post('/app/assignments/:id/students/:sid/challenge/:cid', challengeResolve);
}
