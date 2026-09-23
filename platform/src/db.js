// SQLite storage (node:sqlite). One database file per deployment; every
// institution-owned row carries institution_id, directly or through its course,
// and every query that reads learner data is scoped by it (see src/access.js).
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { COMPETENCIES } from './content/competencies.js';
import { LESSONS } from './content/lessons.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS institutions (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 0,
  approved_provider TEXT NOT NULL DEFAULT 'none',       -- 'none' | 'anthropic'
  approved_model TEXT,
  monthly_model_run_cap INTEGER NOT NULL DEFAULT 0,      -- 0 = model runs disabled
  budget_alert_percent INTEGER NOT NULL DEFAULT 80,
  retention_days INTEGER NOT NULL DEFAULT 365,
  allow_dictation INTEGER NOT NULL DEFAULT 0,
  permitted_data_note TEXT NOT NULL DEFAULT 'Use only the supplied teaching materials. Do not enter personal, confidential or assessed third-party information.',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  password_hash TEXT,
  invite_token_hash TEXT,
  invite_expires_at TEXT,
  is_platform_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS memberships (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('student','educator','inst_admin')),
  UNIQUE (user_id, institution_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY,
  institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS course_members (
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('educator','student')),
  PRIMARY KEY (course_id, user_id)
);

CREATE TABLE IF NOT EXISTS competencies (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lessons (
  slug TEXT PRIMARY KEY,
  module_no INTEGER NOT NULL,
  title TEXT NOT NULL,
  version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_slug TEXT NOT NULL REFERENCES lessons(slug),
  title TEXT NOT NULL,
  instructions_note TEXT NOT NULL DEFAULT '',
  due_at TEXT,
  ai_policy TEXT NOT NULL CHECK (ai_policy IN ('prohibited','limited','permitted','required')),
  ai_policy_note TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL CHECK (mode IN ('practice','assessment')),
  solution_visibility TEXT NOT NULL CHECK (solution_visibility IN ('never','after_submit','after_due')),
  competencies TEXT NOT NULL,             -- JSON array of competency codes
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One row per saved version of a student's work. Versions are never
-- overwritten once submitted, so the revision history is preserved.
CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','submitted')),
  response TEXT NOT NULL,                 -- JSON: the student's own work
  hints_used INTEGER NOT NULL DEFAULT 0,
  dictation_used INTEGER NOT NULL DEFAULT 0,
  disclosure TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  submitted_at TEXT,
  UNIQUE (assignment_id, student_id, version_no)
);

CREATE TABLE IF NOT EXISTS model_runs (
  id INTEGER PRIMARY KEY,
  institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  attempt_id INTEGER REFERENCES attempts(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('platform','student_pasted')),
  provider TEXT NOT NULL,
  requested_model TEXT,
  served_model TEXT,
  settings TEXT NOT NULL DEFAULT '{}',
  prompt TEXT NOT NULL,
  output TEXT,
  status TEXT NOT NULL CHECK (status IN ('ok','error','unavailable','budget_exceeded','refused','not_permitted')),
  error TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS evidence_checks (
  id INTEGER PRIMARY KEY,
  attempt_id INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  claim_key TEXT NOT NULL,
  verdict TEXT NOT NULL,
  source_ref TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  correct INTEGER                          -- 1/0 against the answer key, NULL if no key
);

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY,
  attempt_id INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL CHECK (author_type IN ('automated','educator')),
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,                      -- JSON array of {title, why, next}
  status TEXT NOT NULL CHECK (status IN ('provisional','approved','edited','withheld')),
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Rubric judgements. Automated rows are provisional; only educator-finalised
-- rows count as demonstrated competency.
CREATE TABLE IF NOT EXISTS assessments (
  id INTEGER PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempt_id INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  competency TEXT NOT NULL REFERENCES competencies(code),
  provisional_level INTEGER,
  level INTEGER,
  override_reason TEXT,
  assessor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('provisional','final')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (assignment_id, student_id, competency)
);

CREATE TABLE IF NOT EXISTS challenges (
  id INTEGER PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  response TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pilot_requests (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  institution TEXT NOT NULL,
  role TEXT NOT NULL,
  interest TEXT NOT NULL,
  learners TEXT,
  message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY,
  actor_id INTEGER,
  institution_id INTEGER,
  action TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_attempts_student ON attempts (student_id, assignment_id);
CREATE INDEX IF NOT EXISTS idx_model_runs_inst ON model_runs (institution_id, created_at);
`;

export function openDb(file = process.env.DB_FILE || 'data/practicum.db') {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  db.exec(SCHEMA);
  seedReferenceData(db);
  return db;
}

function seedReferenceData(db) {
  const upC = db.prepare(`INSERT INTO competencies (code, title, description) VALUES (?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET title = excluded.title, description = excluded.description`);
  for (const c of COMPETENCIES) upC.run(c.code, c.title, c.summary);
  const upL = db.prepare(`INSERT INTO lessons (slug, module_no, title, version) VALUES (?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET title = excluded.title, version = excluded.version, module_no = excluded.module_no`);
  for (const l of Object.values(LESSONS)) upL.run(l.slug, l.module, l.title, l.version);
}

// Runs fn in a transaction. Nested calls use savepoints, so helpers that open
// their own transaction can be called from inside another one.
let savepointSeq = 0;
export function tx(db, fn) {
  const name = `sp_${++savepointSeq}`;
  db.exec(`SAVEPOINT ${name}`);
  try {
    const result = fn();
    db.exec(`RELEASE ${name}`);
    return result;
  } catch (err) {
    db.exec(`ROLLBACK TO ${name}; RELEASE ${name}`);
    throw err;
  }
}

export function audit(db, actorId, institutionId, action, detail = '') {
  db.prepare('INSERT INTO audit_log (actor_id, institution_id, action, detail) VALUES (?, ?, ?, ?)')
    .run(actorId ?? null, institutionId ?? null, action, typeof detail === 'string' ? detail : JSON.stringify(detail));
}
