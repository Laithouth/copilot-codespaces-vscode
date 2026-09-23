import { html, raw } from '../html.js';
import { page, chip, csrfField } from '../views/layout.js';
import { requireUser, requireInstAdmin, requirePlatformAdmin } from '../access.js';
import { COMPETENCIES, LEVELS } from '../content/competencies.js';
import { budgetState, providerAvailability, providerLabel, DEFAULT_MODEL } from '../ai.js';
import { issueInvite } from '../auth.js';
import { audit, tx } from '../db.js';
import { csvRow, badRequest, notFound } from '../http.js';
import { baseUrl } from './educator.js';

const SUPPRESS_BELOW = 5;
const go = (ctx, path, msg) => ctx.redirect(`${path}${msg ? `?msg=${encodeURIComponent(msg)}` : ''}`);
const flashOf = (ctx) => String(ctx.query.msg || '').slice(0, 300);

function adminPage(ctx, extra = '') {
  const user = requireUser(ctx);
  const inst = requireInstAdmin(ctx, ctx.params.iid);
  const db = ctx.db;
  const budget = budgetState(db, inst);
  const avail = providerAvailability(inst);
  const courses = db.prepare(`SELECT c.*, (SELECT COUNT(*) FROM course_members m WHERE m.course_id = c.id AND m.role = 'student') AS students,
    (SELECT GROUP_CONCAT(u.name, ', ') FROM course_members m JOIN users u ON u.id = m.user_id WHERE m.course_id = c.id AND m.role = 'educator') AS educators
    FROM courses c WHERE c.institution_id = ? ORDER BY c.code`).all(inst.id);
  const members = db.prepare(`SELECT u.id, u.name, u.email, m.role, (u.password_hash IS NOT NULL) AS active FROM memberships m JOIN users u ON u.id = m.user_id
    WHERE m.institution_id = ? ORDER BY m.role, u.name`).all(inst.id);
  const base = `/app/admin/${inst.id}`;
  const body = html`<section class="wrap section">
    <p><a href="/app">Dashboard</a></p>
    <h1>Administration: ${inst.name}</h1>
    ${inst.is_demo ? html`<p class="note">Demonstration institution. Records here are fictional and kept separate from live institutions.</p>` : ''}
    ${extra}
    <h2>AI usage this month</h2>
    <p>${budget.cap > 0 ? html`${budget.used} of ${budget.cap} model runs used (${budget.percent}%). ${budget.exhausted ? chip('Limit reached: live AI step paused until next month', 'bad') : budget.alert ? chip(`Above the ${inst.budget_alert_percent}% alert threshold`, 'warn') : chip('Within limit', 'good')}` : 'Model runs are switched off (limit is 0).'}</p>
    <p>Provider status: ${avail.ok ? chip('Available', 'good') : html`${chip('Not available', 'warn')} ${avail.reason}`}</p>

    <h2>Settings</h2>
    <form method="post" action="${base}/settings">${csrfField(user)}
      <div class="field"><label for="approved_provider">Approved AI provider</label><select id="approved_provider" name="approved_provider">
        <option value="none"${inst.approved_provider === 'none' ? raw(' selected') : ''}>None (live AI step off)</option>
        <option value="anthropic"${inst.approved_provider === 'anthropic' ? raw(' selected') : ''}>${providerLabel('anthropic')}</option></select></div>
      <div class="field"><label for="approved_model">Approved model identifier</label><p class="hint-text">Leave empty to use the server default (${DEFAULT_MODEL}). Every run records the model that actually served it.</p><input type="text" id="approved_model" name="approved_model" value="${inst.approved_model || ''}"></div>
      <div class="field"><label for="cap">Monthly model-run limit (0 turns the live AI step off)</label><input type="number" id="cap" name="monthly_model_run_cap" min="0" max="1000000" value="${inst.monthly_model_run_cap}"></div>
      <div class="field"><label for="alert">Alert threshold (% of limit)</label><input type="number" id="alert" name="budget_alert_percent" min="1" max="100" value="${inst.budget_alert_percent}"></div>
      <div class="field"><label for="retention">Retention period for learning records (days)</label><p class="hint-text">Records older than this are deleted by the retention job. Minimum 30 days.</p><input type="number" id="retention" name="retention_days" min="30" max="3650" value="${inst.retention_days}"></div>
      <div class="field"><label for="permitted">Data rule shown to students</label><textarea id="permitted" name="permitted_data_note" rows="2">${inst.permitted_data_note}</textarea></div>
      <label class="check"><input type="checkbox" name="allow_dictation" value="1"${inst.allow_dictation ? raw(' checked') : ''}> Allow browser speech input (some browsers send audio to the browser vendor)</label>
      <div class="actions"><button type="submit">Save settings</button></div>
    </form>

    <h2>Courses</h2>
    ${courses.length ? html`<div class="table-wrap" tabindex="0" role="region" aria-label="Table, scrolls sideways on small screens"><table><thead><tr><th scope="col">Code</th><th scope="col">Title</th><th scope="col">Educators</th><th scope="col">Students</th></tr></thead>
      <tbody>${courses.map((c) => html`<tr><td>${c.code}</td><td>${c.title}</td><td>${c.educators || '—'}</td><td>${c.students}</td></tr>`)}</tbody></table></div>` : html`<p>No courses yet.</p>`}
    <details class="disclosure"><summary>Create a course and invite its educator</summary>
      <form method="post" action="${base}/courses">${csrfField(user)}
        <div class="field"><label for="code">Course code</label><input type="text" id="code" name="code" required></div>
        <div class="field"><label for="ctitle">Course title</label><input type="text" id="ctitle" name="title" required></div>
        <div class="field"><label for="ename">Educator name</label><input type="text" id="ename" name="educator_name" required></div>
        <div class="field"><label for="eemail">Educator email</label><input type="email" id="eemail" name="educator_email" required></div>
        <button type="submit">Create course</button></form></details>

    <h2>Reports and export</h2>
    <p>The institution report shows counts by course and criterion. Counts below ${SUPPRESS_BELOW} are shown as "&lt;${SUPPRESS_BELOW}" so individual students can't be identified.</p>
    <div class="actions"><a class="button secondary" href="${base}/report.csv">Export institution report (CSV)</a></div>

    <h2>People</h2>
    <div class="table-wrap" tabindex="0" role="region" aria-label="Table, scrolls sideways on small screens"><table><thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Account</th><th scope="col">Data</th></tr></thead>
      <tbody>${members.map((m) => html`<tr><td>${m.name}</td><td>${m.email}</td><td>${{ student: 'Student', educator: 'Educator', inst_admin: 'Administrator' }[m.role]}</td>
        <td>${m.active ? chip('Active', 'good') : chip('Invited', 'warn')}</td>
        <td>${m.role === 'student' ? html`<details><summary>Delete learner data</summary><form method="post" action="${base}/delete-learner">${csrfField(user)}<input type="hidden" name="user_id" value="${m.id}">
          <p class="small">Permanently deletes this learner's work, feedback, assessments and challenges in ${inst.name}, and removes them from its courses. This can't be undone.</p>
          <label for="confirm-${m.id}">Type the learner's email to confirm</label><input type="email" id="confirm-${m.id}" name="confirm" required>
          <button type="submit">Delete permanently</button></form></details>` : '—'}</td></tr>`)}</tbody></table></div>
  </section>`;
  return page({ title: `Admin: ${inst.name}`, body, user, app: true, csrf: user.csrf, flash: flashOf(ctx) });
}

function settingsPost(ctx) {
  const user = requireUser(ctx);
  const inst = requireInstAdmin(ctx, ctx.params.iid);
  const b = ctx.body;
  const int = (v, min, max) => { const n = parseInt(v, 10); if (Number.isNaN(n) || n < min || n > max) throw badRequest(`Enter a whole number between ${min} and ${max}.`); return n; };
  const provider = ['none', 'anthropic'].includes(b.approved_provider) ? b.approved_provider : 'none';
  const model = String(b.approved_model || '').trim();
  if (model && !/^[\w.:@/-]{1,100}$/.test(model)) throw badRequest('The model identifier contains unexpected characters.');
  ctx.db.prepare(`UPDATE institutions SET approved_provider = ?, approved_model = ?, monthly_model_run_cap = ?, budget_alert_percent = ?, retention_days = ?, permitted_data_note = ?, allow_dictation = ? WHERE id = ?`)
    .run(provider, model || null, int(b.monthly_model_run_cap, 0, 1000000), int(b.budget_alert_percent, 1, 100), int(b.retention_days, 30, 3650),
      String(b.permitted_data_note || '').trim().slice(0, 1000) || inst.permitted_data_note, b.allow_dictation === '1' ? 1 : 0, inst.id);
  audit(ctx.db, user.id, inst.id, 'settings_updated', { provider, model, cap: b.monthly_model_run_cap });
  go(ctx, `/app/admin/${inst.id}`, 'Settings saved.');
}

function coursePost(ctx) {
  const user = requireUser(ctx);
  const inst = requireInstAdmin(ctx, ctx.params.iid);
  const b = ctx.body;
  const code = String(b.code || '').trim().slice(0, 40); const title = String(b.title || '').trim().slice(0, 200);
  const name = String(b.educator_name || '').trim().slice(0, 200); const email = String(b.educator_email || '').trim().toLowerCase().slice(0, 320);
  if (!code || !title || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('Enter a course code, title, and the educator\'s name and email.');
  let invite = null; let courseId;
  const problem = tx(ctx.db, () => {
    const res = issueInvite(ctx.db, { name, email });
    invite = res.invite;
    const role = ctx.db.prepare('SELECT role FROM memberships WHERE user_id = ? AND institution_id = ?').get(res.userId, inst.id)?.role;
    if (role === 'student') return `${email} is a student in this institution and can't also be an educator here.`;
    if (!role) ctx.db.prepare(`INSERT INTO memberships (user_id, institution_id, role) VALUES (?, ?, 'educator')`).run(res.userId, inst.id);
    courseId = Number(ctx.db.prepare('INSERT INTO courses (institution_id, code, title, created_by) VALUES (?, ?, ?, ?)').run(inst.id, code, title, user.id).lastInsertRowid);
    ctx.db.prepare(`INSERT INTO course_members (course_id, user_id, role) VALUES (?, ?, 'educator')`).run(courseId, res.userId);
    return null;
  });
  if (problem) return go(ctx, `/app/admin/${inst.id}`, problem);
  audit(ctx.db, user.id, inst.id, 'course_created', { course: courseId });
  const extra = html`<div class="card spaced" role="status"><p>Course ${code} created.</p>${invite ? html`<p>Share this invitation link with ${name} (valid 14 days, shown once): <code>${baseUrl(ctx)}/invite/${invite}</code></p>` : html`<p>${name} already has an account and can see the course now.</p>`}</div>`;
  ctx.html(adminPage(ctx, extra));
}

// Deletes one learner's records within one institution. Other institutions'
// records are untouched; the account itself is deleted only if nothing remains.
export function deleteLearnerData(db, institutionId, userId) {
  return tx(db, () => {
    const courseIds = db.prepare('SELECT id FROM courses WHERE institution_id = ?').all(institutionId).map((c) => c.id);
    const assignmentIds = courseIds.length ? db.prepare(`SELECT id FROM assignments WHERE course_id IN (${courseIds.map(() => '?').join(',')})`).all(...courseIds).map((a) => a.id) : [];
    const inList = (ids) => ids.map(() => '?').join(',');
    if (assignmentIds.length) {
      for (const t of ['attempts', 'assessments', 'challenges']) {
        db.prepare(`DELETE FROM ${t} WHERE student_id = ? AND assignment_id IN (${inList(assignmentIds)})`).run(userId, ...assignmentIds);
      }
    }
    if (courseIds.length) db.prepare(`DELETE FROM course_members WHERE user_id = ? AND course_id IN (${inList(courseIds)})`).run(userId, ...courseIds);
    db.prepare('DELETE FROM memberships WHERE user_id = ? AND institution_id = ?').run(userId, institutionId);
    const remaining = db.prepare('SELECT COUNT(*) AS n FROM memberships WHERE user_id = ?').get(userId).n;
    const isPlatformAdmin = db.prepare('SELECT is_platform_admin FROM users WHERE id = ?').get(userId)?.is_platform_admin;
    if (!remaining && !isPlatformAdmin) db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    return { accountDeleted: !remaining && !isPlatformAdmin };
  });
}

function deleteLearnerPost(ctx) {
  const user = requireUser(ctx);
  const inst = requireInstAdmin(ctx, ctx.params.iid);
  const target = ctx.db.prepare(`SELECT u.id, u.email FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.institution_id = ? AND m.user_id = ? AND m.role = 'student'`).get(inst.id, ctx.body.user_id);
  if (!target) throw notFound('Learner not found in this institution.');
  if (String(ctx.body.confirm || '').trim().toLowerCase() !== target.email.toLowerCase()) return go(ctx, `/app/admin/${inst.id}`, 'Nothing deleted: the confirmation email did not match.');
  const res = deleteLearnerData(ctx.db, inst.id, target.id);
  audit(ctx.db, user.id, inst.id, 'learner_data_deleted', { user: target.id, accountDeleted: res.accountDeleted });
  go(ctx, `/app/admin/${inst.id}`, `Learner data deleted${res.accountDeleted ? ', including the account' : ' (the account remains because it belongs to another institution)'}.`);
}

export function institutionReportCsv(db, inst) {
  const fmt = (n) => (n > 0 && n < SUPPRESS_BELOW ? `<${SUPPRESS_BELOW}` : String(n));
  const budget = budgetState(db, inst);
  const lines = [
    csvRow(['institution', inst.name]),
    csvRow(['generated_utc', new Date().toISOString()]),
    csvRow(['model_runs_this_month', budget.used, 'monthly_limit', budget.cap]),
    csvRow(['note', `Counts between 1 and ${SUPPRESS_BELOW - 1} are suppressed. Levels are educator-confirmed unless the column says provisional. The rubric is a proposed, uncalibrated version.`]),
    '',
    csvRow(['course', 'enrolled_students', 'assignments', 'students_with_a_submission', 'criterion', ...LEVELS.map((l) => `confirmed_${l.short.toLowerCase().replace(/\s+/g, '_')}`), 'provisional_only']),
  ];
  const courses = db.prepare('SELECT * FROM courses WHERE institution_id = ? ORDER BY code').all(inst.id);
  for (const c of courses) {
    const enrolled = db.prepare(`SELECT COUNT(*) AS n FROM course_members WHERE course_id = ? AND role = 'student'`).get(c.id).n;
    const assignments = db.prepare('SELECT COUNT(*) AS n FROM assignments WHERE course_id = ?').get(c.id).n;
    const submitters = db.prepare(`SELECT COUNT(DISTINCT at.student_id) AS n FROM attempts at JOIN assignments a ON a.id = at.assignment_id WHERE a.course_id = ? AND at.status = 'submitted'`).get(c.id).n;
    for (const comp of COMPETENCIES) {
      const rows = db.prepare(`SELECT s.status, s.level FROM assessments s JOIN assignments a ON a.id = s.assignment_id WHERE a.course_id = ? AND s.competency = ?`).all(c.id, comp.code);
      if (!rows.length) continue;
      const counts = LEVELS.map((l) => rows.filter((r) => r.status === 'final' && r.level === l.value).length);
      const prov = rows.filter((r) => r.status === 'provisional').length;
      lines.push(csvRow([c.code, fmt(enrolled), assignments, fmt(submitters), comp.title, ...counts.map(fmt), fmt(prov)]));
    }
  }
  return lines.join('\r\n') + '\r\n';
}

function platformPage(ctx, extra = '') {
  const user = requireUser(ctx);
  requirePlatformAdmin(ctx);
  const db = ctx.db;
  const insts = db.prepare(`SELECT i.*, (SELECT COUNT(*) FROM memberships m WHERE m.institution_id = i.id) AS members FROM institutions i ORDER BY i.name`).all();
  const requests = db.prepare('SELECT * FROM pilot_requests ORDER BY id DESC LIMIT 100').all();
  const body = html`<section class="wrap section">
    <p><a href="/app">Dashboard</a></p>
    <h1>Platform administration</h1>
    ${extra}
    <h2>Institutions</h2>
    <div class="table-wrap" tabindex="0" role="region" aria-label="Table, scrolls sideways on small screens"><table><thead><tr><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Members</th><th scope="col">Provider</th></tr></thead>
      <tbody>${insts.map((i) => html`<tr><td>${i.name}</td><td>${i.is_demo ? chip('Demo', 'warn') : 'Live'}</td><td>${i.members}</td><td>${providerLabel(i.approved_provider)}</td></tr>`)}</tbody></table></div>
    <details class="disclosure"><summary>Create an institution</summary>
      <form method="post" action="/app/platform/institutions">${csrfField(user)}
        <div class="field"><label for="iname">Institution name</label><input type="text" id="iname" name="name" required></div>
        <div class="field"><label for="aname">First administrator's name</label><input type="text" id="aname" name="admin_name" required></div>
        <div class="field"><label for="aemail">First administrator's email</label><input type="email" id="aemail" name="admin_email" required></div>
        <label class="check"><input type="checkbox" name="is_demo" value="1"> Demonstration institution (fictional data only)</label>
        <div class="actions"><button type="submit">Create institution</button></div></form></details>
    <h2>Pilot and demonstration requests</h2>
    ${requests.length ? html`<div class="table-wrap" tabindex="0" role="region" aria-label="Table, scrolls sideways on small screens"><table><thead><tr><th scope="col">Ref</th><th scope="col">Received (UTC)</th><th scope="col">Name</th><th scope="col">Institution</th><th scope="col">Role</th><th scope="col">Interest</th><th scope="col">Learners</th><th scope="col">Message</th></tr></thead>
      <tbody>${requests.map((r) => html`<tr><td>${r.id}</td><td>${r.created_at}</td><td>${r.name}<br><span class="small">${r.email}</span></td><td>${r.institution}</td><td>${r.role}</td><td>${r.interest}</td><td>${r.learners || '—'}</td><td>${r.message || '—'}</td></tr>`)}</tbody></table></div>` : html`<p>No requests yet.</p>`}
  </section>`;
  return page({ title: 'Platform', body, user, app: true, csrf: user.csrf, flash: flashOf(ctx) });
}

function institutionPost(ctx) {
  const user = requireUser(ctx);
  requirePlatformAdmin(ctx);
  const b = ctx.body;
  const name = String(b.name || '').trim().slice(0, 200); const adminName = String(b.admin_name || '').trim().slice(0, 200);
  const email = String(b.admin_email || '').trim().toLowerCase();
  if (!name || !adminName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('Enter the institution name and the administrator\'s name and email.');
  const { instId, invite } = createInstitution(ctx.db, { name, adminName, adminEmail: email, isDemo: b.is_demo === '1' });
  audit(ctx.db, user.id, instId, 'institution_created');
  ctx.html(platformPage(ctx, html`<div class="card spaced" role="status"><p>${name} created.</p>${invite ? html`<p>Invitation link for ${adminName} (valid 14 days, shown once): <code>${baseUrl(ctx)}/invite/${invite}</code></p>` : html`<p>${adminName} already has an account.</p>`}</div>`));
}

export function createInstitution(db, { name, adminName, adminEmail, isDemo = false }) {
  return tx(db, () => {
    const instId = Number(db.prepare('INSERT INTO institutions (name, is_demo) VALUES (?, ?)').run(name, isDemo ? 1 : 0).lastInsertRowid);
    const { userId, invite } = issueInvite(db, { name: adminName, email: adminEmail });
    db.prepare(`INSERT INTO memberships (user_id, institution_id, role) VALUES (?, ?, 'inst_admin')`).run(userId, instId);
    return { instId, userId, invite };
  });
}

export function registerAdmin(router) {
  router.get('/app/admin/:iid', (ctx) => ctx.html(adminPage(ctx)));
  router.post('/app/admin/:iid/settings', settingsPost);
  router.post('/app/admin/:iid/courses', coursePost);
  router.post('/app/admin/:iid/delete-learner', deleteLearnerPost);
  router.get('/app/admin/:iid/report.csv', (ctx) => {
    const user = requireUser(ctx);
    const inst = requireInstAdmin(ctx, ctx.params.iid);
    audit(ctx.db, user.id, inst.id, 'institution_report_exported');
    ctx.download(institutionReportCsv(ctx.db, inst), 'institution-report.csv', 'text/csv; charset=utf-8');
  });
  router.get('/app/platform', (ctx) => ctx.html(platformPage(ctx)));
  router.post('/app/platform/institutions', institutionPost);
}

