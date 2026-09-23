// Creates a clearly labelled demonstration institution with fictional people,
// for local demos only. Demo records are kept in their own institution and are
// never mixed with live institutions. Uses the .invalid domain so no real
// mailbox can receive anything.
import { randomBytes } from 'node:crypto';
import { openDb, tx } from '../src/db.js';
import { hashPassword } from '../src/auth.js';
import { LESSONS } from '../src/content/lessons.js';
import { getOrCreateDraft, saveDraft, submitAttempt } from '../src/work.js';

const db = openDb();
if (db.prepare('SELECT 1 FROM institutions WHERE name = ?').get('Demo University (fictional)')) {
  console.log('Demo institution already exists. Delete the database file to reseed.');
  process.exit(0);
}
const password = process.env.DEMO_PASSWORD || randomBytes(9).toString('base64url');
const hash = hashPassword(password);
const people = [
  ['Platform Admin (demo)', 'platform@demo.invalid', 'platform'],
  ['Morgan Admin (demo)', 'admin@demo.invalid', 'inst_admin'],
  ['Dr Robin Educator (demo)', 'educator@demo.invalid', 'educator'],
  ['Sam Student (demo)', 'student1@demo.invalid', 'student'],
  ['Jo Student (demo)', 'student2@demo.invalid', 'student'],
  ['Kai Student (demo)', 'student3@demo.invalid', 'student'],
];

tx(db, () => {
  const inst = Number(db.prepare(`INSERT INTO institutions (name, is_demo, approved_provider, monthly_model_run_cap) VALUES ('Demo University (fictional)', 1, ?, ?)`)
    .run(process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'none', process.env.ANTHROPIC_API_KEY ? 200 : 0).lastInsertRowid);
  const ids = {};
  for (const [name, email, role] of people) {
    const id = Number(db.prepare('INSERT INTO users (email, name, password_hash, is_platform_admin) VALUES (?, ?, ?, ?)').run(email, name, hash, role === 'platform' ? 1 : 0).lastInsertRowid);
    ids[email] = id;
    if (role !== 'platform') db.prepare('INSERT INTO memberships (user_id, institution_id, role) VALUES (?, ?, ?)').run(id, inst, role);
  }
  const course = Number(db.prepare(`INSERT INTO courses (institution_id, code, title, created_by) VALUES (?, 'BUS101', 'Introduction to Business Analysis (demo)', ?)`).run(inst, ids['admin@demo.invalid']).lastInsertRowid);
  db.prepare(`INSERT INTO course_members (course_id, user_id, role) VALUES (?, ?, 'educator')`).run(course, ids['educator@demo.invalid']);
  for (const e of ['student1@demo.invalid', 'student2@demo.invalid', 'student3@demo.invalid']) db.prepare(`INSERT INTO course_members (course_id, user_id, role) VALUES (?, ?, 'student')`).run(course, ids[e]);
  const add = (slug, title, policy, mode) => Number(db.prepare(`INSERT INTO assignments (course_id, lesson_slug, title, ai_policy, mode, solution_visibility, competencies, created_by)
    VALUES (?, ?, ?, ?, ?, 'after_submit', ?, ?)`).run(course, slug, title, policy, mode, JSON.stringify(LESSONS[slug].competencies), ids['educator@demo.invalid']).lastInsertRowid);
  add('choosing-suitable-tasks', 'Week 2: Is AI the right tool?', 'limited', 'practice');
  add('defining-a-useful-request', 'Week 3: Brief for Crumb & Co', 'permitted', 'practice');
  const evidence = add('checking-claims-and-sources', 'Week 4: Check before you forward', 'limited', 'practice');
  add('working-with-numbers', 'Week 5: Where should the new rep go?', 'limited', 'practice');

  // One fictional submission so the review screens have something to show.
  const a = db.prepare('SELECT * FROM assignments WHERE id = ?').get(evidence);
  const student = ids['student1@demo.invalid'];
  const draft = getOrCreateDraft(db, a.id, student);
  const response = {
    verdicts: { C1: { verdict: 'supported', source: 'A', note: '290 visits; 41 of 118' }, C2: { verdict: 'contradicted', source: 'A', note: 'Source says 6%' },
      C3: { verdict: 'supported', source: 'B', note: '61%' }, C4: { verdict: 'not_in_sources', source: '', note: '' },
      C5: { verdict: 'supported', source: '', note: 'Looks like a journal' }, C6: { verdict: 'contradicted', source: 'C', note: '£74,000 a year' } },
    corrected: 'Sunday opening is popular: 61% of residents support it and the trial averaged 290 visits (Source A, B). It would cost about £74,000 a year (Source C).',
    uncertainty: 'Not sure.',
    independent: { verdict: 'contradicted', corrected: 'Saturday is the busiest day.' },
  };
  saveDraft(db, draft, { response, disclosure: 'I did not use AI for this task.' });
  submitAttempt(db, { assignment: a, attempt: { ...draft, response, disclosure: 'I did not use AI for this task.' }, studentId: student });
});

console.log('Demo institution created: "Demo University (fictional)".');
console.log(`All demo accounts use the password: ${password}`);
for (const [name, email] of people) console.log(`  ${email}  (${name})`);
