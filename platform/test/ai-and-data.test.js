// Model failures and budget limits; retention, deletion, contact flow and the
// stateless public sample.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, client, makeInstitution, makeUser, makeCourse, makeAssignment, evidenceForm } from './helpers.js';
import { registerProvider, runForAttempt, budgetState } from '../src/ai.js';
import { applyRetention } from '../src/retention.js';
import { deleteLearnerData } from '../src/routes/admin.js';
import { LESSONS } from '../src/content/lessons.js';

let app; let calls = []; let behaviour = 'ok';
registerProvider('fake', {
  label: 'Fake test provider',
  configured: () => true,
  async run({ model, prompt }) {
    calls.push({ model, prompt });
    if (behaviour === 'throw') { const e = new Error('upstream down'); e.status = 529; throw e; }
    if (behaviour === 'refuse') return { status: 'refused', servedModel: model, error: 'The model declined this request.' };
    return { status: 'ok', output: `Rewritten answer (${prompt.length} chars)`, servedModel: `${model}-served`, usage: { input_tokens: 10, output_tokens: 5 } };
  },
});

let S;
before(async () => {
  app = await startApp();
  const { db } = app;
  const instId = makeInstitution(db, 'Model U');
  const edu = makeUser(db, { email: 'edu@m.test', instId, role: 'educator' });
  const stu = makeUser(db, { email: 'stu@m.test', instId, role: 'student' });
  const courseId = makeCourse(db, { instId, code: 'M1', educatorId: edu, studentIds: [stu] });
  S = { instId, edu, stu, courseId, aid: makeAssignment(db, { courseId, policy: 'permitted' }), prohibited: makeAssignment(db, { courseId, policy: 'prohibited' }), brief: makeAssignment(db, { courseId, slug: 'defining-a-useful-request', competencies: ['task_definition', 'instruction_quality', 'revision'] }) };
});
after(async () => { await app.close(); });

const setInst = (fields) => {
  const sets = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
  app.db.prepare(`UPDATE institutions SET ${sets} WHERE id = ?`).run(...Object.values(fields), S.instId);
};

test('without credentials the live AI step says so honestly and the lesson still works', async () => {
  setInst({ approved_provider: 'anthropic', monthly_model_run_cap: 10 }); // no ANTHROPIC_API_KEY in tests
  const s = client(app.base);
  await s.login('stu@m.test');
  let r = await s.get(`/app/assignments/${S.aid}`);
  assert.match(r.text, /not configured on this server \(no credentials\)/);
  assert.doesNotMatch(r.text, /value="run_rewrite"/);
  r = await s.follow(await s.post(`/app/assignments/${S.aid}`, { ...evidenceForm(), ai_prompt: 'Rewrite from sources', action: 'run_rewrite' }));
  assert.match(r.text, /No AI output: The AI provider is not configured/);
  const run = app.db.prepare('SELECT * FROM model_runs ORDER BY id DESC LIMIT 1').get();
  assert.equal(run.status, 'unavailable');
  assert.equal(run.output, null);
});

test('a successful run records requested and served model, prompt and output', async () => {
  setInst({ approved_provider: 'fake', approved_model: 'test-model-1', monthly_model_run_cap: 10 });
  calls = []; behaviour = 'ok';
  const s = client(app.base);
  await s.login('stu@m.test');
  const r = await s.follow(await s.post(`/app/assignments/${S.aid}`, { ...evidenceForm(), ai_prompt: 'Rewrite using only the sources.', action: 'run_rewrite' }));
  assert.match(r.text, /AI output received and saved/);
  assert.match(r.text, /Model: test-model-1-served \(requested test-model-1\)/);
  assert.equal(calls.length, 1);
  assert.match(calls[0].prompt, /<source id="C"/); // sources attached
  const run = app.db.prepare(`SELECT * FROM model_runs WHERE status = 'ok' ORDER BY id DESC LIMIT 1`).get();
  assert.equal(run.requested_model, 'test-model-1');
  assert.equal(run.served_model, 'test-model-1-served');
  assert.equal(JSON.parse(run.settings).purpose, 'rewrite');
  // The student's draft (including the AI instruction) was saved before the run.
  const draft = app.db.prepare(`SELECT response FROM attempts WHERE assignment_id = ? AND status = 'draft'`).get(S.aid);
  assert.equal(JSON.parse(draft.response).ai_prompt, 'Rewrite using only the sources.');
});

test('both prompt versions are kept as separate runs in the brief lesson', async () => {
  behaviour = 'ok';
  const s = client(app.base);
  await s.login('stu@m.test');
  const ex = LESSONS['defining-a-useful-request'].exampleResponse;
  await s.post(`/app/assignments/${S.brief}`, { ...ex, action: 'run_v1' });
  await s.post(`/app/assignments/${S.brief}`, { ...ex, action: 'run_v2' });
  const runs = app.db.prepare(`SELECT r.prompt, r.settings FROM model_runs r JOIN attempts a ON a.id = r.attempt_id WHERE a.assignment_id = ? ORDER BY r.id`).all(S.brief);
  assert.deepEqual(runs.map((r) => JSON.parse(r.settings).purpose), ['prompt v1', 'prompt v2']);
  assert.equal(runs[0].prompt, ex.prompt_v1);
  assert.equal(runs[1].prompt, ex.prompt_v2);
});

test('provider errors and refusals are recorded without losing work', async () => {
  const s = client(app.base);
  await s.login('stu@m.test');
  behaviour = 'throw';
  let r = await s.follow(await s.post(`/app/assignments/${S.aid}`, { ...evidenceForm({ corrected: 'kept after failure' }), ai_prompt: 'x', action: 'run_rewrite' }));
  assert.match(r.text, /could not complete the request \(HTTP 529\)\. Your work is saved/);
  assert.match(r.text, /kept after failure/);
  behaviour = 'refuse';
  r = await s.follow(await s.post(`/app/assignments/${S.aid}`, { ...evidenceForm(), ai_prompt: 'x', action: 'run_rewrite' }));
  assert.match(r.text, /Declined by the model/);
  behaviour = 'ok';
});

test('prohibited assignments never call the provider, even if the form is forged', async () => {
  calls = [];
  const s = client(app.base);
  await s.login('stu@m.test');
  let r = await s.get(`/app/assignments/${S.prohibited}`);
  assert.match(r.text, /AI use is not permitted for this assignment/);
  r = await s.follow(await s.post(`/app/assignments/${S.prohibited}`, { ...evidenceForm(), ai_prompt: 'x', action: 'run_rewrite' }));
  assert.match(r.text, /AI use is not permitted/);
  r = await s.follow(await s.post(`/app/assignments/${S.prohibited}`, { ...evidenceForm(), paste_tool: 'Other AI', paste_output: 'text', action: 'paste' }));
  assert.match(r.text, /not permitted/);
  assert.equal(calls.length, 0);
});

test('the monthly limit stops runs, alerts first, and shows a clear message', async () => {
  const { db } = app;
  const used = budgetState(db, db.prepare('SELECT * FROM institutions WHERE id = ?').get(S.instId)).used;
  setInst({ monthly_model_run_cap: used + 1, budget_alert_percent: 50 });
  const inst = () => db.prepare('SELECT * FROM institutions WHERE id = ?').get(S.instId);
  assert.equal(budgetState(db, inst()).exhausted, false);
  assert.equal(budgetState(db, inst()).alert, true);
  calls = [];
  const attemptId = db.prepare('SELECT id FROM attempts WHERE assignment_id = ? ORDER BY id DESC').get(S.aid).id;
  const first = await runForAttempt(db, { institution: inst(), attemptId, aiPolicy: 'permitted', prompt: 'p', system: 's', purpose: 'test' });
  assert.equal(first.status, 'ok');
  const second = await runForAttempt(db, { institution: inst(), attemptId, aiPolicy: 'permitted', prompt: 'p', system: 's', purpose: 'test' });
  assert.equal(second.status, 'budget_exceeded');
  assert.equal(calls.length, 1);
  const s = client(app.base);
  await s.login('stu@m.test');
  const r = await s.get(`/app/assignments/${S.aid}`);
  assert.match(r.text, /reached its monthly AI limit/);
  const admin = client(app.base);
  await admin.login('admin@model-u.test');
  const ar = await admin.get(`/app/admin/${S.instId}`);
  assert.match(ar.text, /Limit reached: live AI step paused/);
});

test('recording output from another approved tool keeps the stated tool name', async () => {
  setInst({ monthly_model_run_cap: 0 });
  const s = client(app.base);
  await s.login('stu@m.test');
  const r = await s.follow(await s.post(`/app/assignments/${S.aid}`, { ...evidenceForm(), paste_tool: 'University Copilot (model shown: X-1)', paste_for: 'rewrite', paste_output: 'Pasted output text', action: 'paste' }));
  assert.match(r.text, /Output recorded/);
  assert.match(r.text, /AI output recorded by student/);
  assert.match(r.text, /Model: University Copilot \(model shown: X-1\)/);
});

test('retention deletes records older than the institution\'s period, and only those', () => {
  const { db } = app;
  setInst({ retention_days: 30 });
  const other = makeInstitution(db, 'Keep U');
  const edu = makeUser(db, { email: 'e@keep.test', instId: other, role: 'educator' });
  const stu = makeUser(db, { email: 's@keep.test', instId: other, role: 'student' });
  const c = makeCourse(db, { instId: other, code: 'K1', educatorId: edu, studentIds: [stu] });
  const a = makeAssignment(db, { courseId: c });
  db.prepare(`INSERT INTO attempts (assignment_id, student_id, version_no, status, response, created_at) VALUES (?, ?, 1, 'submitted', '{}', datetime('now', '-40 days'))`).run(a, stu);
  db.prepare(`UPDATE attempts SET created_at = datetime('now', '-40 days') WHERE assignment_id = ?`).run(S.aid);
  const before = db.prepare('SELECT COUNT(*) AS n FROM attempts WHERE assignment_id = ?').get(S.aid).n;
  assert.ok(before > 0);
  applyRetention(db);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM attempts WHERE assignment_id = ?').get(S.aid).n, 0);
  assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM model_runs WHERE institution_id = ? AND created_at < datetime('now', '-30 days')`).get(S.instId).n, 0);
  // Keep U has the default 365-day period, so its 40-day-old record stays.
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM attempts WHERE assignment_id = ?').get(a).n, 1);
});

test('learner deletion is scoped to one institution', () => {
  const { db } = app;
  const i1 = makeInstitution(db, 'Del One');
  const i2 = makeInstitution(db, 'Del Two');
  const u = makeUser(db, { email: 'both@del.test', instId: i1, role: 'student' });
  db.prepare(`INSERT INTO memberships (user_id, institution_id, role) VALUES (?, ?, 'student')`).run(u, i2);
  const mk = (inst, code) => {
    const e = makeUser(db, { email: `e-${code}@del.test`, instId: inst, role: 'educator' });
    const c = makeCourse(db, { instId: inst, code, educatorId: e, studentIds: [u] });
    const a = makeAssignment(db, { courseId: c });
    db.prepare(`INSERT INTO attempts (assignment_id, student_id, version_no, status, response) VALUES (?, ?, 1, 'submitted', '{}')`).run(a, u);
    return a;
  };
  const a1 = mk(i1, 'DA'); const a2 = mk(i2, 'DB');
  const res = deleteLearnerData(db, i1, u);
  assert.equal(res.accountDeleted, false);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM attempts WHERE assignment_id = ?').get(a1).n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM attempts WHERE assignment_id = ?').get(a2).n, 1);
  assert.equal(deleteLearnerData(db, i2, u).accountDeleted, true);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users WHERE id = ?').get(u).n, 0);
});

test('learner deletion through the admin page requires the email confirmation', async () => {
  const { db } = app;
  const inst = makeInstitution(db, 'Confirm U');
  const u = makeUser(db, { email: 'gone@confirm.test', instId: inst, role: 'student' });
  const admin = client(app.base);
  await admin.login('admin@confirm-u.test');
  await admin.get(`/app/admin/${inst}`);
  let r = await admin.follow(await admin.post(`/app/admin/${inst}/delete-learner`, { user_id: u, confirm: 'wrong@confirm.test' }));
  assert.match(r.text, /Nothing deleted/);
  r = await admin.follow(await admin.post(`/app/admin/${inst}/delete-learner`, { user_id: u, confirm: 'gone@confirm.test' }));
  assert.match(r.text, /Learner data deleted, including the account/);
  assert.ok(db.prepare(`SELECT 1 FROM audit_log WHERE action = 'learner_data_deleted'`).get());
});

test('pilot request form validates, stores and confirms only after saving', async () => {
  const c = client(app.base);
  let r = await c.post('/contact', { name: '', email: 'bad', institution: '', role: '' });
  assert.equal(r.status, 400);
  assert.match(r.text, /Please correct the highlighted fields/);
  assert.match(r.text, /aria-invalid="true"/);
  r = await c.post('/contact', { name: 'Lee Lecturer', email: 'lee@uni.test', institution: 'Some University', role: 'Lecturer', interest: 'pilot', learners: '80', message: 'Interested' });
  assert.equal(r.status, 200);
  assert.match(r.text, /Your request has been saved \(reference \d+\)/);
  assert.match(r.text, /No confirmation email is sent/);
  assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM pilot_requests WHERE email = ?').get('lee@uni.test').n, 1);
});

test('if the request cannot be saved, no confirmation is shown', async () => {
  const other = await startApp();
  other.db.exec('DROP TABLE pilot_requests');
  const r = await client(other.base).post('/contact', { name: 'Lee', email: 'lee@uni.test', institution: 'U', role: 'Lecturer', interest: 'demo' });
  await other.close();
  assert.equal(r.status, 503);
  assert.match(r.text, /Your request was not saved/);
  assert.doesNotMatch(r.text, /Request received|has been saved/);
});

test('the public sample lesson gives feedback and stores nothing', async () => {
  const { db } = app;
  const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all().map((t) => t.name);
  const counts = () => Object.fromEntries(tables.map((t) => [t, db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n]));
  const beforeCounts = counts();
  const c = client(app.base);
  let r = await c.get('/try');
  assert.match(r.text, /Nothing you type here is saved/);
  assert.match(r.text, /example answer appears after your first submission/);
  r = await c.post('/try', { ...evidenceForm({}, { C5: ['supported', '', ''] }), action: 'hint', hints: '0', version: '1' });
  assert.match(r.text, /Hints used: 1 of 3/);
  r = await c.post('/try', { ...evidenceForm({}, { C5: ['supported', '', ''] }), action: 'submit', hints: '1', version: '1' });
  assert.match(r.text, /Feedback on version 1/);
  assert.match(r.text, /relies on a reference/);
  assert.match(r.text, /Answer key/);
  assert.match(r.text, /name="prev_codes" value="fabricated_accepted"/);
  r = await c.post('/try', { ...evidenceForm(), action: 'submit', hints: '1', version: '2', prev_codes: 'fabricated_accepted' });
  assert.match(r.text, /Resolved since last version/);
  assert.deepEqual(counts(), beforeCounts);
});
