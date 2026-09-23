import { html, raw, paras } from '../html.js';
import { page, chip, csrfField } from '../views/layout.js';
import { requireUser, requireAssignment, memberships } from '../access.js';
import { lessonIntro, materials, aiAnswer, lessonFields, parseResponse, hintsBlock, feedbackBlock, exampleBlock } from '../views/lesson.js';
import { COMPETENCIES, LEVELS, levelLabel, competencyByCode } from '../content/competencies.js';
import { providerAvailability, budgetState, runForAttempt, providerLabel } from '../ai.js';
import { audit } from '../db.js';
import {
  AI_POLICY, lessonFor, attemptsFor, getOrCreateDraft, saveDraft, startRevision, submitAttempt, feedbackForAttempt,
  modelRunsForAttempt, studentCanSeeFeedback, studentCanSeeExample, competencyProfile, isPastDue,
} from '../work.js';

const STATUS_TEXT = {
  ok: ['Output received', 'good'], error: ['Failed', 'bad'], unavailable: ['Unavailable', 'warn'], budget_exceeded: ['Monthly limit reached', 'warn'],
  refused: ['Declined by the model', 'warn'], not_permitted: ['Not permitted', 'bad'],
};

export const WHAT_IS_SAVED = html`<details class="disclosure"><summary>What is saved and who can see it</summary>
  <p>Saved: your answers, each version you submit, hints you use, prompts you run here, AI outputs with the model name, output you record from other tools, your evidence checks, your disclosure and all feedback.</p>
  <p>Who can see it: you, and the educators on this course. Institution administrators see aggregate reports only. Nothing outside this workspace is recorded: not your browsing and not conversations with other AI tools.</p>
  <p>How long: your institution's retention period applies. You can export your portfolio at any time.</p></details>`;

function progressTable(profile) {
  return html`<div class="table-wrap" tabindex="0" role="region" aria-label="Table, scrolls sideways on small screens"><table>
    <caption>Demonstrated competency (educator-confirmed)</caption>
    <thead><tr><th scope="col">Criterion</th><th scope="col">Confirmed level</th><th scope="col">Provisional (not yet reviewed)</th></tr></thead>
    <tbody>${COMPETENCIES.map((c) => { const p = profile[c.code]; return html`<tr><th scope="row">${c.title}</th>
      <td>${p?.final !== null && p?.final !== undefined ? chip(LEVELS[p.final].label, p.final >= 2 ? 'good' : '') : html`<span class="muted">No confirmed evidence yet</span>`}</td>
      <td>${p?.provisional !== null && p?.provisional !== undefined ? html`<span class="muted">${LEVELS[p.provisional].label}</span>` : html`<span class="muted">—</span>`}</td></tr>`; })}</tbody>
  </table></div>`;
}

function dashboard(ctx) {
  const user = requireUser(ctx);
  const db = ctx.db;
  const mems = memberships(db, user.id);
  const studentCourses = db.prepare(`SELECT c.* FROM course_members cm JOIN courses c ON c.id = cm.course_id WHERE cm.user_id = ? AND cm.role = 'student' ORDER BY c.code`).all(user.id);
  const teachingCourses = db.prepare(`SELECT c.*, i.name AS inst FROM course_members cm JOIN courses c ON c.id = cm.course_id JOIN institutions i ON i.id = c.institution_id WHERE cm.user_id = ? AND cm.role = 'educator' ORDER BY c.code`).all(user.id);
  const adminOf = mems.filter((m) => m.role === 'inst_admin');

  const assignmentRows = (course) => db.prepare('SELECT * FROM assignments WHERE course_id = ? ORDER BY due_at IS NULL, due_at, id').all(course.id).map((a) => {
    const attempts = attemptsFor(db, a.id, user.id);
    const last = attempts[attempts.length - 1];
    const state = !last ? ['Not started', ''] : last.status === 'draft' ? [`Draft (version ${last.version_no})`, 'warn'] : [`Submitted (version ${last.version_no})`, 'good'];
    return html`<tr><td><a href="/app/assignments/${a.id}">${a.title}</a></td><td>${lessonFor(a).title}</td><td>${a.due_at || 'No deadline'}</td><td>${AI_POLICY[a.ai_policy].label}</td><td>${chip(state[0], state[1])}</td></tr>`;
  });

  const body = html`<section class="wrap section">
    <h1>Welcome, ${user.name}</h1>
    ${mems.some((m) => m.is_demo) ? html`<p class="note">This account belongs to a <strong>demonstration institution</strong>. Its courses, people and records are fictional and separate from any live student data.</p>` : ''}
    ${studentCourses.length ? html`
      <h2>Your assignments</h2>
      ${studentCourses.map((c) => html`<div class="table-wrap" tabindex="0" role="region" aria-label="Table, scrolls sideways on small screens"><table><caption>${c.code}: ${c.title}</caption>
        <thead><tr><th scope="col">Assignment</th><th scope="col">Lesson</th><th scope="col">Due</th><th scope="col">AI rule</th><th scope="col">Status</th></tr></thead>
        <tbody>${assignmentRows(c)}</tbody></table></div>`)}
      <h2>Your progress</h2>
      <p>Progress is measured by demonstrated competency. Only levels your educator has confirmed count; provisional levels from automated checks are shown for information.</p>
      ${progressTable(competencyProfile(db, user.id))}
      <div class="actions"><a class="button secondary" href="/app/portfolio">Export your portfolio</a></div>` : ''}
    ${teachingCourses.length ? html`<h2>Courses you teach</h2><ul>${teachingCourses.map((c) => html`<li><a href="/app/courses/${c.id}">${c.code}: ${c.title}</a> <span class="muted">(${c.inst})</span></li>`)}</ul>` : ''}
    ${adminOf.length ? html`<h2>Administration</h2><ul>${adminOf.map((m) => html`<li><a href="/app/admin/${m.institution_id}">${m.name}</a></li>`)}</ul>` : ''}
    ${user.is_platform_admin ? html`<h2>Platform</h2><p><a href="/app/platform">Platform administration</a></p>` : ''}
    ${!studentCourses.length && !teachingCourses.length && !adminOf.length && !user.is_platform_admin ? html`<p>You're not enrolled in any courses yet. Your educator or institution will add you.</p>` : ''}
  </section>`;
  return page({ title: 'Dashboard', body, user, app: true, path: '/app', csrf: user.csrf, flash: String(ctx.query.msg || '').slice(0, 300) });
}

function runsBlock(runs) {
  if (!runs.length) return '';
  return html`<h3>AI runs for this version</h3>${runs.map((r) => html`<div class="version">
    <p><span class="who ai">${r.source === 'platform' ? 'AI output' : 'AI output recorded by student'}</span> · ${chip(STATUS_TEXT[r.status][0], STATUS_TEXT[r.status][1])}
      · <span class="small">${r.settings.purpose ? `For: ${r.settings.purpose}` : ''} · Model: ${r.served_model || r.requested_model || 'unknown'}${r.source === 'platform' && r.served_model && r.served_model !== r.requested_model ? ` (requested ${r.requested_model})` : ''} · ${r.created_at} UTC</span></p>
    <details><summary>Prompt sent</summary><p class="ai-output">${r.prompt}</p></details>
    ${r.output ? html`<p class="ai-output">${r.output}</p>` : ''}
    ${r.error ? html`<p class="error-text">${r.error}</p>` : ''}</div>`)}`;
}

function aiPanel(ctx, { assignment, institution, lesson, attempt, readOnly }) {
  if (lesson.type === 'suitability') return html`<p class="muted">This lesson doesn't use the live AI step.</p>`;
  if (assignment.ai_policy === 'prohibited') return html`<div class="note"><p><strong>AI use is not permitted for this assignment,</strong> so the live AI step is switched off.${lesson.type === 'brief' ? ' Evaluate the example output in the lesson plan instead, or reason about what your prompt would produce.' : ''}</p></div>`;
  const avail = providerAvailability(institution);
  const budget = budgetState(ctx.db, institution);
  const buttons = lesson.type === 'brief' ? [['run_v1', 'Run prompt version 1'], ['run_v2', 'Run prompt version 2']] : [['run_rewrite', 'Ask the AI to rewrite the answer from the sources']];
  return html`<fieldset><legend>Live AI step</legend>
    <p class="small">Approved provider: ${providerLabel(institution.approved_provider)}${institution.approved_model ? `, model ${institution.approved_model}` : ''}. Runs are saved with the model name. Don't enter personal or confidential information.</p>
    <p class="small"><strong>Data rule from your institution:</strong> ${institution.permitted_data_note}</p>
    ${lesson.type === 'evidence' ? html`<label for="ai_prompt">Your instruction to the AI</label>
      <p class="hint-text">For example: rewrite the answer using only Sources A–C and name the source for each claim. The sources are attached automatically.</p>
      <textarea id="ai_prompt" name="ai_prompt" rows="4" data-dictate${readOnly ? raw(' disabled') : ''}>${attempt?.response.ai_prompt || ''}</textarea>
      <label for="ai_review">Check the AI's rewrite: did it introduce any new problems?</label>
      <textarea id="ai_review" name="ai_review" rows="3" data-dictate${readOnly ? raw(' disabled') : ''}>${attempt?.response.ai_review || ''}</textarea>` : ''}
    ${!avail.ok ? html`<p class="note"><strong>The live AI step isn't available:</strong> ${avail.reason} You can still complete the lesson, and you can record output from a tool your course approves below.</p>`
      : budget.exhausted ? html`<p class="note"><strong>Your institution has reached its monthly AI limit.</strong> You can still complete the lesson and record output from an approved tool.</p>`
      : !readOnly ? html`<div class="actions">${buttons.map(([v, l]) => html`<button class="secondary" type="submit" name="action" value="${v}">${l}</button>`)}</div>` : ''}
    ${!readOnly ? html`<details class="disclosure"><summary>Record output from another approved tool</summary>
      <div class="field"><label for="paste_tool">Tool and model (as shown by the tool)</label><input type="text" id="paste_tool" name="paste_tool"></div>
      <div class="field"><label for="paste_for">Which step is this for?</label><select id="paste_for" name="paste_for">
        ${lesson.type === 'brief' ? html`<option value="prompt v1">Prompt version 1</option><option value="prompt v2">Prompt version 2</option>` : html`<option value="rewrite">Rewrite from sources</option>`}</select></div>
      <div class="field"><label for="paste_output">Output</label><textarea id="paste_output" name="paste_output" rows="5"></textarea></div>
      <button class="secondary" type="submit" name="action" value="paste">Save recorded output</button></details>` : ''}
  </fieldset>`;
}

function workspace(ctx, { error = '' } = {}) {
  const user = requireUser(ctx);
  const { assignment, course, institution } = requireAssignment(ctx, ctx.params.id, 'student');
  const db = ctx.db;
  const lesson = lessonFor(assignment);
  const attempts = attemptsFor(db, assignment.id, user.id);
  const current = attempts[attempts.length - 1] || null;
  const editable = !current || current.status === 'draft';
  const pastDue = isPastDue(assignment);
  const hintsTotal = attempts.reduce((n, a) => n + a.hints_used, 0);
  const hintsAllowed = assignment.mode === 'practice';
  const policy = AI_POLICY[assignment.ai_policy];
  const assessments = db.prepare('SELECT * FROM assessments WHERE assignment_id = ? AND student_id = ?').all(assignment.id, user.id);
  const challenges = db.prepare('SELECT * FROM challenges WHERE assignment_id = ? AND student_id = ? ORDER BY id').all(assignment.id, user.id);

  const history = attempts.filter((a) => a.status === 'submitted').reverse().map((a) => {
    const fbs = feedbackForAttempt(db, a.id).filter((f) => studentCanSeeFeedback(assignment, f));
    const auto = fbs.find((f) => f.author_type === 'automated');
    const pending = assignment.mode === 'assessment' && !auto;
    return html`<details class="disclosure"${a === attempts[attempts.length - 1] ? raw(' open') : ''}><summary>Version ${a.version_no}, submitted ${a.submitted_at} UTC</summary>
      ${auto && auto.status === 'edited' ? html`<section class="card spaced" id="feedback" tabindex="-1"><h2>Feedback on version ${a.version_no} (from your educator)</h2>${paras(auto.body.edited_text)}</section>`
        : auto ? feedbackBlock(auto.body, { heading: `Feedback on version ${a.version_no}${auto.status === 'approved' ? ' (reviewed by your educator)' : ''}`, provisional: auto.status === 'provisional' }) : ''}
      ${pending ? html`<p class="muted">Assessment mode: feedback appears after your educator has reviewed it.</p>` : ''}
      ${fbs.filter((f) => f.author_type === 'educator').map((f) => html`<div class="card spaced"><p class="who educator">Educator feedback · ${f.author_name}</p>${paras(f.body.text)}</div>`)}
      ${runsBlock(modelRunsForAttempt(db, a.id))}
      <h3>Your disclosure</h3><p>${a.disclosure || 'None given.'}</p>
    </details>`;
  });

  const body = html`<section class="wrap section">
    <p><a href="/app">Dashboard</a> · ${course.code}</p>
    <h1>${assignment.title}</h1>
    <p>${chip(policy.label, assignment.ai_policy === 'prohibited' ? 'bad' : 'good')} ${chip(assignment.mode === 'practice' ? 'Practice mode' : 'Assessment mode')} ${chip(assignment.due_at ? `Due ${assignment.due_at}` : 'No deadline')}</p>
    <div class="note info"><p><strong>AI rule for this assignment:</strong> ${policy.text}</p>${assignment.ai_policy_note ? html`<p><strong>Your educator's note:</strong> ${assignment.ai_policy_note}</p>` : ''}</div>
    ${assignment.instructions_note ? html`<p><strong>Instructions from your educator:</strong> ${assignment.instructions_note}</p>` : ''}
    ${WHAT_IS_SAVED}
    ${error ? html`<div class="note bad" role="alert"><p>${error}</p></div>` : ''}
    ${history.length ? html`<h2>Your submitted versions</h2>${history}` : ''}
    ${assessments.some((s) => s.status === 'final') ? html`<h2>Assessment</h2><ul>${assessments.filter((s) => s.status === 'final').map((s) => html`<li>${competencyByCode[s.competency].title}: <strong>${levelLabel(s.level)}</strong>${s.override_reason ? html` <span class="muted">(educator's note: ${s.override_reason})</span>` : ''}</li>`)}</ul>
      ${challenges.map((c) => html`<div class="card spaced"><p><strong>Your challenge</strong> (${c.status === 'open' ? 'awaiting response' : 'resolved'}): ${c.message}</p>${c.response ? html`<p><strong>Response:</strong> ${c.response}</p>` : ''}</div>`)}
      <details class="disclosure"><summary>Challenge this assessment</summary>
        <form method="post" action="/app/assignments/${assignment.id}/challenge">${csrfField(user)}
          <label for="challenge">Explain which decision you disagree with and why</label><textarea id="challenge" name="message" rows="4" required></textarea>
          <button type="submit">Send challenge to your educator</button></form></details>` : ''}

    <div class="layout-2">
      <div class="sticky">
        <h2>Lesson</h2>${lessonIntro(lesson)}
        ${lesson.brief ? html`<h2>Your task</h2><p>${lesson.brief}</p>` : lesson.scenario ? html`<h2>${lesson.scenario.title}</h2><p>${lesson.scenario.text}</p>` : ''}
        ${materials(lesson)}${aiAnswer(lesson)}
      </div>
      <div>
        ${editable && !pastDue ? html`
          <h2>Your work (version ${current?.version_no || 1}, draft)</h2>
          ${hintsAllowed ? hintsBlock(lesson, current?.hints_used || 0) : ''}
          <form method="post" action="/app/assignments/${assignment.id}" ${institution.allow_dictation ? raw('data-dictation="on"') : ''}>
            ${csrfField(user)}<input type="hidden" name="dictation_used" value="0">
            ${lessonFields(lesson, current?.response || {})}
            ${aiPanel(ctx, { assignment, institution, lesson, attempt: current, readOnly: false })}
            ${runsBlock(current ? modelRunsForAttempt(db, current.id) : [])}
            <fieldset><legend>Disclosure</legend>
              <label for="disclosure">How did you use AI in this task?</label>
              <p class="hint-text" id="disc-hint">Name the tool, what you used it for and what you checked. If you didn't use AI, say so.</p>
              <textarea id="disclosure" name="disclosure" rows="3" aria-describedby="disc-hint" data-dictate>${current?.disclosure || ''}</textarea>
            </fieldset>
            ${institution.allow_dictation ? html`<p class="small muted">Speech input is available where your browser supports it. Some browsers send audio to their own speech service. Always review the text before submitting; speech input does not affect your score.</p>` : ''}
            <div class="actions">
              <button type="submit" name="action" value="submit">Submit version ${current?.version_no || 1}</button>
              <button class="secondary" type="submit" name="action" value="save">Save draft</button>
              ${hintsAllowed && (current?.hints_used || 0) < lesson.hints.length ? html`<button class="secondary" type="submit" name="action" value="hint">Show a hint</button>` : ''}
            </div>
            ${hintsAllowed ? html`<p class="small muted">Hints used on this assignment so far: ${hintsTotal}. Using hints is recorded as "with support".</p>` : html`<p class="small muted">Assessment mode: hints are not available.</p>`}
          </form>`
        : html`
          ${pastDue && editable ? html`<p class="note">The deadline has passed, so this draft can no longer be submitted. Contact your educator if you need an extension.</p>` : ''}
          ${current?.status === 'submitted' && !pastDue ? html`<form method="post" action="/app/assignments/${assignment.id}">${csrfField(user)}
            <p>You can revise your work. Your submitted version stays saved alongside the new one.</p>
            <button type="submit" name="action" value="revise">Start version ${current.version_no + 1}</button></form>` : ''}
          ${current ? html`<h2>Version ${current.version_no}</h2>${lessonFields(lesson, current.response, { readOnly: true })}` : ''}`}
        ${studentCanSeeExample(assignment, attempts) ? exampleBlock(lesson) : html`<p class="muted">${assignment.solution_visibility === 'never' ? 'Your educator has chosen not to show an example answer for this assignment.' : assignment.solution_visibility === 'after_due' ? 'The example answer appears after the deadline.' : 'The example answer appears after your first submission.'}</p>`}
      </div>
    </div>
  </section>`;
  return page({ title: assignment.title, body, user, app: true, csrf: user.csrf, flash: String(ctx.query.msg || '').slice(0, 300) });
}

async function workspacePost(ctx) {
  const user = requireUser(ctx);
  const { assignment, institution } = requireAssignment(ctx, ctx.params.id, 'student');
  const db = ctx.db;
  const lesson = lessonFor(assignment);
  const b = ctx.body;
  const back = (msg, anchor = '') => ctx.redirect(`/app/assignments/${assignment.id}${msg ? `?msg=${encodeURIComponent(msg)}` : ''}${anchor}`);

  if (b.action === 'revise') {
    if (isPastDue(assignment)) return back('The deadline has passed.');
    startRevision(db, assignment, user.id);
    return back('Started a new version. Your previous version is saved.');
  }
  if (isPastDue(assignment)) return back('The deadline has passed, so changes were not saved.');
  const draft = getOrCreateDraft(db, assignment.id, user.id);
  if (!draft) return back('This version is already submitted. Start a new version to revise it.');

  const response = parseResponse(lesson, b);
  if (lesson.type === 'evidence') {
    response.ai_prompt = String(b.ai_prompt || '').slice(0, 8000);
    response.ai_review = String(b.ai_review || '').slice(0, 8000);
  }
  const hintsDelta = b.action === 'hint' && assignment.mode === 'practice' && draft.hints_used < lesson.hints.length ? 1 : 0;
  saveDraft(db, draft, { response, hintsDelta, dictationUsed: b.dictation_used === '1', disclosure: String(b.disclosure || '').slice(0, 4000) });
  const fresh = { ...draft, response, disclosure: String(b.disclosure || '') };

  if (b.action === 'hint') return back(hintsDelta ? 'Hint shown. Your draft was saved.' : 'No more hints are available.');
  if (b.action === 'save') return back('Draft saved.');

  if (b.action === 'paste') {
    if (assignment.ai_policy === 'prohibited') return back('AI use is not permitted for this assignment.');
    const output = String(b.paste_output || '').trim().slice(0, 20000);
    const tool = String(b.paste_tool || '').trim().slice(0, 200);
    if (!output || !tool) return back('Enter both the tool name and the output to record it.');
    db.prepare(`INSERT INTO model_runs (institution_id, attempt_id, source, provider, served_model, settings, prompt, output, status)
      VALUES (?, ?, 'student_pasted', 'external', ?, ?, ?, ?, 'ok')`).run(institution.id, draft.id, tool, JSON.stringify({ purpose: String(b.paste_for || '').slice(0, 40) }), '(recorded by student; prompt not captured)', output);
    return back('Output recorded with the tool name you gave.');
  }

  if (['run_v1', 'run_v2', 'run_rewrite'].includes(b.action)) {
    let prompt; let purpose;
    if (lesson.type === 'brief') {
      purpose = b.action === 'run_v2' ? 'prompt v2' : 'prompt v1';
      prompt = b.action === 'run_v2' ? response.prompt_v2 : response.prompt_v1;
    } else if (lesson.type === 'evidence' && b.action === 'run_rewrite') {
      purpose = 'rewrite';
      const sources = lesson.materials.map((m) => `<source id="${m.id}" title="${m.title}">\n${m.body}\n</source>`).join('\n');
      const answer = `${lesson.aiAnswerOpening} ${lesson.claims.map((c) => c.text).join(' ')}`;
      prompt = response.ai_prompt?.trim() ? `${response.ai_prompt}\n\n<answer_to_revise>\n${answer}\n</answer_to_revise>\n\n${sources}` : '';
    } else {
      return back('That action isn\'t available in this lesson.');
    }
    const run = await runForAttempt(db, { institution, attemptId: draft.id, aiPolicy: assignment.ai_policy, prompt, system: lesson.modelSystemPrompt, purpose });
    const msg = run.status === 'ok' ? 'AI output received and saved.' : `No AI output: ${run.error}`;
    return back(msg);
  }

  if (b.action === 'submit') {
    if (!fresh.disclosure.trim()) return ctx.html(workspace(ctx, { error: 'Add a disclosure before submitting. If you didn\'t use AI, say so. Your draft was saved.' }), 400);
    submitAttempt(db, { assignment, attempt: { ...fresh, status: 'draft' }, studentId: user.id });
    return back(assignment.mode === 'practice' ? 'Submitted. Your feedback is below.' : 'Submitted. Feedback will appear after your educator reviews it.', '#feedback');
  }
  return back('');
}

function challengePost(ctx) {
  const user = requireUser(ctx);
  const { assignment, institution } = requireAssignment(ctx, ctx.params.id, 'student');
  const message = String(ctx.body.message || '').trim().slice(0, 4000);
  if (!message) return ctx.redirect(`/app/assignments/${assignment.id}?msg=${encodeURIComponent('Write your challenge before sending it.')}`);
  ctx.db.prepare('INSERT INTO challenges (assignment_id, student_id, message) VALUES (?, ?, ?)').run(assignment.id, user.id, message);
  audit(ctx.db, user.id, institution.id, 'challenge_created', { assignment: assignment.id });
  ctx.redirect(`/app/assignments/${assignment.id}?msg=${encodeURIComponent('Challenge sent to your educator.')}`);
}

// Portfolio: the student's own work, AI output and feedback, kept visibly
// separate, as a self-contained HTML file.
export function portfolioHtml(db, user) {
  const rows = db.prepare(`SELECT a.*, c.code, c.title AS course_title FROM assignments a JOIN courses c ON c.id = a.course_id
    JOIN course_members cm ON cm.course_id = c.id AND cm.user_id = ? AND cm.role = 'student' ORDER BY c.code, a.id`).all(user.id);
  const sections = rows.map((a) => {
    const lesson = lessonFor(a);
    const attempts = attemptsFor(db, a.id, user.id).filter((x) => x.status === 'submitted');
    if (!attempts.length) return '';
    return html`<section><h2>${a.code}: ${a.title}</h2><p>Lesson: ${lesson.title}. AI rule: ${AI_POLICY[a.ai_policy].label}.</p>
      ${attempts.map((at) => html`<article><h3>Version ${at.version_no} (submitted ${at.submitted_at} UTC)</h3>
        <div class="student"><p class="tag">My work</p><pre>${JSON.stringify(at.response, null, 2)}</pre><p class="tag">My disclosure</p><p>${at.disclosure}</p></div>
        ${modelRunsForAttempt(db, at.id).map((r) => html`<div class="ai"><p class="tag">AI output · ${r.source === 'platform' ? 'run in the platform' : 'recorded from another tool'} · model: ${r.served_model || r.requested_model || 'unknown'} · status: ${r.status}</p>${r.output ? html`<pre>${r.output}</pre>` : html`<p>${r.error || ''}</p>`}</div>`)}
        ${feedbackForAttempt(db, at.id).filter((f) => studentCanSeeFeedback(a, f)).map((f) => html`<div class="feedback"><p class="tag">${f.author_type === 'educator' ? `Educator feedback (${f.author_name})` : `Automated feedback (${f.status})`}</p>
          ${f.author_type === 'educator' ? html`<p>${f.body.text}</p>` : html`<ul>${f.body.shown.map((i) => html`<li>${i.title} ${i.why}</li>`)}</ul>`}</div>`)}
      </article>`)}</section>`;
  });
  const profile = competencyProfile(db, user.id);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Portfolio: ${html`${user.name}`}</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:60rem;margin:2rem auto;padding:0 1rem}pre{white-space:pre-wrap;background:#f4f4f4;padding:.5rem}.tag{font-weight:700;text-transform:uppercase;font-size:.8rem;letter-spacing:.04em}.student{border-left:4px solid #1f5c4a;padding-left:1rem}.ai{border-left:4px dashed #777;padding-left:1rem}.feedback{border-left:4px solid #1a5b8f;padding-left:1rem}</style></head><body>
${html`<h1>AI skills portfolio: ${user.name}</h1><p>Exported ${new Date().toISOString().slice(0, 10)}. Sections are labelled: <strong>My work</strong> (written by me), <strong>AI output</strong> (generated or recorded AI text) and <strong>Feedback</strong> (automated or from an educator).</p>
<h2>Confirmed competency levels</h2><ul>${COMPETENCIES.map((c) => html`<li>${c.title}: ${profile[c.code]?.final !== undefined && profile[c.code]?.final !== null ? LEVELS[profile[c.code].final].label : 'No confirmed evidence yet'}</li>`)}</ul>
<p>Levels are issued by the student's educators using a proposed rubric that has not yet been externally validated. They are not an accredited qualification.</p>`}
${sections.join('')}</body></html>`;
}

export function registerStudent(router) {
  router.get('/app', (ctx) => ctx.html(dashboard(ctx)));
  router.get('/app/assignments/:id', (ctx) => ctx.html(workspace(ctx)));
  router.post('/app/assignments/:id', workspacePost);
  router.post('/app/assignments/:id/challenge', challengePost);
  router.get('/app/portfolio', (ctx) => {
    const user = requireUser(ctx);
    audit(ctx.db, user.id, null, 'portfolio_exported');
    ctx.download(portfolioHtml(ctx.db, user), 'portfolio.html', 'text/html; charset=utf-8');
  });
}
