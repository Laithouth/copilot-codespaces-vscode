import { html } from '../html.js';
import { page } from '../views/layout.js';
import { createSession, destroySession, verifyPassword, hashPassword, passwordProblem, userForInvite, loginAllowed, recordLoginFailure, resetLoginFailures } from '../auth.js';
import { audit } from '../db.js';

const cookie = (ctx, value, maxAge) =>
  `sid=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${ctx.secureCookies ? '; Secure' : ''}`;

function loginPage(ctx, { error = '', email = '' } = {}) {
  const body = html`<section class="wrap narrow section">
    <h1>Sign in</h1>
    <p>Accounts are created by your institution or educator. If you have an invitation link, open it to set your password.</p>
    ${error ? html`<div class="note bad" role="alert"><p>${error}</p></div>` : ''}
    <form method="post" action="/login">
      <div class="field"><label for="email">Email</label><input type="email" id="email" name="email" autocomplete="username" value="${email}" required></div>
      <div class="field"><label for="password">Password</label><input type="password" id="password" name="password" autocomplete="current-password" required></div>
      <button type="submit">Sign in</button>
    </form>
    <p class="muted small">Forgotten your password? Password reset by email is not built yet; ask your educator or institution administrator for a new invitation link.</p>
  </section>`;
  return page({ title: 'Sign in', body, path: '/login' });
}

function invitePage(ctx, user, error = '') {
  const body = html`<section class="wrap narrow section">
    <h1>Set your password</h1>
    <p>Welcome, ${user.name}. You're setting a password for ${user.email}.</p>
    ${error ? html`<div class="note bad" role="alert"><p>${error}</p></div>` : ''}
    <form method="post" action="/invite/${ctx.params.token}">
      <div class="field"><label for="password">New password</label><p class="hint-text" id="pw-hint">At least 10 characters.</p><input type="password" id="password" name="password" autocomplete="new-password" aria-describedby="pw-hint" required></div>
      <div class="field"><label for="confirm">Confirm password</label><input type="password" id="confirm" name="confirm" autocomplete="new-password" required></div>
      <button type="submit">Set password and sign in</button>
    </form>
  </section>`;
  return page({ title: 'Set your password', body });
}

export function registerAccount(router) {
  router.get('/login', (ctx) => (ctx.user ? ctx.redirect('/app') : ctx.html(loginPage(ctx))));
  router.post('/login', (ctx) => {
    const email = String(ctx.body.email || '').trim();
    const key = `${ctx.req.socket.remoteAddress}|${email.toLowerCase()}`;
    if (!loginAllowed(key)) return ctx.html(loginPage(ctx, { email, error: 'Too many attempts. Wait 15 minutes and try again.' }), 429);
    const user = ctx.db.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(email);
    if (!user || !verifyPassword(String(ctx.body.password || ''), user.password_hash)) {
      recordLoginFailure(key);
      return ctx.html(loginPage(ctx, { email, error: 'That email and password don\'t match an account.' }), 401);
    }
    resetLoginFailures(key);
    const sid = createSession(ctx.db, user.id);
    ctx.redirect('/app', { 'Set-Cookie': cookie(ctx, sid, 7 * 86400) });
  });
  router.post('/logout', (ctx) => {
    destroySession(ctx.db, ctx.cookies.sid);
    ctx.redirect('/', { 'Set-Cookie': cookie(ctx, '', 0) });
  });
  router.get('/invite/:token', (ctx) => {
    const user = userForInvite(ctx.db, ctx.params.token);
    if (!user) return ctx.html(page({ title: 'Invitation expired', body: html`<section class="wrap narrow section"><h1>This invitation link isn't valid</h1><p>It may have expired or already been used. Ask your educator or administrator for a new one.</p></section>` }), 404);
    ctx.html(invitePage(ctx, user));
  });
  router.post('/invite/:token', (ctx) => {
    const user = userForInvite(ctx.db, ctx.params.token);
    if (!user) return ctx.redirect(`/invite/${encodeURIComponent(ctx.params.token)}`);
    const pw = String(ctx.body.password || '');
    const problem = passwordProblem(pw) || (pw !== ctx.body.confirm ? 'The two passwords don\'t match.' : null);
    if (problem) return ctx.html(invitePage(ctx, user, problem), 400);
    ctx.db.prepare('UPDATE users SET password_hash = ?, invite_token_hash = NULL, invite_expires_at = NULL WHERE id = ?').run(hashPassword(pw), user.id);
    audit(ctx.db, user.id, null, 'invite_accepted');
    const sid = createSession(ctx.db, user.id);
    ctx.redirect('/app', { 'Set-Cookie': cookie(ctx, sid, 7 * 86400) });
  });
}
