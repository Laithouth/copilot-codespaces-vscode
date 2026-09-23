// Module 5 (working with numbers): feedback rules and the workspace flow.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, parseNumber } from '../src/feedback.js';
import { LESSONS, salesFigures } from '../src/content/lessons.js';
import { parseResponse } from '../src/views/lesson.js';
import { registerProvider } from '../src/ai.js';
import { startApp, client, makeInstitution, makeUser, makeCourse, makeAssignment } from './helpers.js';

const lesson = LESSONS['working-with-numbers'];
const ex = lesson.exampleResponse;
const codes = (r) => r.issues.map((i) => i.code);

// Form values mirroring the example response.
function numbersForm(overrides = {}) {
  return {
    question: ex.question, definition: ex.definition, definition_reason: ex.definition_reason,
    missing_row: ex.missing_row, handling: ex.handling, handling_note: ex.handling_note, other_issue: ex.other_issue,
    val_North: '5.0', val_South: '20.0', val_East: '2.3', val_West: '25.0', top_region: 'West',
    check_region: 'West', check_value: '25', check_method: ex.check_method, recommendation: ex.recommendation,
    ind_correct: 'no', ind_kg: '4.54', ind_formula: '=B2/2.2046', disclosure: 'I did not use AI.',
    ...overrides,
  };
}
const evalForm = (o, ctx) => evaluate(lesson, parseResponse(lesson, numbersForm(o)), ctx);

test('answer key: three definitions give three different top regions', () => {
  const f = salesFigures('estimate');
  const top = (m) => Object.entries(f).sort((a, b) => b[1][m] - a[1][m])[0][0];
  assert.deepEqual([top('gross'), top('net'), top('growth')], ['East', 'North', 'West']);
  assert.equal(f.East.gross, 65750);
});

test('the example response has no issues and reaches the top levels', () => {
  const r = evalForm();
  assert.deepEqual(codes(r), []);
  assert.deepEqual(r.provisional, { task_definition: 3, verification: 3 });
  assert.equal(r.metrics.valuesCorrect, 4);
  assert.equal(r.metrics.independentCorrect, true);
});

test('number parsing accepts currency, commas and percent signs', () => {
  assert.equal(parseNumber('£61,500'), 61500);
  assert.equal(parseNumber('25%'), 25);
  assert.equal(parseNumber(' 2.3 '), 2.3);
  assert.equal(parseNumber('about 60k'), null);
});

test('treating the blank as zero is the first issue and caps verification at 0', () => {
  const r = evalForm({ handling: 'zero' });
  assert.equal(r.shown[0].code, 'missing_as_zero');
  assert.equal(r.provisional.verification, 0);
});

test('a gross total for East of about £32,500 reveals an unstated zero', () => {
  const r = evalForm({ definition: 'gross', val_North: '61500', val_South: '52250', val_East: '32500', val_West: '45000', top_region: 'North', check_region: 'North', check_value: '61,500' });
  assert.equal(r.shown[0].code, 'missing_as_zero');
});

test('any valid definition is accepted when the figures match it', () => {
  const net = evalForm({ definition: 'net', val_North: '£59,500', val_South: '51,400', val_East: '57650', val_West: '44550', top_region: 'North', check_region: 'North', check_value: '59500' });
  assert.deepEqual(codes(net), []);
  const gross = evalForm({ definition: 'gross', val_North: '61500', val_South: '52250', val_East: '65750', val_West: '45000', top_region: 'East', check_region: 'East', check_value: '65750' });
  assert.deepEqual(codes(gross), []);
});

test('wrong figures, an inconsistent top region and a failed recalculation are flagged', () => {
  const r = evalForm({ val_South: '12', top_region: 'South', check_value: '30' });
  assert.deepEqual(codes(r), ['values_wrong', 'top_inconsistent', 'no_recalculation']);
  assert.match(r.shown[0].title, /South/);
  assert.equal(r.provisional.verification, 1);
});

test('excluding the missing quarter is flagged as an unfair comparison', () => {
  const r = evalForm({ handling: 'exclude', definition: 'gross', val_North: '61500', val_South: '52250', val_East: '32500', val_West: '45000', top_region: 'North', check_region: 'North', check_value: '61500' });
  assert.deepEqual(codes(r), ['exclude_bias']);
  assert.equal(r.provisional.verification, 2);
});

test('no definition or reason lowers task definition; a missing gap is noticed', () => {
  const r = evalForm({ definition_reason: 'Seems best.', question: '' });
  assert.ok(codes(r).includes('definition_unstated'));
  assert.equal(r.provisional.task_definition, 1);
  assert.ok(codes(evalForm({ missing_row: 'None' })).includes('missing_not_found'));
});

test('undisclosed estimate, missing limitations, missed returns and length are flagged', () => {
  const rec = 'Put the extra rep in West, which grew fastest at 25% from Q1 to Q2.';
  const r = evalForm({ recommendation: rec, other_issue: '' });
  assert.deepEqual(codes(r), ['returns_missed', 'assumption_undisclosed', 'limitations_missing']);
  assert.ok(codes(evalForm({ recommendation: `${ex.recommendation} ${'More detail. '.repeat(40)}` })).includes('too_long'));
});

test('independent item: accepting the wrong formula or a wrong kg value is not credited', () => {
  assert.equal(evalForm({ ind_correct: 'yes' }).metrics.independentCorrect, false);
  assert.equal(evalForm({ ind_kg: '22.05' }).metrics.independentCorrect, false);
  assert.equal(evalForm({ ind_correct: 'yes' }).provisional.verification, 2);
});

test('hints cap the provisional level at "limited support"', () => {
  assert.equal(evalForm({}, { hintsUsed: 1 }).provisional.verification, 2);
});

// Workspace flow over HTTP.
let app; let S; let calls = [];
registerProvider('fake-numbers', {
  label: 'Fake', configured: () => true,
  async run({ model, prompt }) { calls.push(prompt); return { status: 'ok', output: '=C3/C2-1', servedModel: model }; },
});
before(async () => {
  app = await startApp();
  const instId = makeInstitution(app.db, 'Numbers U');
  app.db.prepare(`UPDATE institutions SET approved_provider = 'fake-numbers', monthly_model_run_cap = 10 WHERE id = ?`).run(instId);
  const edu = makeUser(app.db, { email: 'edu@n.test', instId, role: 'educator' });
  const stu = makeUser(app.db, { email: 'stu@n.test', instId, role: 'student' });
  const courseId = makeCourse(app.db, { instId, code: 'N1', educatorId: edu, studentIds: [stu] });
  S = { stu, courseId, aid: makeAssignment(app.db, { courseId, slug: 'working-with-numbers', competencies: ['task_definition', 'verification', 'responsible_use'] }) };
});
after(async () => { await app.close(); });

test('workspace: dataset shown, AI request carries the dataset, feedback, revision and report', async () => {
  const s = client(app.base);
  await s.login('stu@n.test');
  let r = await s.get(`/app/assignments/${S.aid}`);
  assert.match(r.text, /Dataset D \(synthetic\)/);
  assert.match(r.text, /<td>1,330<\/td><td><\/td><td>£4,200<\/td>/); // shown as an empty cell, as in a spreadsheet
  assert.match(r.text, /Dataset D is attached/);

  r = await s.follow(await s.post(`/app/assignments/${S.aid}`, { ...numbersForm(), ai_prompt: 'Give me a growth formula per region.', action: 'run_formula' }));
  assert.match(r.text, /AI output received and saved/);
  assert.match(calls[0], /<dataset name="Dataset D"/);
  assert.match(calls[0], /2025-Q2,East,1330,,4200/); // the blank is sent as a blank, not a zero

  r = await s.follow(await s.post(`/app/assignments/${S.aid}`, { ...numbersForm({ handling: 'zero' }), action: 'submit' }));
  assert.match(r.text, /counted as zero/);
  await s.post(`/app/assignments/${S.aid}`, { action: 'revise' });
  r = await s.follow(await s.post(`/app/assignments/${S.aid}`, { ...numbersForm(), action: 'submit' }));
  assert.match(r.text, /Resolved since last version/);
  assert.match(r.text, /East leads on gross revenue, North on net revenue and West on growth/);

  const e = client(app.base);
  await e.login('edu@n.test');
  r = await e.get(`/app/courses/${S.courseId}/report.csv`);
  const row = r.text.split('\r\n').find((l) => l.includes('stu@n.test'));
  assert.ok(row.endsWith(',growth,4/4,estimate,'), row);
  assert.ok(row.includes(',true,'), row);
  r = await e.get(`/app/assignments/${S.aid}/review`);
  assert.match(r.text, /P: Limited support/); // revision after feedback caps at 2
});

test('the dataset CSV is downloadable and labelled synthetic', async () => {
  const res = await fetch(`${app.base}/static/module5-sales-synthetic.csv`);
  const text = await res.text();
  assert.equal(res.status, 200);
  assert.match(text, /SYNTHETIC TEACHING DATA/);
  assert.match(text, /2025-Q2,East,1330,,4200/);
});
