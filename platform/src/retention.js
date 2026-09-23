import { audit } from './db.js';

// Deletes learning records older than each institution's retention period.
// Attempts cascade to model runs, evidence checks, feedback and assessments.
export function applyRetention(db, now = new Date()) {
  const results = [];
  for (const inst of db.prepare('SELECT id, name, retention_days FROM institutions').all()) {
    const cutoff = new Date(now.getTime() - inst.retention_days * 86400_000).toISOString().replace('T', ' ').slice(0, 19);
    const courseFilter = 'assignment_id IN (SELECT a.id FROM assignments a JOIN courses c ON c.id = a.course_id WHERE c.institution_id = ?)';
    const attempts = db.prepare(`DELETE FROM attempts WHERE created_at < ? AND ${courseFilter}`).run(cutoff, inst.id).changes;
    const challenges = db.prepare(`DELETE FROM challenges WHERE created_at < ? AND ${courseFilter}`).run(cutoff, inst.id).changes;
    const runs = db.prepare('DELETE FROM model_runs WHERE institution_id = ? AND created_at < ?').run(inst.id, cutoff).changes;
    if (attempts || challenges || runs) audit(db, null, inst.id, 'retention_applied', { cutoff, attempts, challenges, runs });
    results.push({ institution: inst.name, cutoff, attempts, challenges, runs });
  }
  return results;
}
