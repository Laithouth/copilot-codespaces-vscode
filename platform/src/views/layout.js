import { html, raw } from '../html.js';

export const PRODUCT = 'Practicum';
export const PRODUCT_NOTE = 'Practicum is a working name.';

const NAV = [
  ['/how-it-works', 'How it works'],
  ['/curriculum', 'Curriculum'],
  ['/institutions', 'For institutions'],
  ['/research', 'Research'],
  ['/plans', 'Plans & pilot'],
  ['/trust', 'Trust & accessibility'],
  ['/resources', 'Resources & FAQ'],
];

export function page({ title, description = '', body, user = null, path = '', app = false, flash = '', csrf = '' }) {
  const nav = app ? appNav(user, path, csrf) : publicNav(path, user);
  return html`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title ? `${title} · ${PRODUCT}` : PRODUCT}</title>
<meta name="description" content="${description}">
<link rel="stylesheet" href="/static/styles.css">
<script src="/static/app.js" defer></script>
</head>
<body>
<a class="skip" href="#main">Skip to main content</a>
<header class="site-header">
  <div class="wrap header-row">
    <a class="brand" href="${app ? '/app' : '/'}"><span class="brand-mark" aria-hidden="true">P</span> ${PRODUCT}</a>
    ${nav}
  </div>
</header>
<div class="prototype-banner" role="note"><div class="wrap">Pilot prototype. Some features are planned, not built. <a href="/status">See what works today</a>.</div></div>
<main id="main" tabindex="-1">
${flash ? html`<div class="wrap"><p class="flash" role="status">${flash}</p></div>` : ''}
${body}
</main>
<footer class="site-footer">
  <div class="wrap footer-grid">
    <div>
      <p class="brand-foot">${PRODUCT}</p>
      <p class="muted">AI skills practice for university courses. ${PRODUCT_NOTE}</p>
    </div>
    <nav aria-label="Footer">
      <ul class="plain">
        <li><a href="/try">Try a sample lesson</a></li>
        <li><a href="/curriculum">View the curriculum</a></li>
        <li><a href="/contact">Request an institutional pilot</a></li>
      </ul>
    </nav>
    <nav aria-label="Policies">
      <ul class="plain">
        <li><a href="/status">Feature status</a></li>
        <li><a href="/trust">Data, privacy &amp; accessibility</a></li>
        <li><a href="/research">Research &amp; evidence</a></li>
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
        <li><a href="${user ? '/app' : '/login'}">${user ? 'Your workspace' : 'Sign in'}</a></li>
        <li><a class="button small" href="/try">Try a sample lesson</a></li>
      </ul>
    </details>
  </nav>`;
}

function appNav(user, path, csrf) {
  return html`<nav class="main-nav" aria-label="Workspace">
    <details class="menu">
      <summary>Menu</summary>
      <ul>
        <li><a href="/app"${path === '/app' ? raw(' aria-current="page"') : ''}>Dashboard</a></li>
        <li><a href="/">Public site</a></li>
        <li><span class="muted">Signed in as ${user?.name}</span></li>
        <li><form method="post" action="/logout" class="inline"><input type="hidden" name="_csrf" value="${csrf}"><button class="linklike" type="submit">Sign out</button></form></li>
      </ul>
    </details>
  </nav>`;
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
