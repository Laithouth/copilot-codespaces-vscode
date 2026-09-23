import { scryptSync, randomBytes, timingSafeEqual, createHash } from 'node:crypto';

const SESSION_DAYS = 7;
const INVITE_DAYS = 14;

export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.startsWith('scrypt$')) return false;
  const [, saltB64, hashB64] = stored.split('$');
  const expected = Buffer.from(hashB64, 'base64');
  const actual = scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length);
  return timingSafeEqual(expected, actual);
}

export const sha256 = (s) => createHash('sha256').update(s).digest('hex');
export const token = () => randomBytes(32).toString('base64url');

export function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < 10) return 'Use at least 10 characters.';
  if (password.length > 200) return 'Use at most 200 characters.';
  return null;
}

export function createSession(db, userId) {
  const raw = token();
  db.prepare(`INSERT INTO sessions (token_hash, user_id, csrf, expires_at) VALUES (?, ?, ?, datetime('now', ?))`)
    .run(sha256(raw), userId, token(), `+${SESSION_DAYS} days`);
  return raw;
}

export function sessionUser(db, rawToken) {
  if (!rawToken) return null;
  const row = db.prepare(`SELECT s.csrf, u.id, u.email, u.name, u.is_platform_admin FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > datetime('now')`).get(sha256(rawToken));
  return row || null;
}

export function destroySession(db, rawToken) {
  if (rawToken) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(rawToken));
}

// Creates (or reuses) a user and returns a one-time invite token for setting a
// password. The platform does not send email yet, so the caller shows the link.
export function issueInvite(db, { email, name }) {
  const raw = token();
  const existing = db.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(email);
  if (existing) {
    if (existing.password_hash) return { userId: existing.id, invite: null };
    db.prepare(`UPDATE users SET invite_token_hash = ?, invite_expires_at = datetime('now', ?) WHERE id = ?`).run(sha256(raw), `+${INVITE_DAYS} days`, existing.id);
    return { userId: existing.id, invite: raw };
  }
  const info = db.prepare(`INSERT INTO users (email, name, invite_token_hash, invite_expires_at) VALUES (?, ?, ?, datetime('now', ?))`)
    .run(email, name, sha256(raw), `+${INVITE_DAYS} days`);
  return { userId: Number(info.lastInsertRowid), invite: raw };
}

export function userForInvite(db, raw) {
  if (!raw) return null;
  return db.prepare(`SELECT id, email, name FROM users WHERE invite_token_hash = ? AND invite_expires_at > datetime('now')`).get(sha256(raw)) || null;
}

// Simple in-memory limiter for login attempts (per process). Adequate for a
// single-instance pilot; a multi-instance deployment needs a shared store.
const attempts = new Map();
export function loginAllowed(key) {
  const now = Date.now();
  const entry = attempts.get(key) || { count: 0, since: now };
  if (now - entry.since > 15 * 60_000) { entry.count = 0; entry.since = now; }
  attempts.set(key, entry);
  return entry.count < 10;
}
export function recordLoginFailure(key) {
  const entry = attempts.get(key) || { count: 0, since: Date.now() };
  entry.count++;
  attempts.set(key, entry);
}
export function resetLoginFailures(key) { attempts.delete(key); }
