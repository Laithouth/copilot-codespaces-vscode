// Accessibility checks in a real browser (Chromium via Playwright):
//   1. axe-core WCAG 2.0/2.1/2.2 A and AA rules on public and workspace pages
//   2. no horizontal scrolling at 320 CSS px (reflow, WCAG 1.4.10)
//   3. keyboard-only completion of the sample lesson
// Automated checks find only some problems. Screen-reader testing and testing
// with disabled users are still needed and are not covered here.
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { openDb } from '../src/db.js';
import { createApp } from '../src/server.js';
import { hashPassword } from '../src/auth.js';
import { createInstitution } from '../src/routes/admin.js';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const db = openDb(':memory:');
const { instId } = createInstitution(db, { name: 'A11y University', adminName: 'Admin', adminEmail: 'admin@a11y.test' });
const pw = hashPassword('a11y-password-1');
db.prepare('UPDATE users SET password_hash = ?').run(pw);
const mk = (email, role) => {
  const id = Number(db.prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)').run(email, email.split('@')[0], pw).lastInsertRowid);
  db.prepare('INSERT INTO memberships (user_id, institution_id, role) VALUES (?, ?, ?)').run(id, instId, role);
  return id;
};
const edu = mk('edu@a11y.test', 'educator');
const stu = mk('stu@a11y.test', 'student');
const course = Number(db.prepare(`INSERT INTO courses (institution_id, code, title) VALUES (?, 'A11Y1', 'Accessibility course')`).run(instId).lastInsertRowid);
db.prepare(`INSERT INTO course_members VALUES (?, ?, 'educator'), (?, ?, 'student')`).run(course, edu, course, stu);
const slugs = ['checking-claims-and-sources', 'choosing-suitable-tasks', 'defining-a-useful-request'];
const assignmentIds = slugs.map((slug) => Number(db.prepare(`INSERT INTO assignments (course_id, lesson_slug, title, ai_policy, mode, solution_visibility, competencies) VALUES (?, ?, ?, 'limited', 'practice', 'after_submit', '["verification"]')`).run(course, slug, `A11y ${slug}`).lastInsertRowid));

const server = createServer(createApp(db));
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const shotDir = process.env.SCREENSHOT_DIR;
if (shotDir) mkdirSync(shotDir, { recursive: true });

const results = [];
async function audit(page, label) {
  await page.addScriptTag({ content: axeSource });
  const res = await page.evaluate(async () => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  results.push({ label, violations: res.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s), e.g. ${v.nodes[0].target.join(' ')}`), overflow });
}

const publicPaths = ['/', '/how-it-works', '/curriculum', '/curriculum/module-4', '/curriculum/sample-lesson', '/curriculum/rubric', '/institutions', '/research', '/plans', '/trust', '/resources', '/status', '/contact', '/try', '/login'];
for (const scheme of ['light', 'dark']) {
  for (const width of [1280, 320]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme, bypassCSP: true }); // only so axe can be injected
    const page = await ctx.newPage();
    for (const p of publicPaths) {
      await page.goto(base + p);
      await audit(page, `${scheme} ${width}px ${p}`);
      if (shotDir && scheme === 'light' && ['/', '/try'].includes(p)) await page.screenshot({ path: `${shotDir}/${width}${p === '/' ? '-home' : p.replace(/\//g, '-')}.png`, fullPage: false });
    }
    // Sample lesson after a submission (feedback and example visible).
    await page.goto(`${base}/try`);
    await page.getByRole('button', { name: 'Submit for feedback' }).click();
    await audit(page, `${scheme} ${width}px /try (after submit)`);
    // Workspace pages as a student and an educator.
    for (const [email, paths] of [['stu@a11y.test', ['/app', ...assignmentIds.map((id) => `/app/assignments/${id}`)]], ['edu@a11y.test', ['/app', `/app/courses/${course}`, `/app/assignments/${assignmentIds[0]}/review`, `/app/assignments/${assignmentIds[0]}/students/${stu}`, `/app/courses/${course}/gaps`]], ['admin@a11y.test', [`/app/admin/${instId}`]]]) {
      await page.goto(`${base}/login`);
      await page.fill('#email', email);
      await page.fill('#password', 'a11y-password-1');
      await page.getByRole('button', { name: 'Sign in' }).click();
      for (const p of paths) {
        await page.goto(base + p);
        await audit(page, `${scheme} ${width}px ${email.split('@')[0]} ${p}`);
      }
      if (email === 'stu@a11y.test') {
        // Submit once so the review pages have content.
        await page.goto(`${base}/app/assignments/${assignmentIds[0]}`);
        if (await page.locator('#disclosure').count()) {
          await page.fill('#disclosure', 'I did not use AI.');
          await page.getByRole('button', { name: /Submit version/ }).click();
        }
        await audit(page, `${scheme} ${width}px student after submit`);
      }
      await ctx.clearCookies();
    }
    await ctx.close();
  }
}

// Keyboard-only walkthrough of the sample lesson: reach the first verdict,
// choose it with the keyboard, reach and press the submit button, and check
// that focus lands on the feedback.
const kctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const kp = await kctx.newPage();
await kp.goto(`${base}/try`);
await kp.keyboard.press('Tab');
const skip = await kp.evaluate(() => document.activeElement.textContent.trim());
await kp.keyboard.press('Enter');
let reachedRadio = false; let reachedSubmit = false; let focusVisible = true;
for (let i = 0; i < 400 && !(reachedRadio && reachedSubmit); i++) {
  await kp.keyboard.press('Tab');
  const info = await kp.evaluate(() => {
    const el = document.activeElement;
    const style = getComputedStyle(el);
    return { name: el.name, type: el.type, text: el.textContent.trim(), outline: style.outlineStyle !== 'none' || style.boxShadow !== 'none' };
  });
  if (!info.outline && info.type !== 'radio') focusVisible = false;
  if (!reachedRadio && info.name === 'v_C1') { reachedRadio = true; await kp.keyboard.press('ArrowRight'); }
  if (info.text === 'Submit for feedback') {
    reachedSubmit = true;
    await Promise.all([kp.waitForURL(/\/try/, { waitUntil: 'load' }), kp.waitForEvent('framenavigated'), kp.keyboard.press('Enter')]);
    break;
  }
}
await kp.waitForLoadState('load');
const focusedFeedback = await kp.evaluate(() => document.activeElement?.id === 'feedback');
const chosen = await kp.evaluate(() => document.querySelector('input[name="v_C1"]:checked')?.value);
await kctx.close();
await browser.close();
server.close();

let failures = 0;
for (const r of results) {
  if (r.violations.length || r.overflow) {
    failures++;
    console.log(`FAIL ${r.label}${r.overflow ? ' [horizontal overflow]' : ''}`);
    for (const v of r.violations) console.log(`   - ${v}`);
  }
}
console.log(`axe + reflow: ${results.length - failures}/${results.length} page states passed`);
const keyboardOk = skip === 'Skip to main content' && reachedRadio && reachedSubmit && focusedFeedback && chosen === 'partly_supported' && focusVisible;
console.log(`keyboard walkthrough: skip link first=${skip === 'Skip to main content'}, verdict chosen by keyboard=${chosen}, submit reached=${reachedSubmit}, focus moved to feedback=${focusedFeedback}, visible focus=${focusVisible} -> ${keyboardOk ? 'PASS' : 'FAIL'}`);
process.exit(failures || !keyboardOk ? 1 : 0);
