# 10. Working features, launch blockers and later improvements

**This is a pilot prototype. It is not ready for large institutional deployment**, and it is not yet ready for a live pilot with real students until the launch blockers below are closed.

The live feature list is at `/status`, generated from [`src/content/features.js`](../src/content/features.js).

## Working now (built and covered by automated tests)

- Public website: every page in the brief (Home, How it works, Curriculum, For institutions, Research and evidence, Plans and pilot, Trust and accessibility, Resources and FAQ, Contact), plus module pages, the rubric, the complete sample lesson plan and feature status.
- **Public sample lesson** (Module 4) end to end: hints, provisional feedback, revision with resolved-issue tracking, example answer after first attempt; nothing stored.
- Accounts via invitation links, sign-in with rate limiting, sessions, CSRF protection, security headers.
- Roles and tenant isolation: student, educator, institution administrator, platform administrator.
- Modules 1, 2 and 4 as assignable lessons, with per-assignment AI rule, mode, deadline, example visibility and criteria.
- Student workspace: saved drafts, hints (practice only), required disclosure, submissions, immutable versions, revisions, deadline enforcement, "what is saved" notice.
- Live AI step through a replaceable adapter (Anthropic), with refusal fallback, requested and served model recorded, honest "unavailable" message without credentials, monthly limit with alert, and recording of output from other approved tools.
- Provisional rule-based feedback (at most two issues) and provisional levels; educator approve, edit or withhold; educator feedback; confirmed levels with required override reasons; student challenges.
- Progress by demonstrated competency (confirmed levels only; provisional shown separately).
- Course report CSV; institution report CSV with small-number suppression; student portfolio export (HTML).
- Institution settings, course creation, learner deletion with confirmation, retention job, audit log.
- Accessibility: axe-core WCAG A/AA checks pass on 108 page states (light and dark mode, 1280 px and 320 px); no horizontal scrolling at 320 px; keyboard-only completion of the sample lesson.

## Built with limited testing

- Speech input (browser Web Speech API; off by default). Not tested with real speech in this environment.
- Cohort skill gaps page (checked for no names; content not validated with educators).
- Backup command (`npm run backup`, SQLite `VACUUM INTO`). Restore checked by hand once: row counts matched, the integrity check passed, and the app ran from the backup file.
- Live calls to Anthropic's API: the adapter uses the official SDK. The request shape (model, `max_tokens`, effort, `fallbacks: "default"` with its beta header, system prompt, API key header) and response handling were checked against a local stub server. **No request has been made to the real API** (no credentials in the build environment). Behaviour in the app is tested with a fake provider.

## Launch blockers (before the first pilot with real students)

1. **Hosting**: a production host with TLS, encryption at rest, monitoring and an agreed data location; set `COOKIE_SECURE=1` and `PUBLIC_URL`.
2. **Backups**: scheduled, encrypted, off-site, with a tested restore.
3. **Scheduled retention job** (`npm run retention`, daily).
4. **Provider contract**: confirm the AI provider's data retention and training terms for our account and write them into the Trust page and the data processing agreement. Run one live request per lesson to confirm the adapter, and record the model identifiers.
5. **Data processing agreement** template and sub-processor list; a data-protection review with the pilot institution.
6. **Security**: an independent security review or penetration test; a dependency audit; a password reset flow (currently the educator re-issues an invitation).
7. **Accessibility**: screen-reader testing (NVDA, JAWS, VoiceOver) of the sample lesson and workspace; an accessibility statement with the tested scope.
8. **Rubric calibration** with pilot educators before any level informs a grade.
9. **Invitation delivery**: either email, or a documented process for educators sharing links securely.
10. **Content review** of Modules 1, 2 and 4 by at least one subject educator; confirm the UNESCO competency names against the official document.
11. **Evidence register**: re-read full texts for E1–E5 before quoting any figure not already on the site; confirm the EU AI Act text on EUR-Lex.
12. **Operational**: error monitoring, uptime checks, a support contact route, and an incident process.

## Later improvements (driven by pilot evidence and buyer needs)

- Build Modules 3, 5 (materials ready), 6, 7 and 8; the delayed transfer check as a scheduled activity.
- Educator editing of lesson materials and rubrics; discipline templates for Module 8.
- Institutional single sign-on (SAML or OIDC).
- LMS integration: LTI 1.3 launch, then LTI Advantage (Deep Linking for activity selection, Names and Role Provisioning for rosters, Assignment and Grade Services for instructor-approved grade return), tested with a named LMS.
- AI-generated formative feedback behind educator review, after comparing it with educator judgements.
- Spend-based budget limits and provider-side spend caps.
- Stronger analytics (pre/post comparisons, transfer), translated content, more disciplines.
- Postgres, a shared rate-limit store and migrations for multi-server deployment.
- Schools: only after age-appropriate content, permissions, controls and review.
