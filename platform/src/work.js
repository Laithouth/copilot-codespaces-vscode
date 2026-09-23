// Learning records: drafts, submissions, revisions, feedback and provisional
// assessments. Route handlers call these after access checks.
import { tx, audit } from './db.js';
import { evaluate } from './feedback.js';
import { LESSONS } from './content/lessons.js';

export const AI_POLICY = {
  prohibited: { label: 'AI prohibited', text: 'You may not use AI tools for this assignment. The live AI step is switched off. You can still check the supplied AI-style material.' },
  limited: { label: 'AI permitted for limited purposes', text: 'You may use the approved AI tool only for the purposes your educator lists below. Disclose what you used it for.' },
  permitted: { label: 'AI broadly permitted', text: 'You may use the approved AI tool. You are responsible for the accuracy of what you submit, and you must disclose how you used AI.' },
  required: { label: 'AI use required', text: 'This assignment asks you to use the approved AI tool as described. Your prompts, checks and revisions are part of the assessment.' },
};

export const SOLUTION_VISIBILITY = {
  never: 'Not shown to students',
  after_submit: 'After the student\'s first submission',
  after_due: 'After the deadline',
};

export const lessonFor = (assignment) => LESSONS[assignment.lesson_slug];

// Deadlines are dates; a deadline is past once that day has ended (UTC).
export function isPastDue(assignment, now = new Date()) {
  if (!assignment.due_at) return false;
  return now > new Date(`${assignment.due_at}T23:59:59Z`);
}

export function attemptsFor(db, assignmentId, studentId) {
  return db.prepare('SELECT * FROM attempts WHERE assignment_id = ? AND student_id = ? ORDER BY version_no').all(assignmentId, studentId)
    .map((a) => ({ ...a, response: JSON.parse(a.response) }));
}

export function latestAttempt(db, assignmentId, studentId) {
  const list = attemptsFor(db, assignmentId, studentId);
  return list[list.length - 1] || null;
}

export function getOrCreateDraft(db, assignmentId, studentId) {
  const latest = latestAttempt(db, assignmentId, studentId);
  if (latest?.status === 'draft') return latest;
  if (latest) return null; // submitted: a revision must be started explicitly
  db.prepare(`INSERT INTO attempts (assignment_id, student_id, version_no, status, response) VALUES (?, ?, 1, 'draft', '{}')`).run(assignmentId, studentId);
  return latestAttempt(db, assignmentId, studentId);
}

export function saveDraft(db, attempt, { response, hintsDelta = 0, dictationUsed = false, disclosure }) {
  if (attempt.status !== 'draft') throw new Error('Only drafts can be edited.');
  db.prepare(`UPDATE attempts SET response = ?, hints_used = hints_used + ?, dictation_used = MAX(dictation_used, ?), disclosure = COALESCE(?, disclosure) WHERE id = ?`)
    .run(JSON.stringify(response), hintsDelta, dictationUsed ? 1 : 0, disclosure ?? null, attempt.id);
}

export function startRevision(db, assignment, studentId) {
  const latest = latestAttempt(db, assignment.id, studentId);
  if (!latest || latest.status !== 'submitted') return latest;
  db.prepare(`INSERT INTO attempts (assignment_id, student_id, version_no, status, response, hints_used, disclosure)
    VALUES (?, ?, ?, 'draft', ?, 0, ?)`).run(assignment.id, studentId, latest.version_no + 1, JSON.stringify(latest.response), latest.disclosure);
  return latestAttempt(db, assignment.id, studentId);
}

function previousIssueCodes(db, assignmentId, studentId, versionNo) {
  const prev = db.prepare(`SELECT f.body FROM feedback f JOIN attempts a ON a.id = f.attempt_id
    WHERE a.assignment_id = ? AND a.student_id = ? AND a.version_no = ? AND f.author_type = 'automated'`).get(assignmentId, studentId, versionNo - 1);
  if (!prev) return [];
  return JSON.parse(prev.body).issues.map((i) => i.code);
}

// Submits a draft: stores evidence checks, provisional feedback and provisional
// rubric levels. Educator-finalised levels are never overwritten.
export function submitAttempt(db, { assignment, attempt, studentId }) {
  const lesson = lessonFor(assignment);
  const hintsUsed = db.prepare('SELECT COALESCE(SUM(hints_used), 0) AS n FROM attempts WHERE assignment_id = ? AND student_id = ?').get(assignment.id, studentId).n;
  const result = evaluate(lesson, attempt.response, {
    hintsUsed,
    versionNo: attempt.version_no,
    previousIssueCodes: previousIssueCodes(db, assignment.id, studentId, attempt.version_no),
  });
  const competencies = JSON.parse(assignment.competencies);
  tx(db, () => {
    db.prepare(`UPDATE attempts SET status = 'submitted', submitted_at = datetime('now') WHERE id = ?`).run(attempt.id);
    const ins = db.prepare('INSERT INTO evidence_checks (attempt_id, claim_key, verdict, source_ref, note, correct) VALUES (?, ?, ?, ?, ?, ?)');
    for (const c of result.evidenceChecks) ins.run(attempt.id, c.claim_key, c.verdict || '', c.source_ref, c.note, c.correct);
    db.prepare(`INSERT INTO feedback (attempt_id, author_type, body, status) VALUES (?, 'automated', ?, 'provisional')`)
      .run(attempt.id, JSON.stringify({ issues: result.issues, shown: result.shown, strengths: result.strengths, resolved: result.resolved || [], metrics: result.metrics }));
    const up = db.prepare(`INSERT INTO assessments (assignment_id, student_id, attempt_id, competency, provisional_level, status)
      VALUES (?, ?, ?, ?, ?, 'provisional')
      ON CONFLICT(assignment_id, student_id, competency) DO UPDATE SET attempt_id = excluded.attempt_id,
        provisional_level = excluded.provisional_level, updated_at = datetime('now')
      WHERE assessments.status = 'provisional'`);
    for (const code of competencies) {
      const level = result.provisional[code];
      if (level !== undefined && level !== null) up.run(assignment.id, studentId, attempt.id, code, level);
    }
  });
  audit(db, studentId, null, 'attempt_submitted', { assignment: assignment.id, version: attempt.version_no });
  return result;
}

export function feedbackForAttempt(db, attemptId) {
  return db.prepare(`SELECT f.*, u.name AS author_name FROM feedback f LEFT JOIN users u ON u.id = f.author_id WHERE attempt_id = ? ORDER BY f.id`).all(attemptId)
    .map((f) => ({ ...f, body: JSON.parse(f.body) }));
}

export function modelRunsForAttempt(db, attemptId) {
  return db.prepare('SELECT * FROM model_runs WHERE attempt_id = ? ORDER BY id').all(attemptId).map((r) => ({ ...r, settings: JSON.parse(r.settings) }));
}

export function evidenceChecksForAttempt(db, attemptId) {
  return db.prepare('SELECT * FROM evidence_checks WHERE attempt_id = ? ORDER BY claim_key').all(attemptId);
}

// Automated feedback is visible to students in practice mode unless withheld;
// in assessment mode only after an educator approves or edits it.
export function studentCanSeeFeedback(assignment, fb) {
  if (fb.author_type === 'educator') return true;
  if (fb.status === 'withheld') return false;
  if (assignment.mode === 'assessment') return fb.status === 'approved' || fb.status === 'edited';
  return true;
}

export function studentCanSeeExample(assignment, attempts, now = new Date()) {
  if (assignment.solution_visibility === 'never') return false;
  if (assignment.solution_visibility === 'after_due') return isPastDue(assignment, now);
  return attempts.some((a) => a.status === 'submitted');
}

// Demonstrated competency: the highest educator-finalised level per criterion.
// Provisional levels are reported separately and never merged in.
export function competencyProfile(db, studentId, courseIds = null) {
  const filter = courseIds ? `AND a.course_id IN (${courseIds.map(() => '?').join(',')})` : '';
  const rows = db.prepare(`SELECT s.competency, s.status, s.level, s.provisional_level FROM assessments s JOIN assignments a ON a.id = s.assignment_id
    WHERE s.student_id = ? ${filter}`).all(studentId, ...(courseIds || []));
  const profile = {};
  for (const r of rows) {
    const p = (profile[r.competency] ||= { final: null, provisional: null, finalCount: 0 });
    if (r.status === 'final') { p.final = Math.max(p.final ?? -1, r.level); p.finalCount++; }
    else if (r.provisional_level !== null) p.provisional = Math.max(p.provisional ?? -1, r.provisional_level);
  }
  return profile;
}
