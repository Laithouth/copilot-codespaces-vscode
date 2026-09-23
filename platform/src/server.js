import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { openDb } from './db.js';
import { Router, HttpError, buildContext, serveStatic, SECURITY_HEADERS } from './http.js';
import { errorPage } from './views/layout.js';
import { sessionUser } from './auth.js';
import { parseCookies } from './http.js';
import { registerPublic } from './routes/public.js';
import { registerSample } from './routes/sample.js';
import { registerAccount } from './routes/account.js';
import { registerStudent } from './routes/student.js';
import { registerEducator } from './routes/educator.js';
import { registerAdmin } from './routes/admin.js';

export function createApp(db) {
  const router = new Router();
  registerPublic(router);
  registerSample(router);
  registerAccount(router);
  registerStudent(router);
  registerEducator(router);
  registerAdmin(router);

  return async function handle(req, res) {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (req.method === 'GET' && serveStatic(pathname, res)) return;
    if (pathname === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok'); return; }
    const match = router.match(req.method, pathname);
    let ctx;
    try {
      if (!match) throw new HttpError(404, 'We couldn\'t find that page.');
      if (match.methodMismatch) throw new HttpError(405, 'That action isn\'t available here.');
      ctx = await buildContext(req, res, db, match.params);
      if (pathname.startsWith('/app')) ctx.res.setHeader?.('Cache-Control', 'no-store');
      await match.handler(ctx);
    } catch (err) {
      if (res.headersSent) { console.error(err); res.end(); return; }
      const status = err instanceof HttpError ? err.status : 500;
      if (status === 500) console.error(err);
      if (status === 401) {
        res.writeHead(303, { Location: `/login`, ...SECURITY_HEADERS });
        res.end();
        return;
      }
      const user = ctx?.user || sessionUser(db, parseCookies(req.headers.cookie).sid);
      res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', ...SECURITY_HEADERS });
      res.end(String(errorPage(status, status === 500 ? 'Something went wrong on our side. Your saved work is not affected; please try again.' : err.message, user)));
    }
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db = openDb();
  const port = Number(process.env.PORT || 3000);
  createServer(createApp(db)).listen(port, () => console.log(`Practicum listening on http://localhost:${port}`));
}
