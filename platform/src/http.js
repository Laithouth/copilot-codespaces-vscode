import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sessionUser } from './auth.js';

const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url));
const MAX_BODY = 512 * 1024;
const TYPES = { '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.csv': 'text/csv; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2' };

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const forbidden = (msg = 'You do not have access to this page.') => new HttpError(403, msg);
export const notFound = (msg = 'Page not found.') => new HttpError(404, msg);
export const badRequest = (msg = 'The request could not be processed.') => new HttpError(400, msg);

export class Router {
  constructor() { this.routes = []; }
  add(method, path, handler) {
    const keys = [];
    const pattern = new RegExp('^' + path.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
    this.routes.push({ method, pattern, keys, handler });
  }
  get(path, h) { this.add('GET', path, h); }
  post(path, h) { this.add('POST', path, h); }
  match(method, pathname) {
    let methodMismatch = false;
    for (const r of this.routes) {
      const m = pathname.match(r.pattern);
      if (!m) continue;
      if (r.method !== method) { methodMismatch = true; continue; }
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      return { handler: r.handler, params };
    }
    return methodMismatch ? { methodMismatch: true } : null;
  }
}

export function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((c) => c.trim().split('=')).filter(([k]) => k).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new HttpError(413, 'That submission is too large.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export async function parseForm(req) {
  const type = req.headers['content-type'] || '';
  if (!type.startsWith('application/x-www-form-urlencoded')) return {};
  const params = new URLSearchParams(await readBody(req));
  const out = {};
  for (const [k, v] of params) out[k] = k in out ? [].concat(out[k], v) : v;
  return out;
}

export const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=(self)',
};

export function serveStatic(pathname, res) {
  if (!pathname.startsWith('/static/')) return false;
  const rel = normalize(pathname.slice('/static/'.length)).replace(/^(\.\.[/\\])+/, '');
  const file = join(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR) || !existsSync(file)) return false;
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=300', ...SECURITY_HEADERS });
  res.end(readFileSync(file));
  return true;
}

// Builds the per-request context passed to handlers.
export async function buildContext(req, res, db, params) {
  const url = new URL(req.url, 'http://localhost');
  const cookies = parseCookies(req.headers.cookie);
  const user = sessionUser(db, cookies.sid);
  const body = req.method === 'POST' ? await parseForm(req) : {};
  if (req.method === 'POST' && user && body._csrf !== user.csrf) {
    throw new HttpError(403, 'Your session form token did not match. Reload the page and try again.');
  }
  const ctx = {
    req, res, db, params, url, query: Object.fromEntries(url.searchParams), body, cookies, user,
    secureCookies: process.env.COOKIE_SECURE === '1',
    html(content, status = 200, headers = {}) {
      res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', ...SECURITY_HEADERS, ...headers });
      res.end(String(content));
    },
    redirect(location, headers = {}) {
      res.writeHead(303, { Location: location, ...SECURITY_HEADERS, ...headers });
      res.end();
    },
    download(content, filename, type) {
      res.writeHead(200, { 'Content-Type': type, 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store', ...SECURITY_HEADERS });
      res.end(content);
    },
  };
  return ctx;
}

export function csvRow(values) {
  return values.map((v) => {
    let s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // prevent formula injection in spreadsheets
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',');
}
