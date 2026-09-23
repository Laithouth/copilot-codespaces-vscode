// Public sample lesson. Stateless: nothing a visitor types is stored on the
// server. The issue codes from the previous version are carried in a hidden
// field so feedback on a revision can say which issues were resolved.
import { html } from '../html.js';
import { page } from '../views/layout.js';
import { LESSONS, SAMPLE_LESSON_SLUG } from '../content/lessons.js';
import { lessonIntro, materials, aiAnswer, lessonFields, parseResponse, hintsBlock, feedbackBlock, exampleBlock } from '../views/lesson.js';
import { evaluate } from '../feedback.js';

const lesson = LESSONS[SAMPLE_LESSON_SLUG];

function render(ctx, { response = {}, hints = 0, version = 1, result = null, prevCodes = [] }) {
  const submitted = Boolean(result);
  const body = html`<section class="wrap section">
    <p class="muted">Sample lesson · Module ${lesson.module} · about ${lesson.minutes} minutes</p>
    <h1>${lesson.title}</h1>
    <p class="note info"><strong>Nothing you type here is saved.</strong> This is a public demonstration. In a course, your work, versions and feedback are saved to your portfolio and visible to your educator.</p>
    ${submitted ? feedbackBlock(result, { heading: `Feedback on version ${version}` }) : ''}
    <div class="layout-2">
      <div class="sticky">
        <h2>Lesson</h2>
        ${lessonIntro(lesson)}
        <h2>Your task</h2><p>${lesson.brief}</p>
        ${materials(lesson)}
        ${aiAnswer(lesson)}
      </div>
      <div>
        <h2>Your work${submitted ? html` (revising version ${version})` : ''}</h2>
        ${hintsBlock(lesson, hints)}
        <form method="post" action="/try#feedback">
          <input type="hidden" name="hints" value="${hints}">
          <input type="hidden" name="version" value="${submitted ? version + 1 : version}">
          <input type="hidden" name="prev_codes" value="${(submitted ? result.issues.map((i) => i.code) : prevCodes).join(',')}">
          ${lessonFields(lesson, response)}
          <div class="actions">
            <button type="submit" name="action" value="submit">${submitted ? 'Submit revision' : 'Submit for feedback'}</button>
            ${hints < lesson.hints.length ? html`<button class="secondary" type="submit" name="action" value="hint">Show a hint (${hints} of ${lesson.hints.length} used)</button>` : ''}
          </div>
          <p class="small muted">Hints are optional. In a course, using them is recorded and the work counts as "with support".</p>
        </form>
        ${submitted ? exampleBlock(lesson) : html`<p class="muted">The example answer appears after your first submission, so you try it yourself first.</p>`}
        <div class="card spaced">
          <h2>Using this with a class?</h2>
          <p>See the <a href="/curriculum/sample-lesson">complete lesson plan</a> with rubric and instructor notes, or <a href="/contact">request an institutional pilot</a>.</p>
        </div>
      </div>
    </div>
  </section>`;
  return page({ title: 'Sample lesson', description: 'Check an AI-written answer against sources: a free sample lesson.', body, user: ctx.user, path: '/try' });
}

export function registerSample(router) {
  router.get('/try', (ctx) => ctx.html(render(ctx, {})));
  router.post('/try', (ctx) => {
    const b = ctx.body;
    const response = parseResponse(lesson, b);
    const version = Math.max(1, Math.min(50, parseInt(b.version, 10) || 1));
    let hints = Math.max(0, Math.min(lesson.hints.length, parseInt(b.hints, 10) || 0));
    const prevCodes = String(b.prev_codes || '').split(',').filter(Boolean).slice(0, 20);
    if (b.action === 'hint') {
      hints = Math.min(lesson.hints.length, hints + 1);
      return ctx.html(render(ctx, { response, hints, version, prevCodes }));
    }
    const result = evaluate(lesson, response, { hintsUsed: hints, versionNo: version, previousIssueCodes: prevCodes });
    return ctx.html(render(ctx, { response, hints, version, result }));
  });
}
