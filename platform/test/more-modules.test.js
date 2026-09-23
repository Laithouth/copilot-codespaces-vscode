// Modules 3, 6, 7 and 8: feedback rules and the workspace flow.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, parseDate } from '../src/feedback.js';
import { LESSONS } from '../src/content/lessons.js';
import { parseResponse } from '../src/views/lesson.js';
import { registerProvider } from '../src/ai.js';
import { startApp, client, makeInstitution, makeUser, makeCourse, makeAssignment } from './helpers.js';

const M3 = LESSONS['examples-and-structured-outputs'];
const M6 = LESSONS['research-and-communication'];
const M7 = LESSONS['responsible-workflows'];
const M8 = LESSONS['independent-application'];
const codes = (r) => r.issues.map((i) => i.code);

// Form bodies built from each lesson's example response, as a browser would post them.
function form3(o = {}) {
  const f = { prompt: M3.exampleResponse.prompt, comparison: M3.exampleResponse.comparison, ind_start: '15/01/2026', ind_fee: '£1,350', ind_notice: '30 ' };
  for (const [k, [v, w]] of Object.entries(M3.exampleResponse.cells)) { f[`cell_${k}`] = v; f[`where_${k}`] = w; }
  return { ...f, ...o };
}
function form6(o = {}, verdicts = {}) {
  const v = { K1: 'partly_supported', K2: 'contradicted', K3: 'partly_supported', K4: 'supported', K5: 'not_in_sources', ...verdicts };
  const f = { brief_text: M6.exampleResponse.brief_text, ind_report: 'R2', ind_limit: M6.exampleResponse.ind };
  for (const [k, x] of Object.entries(v)) { f[`v_${k}`] = x; f[`src_${k}`] = 'R1'; }
  return { ...f, ...o };
}
function form7(o = {}, decisions = {}) {
  const f = { revised: M7.exampleResponse.revised, disclosure_text: M7.exampleResponse.disclosure_text, ind_decision: 'change', ind_reason: M7.exampleResponse.ind };
  for (const [k, [d, r]] of Object.entries({ ...M7.exampleResponse.decisions, ...decisions })) { f[`d_${k}`] = d; f[`r_${k}`] = r; }
  return { ...f, ...o };
}
const form8 = (o = {}) => ({ ...M8.exampleResponse, ...o });
const ev = (lesson, body, ctx) => evaluate(lesson, parseResponse(lesson, body), ctx);

test('every new lesson\'s example response passes its own checks at the top levels', () => {
  for (const [lesson, body] of [[M3, form3()], [M6, form6()], [M7, form7()], [M8, form8()]]) {
    const r = ev(lesson, body);
    assert.deepEqual(codes(r), [], lesson.slug);
    assert.ok(Object.values(r.provisional).every((l) => l === 3), `${lesson.slug} ${JSON.stringify(r.provisional)}`);
  }
});

test('date parsing handles the common formats', () => {
  for (const d of ['1 March 2026', 'March 1, 2026', '01/03/2026', '2026-03-01', '1st of March 2026', '1 Mar 2026']) assert.equal(parseDate(d), '2026-03-01', d);
  assert.equal(parseDate('the first day of March'), null);
});

test('Module 3: the missed amendment and footnote come first and cap verification', () => {
  const r = ev(M3, form3({ cell_payment: '30', cell_footnote: 'not stated' }));
  assert.deepEqual(r.shown.map((i) => i.code), ['amendment_missed', 'footnote_missed']);
  assert.equal(r.provisional.verification, 1);
});

test('Module 3: the instruction is judged on boundary, example and missing-field rule, not length', () => {
  const long = 'Please extract all the important information from this agreement very carefully and accurately. '.repeat(10);
  const r = ev(M3, form3({ prompt: long }));
  assert.deepEqual(codes(r), ['prompt_no_missing_rule', 'prompt_no_boundary', 'prompt_no_example']);
  assert.equal(r.provisional.instruction_quality, 0);
});

test('Module 3: a wrong independent fee (ignoring Schedule 1) is not credited', () => {
  const r = ev(M3, form3({ ind_fee: '1200' }));
  assert.equal(r.metrics.independentCorrect, false);
  assert.equal(r.provisional.verification, 2);
});

test('Module 6: accepting the reversed productivity claim is the first issue', () => {
  const r = ev(M6, form6({}, { K2: 'supported' }));
  assert.equal(r.shown[0].code, 'productivity_misstated');
  assert.equal(r.provisional.verification, 1);
});

test('Module 6: a smooth brief that drops caveats and invents a figure is flagged', () => {
  const brief = 'Hybrid working is popular and productivity rose, and it cut turnover by 15%. Output fell 3%. Interpretation: keep hybrid working.';
  const r = ev(M6, form6({ brief_text: brief }));
  for (const c of ['brief_unsupported', 'brief_productivity', 'brief_confounder_missing', 'brief_disagreement_hidden', 'brief_weak_source']) assert.ok(codes(r).includes(c), c);
  assert.ok(!codes(r).includes('interpretation_unlabelled'));
});

test('Module 7: keeping the personal-data step is the first issue', () => {
  const r = ev(M7, form7({}, { W1: ['keep', 'It saves time.'] }));
  assert.equal(r.shown[0].code, 'wrong_W1');
  assert.ok(r.provisional.responsible_use <= 1);
});

test('Module 7: a disclosure that only says "we used AI" is incomplete', () => {
  const r = ev(M7, form7({ disclosure_text: 'We used AI.' }));
  assert.ok(codes(r).includes('disclosure_incomplete'));
  assert.match(r.issues.find((i) => i.code === 'disclosure_incomplete').title, /which tool/);
});

test('Module 8: charging Option B on the extra orders only is caught', () => {
  const final = 'Choose Option B. It costs £24.80 to £49.60 a month on 10–20 extra orders, against £29 for Option A. The extra orders are a guess.';
  const r = ev(M8, form8({ final_work: final, checks: '10 × £2.48 = £24.80; 20 × £2.48 = £49.60' }));
  assert.equal(r.shown[0].code, 'fees_extra_only');
  assert.equal(r.provisional.verification, 1);
});

test('Module 8: an incomplete record and unstated uncertainty are flagged', () => {
  const r = ev(M8, form8({ checks: '', final_work: 'Choose Option A: £29 a month against about £124 for Option B at 50 orders.' }));
  assert.equal(r.shown[0].code, 'record_incomplete');
  assert.ok(codes(r).includes('uncertainty_missing'));
});

// ---- Workspace flow over HTTP ----
let app; let S; const calls = [];
registerProvider('fake-more', { label: 'Fake', configured: () => true, async run({ model, prompt }) { calls.push(prompt); return { status: 'ok', output: 'Supplier | Northmill Flour Ltd | Clause 1', servedModel: model }; } });
before(async () => {
  app = await startApp();
  const instId = makeInstitution(app.db, 'Modules U');
  app.db.prepare(`UPDATE institutions SET approved_provider = 'fake-more', monthly_model_run_cap = 20 WHERE id = ?`).run(instId);
  const edu = makeUser(app.db, { email: 'edu@m8.test', instId, role: 'educator' });
  makeUser(app.db, { email: 'stu@m8.test', instId, role: 'student' });
  const stu = app.db.prepare('SELECT id FROM users WHERE email = ?').get('stu@m8.test').id;
  const courseId = makeCourse(app.db, { instId, code: 'M8', educatorId: edu, studentIds: [stu] });
  S = { courseId, ids: Object.fromEntries([M3, M6, M7, M8].map((l) => [l.module, makeAssignment(app.db, { courseId, slug: l.slug, competencies: l.competencies })])) };
});
after(async () => { await app.close(); });

test('workspace: each new lesson renders, runs its AI step where it has one, submits and reports', async () => {
  const s = client(app.base);
  await s.login('stu@m8.test');
  for (const [no, body, heading] of [[3, form3(), /Document A: Flour supply agreement/], [6, form6(), /The draft to check/], [7, form7(), /University AI policy excerpt/], [8, form8(), /Fact sheet/]]) {
    let r = await s.get(`/app/assignments/${S.ids[no]}`);
    assert.equal(r.status, 200);
    assert.match(r.text, heading);
    if (no === 7) assert.match(r.text, /doesn't use the live AI step/);
    r = await s.follow(await s.post(`/app/assignments/${S.ids[no]}`, { ...body, disclosure: 'As described in my record.', action: 'submit' }));
    assert.match(r.text, /No major issues found/, `module ${no}`);
    assert.match(r.text, /Example response/);
  }
  // AI step for Module 3 sends the student's own instruction with the document attached.
  await s.post(`/app/assignments/${S.ids[3]}`, { action: 'revise' });
  const r = await s.follow(await s.post(`/app/assignments/${S.ids[3]}`, { ...form3(), action: 'run_extract' }));
  assert.match(r.text, /AI output received and saved/);
  assert.ok(calls.at(-1).startsWith(M3.exampleResponse.prompt));
  assert.match(calls.at(-1), /<document id="A"/);
  // Module 6 uses its own AI instruction field.
  await s.post(`/app/assignments/${S.ids[6]}`, { action: 'revise' });
  await s.post(`/app/assignments/${S.ids[6]}`, { ...form6(), ai_prompt: 'Draft a faithful brief.', action: 'run_brief' });
  assert.ok(calls.at(-1).startsWith('Draft a faithful brief.'));
  assert.match(calls.at(-1), /<document id="R3"/);

  const e = client(app.base);
  await e.login('edu@m8.test');
  const csv = (await e.get(`/app/courses/${S.courseId}/report.csv`)).text.split('\r\n');
  assert.ok(csv.find((l) => l.includes('Examples and structured outputs')).endsWith(',8/8'));
  assert.ok(csv.find((l) => l.includes('Research and communication')).endsWith(',5/5'));
  assert.ok(csv.find((l) => l.includes('Responsible workflows')).endsWith(',6/6'));
  assert.ok(csv.find((l) => l.includes('Independent application')).endsWith(',comparison correct'));
});
