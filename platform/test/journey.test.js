// The critical journey, end to end over HTTP: an institution is set up, an
// educator assigns a lesson, a student completes and revises it, the educator
// reviews the evidence and confirms levels, and the institution exports a report.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, client, evidenceForm, PASSWORD } from './helpers.js';
import { createInstitution } from '../src/routes/admin.js';

let app;
before(async () => { app = await startApp(); });
after(async () => { await app.close(); });

const inviteFrom = (text) => text.match(/\/invite\/([A-Za-z0-9_-]+)/)[1];
const acceptInvite = async (c, token) => {
  await c.get(`/invite/${token}`);
  const r = await c.post(`/invite/${token}`, { password: PASSWORD, confirm: PASSWORD });
  assert.equal(r.status, 303);
  return c.follow(r);
};

test('critical journey: assign, complete, revise, review, export', async () => {
  const { db, base } = app;

  // Institution and its first administrator (platform admin step, done via the CLI helper).
  const { instId, invite } = createInstitution(db, { name: 'Test University', adminName: 'Ada Admin', adminEmail: 'ada@tu.test' });
  const admin = client(base);
  await acceptInvite(admin, invite);

  // Administrator creates a course and invites its educator; enables 10 runs/month.
  let r = await admin.post(`/app/admin/${instId}/courses`, { code: 'BUS200', title: 'Business Analysis', educator_name: 'Eli Educator', educator_email: 'eli@tu.test' });
  assert.equal(r.status, 200);
  const educatorInvite = inviteFrom(r.text);
  const educator = client(base);
  r = await acceptInvite(educator, educatorInvite);
  assert.match(r.text, /BUS200: Business Analysis/);
  const courseId = Number(r.text.match(/\/app\/courses\/(\d+)/)[1]);

  // Educator imports a roster (one malformed line is reported, not imported).
  r = await educator.post(`/app/courses/${courseId}/roster`, { roster: 'name,email\nSam Student,sam@tu.test\nPat Student,pat@tu.test\nbroken line' });
  assert.match(r.text, /2 students enrolled/);
  assert.match(r.text, /Line 4: expected/);
  const samInvite = r.text.match(/sam@tu\.test\)<\/td><td><code>[^<]*\/invite\/([A-Za-z0-9_-]+)/)[1];

  // Educator assigns the evidence lesson, practice mode, AI limited.
  r = await educator.post(`/app/courses/${courseId}/assignments`, {
    lesson: 'checking-claims-and-sources', title: 'Check before you forward', ai_policy: 'limited', ai_policy_note: 'Only for the rewrite step',
    mode: 'practice', solution_visibility: 'after_submit', due_at: '',
  });
  r = await educator.follow(r);
  assert.match(r.text, /Assignment &quot;Check before you forward&quot; created/);
  const assignmentId = Number(r.text.match(/\/app\/assignments\/(\d+)\/review/)[1]);

  // Student accepts the invite and sees the assignment and its AI rule.
  const sam = client(base);
  r = await acceptInvite(sam, samInvite);
  assert.match(r.text, /Check before you forward/);
  r = await sam.get(`/app/assignments/${assignmentId}`);
  assert.match(r.text, /AI permitted for limited purposes/);
  assert.match(r.text, /Only for the rewrite step/);
  assert.match(r.text, /What is saved and who can see it/);
  assert.match(r.text, /example answer appears after your first submission/);

  // Saved progress: a draft survives a reload.
  const flawed = evidenceForm({ uncertainty: 'Not sure.' }, { C5: ['supported', '', 'looks academic'], C6: ['supported', 'C', ''] });
  r = await sam.follow(await sam.post(`/app/assignments/${assignmentId}`, { ...flawed, action: 'save' }));
  assert.match(r.text, /Draft saved/);
  r = await sam.get(`/app/assignments/${assignmentId}`);
  assert.match(r.text, /value="supported" checked/);
  assert.match(r.text, /looks academic/);

  // A hint is recorded.
  r = await sam.follow(await sam.post(`/app/assignments/${assignmentId}`, { ...flawed, action: 'hint' }));
  assert.match(r.text, /Hints used: 1 of 3/);

  // Submitting without a disclosure is refused and the draft is kept.
  r = await sam.post(`/app/assignments/${assignmentId}`, { ...flawed, disclosure: '', action: 'submit' });
  assert.equal(r.status, 400);
  assert.match(r.text, /Add a disclosure before submitting/);

  // Version 1: feedback names the fabricated reference first.
  r = await sam.follow(await sam.post(`/app/assignments/${assignmentId}`, { ...flawed, action: 'submit' }));
  assert.match(r.text, /Feedback on version 1/);
  assert.match(r.text, /relies on a reference you haven&#39;t verified/);
  assert.match(r.text, /Example response/); // after_submit

  // Revision: version 2 fixes it; version 1 is preserved.
  r = await sam.follow(await sam.post(`/app/assignments/${assignmentId}`, { action: 'revise' }));
  assert.match(r.text, /version 2, draft/);
  r = await sam.follow(await sam.post(`/app/assignments/${assignmentId}`, { ...evidenceForm(), action: 'submit' }));
  assert.match(r.text, /Feedback on version 2/);
  assert.match(r.text, /Resolved since last version/);
  assert.match(r.text, /Version 1, submitted/);
  const versions = db.prepare('SELECT version_no, status FROM attempts WHERE assignment_id = ? ORDER BY version_no').all(assignmentId);
  assert.deepEqual(versions.map((v) => [v.version_no, v.status]), [[1, 'submitted'], [2, 'submitted']]);

  // Educator review: provisional level visible, evidence checks shown.
  r = await educator.get(`/app/assignments/${assignmentId}/review`);
  assert.match(r.text, /P: Limited support/);
  const samId = Number(r.text.match(/\/students\/(\d+)">Sam Student/)[1]);
  r = await educator.get(`/app/assignments/${assignmentId}/students/${samId}`);
  assert.match(r.text, /Evidence checks against the answer key/);
  assert.match(r.text, /Version 1 · submitted/);
  const autoFeedbackId = r.text.match(/name="feedback_id" value="(\d+)"/)[1];

  // Approve automated feedback and add educator feedback.
  await educator.post(`/app/assignments/${assignmentId}/students/${samId}/feedback`, { action: 'approve', feedback_id: autoFeedbackId });
  const v2 = db.prepare('SELECT id FROM attempts WHERE assignment_id = ? AND version_no = 2').get(assignmentId).id;
  await educator.post(`/app/assignments/${assignmentId}/students/${samId}/feedback`, { action: 'add', attempt_id: v2, text: 'Good revision: you removed the invented study.' });

  // Overriding a provisional level without a reason is refused; with a reason it is saved.
  r = await educator.follow(await educator.post(`/app/assignments/${assignmentId}/students/${samId}/assess`, { level_verification: '3', reason_verification: '', level_revision: '2' }));
  assert.match(r.text, /Not saved\. Verification: give a reason/);
  assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM assessments WHERE student_id = ? AND status = 'final'`).get(samId).n, 0);
  r = await educator.follow(await educator.post(`/app/assignments/${assignmentId}/students/${samId}/assess`, { level_verification: '3', reason_verification: 'Hint was only the first one; checks were thorough.', level_revision: '2', level_responsible_use: '2', reason_responsible_use: 'Accurate disclosure.' }));
  assert.match(r.text, /3 levels confirmed/);

  // Student sees the confirmed level and educator feedback, then challenges.
  r = await sam.get(`/app/assignments/${assignmentId}`);
  assert.match(r.text, /Verification: <strong>Independently demonstrated<\/strong>/);
  assert.match(r.text, /Good revision: you removed the invented study/);
  r = await sam.get('/app');
  assert.match(r.text, /Independently demonstrated/);
  r = await sam.follow(await sam.post(`/app/assignments/${assignmentId}/challenge`, { message: 'I think responsible use should be higher.' }));
  assert.match(r.text, /awaiting response/);
  r = await educator.get(`/app/assignments/${assignmentId}/students/${samId}`);
  const cid = r.text.match(/\/challenge\/(\d+)/)[1];
  await educator.post(`/app/assignments/${assignmentId}/students/${samId}/challenge/${cid}`, { response: 'Kept at limited support: the disclosure did not name what you checked.' });
  r = await sam.get(`/app/assignments/${assignmentId}`);
  assert.match(r.text, /resolved/);

  // Educator exports a course report with the confirmed levels.
  r = await educator.get(`/app/courses/${courseId}/report.csv`);
  assert.equal(r.headers.get('content-type'), 'text/csv; charset=utf-8');
  const samRow = r.text.split('\r\n').find((l) => l.includes('sam@tu.test'));
  assert.ok(samRow.includes(',6/6,true,'), samRow);
  assert.match(samRow, /,,,3,2,2,/); // confirmed: task_definition, tool_selection, instruction_quality empty; verification 3, revision 2, responsible_use 2

  // Cohort gaps shows aggregates without names.
  r = await educator.get(`/app/courses/${courseId}/gaps`);
  assert.match(r.text, /Cohort skill gaps/);
  assert.doesNotMatch(r.text, /Sam Student/);

  // Institution report: aggregated, with small numbers suppressed, no names.
  r = await admin.get(`/app/admin/${instId}/report.csv`);
  assert.match(r.text, /BUS200,<5,1,<5,Verification,0,0,0,<5,0/);
  assert.doesNotMatch(r.text, /sam@tu\.test|Sam Student/);

  // Student portfolio keeps own work, AI output and feedback distinct.
  r = await sam.get('/app/portfolio');
  assert.match(r.headers.get('content-disposition'), /portfolio\.html/);
  assert.match(r.text, /My work/);
  assert.match(r.text, /Educator feedback \(Eli Educator\)/);
  assert.match(r.text, /Automated feedback \(approved\)/);
  assert.match(r.text, /not an accredited qualification/);
});

test('assessment mode: no hints, feedback withheld until educator approval', async () => {
  const { db, base } = app;
  const { instId, userId } = createInstitution(db, { name: 'Assess U', adminName: 'A', adminEmail: 'a@au.test' });
  const { makeUser, makeCourse, makeAssignment } = await import('./helpers.js');
  const edu = makeUser(db, { email: 'edu@au.test', instId, role: 'educator' });
  const stu = makeUser(db, { email: 'stu@au.test', instId, role: 'student' });
  const courseId = makeCourse(db, { instId, code: 'AS1', educatorId: edu, studentIds: [stu] });
  const aid = makeAssignment(db, { courseId, mode: 'assessment', visibility: 'never' });
  const s = client(base);
  await s.login('stu@au.test');
  let r = await s.get(`/app/assignments/${aid}`);
  assert.doesNotMatch(r.text, /Show a hint/);
  assert.match(r.text, /Assessment mode: hints are not available/);
  r = await s.follow(await s.post(`/app/assignments/${aid}`, { ...evidenceForm({}, { C5: ['supported', '', ''] }), action: 'hint' }));
  assert.equal(db.prepare('SELECT hints_used FROM attempts WHERE assignment_id = ?').get(aid).hints_used, 0);
  r = await s.follow(await s.post(`/app/assignments/${aid}`, { ...evidenceForm({}, { C5: ['supported', '', ''] }), action: 'submit' }));
  assert.match(r.text, /Feedback will appear after your educator reviews it/);
  assert.doesNotMatch(r.text, /relies on a reference/);
  assert.match(r.text, /chosen not to show an example answer/);
  const e = client(base);
  await e.login('edu@au.test');
  r = await e.get(`/app/assignments/${aid}/students/${stu}`);
  const fid = r.text.match(/name="feedback_id" value="(\d+)"/)[1];
  await e.post(`/app/assignments/${aid}/students/${stu}/feedback`, { action: 'edit', feedback_id: fid, edited_text: 'Check the reference in C5 before relying on it.' });
  r = await s.get(`/app/assignments/${aid}`);
  assert.match(r.text, /Check the reference in C5 before relying on it/);
  assert.doesNotMatch(r.text, /relies on a reference you haven/);
  void userId;
});

test('deadline: past-due drafts cannot be submitted', async () => {
  const { db, base } = app;
  const { makeUser, makeCourse, makeAssignment } = await import('./helpers.js');
  const { instId } = createInstitution(db, { name: 'Due U', adminName: 'A', adminEmail: 'a@du.test' });
  const edu = makeUser(db, { email: 'edu@du.test', instId, role: 'educator' });
  const stu = makeUser(db, { email: 'stu@du.test', instId, role: 'student' });
  const courseId = makeCourse(db, { instId, code: 'D1', educatorId: edu, studentIds: [stu] });
  const aid = makeAssignment(db, { courseId, due: '2020-01-01' });
  const s = client(base);
  await s.login('stu@du.test');
  const r = await s.follow(await s.post(`/app/assignments/${aid}`, { ...evidenceForm(), action: 'submit' }));
  assert.match(r.text, /deadline has passed/);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM attempts WHERE assignment_id = ?').get(aid).n, 0);
});
