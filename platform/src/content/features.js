// Feature status: the single source for "what works today" across the site.
// tested   = built and covered by automated tests in this repository
// built    = built and checked by hand, without full automated coverage
// pilot    = works only with pilot-specific setup (credentials, hosting, onboarding)
// planned  = not built
export const FEATURE_STATUS = {
  tested: { label: 'Built and tested', kind: 'good', note: 'Implemented and covered by the automated test suite.' },
  built: { label: 'Built, limited testing', kind: 'good', note: 'Implemented and checked by hand; automated coverage is partial.' },
  pilot: { label: 'Pilot setup needed', kind: 'warn', note: 'Works only once configured for a pilot (for example, provider credentials or hosting).' },
  planned: { label: 'Planned', kind: '', note: 'Not built. Timing depends on pilot evidence and buyer needs.' },
};

export const FEATURES = [
  { area: 'Learning', name: 'Public sample lesson (Module 4: Checking claims and sources)', status: 'tested', note: 'No account needed; nothing entered is saved.' },
  { area: 'Learning', name: 'Modules 1, 2, 4 and 5 as assignable lessons', status: 'tested' },
  { area: 'Learning', name: 'Modules 3, 6, 7 and 8', status: 'planned', note: 'Specified in the curriculum; not built.' },
  { area: 'Learning', name: 'Practice mode with recorded hints; assessment mode without hints', status: 'tested' },
  { area: 'Learning', name: 'Revision with every version preserved', status: 'tested' },
  { area: 'Learning', name: 'Provisional automated feedback (rule-based, one or two issues)', status: 'tested', note: 'Deterministic checks against each lesson\'s answer key; no AI grading.' },
  { area: 'Learning', name: 'Live AI step inside lessons', status: 'pilot', note: 'Needs an approved provider and server credentials. Without them the workspace says so and students can record output from an approved tool.' },
  { area: 'Learning', name: 'Speech input for text answers', status: 'built', note: 'Off by default. Uses the browser\'s own speech recognition, which may send audio to the browser vendor. Not used in scoring.' },
  { area: 'Learning', name: 'Student portfolio export (HTML)', status: 'tested' },
  { area: 'Learning', name: 'Delayed transfer check (4–6 weeks)', status: 'planned', note: 'Designed in the pilot plan; not built as a scheduled activity.' },
  { area: 'Teaching', name: 'Assignments with AI-use rules, mode, deadline and solution visibility', status: 'tested' },
  { area: 'Teaching', name: 'Roster import from CSV with invite links', status: 'tested', note: 'Invite emails are not sent automatically; educators share the links.' },
  { area: 'Teaching', name: 'Review of attempts, model runs, evidence checks and feedback', status: 'tested' },
  { area: 'Teaching', name: 'Approve, edit or withhold automated feedback; add educator feedback', status: 'tested' },
  { area: 'Teaching', name: 'Rubric levels with required reason for overriding the provisional level', status: 'tested' },
  { area: 'Teaching', name: 'Student challenges to assessment decisions', status: 'tested' },
  { area: 'Teaching', name: 'Cohort skill gaps (no public rankings)', status: 'built' },
  { area: 'Teaching', name: 'Course report export (CSV)', status: 'tested' },
  { area: 'Teaching', name: 'Editing lesson materials and rubrics in the app', status: 'planned', note: 'Educators can add assignment-specific instructions today; full editing is planned.' },
  { area: 'Administration', name: 'Roles: student, educator, institution administrator, platform administrator', status: 'tested' },
  { area: 'Administration', name: 'Tenant isolation and server-side access checks', status: 'tested' },
  { area: 'Administration', name: 'Approved provider, model and monthly model-run limit with alert threshold', status: 'tested' },
  { area: 'Administration', name: 'Retention period and retention job', status: 'tested' },
  { area: 'Administration', name: 'Learner data deletion', status: 'tested' },
  { area: 'Administration', name: 'Institution report export with small-number suppression', status: 'tested' },
  { area: 'Administration', name: 'Database backup command', status: 'built', note: 'Manual command; one restore checked by hand. Scheduled, encrypted, off-site backups are a launch blocker.' },
  { area: 'Administration', name: 'Institutional single sign-on (SAML / OIDC)', status: 'planned' },
  { area: 'Administration', name: 'LMS integration (LTI 1.3 and LTI Advantage)', status: 'planned', note: 'To be evaluated with a named LMS and pilot partner.' },
  { area: 'Administration', name: 'Automatic invite and notification emails', status: 'planned' },
  { area: 'Site', name: 'Pilot request form', status: 'tested', note: 'Requests are stored; no confirmation email is sent.' },
  { area: 'Site', name: 'Accessibility: automated checks on key pages and keyboard walkthrough', status: 'built', note: 'Screen-reader testing and testing with disabled students have not been done yet.' },
  { area: 'Site', name: 'Translated content', status: 'planned' },
];
