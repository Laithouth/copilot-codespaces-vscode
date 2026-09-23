import { createServer } from 'node:http';
import { openDb } from '../src/db.js';
import { createApp } from '../src/server.js';
import { hashPassword } from '../src/auth.js';
import { createInstitution } from '../src/routes/admin.js';

delete process.env.ANTHROPIC_API_KEY;
export const PASSWORD = 'correct-horse-battery';

export async function startApp() {
  const db = openDb(':memory:');
  const server = createServer(createApp(db));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { db, base, close: () => new Promise((r) => server.close(r)) };
}

// A browser-like client: keeps the session cookie and the latest CSRF token.
export function client(base) {
  let cookie = '';
  let csrf = '';
  async function request(method, path, form) {
    const headers = {};
    if (cookie) headers.cookie = cookie;
    let body;
    if (form) {
      headers['content-type'] = 'application/x-www-form-urlencoded';
      const params = new URLSearchParams();
      const withToken = { _csrf: csrf, ...form };
      for (const [k, v] of Object.entries(withToken)) for (const item of [].concat(v)) params.append(k, item);
      body = params.toString();
    }
    const res = await fetch(base + path, { method, headers, body, redirect: 'manual' });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0];
    const text = await res.text();
    const m = text.match(/name="_csrf" value="([^"]*)"/);
    if (m && m[1]) csrf = m[1];
    return { status: res.status, location: res.headers.get('location'), text, headers: res.headers };
  }
  return {
    get: (p) => request('GET', p),
    post: (p, form) => request('POST', p, form),
    async follow(res) {
      let r = res;
      while (r.status === 303) r = await request('GET', r.location);
      return r;
    },
    async login(email, password = PASSWORD) {
      await request('GET', '/login');
      const r = await request('POST', '/login', { email, password });
      if (r.status !== 303) throw new Error(`login failed for ${email}: ${r.status}`);
      await request('GET', '/app');
      return r;
    },
    setCsrf(v) { csrf = v; },
    get csrf() { return csrf; },
  };
}

// Direct setup through the data layer, for tests that are not about onboarding.
export function makeInstitution(db, name) {
  const { instId } = createInstitution(db, { name, adminName: `${name} Admin`, adminEmail: `admin@${slug(name)}.test` });
  db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hashPassword(PASSWORD), `admin@${slug(name)}.test`);
  return instId;
}

export function makeUser(db, { email, name = email, instId, role }) {
  const id = Number(db.prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)').run(email, name, hashPassword(PASSWORD)).lastInsertRowid);
  if (instId) db.prepare('INSERT INTO memberships (user_id, institution_id, role) VALUES (?, ?, ?)').run(id, instId, role);
  return id;
}

export function makeCourse(db, { instId, code, educatorId, studentIds = [] }) {
  const id = Number(db.prepare('INSERT INTO courses (institution_id, code, title) VALUES (?, ?, ?)').run(instId, code, `${code} title`).lastInsertRowid);
  db.prepare(`INSERT INTO course_members (course_id, user_id, role) VALUES (?, ?, 'educator')`).run(id, educatorId);
  for (const s of studentIds) db.prepare(`INSERT INTO course_members (course_id, user_id, role) VALUES (?, ?, 'student')`).run(id, s);
  return id;
}

export function makeAssignment(db, { courseId, slug = 'checking-claims-and-sources', policy = 'permitted', mode = 'practice', visibility = 'after_submit', due = null, competencies }) {
  return Number(db.prepare(`INSERT INTO assignments (course_id, lesson_slug, title, ai_policy, mode, solution_visibility, competencies, due_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(courseId, slug, `Assignment ${slug}`, policy, mode, visibility, JSON.stringify(competencies || ['verification', 'revision', 'responsible_use']), due).lastInsertRowid);
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

// Form values for the evidence lesson.
export function evidenceForm(overrides = {}, verdicts = {}) {
  const v = {
    C1: ['supported', 'A', '290 visits; 41 of 118'], C2: ['contradicted', 'A', '6% not 16%'], C3: ['partly_supported', 'B', 'self-selected 61%'],
    C4: ['not_in_sources', '', ''], C5: ['citation_unverifiable', '', 'cannot find it'], C6: ['contradicted', 'C', '£74,000; voluntary shifts'], ...verdicts,
  };
  const form = {};
  for (const [k, [verdict, src, note]] of Object.entries(v)) { form[`v_${k}`] = verdict; form[`src_${k}`] = src; form[`note_${k}`] = note; }
  return {
    ...form,
    corrected: 'Trial Sundays averaged 290 visits (Source A). Memberships were 6% higher but other factors may have contributed (Source A). 61% of self-selected survey respondents supported it (Source B). It would cost £74,000 a year and staff shifts are voluntary (Source C).',
    uncertainty: 'Whether trial attendance would last, whether respondents represent all residents, and whether staff would volunteer.',
    v_C7: 'contradicted', ind_corrected: 'Saturday is the busiest day.',
    disclosure: 'I did not use AI for this task.',
    ...overrides,
  };
}
