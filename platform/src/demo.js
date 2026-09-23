// Demonstration data: a clearly labelled fictional institution with all eight
// lessons assigned and students at different stages, so every screen has
// something realistic to show. Used by `npm run seed:demo` and the prototype
// export. Demo records live in their own institution (is_demo = 1) and use the
// .invalid email domain, so no real mailbox can receive anything.
import { tx, audit } from './db.js';
import { hashPassword } from './auth.js';
import { LESSONS } from './content/lessons.js';
import { getOrCreateDraft, saveDraft, submitAttempt, startRevision } from './work.js';

export const DEMO_INSTITUTION = 'Demo University (fictional)';
export const DEMO_PEOPLE = [
  ['Platform Admin (demo)', 'platform@demo.invalid', 'platform'],
  ['Morgan Admin (demo)', 'admin@demo.invalid', 'inst_admin'],
  ['Dr Robin Educator (demo)', 'educator@demo.invalid', 'educator'],
  ['Sam Student (demo)', 'student1@demo.invalid', 'student'],
  ['Jo Student (demo)', 'student2@demo.invalid', 'student'],
  ['Kai Student (demo)', 'student3@demo.invalid', 'student'],
];

const L = LESSONS;
const pairs = (o) => Object.fromEntries(Object.entries(o).map(([k, [a, b]]) => [k, a, b]).map(([k, a, b]) => [k, { a, b }]));

// A strong response for each lesson, built from the lesson's own example.
export function goodResponse(slug) {
  const l = L[slug];
  const e = l.exampleResponse;
  switch (slug) {
    case 'choosing-suitable-tasks':
      return { decisions: Object.fromEntries([...l.scenarios, l.independent].map((s) => [s.key, { decision: s.expected[0], reason: e.decisions[s.key] }])), own_task: 'Summarising a journal article for a seminar.', own_decision: 'with_conditions', own_reason: e.own };
    case 'checking-claims-and-sources':
      return { verdicts: Object.fromEntries(l.claims.map((c) => [c.key, { verdict: c.expected[0], source: c.source, note: c.explain }])), corrected: l.exampleCorrected, uncertainty: l.exampleUncertainty, independent: { verdict: 'contradicted', corrected: 'Saturday is the busiest day.' } };
    case 'examples-and-structured-outputs':
      return { cells: Object.fromEntries(Object.entries(pairs(e.cells)).map(([k, { a, b }]) => [k, { value: a, where: b }])), prompt: e.prompt, comparison: e.comparison, ind_start: '15 January 2026', ind_fee: '1350', ind_notice: '30' };
    case 'research-and-communication':
      return { verdicts: Object.fromEntries(l.claims.map((c) => [c.key, { verdict: c.expected[0], source: c.source, note: '' }])), brief_text: e.brief_text, ind_report: 'R2', ind_limit: e.ind };
    case 'responsible-workflows':
      return { decisions: Object.fromEntries(Object.entries(pairs(e.decisions)).map(([k, { a, b }]) => [k, { decision: a, reason: b }])), revised: e.revised, disclosure_text: e.disclosure_text, ind_decision: 'change', ind_reason: e.ind };
    default: // brief, numbers and capstone examples are already in response form
      return structuredClone(e);
  }
}

// A plausible first attempt with the lesson's most important mistake.
export function flawedResponse(slug) {
  const r = goodResponse(slug);
  switch (slug) {
    case 'choosing-suitable-tasks': r.decisions.S3 = { decision: 'suitable', reason: 'It only improves flow, the ideas are mine.' }; break;
    case 'defining-a-useful-request': r.success_criteria = 'Engaging'; r.prompt_v1 = 'Write about how small businesses can use social media.'; break;
    case 'checking-claims-and-sources': r.verdicts.C5 = { verdict: 'supported', source: '', note: 'Looks like a journal' }; r.uncertainty = 'Not sure.'; break;
    case 'working-with-numbers': r.handling = 'zero'; r.definition = 'gross'; r.values = { North: '61500', South: '52250', East: '32500', West: '45000' }; r.top_region = 'North'; break;
    case 'examples-and-structured-outputs': r.cells.payment = { value: '30', where: 'Clause 4' }; r.cells.footnote = { value: 'not stated', where: '' }; break;
    case 'research-and-communication': r.verdicts.K2 = { verdict: 'supported', source: 'R1', note: '' }; r.brief_text = 'Hybrid working is popular and productivity rose, with 41% reporting improvement. Output per hour fell 3%. An independent review recommends three office days. Interpretation: keep hybrid working.'; break;
    case 'responsible-workflows': r.decisions.W1 = { decision: 'keep', reason: 'It would save time organising the group.' }; r.disclosure_text = 'We used AI.'; break;
    case 'independent-application': r.final_work = 'Choose Option B. On 10–20 extra orders it costs £24.80 to £49.60 a month, against £29 for Option A.'; r.checks = '10 × £2.48 = £24.80; 20 × £2.48 = £49.60'; break;
    default: break;
  }
  return r;
}

const ASSIGNMENTS = [
  ['choosing-suitable-tasks', 'Week 1: Is AI the right tool?', 'limited', 'practice'],
  ['defining-a-useful-request', 'Week 2: Brief for Crumb & Co', 'permitted', 'practice'],
  ['examples-and-structured-outputs', 'Week 3: Supply agreement terms', 'permitted', 'practice'],
  ['checking-claims-and-sources', 'Week 4: Check before you forward', 'limited', 'practice'],
  ['working-with-numbers', 'Week 5: Where should the new rep go?', 'limited', 'practice'],
  ['research-and-communication', 'Week 6: Hybrid working brief', 'permitted', 'practice'],
  ['responsible-workflows', 'Week 7: Fix the group workflow', 'prohibited', 'practice'],
  ['independent-application', 'Week 8: Independent task', 'permitted', 'assessment'],
];

// Seeds the demo institution. Returns ids useful to callers (the export script).
export function seedDemo(db, { password }) {
  if (db.prepare('SELECT 1 FROM institutions WHERE name = ?').get(DEMO_INSTITUTION)) return null;
  const hash = hashPassword(password);
  const ids = {}; const assignmentIds = {};
  let inst; let course;
  tx(db, () => {
    const live = Boolean(globalThis.process?.env?.ANTHROPIC_API_KEY);
    inst = Number(db.prepare(`INSERT INTO institutions (name, is_demo, approved_provider, monthly_model_run_cap) VALUES (?, 1, ?, ?)`).run(DEMO_INSTITUTION, live ? 'anthropic' : 'none', live ? 200 : 0).lastInsertRowid);
    for (const [name, email, role] of DEMO_PEOPLE) {
      ids[email] = Number(db.prepare('INSERT INTO users (email, name, password_hash, is_platform_admin) VALUES (?, ?, ?, ?)').run(email, name, hash, role === 'platform' ? 1 : 0).lastInsertRowid);
      if (role !== 'platform') db.prepare('INSERT INTO memberships (user_id, institution_id, role) VALUES (?, ?, ?)').run(ids[email], inst, role);
    }
    course = Number(db.prepare(`INSERT INTO courses (institution_id, code, title, created_by) VALUES (?, 'BUS101', 'Introduction to Business Analysis (demo)', ?)`).run(inst, ids['admin@demo.invalid']).lastInsertRowid);
    db.prepare(`INSERT INTO course_members (course_id, user_id, role) VALUES (?, ?, 'educator')`).run(course, ids['educator@demo.invalid']);
    for (const e of ['student1@demo.invalid', 'student2@demo.invalid', 'student3@demo.invalid']) db.prepare(`INSERT INTO course_members (course_id, user_id, role) VALUES (?, ?, 'student')`).run(course, ids[e]);
    for (const [slug, title, policy, mode] of ASSIGNMENTS) {
      assignmentIds[slug] = Number(db.prepare(`INSERT INTO assignments (course_id, lesson_slug, title, ai_policy, mode, solution_visibility, competencies, created_by, ai_policy_note)
        VALUES (?, ?, ?, ?, ?, 'after_submit', ?, ?, ?)`).run(course, slug, title, policy, mode, JSON.stringify(LESSONS[slug].competencies), ids['educator@demo.invalid'],
        policy === 'limited' ? 'Only for the optional AI step in the lesson.' : '').lastInsertRowid);
    }
  });

  const assignment = (slug) => db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignmentIds[slug]);
  const submit = (email, slug, response, { hints = 0 } = {}) => {
    const a = assignment(slug); const sid = ids[email];
    let draft = getOrCreateDraft(db, a.id, sid) || startRevision(db, a, sid);
    const disclosure = a.ai_policy === 'prohibited' ? 'I did not use AI for this task.' : 'I did not use the live AI step; all work is my own.';
    saveDraft(db, draft, { response, hintsDelta: hints, disclosure });
    draft = { ...draft, response, disclosure };
    submitAttempt(db, { assignment: a, attempt: draft, studentId: sid });
  };
  const S = 'student1@demo.invalid'; const J = 'student2@demo.invalid'; const K = 'student3@demo.invalid';

  // Sam: steady progress, one revision after feedback, one draft in progress.
  submit(S, 'choosing-suitable-tasks', goodResponse('choosing-suitable-tasks'));
  submit(S, 'defining-a-useful-request', goodResponse('defining-a-useful-request'), { hints: 1 });
  submit(S, 'checking-claims-and-sources', flawedResponse('checking-claims-and-sources'));
  submit(S, 'checking-claims-and-sources', goodResponse('checking-claims-and-sources'));
  submit(S, 'working-with-numbers', flawedResponse('working-with-numbers'));
  { const a = assignment('examples-and-structured-outputs'); const d = getOrCreateDraft(db, a.id, ids[S]); saveDraft(db, d, { response: flawedResponse('examples-and-structured-outputs'), disclosure: '' }); }
  // Jo: strong on sources, needs work on rules and data.
  submit(J, 'choosing-suitable-tasks', flawedResponse('choosing-suitable-tasks'));
  submit(J, 'checking-claims-and-sources', goodResponse('checking-claims-and-sources'));
  submit(J, 'research-and-communication', goodResponse('research-and-communication'));
  submit(J, 'responsible-workflows', flawedResponse('responsible-workflows'));
  // Kai: well ahead, including the independent task.
  submit(K, 'choosing-suitable-tasks', goodResponse('choosing-suitable-tasks'));
  submit(K, 'checking-claims-and-sources', flawedResponse('checking-claims-and-sources'), { hints: 2 });
  submit(K, 'examples-and-structured-outputs', goodResponse('examples-and-structured-outputs'));
  submit(K, 'independent-application', goodResponse('independent-application'));

  // A recorded AI output (fictional), so the review screens show one.
  const samBrief = db.prepare('SELECT id FROM attempts WHERE assignment_id = ? AND student_id = ?').get(assignmentIds['defining-a-useful-request'], ids[S]);
  db.prepare(`INSERT INTO model_runs (institution_id, attempt_id, source, provider, served_model, settings, prompt, output, status) VALUES (?, ?, 'student_pasted', 'external', ?, ?, ?, ?, 'ok')`)
    .run(inst, samBrief.id, 'University AI Assistant (demo, fictional output)', JSON.stringify({ purpose: 'prompt v1' }), '(recorded by student; prompt not captured)',
      'Recommendation: post two photos a week of finished celebration cakes from the window display, and reply to messages within a day. Estimated time: about 2.5 hours a week. Measure: ask each cake customer how they heard about you.');

  // Educator review: confirmed levels, feedback, and one resolved challenge.
  const educator = ids['educator@demo.invalid'];
  const confirm = (email, slug, levels, reason = null) => {
    const a = assignment(slug);
    const last = db.prepare(`SELECT id FROM attempts WHERE assignment_id = ? AND student_id = ? AND status = 'submitted' ORDER BY version_no DESC LIMIT 1`).get(a.id, ids[email]);
    for (const [code, level] of Object.entries(levels)) {
      db.prepare(`INSERT INTO assessments (assignment_id, student_id, attempt_id, competency, level, override_reason, assessor_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'final')
        ON CONFLICT(assignment_id, student_id, competency) DO UPDATE SET level = excluded.level, override_reason = excluded.override_reason, assessor_id = excluded.assessor_id, status = 'final'`)
        .run(a.id, ids[email], last.id, code, level, reason, educator);
    }
    db.prepare(`UPDATE feedback SET status = 'approved', reviewed_by = ? WHERE attempt_id = ? AND author_type = 'automated'`).run(educator, last.id);
    return last.id;
  };
  const samM4 = confirm(S, 'checking-claims-and-sources', { verification: 2, revision: 2, responsible_use: 2 }, 'Strong revision after feedback; counted as limited support.');
  db.prepare(`INSERT INTO feedback (attempt_id, author_type, author_id, body, status) VALUES (?, 'educator', ?, ?, 'approved')`).run(samM4, educator, JSON.stringify({ text: 'Good revision: you removed the invented study and added the cost. Next time, record the evidence for every claim, not only the ones you doubted.' }));
  confirm(S, 'choosing-suitable-tasks', { tool_selection: 3, responsible_use: 2 }, 'Own-course decision was clear; disclosure could say what you checked.');
  confirm(K, 'independent-application', { task_definition: 3, tool_selection: 3, instruction_quality: 2, verification: 3, revision: 3, responsible_use: 3 }, 'Instruction to the AI was brief but adequate.');
  const a1 = assignment('choosing-suitable-tasks');
  db.prepare(`INSERT INTO challenges (assignment_id, student_id, message, status, response) VALUES (?, ?, ?, 'resolved', ?)`).run(a1.id, ids[S],
    'I think responsible use should be "independently demonstrated": my disclosure followed the template.',
    'The template is a start, but a level 3 disclosure says what you checked. Kept at limited support; happy to look again on your next assignment.');
  audit(db, null, inst, 'demo_seeded');
  return { inst, course, ids, assignmentIds };
}
