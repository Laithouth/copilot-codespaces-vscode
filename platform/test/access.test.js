// Access boundaries: tenant isolation, role separation, CSRF and sign-in.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, client, makeInstitution, makeUser, makeCourse, makeAssignment, evidenceForm } from './helpers.js';

let app; let A; let B;
before(async () => {
  app = await startApp();
  const { db } = app;
  const setup = (name, tag) => {
    const instId = makeInstitution(db, name);
    const edu = makeUser(db, { email: `edu@${tag}.test`, instId, role: 'educator' });
    const stu = makeUser(db, { email: `stu@${tag}.test`, instId, role: 'student' });
    const stu2 = makeUser(db, { email: `stu2@${tag}.test`, instId, role: 'student' });
    const courseId = makeCourse(db, { instId, code: `${tag}101`, educatorId: edu, studentIds: [stu, stu2] });
    const otherCourse = makeCourse(db, { instId, code: `${tag}999`, educatorId: makeUser(db, { email: `edu2@${tag}.test`, instId, role: 'educator' }) });
    const aid = makeAssignment(db, { courseId });
    return { instId, edu, stu, stu2, courseId, otherCourse, aid, admin: `admin@${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.test` };
  };
  A = setup('Alpha University', 'alpha');
  B = setup('Beta College', 'beta');
  // Give student A some work to try to read.
  const s = client(app.base);
  await s.login('stu@alpha.test');
  await s.post(`/app/assignments/${A.aid}`, { ...evidenceForm(), action: 'submit' });
});
after(async () => { await app.close(); });

test('signed-out visitors are sent to sign in for every workspace page', async () => {
  const c = client(app.base);
  for (const p of ['/app', `/app/assignments/${A.aid}`, `/app/courses/${A.courseId}`, `/app/admin/${A.instId}`, '/app/platform', '/app/portfolio', `/app/courses/${A.courseId}/report.csv`]) {
    const r = await c.get(p);
    assert.equal(r.status, 303, p);
    assert.equal(r.location, '/login', p);
  }
});

test('educators cannot see another institution\'s course, assignment or students', async () => {
  const e = client(app.base);
  await e.login('edu@beta.test');
  for (const p of [`/app/courses/${A.courseId}`, `/app/assignments/${A.aid}/review`, `/app/assignments/${A.aid}/students/${A.stu}`, `/app/courses/${A.courseId}/report.csv`, `/app/courses/${A.courseId}/gaps`]) {
    const r = await e.get(p);
    assert.equal(r.status, 404, p);
    assert.doesNotMatch(r.text, /stu@alpha\.test|Alpha/, p);
  }
  const r = await e.post(`/app/assignments/${A.aid}/students/${A.stu}/assess`, { level_verification: '0', reason_verification: 'x' });
  assert.equal(r.status, 404);
});

test('educators cannot see courses in their own institution that they do not teach', async () => {
  const e = client(app.base);
  await e.login('edu@alpha.test');
  assert.equal((await e.get(`/app/courses/${A.otherCourse}`)).status, 404);
});

test('an educator cannot view a student who is not on the course through a course they teach', async () => {
  const e = client(app.base);
  await e.login('edu@alpha.test');
  assert.equal((await e.get(`/app/assignments/${A.aid}/students/${B.stu}`)).status, 404);
});

test('students cannot open review pages, other institutions\' assignments, or admin pages', async () => {
  const s = client(app.base);
  await s.login('stu@beta.test');
  assert.equal((await s.get(`/app/assignments/${A.aid}`)).status, 404);
  assert.equal((await s.post(`/app/assignments/${A.aid}`, { ...evidenceForm(), action: 'submit' })).status, 404);
  const own = client(app.base);
  await own.login('stu2@alpha.test');
  assert.equal((await own.get(`/app/assignments/${A.aid}/review`)).status, 404);
  assert.equal((await own.get(`/app/assignments/${A.aid}/students/${A.stu}`)).status, 404);
  assert.equal((await own.get(`/app/admin/${A.instId}`)).status, 403);
  assert.equal((await own.get('/app/platform')).status, 403);
  // A classmate's work is not visible on the shared assignment page.
  const r = await own.get(`/app/assignments/${A.aid}`);
  assert.equal(r.status, 200);
  assert.doesNotMatch(r.text, /290 visits; 41 of 118/);
});

test('institution administrators are limited to their own institution', async () => {
  const a = client(app.base);
  await a.login(B.admin);
  assert.equal((await a.get(`/app/admin/${B.instId}`)).status, 200);
  assert.equal((await a.get(`/app/admin/${A.instId}`)).status, 403);
  assert.equal((await a.get(`/app/admin/${A.instId}/report.csv`)).status, 403);
  assert.equal((await a.post(`/app/admin/${A.instId}/settings`, { approved_provider: 'none', monthly_model_run_cap: '5', budget_alert_percent: '80', retention_days: '30' })).status, 403);
  assert.equal((await a.post(`/app/admin/${B.instId}/delete-learner`, { user_id: A.stu, confirm: 'stu@alpha.test' })).status, 404);
  // Administrators are not course educators: no access to individual work.
  assert.equal((await a.get(`/app/assignments/${B.aid}/review`)).status, 404);
});

test('state-changing requests without the session\'s CSRF token are rejected', async () => {
  const s = client(app.base);
  await s.login('stu2@alpha.test');
  s.setCsrf('forged');
  const r = await s.post(`/app/assignments/${A.aid}`, { ...evidenceForm(), action: 'save' });
  assert.equal(r.status, 403);
  assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM attempts WHERE student_id = ?').get(A.stu2).n, 0);
});

test('wrong passwords are rejected and repeated failures are rate-limited', async () => {
  const c = client(app.base);
  let r;
  for (let i = 0; i < 10; i++) r = await c.post('/login', { email: 'edu2@beta.test', password: 'wrong-password' });
  assert.equal(r.status, 401);
  r = await c.post('/login', { email: 'edu2@beta.test', password: 'wrong-password' });
  assert.equal(r.status, 429);
  // Locked out even with the right password until the window passes.
  r = await c.post('/login', { email: 'edu2@beta.test', password: 'correct-horse-battery' });
  assert.equal(r.status, 429);
});

test('user-supplied text is escaped in pages', async () => {
  const s = client(app.base);
  await s.login('stu@beta.test');
  await s.post(`/app/assignments/${B.aid}`, { ...evidenceForm({ corrected: '<script>alert(1)</script>' }), action: 'save' });
  const r = await s.get(`/app/assignments/${B.aid}`);
  assert.doesNotMatch(r.text, /<script>alert\(1\)<\/script>/);
  assert.match(r.text, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test('security headers are set', async () => {
  const r = await client(app.base).get('/');
  assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
});
