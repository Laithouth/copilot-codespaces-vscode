// Server-side authorisation. Every handler that touches institution data goes
// through one of these helpers; each throws 403/404 rather than returning data
// the user may not see. 404 is used where revealing existence would leak.
import { forbidden, notFound, HttpError } from './http.js';

export function requireUser(ctx) {
  if (!ctx.user) throw new HttpError(401, 'Please sign in.');
  return ctx.user;
}

export function memberships(db, userId) {
  return db.prepare(`SELECT m.institution_id, m.role, i.name, i.is_demo FROM memberships m JOIN institutions i ON i.id = m.institution_id
    WHERE m.user_id = ? ORDER BY i.name`).all(userId);
}

export function institutionRole(db, userId, institutionId) {
  return db.prepare('SELECT role FROM memberships WHERE user_id = ? AND institution_id = ?').get(userId, institutionId)?.role || null;
}

export function requireInstAdmin(ctx, institutionId) {
  requireUser(ctx);
  const inst = ctx.db.prepare('SELECT * FROM institutions WHERE id = ?').get(institutionId);
  if (!inst) throw notFound();
  if (institutionRole(ctx.db, ctx.user.id, inst.id) !== 'inst_admin') throw forbidden();
  return inst;
}

export function requirePlatformAdmin(ctx) {
  requireUser(ctx);
  if (!ctx.user.is_platform_admin) throw forbidden();
}

function courseWithRole(ctx, courseId) {
  requireUser(ctx);
  const course = ctx.db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
  if (!course) throw notFound();
  const role = ctx.db.prepare('SELECT role FROM course_members WHERE course_id = ? AND user_id = ?').get(course.id, ctx.user.id)?.role || null;
  return { course, role };
}

export function requireCourseEducator(ctx, courseId) {
  const { course, role } = courseWithRole(ctx, courseId);
  if (role !== 'educator') throw notFound();
  return course;
}

export function requireAssignment(ctx, assignmentId, wantRole) {
  requireUser(ctx);
  const a = ctx.db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignmentId);
  if (!a) throw notFound();
  const { course, role } = courseWithRole(ctx, a.course_id);
  if (role !== wantRole) throw notFound();
  const institution = ctx.db.prepare('SELECT * FROM institutions WHERE id = ?').get(course.institution_id);
  return { assignment: a, course, institution };
}

// Educator viewing one student's work: the student must be enrolled as a
// student on the same course.
export function requireStudentInCourse(ctx, courseId, studentId) {
  const row = ctx.db.prepare(`SELECT u.id, u.name, u.email FROM course_members cm JOIN users u ON u.id = cm.user_id
    WHERE cm.course_id = ? AND cm.user_id = ? AND cm.role = 'student'`).get(courseId, studentId);
  if (!row) throw notFound();
  return row;
}
