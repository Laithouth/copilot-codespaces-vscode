// Exports a clickable, static prototype of the whole product: the public site,
// and every workspace screen as seen by a student, an educator, an institution
// administrator and a platform administrator, filled with the fictional demo
// data. Pages are captured from the real application, so the prototype shows
// exactly what the product renders. The sample lesson stays fully interactive:
// the same lesson and feedback code runs in the browser.
//
// Usage: npm run export:prototype   → dist/prototype/ and dist/prototype.zip
import { createServer } from 'node:http';
import { mkdirSync, rmSync, writeFileSync, copyFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { openDb } from '../src/db.js';
import { createApp } from '../src/server.js';
import { seedDemo } from '../src/demo.js';
import { LESSONS } from '../src/content/lessons.js';
import { MODULES } from '../src/content/curriculum.js';
import { page, PRODUCT } from '../src/views/layout.js';
import { html } from '../src/html.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'dist', 'prototype');
const PASSWORD = 'prototype-only-password';

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'assets'), { recursive: true });

// ---- Run the real app on the demo data ----
const db = openDb(':memory:');
const demo = seedDemo(db, { password: PASSWORD });
const server = createServer(createApp(db));
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

async function session(email) {
  let cookie = '';
  if (email) {
    const res = await fetch(`${base}/login`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ email, password: PASSWORD }) });
    cookie = res.headers.get('set-cookie').split(';')[0];
  }
  return async (path) => {
    const res = await fetch(base + path, { headers: cookie ? { cookie } : {}, redirect: 'manual' });
    if (res.status !== 200) throw new Error(`${email || 'visitor'} ${path} → ${res.status}`);
    return { text: await res.text(), type: res.headers.get('content-type') || '' };
  };
}

// ---- What to capture, per role ----
const A = demo.assignmentIds;
const I = demo.ids;
const course = demo.course;
const publicPaths = ['/', '/how-it-works', '/curriculum', ...MODULES.map((m) => `/curriculum/module-${m.no}`), '/curriculum/sample-lesson', '/curriculum/rubric',
  '/institutions', '/research', '/plans', '/trust', '/resources', '/status', '/contact', '/try', '/login'];
const studentPaths = ['/app', ...Object.values(A).map((id) => `/app/assignments/${id}`)];
const ROLES = [
  { key: 'visitor', label: 'Visitor', email: null, paths: publicPaths, downloads: [] },
  { key: 'student-sam', label: 'Student: Sam', email: 'student1@demo.invalid', paths: studentPaths, downloads: ['/app/portfolio'] },
  { key: 'student-jo', label: 'Student: Jo', email: 'student2@demo.invalid', paths: studentPaths, downloads: ['/app/portfolio'] },
  { key: 'student-kai', label: 'Student: Kai', email: 'student3@demo.invalid', paths: studentPaths, downloads: ['/app/portfolio'] },
  { key: 'educator', label: 'Educator', email: 'educator@demo.invalid',
    paths: ['/app', `/app/courses/${course}`, `/app/courses/${course}/gaps`, ...Object.values(A).map((id) => `/app/assignments/${id}/review`),
      ...Object.values(A).flatMap((id) => ['student1', 'student2', 'student3'].map((s) => `/app/assignments/${id}/students/${I[`${s}@demo.invalid`]}`))],
    downloads: [`/app/courses/${course}/report.csv`] },
  { key: 'admin', label: 'Institution admin', email: 'admin@demo.invalid', paths: ['/app', `/app/admin/${demo.inst}`], downloads: [`/app/admin/${demo.inst}/report.csv`] },
  { key: 'platform', label: 'Platform admin', email: 'platform@demo.invalid', paths: ['/app', '/app/platform'], downloads: [] },
];

const slug = (p) => p.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/-$/, '') || 'home';
const fileFor = (role, p) => {
  if (p === '/app/portfolio') return `${role}-portfolio.html`;
  if (p.endsWith('.csv')) return `${role}-${slug(p.replace(/\.csv$/, ''))}.csv`;
  return `${role === 'visitor' ? 'site' : role}-${slug(p)}.html`;
};
const publicMap = Object.fromEntries(publicPaths.map((p) => [p, fileFor('visitor', p)]));

function rewrite(text, role) {
  const roleMap = Object.fromEntries([...role.paths, ...role.downloads].map((p) => [p, fileFor(role.key, p)]));
  const target = (href) => {
    const [pathPart, hash = ''] = href.split('#');
    const p = pathPart.split('?')[0].replace(/\/$/, '') || '/';
    const file = roleMap[p] || publicMap[p];
    if (file) return file + (hash ? `#${hash}` : '');
    return '#prototype-unavailable';
  };
  return text
    .replace(/(href|src)="\/static\/([^"]+)"/g, '$1="assets/$2"')
    .replace(/href="(\/[^"]*)"/g, (_, h) => `href="${target(h)}"`)
    .replace(/name="_csrf" value="[^"]*"/g, 'name="_csrf" value=""')
    .replace('<body>', `<body data-proto-role="${role.key}">\n${bar(role)}`)
    .replace('</body>', `${text.includes('action="/try') ? '<script src="assets/sample-live.js"></script>\n' : ''}<script src="assets/prototype.js"></script>\n</body>`);
}

function bar(role) {
  const links = ROLES.map((r) => `<a href="${r.key === 'visitor' ? 'site-home.html' : `${r.key}-app.html`}"${r.key === role.key ? ' aria-current="page"' : ''}>${r.label}</a>`).join('');
  return `<div class="proto-bar" role="region" aria-label="Prototype controls"><div class="wrap proto-row"><span><strong>Prototype</strong> · fictional demo data · <a href="index.html">All screens</a></span><nav aria-label="View as" class="proto-roles"><span class="muted">View as:</span>${links}</nav></div><p class="proto-toast" role="status" aria-live="polite" hidden></p></div>`;
}

// ---- Capture ----
let count = 0;
for (const role of ROLES) {
  const get = await session(role.email);
  for (const p of role.paths) {
    const { text } = await get(p);
    writeFileSync(join(OUT, fileFor(role.key, p)), rewrite(text, role));
    count++;
  }
  for (const p of role.downloads) {
    const { text } = await get(p);
    writeFileSync(join(OUT, fileFor(role.key, p)), text);
    count++;
  }
}

// ---- Overview page ----
const card = (title, text, links) => html`<div class="card"><h3>${title}</h3><p>${text}</p><ul class="plain">${links.map(([href, label]) => html`<li><a href="${href}">${label}</a></li>`)}</ul></div>`;
const lessonLink = (roleKey, slugName) => `${roleKey}-app-assignments-${A[slugName]}.html`;
const overview = page({
  title: 'Prototype overview',
  description: `Clickable prototype of ${PRODUCT}, with fictional demo data.`,
  body: html`<section class="wrap section">
    <h1>${PRODUCT}: clickable prototype</h1>
    <p class="lead">Every screen of the product, as each type of user sees it, filled with fictional demo data. The pages are captured from the working application.</p>
    <div class="note info"><p><strong>What works here.</strong> All links work. The <a href="site-try.html">sample lesson</a> is fully interactive: it gives real feedback, runs on the product's own feedback rules, and saves nothing. Other buttons that would save data are switched off in this prototype and explain what they would do. The full product, with accounts and saving, runs from the source code.</p></div>

    <h2>Suggested 10-minute tour</h2>
    <ol class="steps">
      <li><a href="site-home.html"><strong>Public website</strong></a>: what a university sees first.</li>
      <li><a href="site-try.html"><strong>Try the sample lesson</strong></a>: submit it and read the feedback, then revise.</li>
      <li><a href="student-sam-app.html"><strong>Student dashboard</strong></a> (Sam): assignments, AI rules and progress by skill.</li>
      <li><a href="${lessonLink('student-sam', 'checking-claims-and-sources')}"><strong>A lesson after revision</strong></a>: both versions, feedback, educator comments and confirmed levels.</li>
      <li><a href="educator-app-courses-${course}.html"><strong>Educator course page</strong></a>: assign lessons with AI rules, import students, export reports.</li>
      <li><a href="educator-app-assignments-${A['checking-claims-and-sources']}-review.html"><strong>Review a class</strong></a>, then open one student to confirm levels.</li>
      <li><a href="educator-app-courses-${course}-gaps.html"><strong>Cohort skill gaps</strong></a>: what to teach next, with no rankings.</li>
      <li><a href="admin-app-admin-${demo.inst}.html"><strong>Institution admin</strong></a>: AI provider, usage cap, retention and deletion.</li>
    </ol>

    <h2>Screens by role</h2>
    <div class="grid">
      ${card('Visitor', 'The public website, curriculum, research, plans, trust and contact pages.', [['site-home.html', 'Home'], ['site-curriculum.html', 'Curriculum (8 modules)'], ['site-institutions.html', 'For institutions'], ['site-plans.html', 'Plans and pilot'], ['site-try.html', 'Sample lesson (interactive)']])}
      ${card('Student: Sam', 'Steady progress: one lesson revised after feedback, one mistake to fix, one draft.', [['student-sam-app.html', 'Dashboard'], [lessonLink('student-sam', 'working-with-numbers'), 'Module 5 with feedback'], [lessonLink('student-sam', 'examples-and-structured-outputs'), 'Module 3 draft in progress'], ['student-sam-portfolio.html', 'Portfolio export']])}
      ${card('Student: Jo', 'Strong on sources; a mistake about personal data in Module 7.', [['student-jo-app.html', 'Dashboard'], [lessonLink('student-jo', 'responsible-workflows'), 'Module 7 with feedback'], [lessonLink('student-jo', 'research-and-communication'), 'Module 6']])}
      ${card('Student: Kai', 'Ahead of the class, including the independent final task.', [['student-kai-app.html', 'Dashboard'], [lessonLink('student-kai', 'independent-application'), 'Module 8 (assessment mode)']])}
      ${card('Educator', 'Assign, review, give feedback, confirm levels, answer challenges, export.', [['educator-app.html', 'Dashboard'], [`educator-app-courses-${course}.html`, 'Course page'], [`educator-app-assignments-${A['checking-claims-and-sources']}-students-${I['student1@demo.invalid']}.html`, 'One student\'s work in detail'], [`educator-app-courses-${course}-report.csv`, 'Course report (CSV)']])}
      ${card('Administrators', 'Institution settings and reports; platform-level institutions and pilot requests.', [[`admin-app-admin-${demo.inst}.html`, 'Institution administration'], [`admin-app-admin-${demo.inst}-report.csv`, 'Institution report (CSV)'], ['platform-app-platform.html', 'Platform administration']])}
    </div>

    <h2>The eight lessons</h2>
    <div class="table-wrap" tabindex="0" role="region" aria-label="Lessons, scrolls sideways on small screens"><table><thead><tr><th scope="col">Module</th><th scope="col">Lesson</th><th scope="col">Student view</th><th scope="col">Educator view</th></tr></thead>
      <tbody>${Object.values(LESSONS).sort((x, y) => x.module - y.module).map((l) => html`<tr><td>${l.module}</td><td>${l.title}</td><td><a href="${lessonLink('student-sam', l.slug)}">Open</a></td><td><a href="educator-app-assignments-${A[l.slug]}-review.html">Review</a></td></tr>`)}</tbody></table></div>
    <p class="small muted">All people, organisations, figures and records in this prototype are fictional.</p>
  </section>`,
});
writeFileSync(join(OUT, 'index.html'), rewrite(String(overview), ROLES[0]));

// ---- Assets: styles, the site script, the prototype script and the modules the live sample lesson needs ----
for (const f of readdirSync(join(ROOT, 'public'))) copyFileSync(join(ROOT, 'public', f), join(OUT, 'assets', f));
// Bundle the sample lesson (the same lesson and feedback code the server uses)
// into one classic script, so it also works when the files are opened from disk.
execFileSync(join(ROOT, 'node_modules', '.bin', 'esbuild'), [join(ROOT, 'src', 'routes', 'sample.js'), '--bundle', '--format=iife', '--global-name=PrototypeSample', '--minify', `--outfile=${join(OUT, 'assets', 'sample-live.js')}`, '--log-level=warning']);
const logins = Object.fromEntries(ROLES.filter((r) => r.email).map((r) => [r.email, `${r.key}-app.html`]));
writeFileSync(join(OUT, 'assets', 'prototype.js'), `// Prototype behaviour (classic script, so it works from disk too): live sample lesson, demo sign-in, and friendly notices
// for actions that would save data in the real product.
const PUBLIC_MAP = ${JSON.stringify(publicMap)};
const LOGINS = ${JSON.stringify(logins)};
const toast = document.querySelector('.proto-toast');
function say(msg) { if (!toast) return; toast.textContent = msg; toast.hidden = false; clearTimeout(say.t); say.t = setTimeout(() => { toast.hidden = true; }, 6000); }

function relink(root) {
  root.querySelectorAll('a[href^="/"]').forEach((a) => {
    const [p, hash] = a.getAttribute('href').split('#');
    const file = PUBLIC_MAP[p.replace(/\\/$/, '') || '/'];
    a.setAttribute('href', file ? file + (hash ? '#' + hash : '') : '#prototype-unavailable');
  });
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href="#prototype-unavailable"]');
  if (a) { e.preventDefault(); say('That page is not part of this prototype.'); }
});

document.addEventListener('submit', (e) => {
  const form = e.target;
  const action = form.getAttribute('action') || '';
  e.preventDefault();
  if (action.startsWith('/try')) {
    const body = Object.fromEntries(new FormData(form));
    if (e.submitter?.name) body[e.submitter.name] = e.submitter.value;
    const { samplePage } = window.PrototypeSample;
    const doc = new DOMParser().parseFromString(String(samplePage({ user: null }, body)), 'text/html');
    const main = document.querySelector('main');
    main.innerHTML = doc.querySelector('main').innerHTML;
    relink(main);
    const fb = document.getElementById('feedback');
    if (fb) { fb.scrollIntoView(); fb.focus(); } else window.scrollTo(0, 0);
    return;
  }
  if (action === '/login') {
    const email = String(new FormData(form).get('email') || '').trim().toLowerCase();
    if (LOGINS[email]) { location.href = LOGINS[email]; return; }
    say('In this prototype, sign in with a demo account: student1@demo.invalid, educator@demo.invalid or admin@demo.invalid (any password).');
    return;
  }
  if (action === '/logout') { location.href = 'index.html'; return; }
  const what = action.includes('/assignments/') && !action.includes('/students/') ? 'save or submit this work, and show feedback'
    : action.includes('/students/') ? 'save this feedback or assessment decision'
    : action.includes('/roster') ? 'enrol these students and show their invitation links'
    : action.includes('/admin/') ? 'save these institution settings'
    : action === '/contact' ? 'send this pilot request' : 'save this';
  say('Prototype: saving is switched off. In the real product this would ' + what + '.');
});
`);
writeFileSync(join(OUT, 'assets', 'prototype.css'), `.proto-bar { background: var(--text); color: var(--bg); font-size: 0.9rem; }
.proto-bar a { color: var(--bg); }
.proto-bar a[aria-current="page"] { font-weight: 700; }
.proto-bar .muted { color: inherit; opacity: 0.8; }
.proto-row { display: flex; flex-wrap: wrap; gap: 0.3rem 1.2rem; justify-content: space-between; padding-top: 0.4rem; padding-bottom: 0.4rem; }
.proto-roles { display: flex; flex-wrap: wrap; gap: 0.2rem 0.9rem; }
.proto-toast { margin: 0; padding: 0.5rem 1rem; background: var(--accent); color: var(--accent-text); text-align: center; }
`);
for (const f of readdirSync(OUT).filter((f) => f.endsWith('.html'))) {
  const p = join(OUT, f);
  const t = (await import('node:fs')).readFileSync(p, 'utf8');
  writeFileSync(p, t.replace('<link rel="stylesheet" href="assets/styles.css">', '<link rel="stylesheet" href="assets/styles.css">\n<link rel="stylesheet" href="assets/prototype.css">'));
}

server.close();
let zipped = false;
try {
  rmSync(join(ROOT, 'dist', 'prototype.zip'), { force: true });
  execFileSync('python3', ['-c', 'import shutil,sys; shutil.make_archive(sys.argv[1], "zip", sys.argv[2])', join(ROOT, 'dist', 'prototype'), OUT]);
  zipped = true;
} catch { /* zip is optional */ }
console.log(`Prototype written to dist/prototype (${count} captured screens and files + overview).${zipped ? ' Zip: dist/prototype.zip' : ''}`);
console.log('Open dist/prototype/index.html in a browser, or publish the folder to any static host.');
