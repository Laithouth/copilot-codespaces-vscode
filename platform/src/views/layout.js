import { html, raw } from '../html.js';
import { icon } from './icons.js';

// Brand name is configurable (BRAND_NAME) so the platform can be licensed and
// run under a customer's own name. Guarded so this module also runs in a browser.
const env = globalThis.process?.env || {};
export const PRODUCT = env.BRAND_NAME || 'Practicum';
export const PRODUCT_NOTE = env.BRAND_NAME ? '' : 'Practicum is a working name.';

const NAV = [
  ['/how-it-works', 'How it works'],
  ['/curriculum', 'Curriculum'],
  ['/institutions', 'Institutions'],
  ['/research', 'Research'],
  ['/plans', 'Plans'],
  ['/trust', 'Trust'],
  ['/resources', 'Resources'],
];

// Default workspace navigation; pages can add items (for example, a student's
// portfolio export) through `sideNav`.
const APP_NAV = [
  ['/app', 'Dashboard', 'home'],
  ['/curriculum', 'Curriculum', 'book'],
  ['/resources', 'Help and resources', 'help'],
  ['/', 'Public website', 'globe'],
];

// The logo mark: an AI spark above a check mark ("use AI, then check it").
// It carries no letters, so it still works when the product is white-labelled.
export const LOGO_MARK = raw('<svg class="logo-glyph" viewBox="0 0 40 40" width="24" height="24" aria-hidden="true" focusable="false"><path class="logo-spark" d="M13.5 6.5c.6 3.6 1.9 4.9 5.5 5.5-3.6.6-4.9 1.9-5.5 5.5-.6-3.6-1.9-4.9-5.5-5.5 3.6-.6 4.9-1.9 5.5-5.5z"/><path class="logo-check" d="M12 23l6 6 12.5-14.5" fill="none" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/></svg>');
const brand = (href) => html`<a class="brand" href="${href}"><span class="brand-mark" aria-hidden="true">${LOGO_MARK}</span><span class="brand-name">${PRODUCT}</span></a>`;

const head = (title, description) => html`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title ? `${title} · ${PRODUCT}` : PRODUCT}</title>
<meta name="description" content="${description}">
<link rel="icon" href="/static/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/static/styles.css">
<script src="/static/app.js" defer></script>
</head>`;

const banner = html`<div class="prototype-banner" role="note"><div class="wrap"><span class="banner-dot" aria-hidden="true"></span>Pilot prototype. Some features are planned, not built. <a href="/status">See what works today</a></div></div>`;

export function page({ title, description = '', body, user = null, path = '', app = false, flash = '', csrf = '', sideNav = [] }) {
  const flashBlock = flash ? html`<div class="wrap"><p class="flash" role="status">${flash}</p></div>` : '';
  if (app) {
    return html`${head(title, description)}
<body class="app">
<a class="skip" href="#main">Skip to main content</a>
<div class="shell">
${appSidebar(user, path, csrf, sideNav)}
<div class="shell-main">
${banner}
<main id="main" tabindex="-1">
${flashBlock}
${body}
</main>
<footer class="app-footer"><div class="wrap"><span>${PRODUCT}</span><a href="/status">Feature status</a><a href="/trust">Data and privacy</a><a href="/resources">Help</a></div></footer>
</div>
</div>
</body>
</html>`;
  }
  return html`${head(title, description)}
<body>
<a class="skip" href="#main">Skip to main content</a>
<header class="site-header">
  <div class="wrap header-row">
    ${brand('/')}
    ${publicNav(path, user)}
  </div>
</header>
${banner}
<main id="main" tabindex="-1">
${flashBlock}
${body}
</main>
<footer class="site-footer">
  <div class="wrap footer-grid">
    <div class="footer-brand">
      ${brand('/')}
      <p class="muted">AI skills practice and assessment for university courses. ${PRODUCT_NOTE}</p>
    </div>
    <nav aria-label="Product">
      <p class="footer-head">Product</p>
      <ul class="plain">
        <li><a href="/try">Try a sample lesson</a></li>
        <li><a href="/curriculum">Curriculum</a></li>
        <li><a href="/plans">Plans and pilot</a></li>
      </ul>
    </nav>
    <nav aria-label="Company">
      <p class="footer-head">Trust</p>
      <ul class="plain">
        <li><a href="/status">Feature status</a></li>
        <li><a href="/trust">Data, privacy &amp; accessibility</a></li>
        <li><a href="/research">Research &amp; evidence</a></li>
      </ul>
    </nav>
    <nav aria-label="Get in touch">
      <p class="footer-head">Contact</p>
      <ul class="plain">
        <li><a href="/contact">Request an institutional pilot</a></li>
        <li><a href="/resources">Resources and FAQ</a></li>
      </ul>
    </nav>
  </div>
</footer>
</body>
</html>`;
}

function publicNav(path, user) {
  return html`<nav class="main-nav" aria-label="Main">
    <details class="menu">
      <summary>Menu</summary>
      <ul>
        ${NAV.map(([href, label]) => html`<li><a href="${href}"${path === href ? raw(' aria-current="page"') : ''}>${label}</a></li>`)}
        <li><a href="/contact"${path === '/contact' ? raw(' aria-current="page"') : ''}>Contact</a></li>
        <li class="nav-sep"><a href="${user ? '/app' : '/login'}">${user ? 'Your workspace' : 'Sign in'}</a></li>
        <li><a class="button small" href="/try">Try a sample lesson</a></li>
      </ul>
    </details>
  </nav>`;
}

const initials = (name = '') => name.replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

function appSidebar(user, path, csrf, extra) {
  const items = [...APP_NAV.slice(0, 1), ...extra, ...APP_NAV.slice(1)];
  return html`<aside class="sidebar" aria-label="Workspace">
    <div class="sidebar-top">${brand('/app')}</div>
    <details class="side-menu">
      <summary>Menu</summary>
      <nav aria-label="Workspace navigation"><ul class="side-nav">
        ${items.map(([href, label, ic]) => html`<li><a href="${href}"${path === href ? raw(' aria-current="page"') : ''}>${icon(ic)}<span>${label}</span></a></li>`)}
      </ul></nav>
      <div class="user-card">
        <span class="avatar" aria-hidden="true">${initials(user?.name)}</span>
        <span class="user-meta"><span class="user-label">Signed in as</span><strong>${user?.name}</strong></span>
        <form method="post" action="/logout" class="inline"><input type="hidden" name="_csrf" value="${csrf}"><button class="icon-button" type="submit" aria-label="Sign out">${icon('logout')}</button></form>
      </div>
    </details>
  </aside>`;
}

export const csrfField = (user) => html`<input type="hidden" name="_csrf" value="${user?.csrf || ''}">`;

export function errorPage(status, message, user) {
  const title = status === 404 ? 'Page not found' : status === 403 ? 'Access denied' : 'Something went wrong';
  return page({
    title, user, app: Boolean(user), csrf: user?.csrf,
    body: html`<section class="wrap narrow section"><h1>${title}</h1><p>${message}</p><p><a href="${user ? '/app' : '/'}">Go back to ${user ? 'your dashboard' : 'the home page'}</a></p></section>`,
  });
}

// Plain-language status chips. Status is always carried by text, not colour alone.
export const chip = (text, kind = '') => html`<span class="chip ${kind}">${text}</span>`;
