import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, MAX_SHOWN } from '../src/feedback.js';
import { LESSONS } from '../src/content/lessons.js';
import { parseResponse } from '../src/views/lesson.js';
import { evidenceForm } from './helpers.js';

const evidence = LESSONS['checking-claims-and-sources'];
const suitability = LESSONS['choosing-suitable-tasks'];
const brief = LESSONS['defining-a-useful-request'];

test('a fully correct evidence answer has no issues and is independent', () => {
  const r = evaluate(evidence, parseResponse(evidence, evidenceForm()));
  assert.deepEqual(r.issues.map((i) => i.code), []);
  assert.equal(r.provisional.verification, 3);
  assert.equal(r.metrics.claimsCorrect, 6);
  assert.equal(r.metrics.independentCorrect, true);
});

test('the lesson\'s own example corrected answer passes the checks', () => {
  const r = evaluate(evidence, parseResponse(evidence, evidenceForm({ corrected: evidence.exampleCorrected, uncertainty: evidence.exampleUncertainty })));
  assert.deepEqual(r.issues.map((i) => i.code), []);
});

test('accepting the fabricated reference is the first issue shown, and at most two are shown', () => {
  const r = evaluate(evidence, parseResponse(evidence, evidenceForm({ uncertainty: '' }, { C5: ['supported', '', ''], C6: ['supported', 'C', ''], C3: ['supported', 'B', ''] })));
  assert.equal(r.shown[0].code, 'fabricated_accepted');
  assert.equal(r.shown[1].code, 'cost_missed');
  assert.ok(r.shown.length <= MAX_SHOWN);
  assert.ok(r.issues.length > MAX_SHOWN);
});

test('keeping the fabricated figure in the corrected answer caps verification at "not yet"', () => {
  const r = evaluate(evidence, parseResponse(evidence, evidenceForm({ corrected: 'Use rises about 20% (Marlow & Achebe, 2021). Cost is £74,000.' })));
  assert.ok(r.issues.some((i) => i.code === 'fabricated_retained'));
  assert.equal(r.provisional.verification, 0);
});

test('hints or revision cap the provisional level at "limited support"', () => {
  const resp = parseResponse(evidence, evidenceForm());
  assert.equal(evaluate(evidence, resp, { hintsUsed: 1 }).provisional.verification, 2);
  assert.equal(evaluate(evidence, resp, { versionNo: 2, previousIssueCodes: ['cost_missed'] }).provisional.verification, 2);
});

test('revision credit depends on resolving the issues shown last time', () => {
  const resp = parseResponse(evidence, evidenceForm());
  const fixed = evaluate(evidence, resp, { versionNo: 2, previousIssueCodes: ['fabricated_accepted', 'cost_missed'] });
  assert.equal(fixed.provisional.revision, 2);
  assert.deepEqual(fixed.resolved, ['fabricated_accepted', 'cost_missed']);
  const notFixed = evaluate(evidence, parseResponse(evidence, evidenceForm({}, { C5: ['supported', '', ''] })), { versionNo: 2, previousIssueCodes: ['fabricated_accepted'] });
  assert.equal(notFixed.provisional.revision, 0);
});

test('an empty evidence submission asks for verdicts first', () => {
  const r = evaluate(evidence, {});
  assert.equal(r.shown[0].code, 'unanswered');
  assert.equal(r.provisional.verification, 0);
});

test('suitability: the example response passes; rule-breaking choices are prioritised', () => {
  const ex = suitability.exampleResponse.decisions;
  const good = { decisions: {
    S1: { decision: 'suitable', reason: ex.S1 }, S2: { decision: 'not_suitable', reason: ex.S2 }, S3: { decision: 'not_suitable', reason: ex.S3 },
    S4: { decision: 'with_conditions', reason: ex.S4 }, S5: { decision: 'not_suitable', reason: ex.S5 }, S6: { decision: 'with_conditions', reason: ex.S6 },
  }, own_task: 'Summarising a journal article for a seminar.', own_decision: 'with_conditions', own_reason: suitability.exampleResponse.own };
  const r = evaluate(suitability, good);
  assert.deepEqual(r.issues.map((i) => i.code), []);
  assert.equal(r.provisional.tool_selection, 3);
  const bad = evaluate(suitability, { ...good, decisions: { ...good.decisions, S3: { decision: 'suitable', reason: 'It is only flow.' } } });
  assert.equal(bad.shown[0].code, 'wrong_S3');
  assert.equal(bad.provisional.tool_selection, 1);
});

test('brief: the example response passes; vague criteria and missing constraints are flagged', () => {
  const ex = brief.exampleResponse;
  const r = evaluate(brief, { ...ex });
  assert.deepEqual(r.issues.map((i) => i.code), []);
  assert.equal(r.provisional.task_definition, 3);
  assert.equal(r.provisional.instruction_quality, 3);
  const weak = evaluate(brief, { ...ex, success_criteria: 'Engaging', prompt_v1: 'Write about social media for small businesses.' });
  assert.deepEqual(weak.shown.map((i) => i.code), ['criteria_uncheckable', 'constraints_not_carried']);
});

test('prompt length is not rewarded: a long generic prompt still misses constraints', () => {
  const ex = brief.exampleResponse;
  const long = 'You are a world-class expert marketing strategist with decades of experience. '.repeat(20) + 'Write a comprehensive guide to social media.';
  const r = evaluate(brief, { ...ex, prompt_v1: long });
  assert.ok(r.issues.some((i) => i.code === 'constraints_not_carried'));
  assert.ok(r.provisional.instruction_quality <= 1);
});

test('saying the unverified figure was removed is not treated as keeping it', () => {
  const r = evaluate(evidence, parseResponse(evidence, evidenceForm({ corrected: `${evidenceForm().corrected} I removed a claimed 20% increase because I could not find the study.` })));
  assert.ok(!r.issues.some((i) => i.code === 'fabricated_retained'));
});

test('correcting the membership figure is not flagged; repeating it is', () => {
  const base = evidenceForm().corrected;
  const ok = evaluate(evidence, parseResponse(evidence, evidenceForm({ corrected: `${base} The answer said 16% but the source says 6%, which was corrected.` })));
  assert.ok(!ok.issues.some((i) => i.code === 'membership_misstated'));
  const bad = evaluate(evidence, parseResponse(evidence, evidenceForm({ corrected: `${base} The trial caused new memberships to rise.` })));
  assert.ok(bad.issues.some((i) => i.code === 'membership_misstated'));
});

test('accepting the invented reference caps verification at "substantial support"', () => {
  const r = evaluate(evidence, parseResponse(evidence, evidenceForm({}, { C5: ['supported', '', ''] })));
  assert.equal(r.metrics.claimsCorrect, 5);
  assert.equal(r.provisional.verification, 1);
});
