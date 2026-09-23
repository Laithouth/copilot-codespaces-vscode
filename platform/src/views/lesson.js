// Renders lesson content and the student's form for the three lesson types.
// Shared by the public sample lesson and the course workspace.
import { html, raw, paras } from '../html.js';
import { TEACHING_LABEL, SALES_ROWS, REGIONS } from '../content/lessons.js';

export function lessonIntro(lesson) {
  return html`
  <p class="note" role="note"><strong>Teaching material.</strong> ${TEACHING_LABEL.replace('Teaching material: every', 'Every')}</p>
  ${lesson.intro.map((p) => html`<p>${p}</p>`)}
  ${lesson.checklist ? html`<h3>Four questions before you start</h3>
    <dl class="kv">${lesson.checklist.map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl>` : ''}
  ${workedExample(lesson)}`;
}

function workedExample(lesson) {
  const w = lesson.workedExample;
  if (lesson.type === 'suitability') {
    return html`<details class="disclosure" open><summary>${w.title}</summary>
      <p>${w.scenario}</p>
      <dl class="kv">${w.reasoning.map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl>
      <p><strong>Decision:</strong> ${w.decision}</p></details>`;
  }
  if (lesson.type === 'brief') {
    return html`<details class="disclosure" open><summary>${w.title}</summary>
      <p><span class="label-tag">Before</span><br>${w.before}</p>
      <dl class="kv">${w.brief.map(([k, v]) => html`<dt>${k}</dt><dd>${paras(v)}</dd>`)}</dl>
      <p><span class="label-tag">After</span></p><p class="ai-output">${w.after}</p>
      <p>${w.why}</p></details>`;
  }
  if (lesson.type === 'numbers') {
    return html`<details class="disclosure" open><summary>${w.title}</summary>
      <p>${w.scenario}</p>
      <ol>${w.steps.map((s) => html`<li>${s}</li>`)}</ol></details>`;
  }
  return html`<details class="disclosure" open><summary>${w.title}</summary>
    <p class="claim-text">${w.claim}</p>
    <ol>${w.steps.map((s) => html`<li>${s}</li>`)}</ol></details>`;
}

export function materials(lesson) {
  if (!lesson.materials) return '';
  return html`<section aria-labelledby="materials-h">
    <h2 id="materials-h">Source materials</h2>
    ${lesson.materials.map((m) => html`<article class="source" aria-labelledby="src-${m.id}"><h3 id="src-${m.id}">${m.title}</h3>${paras(m.body)}${m.table ? salesTable() : ''}</article>`)}
  </section>`;
}

const gbp = (n) => (n === null ? '' : `£${n.toLocaleString('en-GB')}`);

export function salesTable() {
  return html`<div class="table-wrap" tabindex="0" role="region" aria-label="Dataset D, scrolls sideways on small screens"><table>
    <caption>Dataset D (synthetic)</caption>
    <thead><tr><th scope="col">Quarter</th><th scope="col">Region</th><th scope="col">Units sold</th><th scope="col">Gross revenue (£)</th><th scope="col">Returns (£)</th></tr></thead>
    <tbody>${SALES_ROWS.map((r) => html`<tr><td>${r.quarter}</td><th scope="row">${r.region}</th><td>${r.units.toLocaleString('en-GB')}</td><td>${gbp(r.gross)}</td><td>${gbp(r.returns)}</td></tr>`)}</tbody>
  </table></div>
  <p class="small"><a href="/static/module5-sales-synthetic.csv" download>Download Dataset D as CSV</a></p>`;
}

export function aiAnswer(lesson) {
  if (lesson.type !== 'evidence') return '';
  return html`<section aria-labelledby="ai-answer-h">
    <h2 id="ai-answer-h">The answer to check</h2>
    <p class="label-tag">${lesson.aiAnswerIntro}</p>
    <div class="ai-output">${lesson.aiAnswerOpening} ${lesson.claims.map((c) => html`[${c.key}] ${c.text} `)}</div>
  </section>`;
}

const val = (o, k) => (o && o[k]) || '';
const checked = (a, b) => (a === b ? raw(' checked') : '');

// Form fields for the student's own work. `response` pre-fills a saved draft.
export function lessonFields(lesson, response = {}, { readOnly = false } = {}) {
  const dis = readOnly ? raw(' disabled') : '';
  if (lesson.type === 'evidence') {
    const v = response.verdicts || {};
    return html`
    <fieldset><legend>Step 1. Check each claim</legend>
      <p class="hint-text">Choose a verdict, the source you used, and a short note of the evidence.</p>
      ${lesson.claims.map((c) => html`<fieldset class="claim"><legend>Claim ${c.key}</legend>
        <p class="claim-text">${c.text}</p>
        <div class="radio-row" role="radiogroup" aria-label="Verdict for ${c.key}">
          ${lesson.verdicts.map(([value, label]) => html`<label><input type="radio" name="v_${c.key}" value="${value}"${checked(v[c.key]?.verdict, value)}${dis}> ${label}</label>`)}
        </div>
        <div class="field"><label for="src_${c.key}">Source used</label>
          <select id="src_${c.key}" name="src_${c.key}"${dis}>
            <option value="">None / not applicable</option>
            ${lesson.materials.map((m) => html`<option value="${m.id}"${v[c.key]?.source === m.id ? raw(' selected') : ''}>Source ${m.id}</option>`)}
          </select></div>
        <div class="field"><label for="note_${c.key}">Evidence note</label>
          <input type="text" id="note_${c.key}" name="note_${c.key}" value="${val(v[c.key], 'note')}"${dis}></div>
      </fieldset>`)}
    </fieldset>
    <fieldset><legend>Step 2. Write the corrected answer</legend>
      <label for="corrected">Corrected answer for the committee</label>
      <p class="hint-text" id="corrected-hint">Use only claims you checked. Say which source supports each one.</p>
      <textarea id="corrected" name="corrected" rows="9" aria-describedby="corrected-hint" data-dictate${dis}>${val(response, 'corrected')}</textarea>
      <label for="uncertainty">What remains uncertain?</label>
      <textarea id="uncertainty" name="uncertainty" rows="4" data-dictate${dis}>${val(response, 'uncertainty')}</textarea>
    </fieldset>
    <fieldset><legend>Step 3. Independent check (no hints)</legend>
      <p class="claim-text">${lesson.independent.text}</p>
      <div class="radio-row" role="radiogroup" aria-label="Verdict for the independent check">
        ${lesson.verdicts.map(([value, label]) => html`<label><input type="radio" name="v_${lesson.independent.key}" value="${value}"${checked(response.independent?.verdict, value)}${dis}> ${label}</label>`)}
      </div>
      <label for="ind_corrected">Corrected sentence</label>
      <input type="text" id="ind_corrected" name="ind_corrected" value="${val(response.independent, 'corrected')}"${dis}>
    </fieldset>`;
  }
  if (lesson.type === 'numbers') {
    const vals = response.values || {};
    const ind = response.independent || {};
    const regionSelect = (id, name, current) => html`<select id="${id}" name="${name}"${dis}><option value="">Choose a region</option>${REGIONS.map((reg) => html`<option value="${reg}"${current === reg ? raw(' selected') : ''}>${reg}</option>`)}</select>`;
    return html`
    <fieldset><legend>Step 1. Clarify the question</legend>
      <label for="question">What would you ask the manager, and what have you assumed?</label>
      <textarea id="question" name="question" rows="3" data-dictate${dis}>${val(response, 'question')}</textarea>
      <fieldset><legend>Which definition of "top performer" will you use?</legend><div class="radio-row">
        ${lesson.definitions.map(([value, label]) => html`<label><input type="radio" name="definition" value="${value}"${checked(response.definition, value)}${dis}> ${label}</label>`)}
      </div></fieldset>
      <label for="definition_reason">Why this definition?</label>
      <textarea id="definition_reason" name="definition_reason" rows="2" data-dictate${dis}>${val(response, 'definition_reason')}</textarea>
    </fieldset>
    <fieldset><legend>Step 2. Inspect the data before calculating</legend>
      <label for="missing_row">Is any value missing? Which row and column?</label>
      <input type="text" id="missing_row" name="missing_row" value="${val(response, 'missing_row')}"${dis}>
      <fieldset><legend>How will you handle it?</legend><div class="radio-row">
        ${lesson.handlings.map(([value, label]) => html`<label><input type="radio" name="handling" value="${value}"${checked(response.handling, value)}${dis}> ${label}</label>`)}
      </div></fieldset>
      <label for="handling_note">Explain how (for example, the estimate and how you got it)</label>
      <input type="text" id="handling_note" name="handling_note" value="${val(response, 'handling_note')}"${dis}>
      <label for="other_issue">Anything else in the data that affects the answer?</label>
      <input type="text" id="other_issue" name="other_issue" value="${val(response, 'other_issue')}"${dis}>
    </fieldset>
    <fieldset><legend>Step 3. Calculate</legend>
      <p class="hint-text">Enter each region's figure for your chosen definition: pounds for revenue (for example 48200), or a percentage for growth (for example 7.5).</p>
      ${REGIONS.map((reg) => html`<div class="field"><label for="val_${reg}">${reg}</label><input type="text" inputmode="decimal" id="val_${reg}" name="val_${reg}" value="${vals[reg] || ''}"${dis}></div>`)}
      <label for="top_region">Top region on your definition</label>
      ${regionSelect('top_region', 'top_region', response.top_region)}
    </fieldset>
    <fieldset><legend>Step 4. Check one figure yourself</legend>
      <label for="check_region">Region you recalculated</label>
      ${regionSelect('check_region', 'check_region', response.check_region)}
      <label for="check_value">Your recalculated figure</label>
      <input type="text" inputmode="decimal" id="check_value" name="check_value" value="${val(response, 'check_value')}"${dis}>
      <label for="check_method">How you checked it</label>
      <textarea id="check_method" name="check_method" rows="2" data-dictate${dis}>${val(response, 'check_method')}</textarea>
    </fieldset>
    <fieldset><legend>Step 5. Recommendation (150 words or fewer)</legend>
      <label for="recommendation">Your recommendation to the manager, with its limitations</label>
      <textarea id="recommendation" name="recommendation" rows="7" data-dictate${dis}>${val(response, 'recommendation')}</textarea>
    </fieldset>
    <fieldset><legend>Step 6. Independent check (no hints)</legend>
      <p>${lesson.independent.text}</p>
      <fieldset><legend>Is the formula correct?</legend><div class="radio-row">
        <label><input type="radio" name="ind_correct" value="yes"${checked(ind.correct, 'yes')}${dis}> Yes</label>
        <label><input type="radio" name="ind_correct" value="no"${checked(ind.correct, 'no')}${dis}> No</label>
      </div></fieldset>
      <label for="ind_kg">What should a ${lesson.independent.testLb} lb parcel be in kg? (2 decimal places)</label>
      <input type="text" inputmode="decimal" id="ind_kg" name="ind_kg" value="${ind.kg || ''}"${dis}>
      <label for="ind_formula">Correct formula</label>
      <input type="text" id="ind_formula" name="ind_formula" value="${ind.formula || ''}"${dis}>
    </fieldset>`;
  }
  if (lesson.type === 'suitability') {
    const d = response.decisions || {};
    const options = [['suitable', 'Suitable'], ['with_conditions', 'Suitable with conditions'], ['not_suitable', 'Not suitable / use another method']];
    const item = (s, label) => html`<fieldset class="claim"><legend>${label} ${s.key}</legend>
      <p>${s.text}</p>
      <div class="radio-row" role="radiogroup" aria-label="Decision for ${s.key}">
        ${options.map(([value, text]) => html`<label><input type="radio" name="d_${s.key}" value="${value}"${checked(d[s.key]?.decision, value)}${dis}> ${text}</label>`)}
      </div>
      <label for="r_${s.key}">Reason</label>
      <input type="text" id="r_${s.key}" name="r_${s.key}" value="${val(d[s.key], 'reason')}"${dis}>
    </fieldset>`;
    return html`
    <fieldset><legend>Step 1. Decide for each scenario</legend>${lesson.scenarios.map((s) => item(s, 'Scenario'))}</fieldset>
    <fieldset><legend>Step 2. Independent scenario (no hints)</legend>${item(lesson.independent, 'Scenario')}</fieldset>
    <fieldset><legend>Step 3. A task from your own course</legend>
      <p class="hint-text">${lesson.ownTaskPrompt} Don't include anyone's personal information.</p>
      <label for="own_task">The task</label>
      <textarea id="own_task" name="own_task" rows="3" data-dictate${dis}>${val(response, 'own_task')}</textarea>
      <div class="radio-row" role="radiogroup" aria-label="Decision for your own task">
        ${options.map(([value, text]) => html`<label><input type="radio" name="own_decision" value="${value}"${checked(response.own_decision, value)}${dis}> ${text}</label>`)}
      </div>
      <label for="own_reason">Your explanation</label>
      <textarea id="own_reason" name="own_reason" rows="5" data-dictate${dis}>${val(response, 'own_reason')}</textarea>
    </fieldset>`;
  }
  // brief
  return html`
  <fieldset><legend>Step 1. Write the brief</legend>
    ${lesson.briefFields.map(([k, label, hint]) => html`<div class="field"><label for="${k}">${label}</label>
      <p class="hint-text" id="${k}-hint">${hint}</p>
      <textarea id="${k}" name="${k}" rows="${k === 'success_criteria' ? 4 : 2}" aria-describedby="${k}-hint" data-dictate${dis}>${val(response, k)}</textarea></div>`)}
  </fieldset>
  <fieldset><legend>Step 2. Initial prompt</legend>
    <label for="prompt_v1">Prompt, version 1</label>
    <textarea id="prompt_v1" name="prompt_v1" rows="6" data-dictate${dis}>${val(response, 'prompt_v1')}</textarea>
  </fieldset>
  <fieldset><legend>Step 3. Evaluate the output against your success criteria</legend>
    <label for="assessment_v1">For each criterion: met, partly met or not met, and why</label>
    <textarea id="assessment_v1" name="assessment_v1" rows="5" data-dictate${dis}>${val(response, 'assessment_v1')}</textarea>
  </fieldset>
  <fieldset><legend>Step 4. Change one thing</legend>
    <label for="change_made">What did you change, and which criterion was it for?</label>
    <textarea id="change_made" name="change_made" rows="3" data-dictate${dis}>${val(response, 'change_made')}</textarea>
    <label for="prompt_v2">Prompt, version 2</label>
    <textarea id="prompt_v2" name="prompt_v2" rows="6" data-dictate${dis}>${val(response, 'prompt_v2')}</textarea>
    <label for="assessment_v2">Evaluate version 2 against the same criteria</label>
    <textarea id="assessment_v2" name="assessment_v2" rows="4" data-dictate${dis}>${val(response, 'assessment_v2')}</textarea>
    <label for="did_it_help">Did the change help? What is your evidence, and how sure can you be?</label>
    <textarea id="did_it_help" name="did_it_help" rows="4" data-dictate${dis}>${val(response, 'did_it_help')}</textarea>
  </fieldset>`;
}

export function parseResponse(lesson, body) {
  const s = (k) => (typeof body[k] === 'string' ? body[k].slice(0, 20000) : '');
  if (lesson.type === 'evidence') {
    const verdicts = {};
    const allowed = new Set(lesson.verdicts.map(([v]) => v));
    const sources = new Set(lesson.materials.map((m) => m.id));
    for (const c of lesson.claims) {
      verdicts[c.key] = { verdict: allowed.has(s(`v_${c.key}`)) ? s(`v_${c.key}`) : '', source: sources.has(s(`src_${c.key}`)) ? s(`src_${c.key}`) : '', note: s(`note_${c.key}`) };
    }
    const iv = s(`v_${lesson.independent.key}`);
    return { verdicts, corrected: s('corrected'), uncertainty: s('uncertainty'), independent: { verdict: allowed.has(iv) ? iv : '', corrected: s('ind_corrected') } };
  }
  if (lesson.type === 'numbers') {
    const pick = (k, list) => (list.some(([v]) => v === s(k)) ? s(k) : '');
    const region = (k) => (REGIONS.includes(s(k)) ? s(k) : '');
    return {
      question: s('question'), definition: pick('definition', lesson.definitions), definition_reason: s('definition_reason'),
      missing_row: s('missing_row'), handling: pick('handling', lesson.handlings), handling_note: s('handling_note'), other_issue: s('other_issue'),
      values: Object.fromEntries(REGIONS.map((reg) => [reg, s(`val_${reg}`).slice(0, 40)])), top_region: region('top_region'),
      check_region: region('check_region'), check_value: s('check_value').slice(0, 40), check_method: s('check_method'),
      recommendation: s('recommendation'),
      independent: { correct: ['yes', 'no'].includes(s('ind_correct')) ? s('ind_correct') : '', kg: s('ind_kg').slice(0, 40), formula: s('ind_formula').slice(0, 200) },
    };
  }
  if (lesson.type === 'suitability') {
    const allowed = new Set(['suitable', 'with_conditions', 'not_suitable']);
    const decisions = {};
    for (const sc of [...lesson.scenarios, lesson.independent]) {
      decisions[sc.key] = { decision: allowed.has(s(`d_${sc.key}`)) ? s(`d_${sc.key}`) : '', reason: s(`r_${sc.key}`) };
    }
    return { decisions, own_task: s('own_task'), own_decision: allowed.has(s('own_decision')) ? s('own_decision') : '', own_reason: s('own_reason') };
  }
  const out = {};
  for (const [k] of lesson.briefFields) out[k] = s(k);
  for (const k of ['prompt_v1', 'assessment_v1', 'change_made', 'prompt_v2', 'assessment_v2', 'did_it_help']) out[k] = s(k);
  return out;
}

export function hintsBlock(lesson, used) {
  if (!used) return '';
  return html`<div class="note info" role="region" aria-label="Hints"><p><strong>Hints used: ${used} of ${lesson.hints.length}</strong></p>
    <ol>${lesson.hints.slice(0, used).map((h) => html`<li>${h}</li>`)}</ol></div>`;
}

export function feedbackBlock(result, { heading = 'Feedback on this version', provisional = true } = {}) {
  if (!result) return '';
  return html`<section class="card" aria-labelledby="fb-h" tabindex="-1" id="feedback">
    <h2 id="fb-h">${heading}</h2>
    ${provisional ? html`<p class="small muted">Automated, provisional feedback from rule-based checks against the answer key. It points to the most important issues only. Your educator reviews it and it does not decide a grade.</p>` : ''}
    ${result.shown.length ? html`<p>The ${result.shown.length === 1 ? 'most important issue' : `${result.shown.length} most important issues`} to work on:</p>
      ${result.shown.map((i) => html`<div class="feedback-item"><p><strong><span class="chip warn">To revise</span> ${i.title}</strong></p><p><strong>Why it matters:</strong> ${i.why}</p><p><strong>Next step:</strong> ${i.next}</p></div>`)}
      ${result.issues.length > result.shown.length ? html`<p class="small muted">There may be smaller points too. Fix these first, then submit a revision.</p>` : ''}`
    : html`<div class="feedback-item good"><p><strong><span class="chip good">No major issues found</span></strong> These checks found nothing important to fix. Compare your answer with the example to see whether anything could be sharper.</p></div>`}
    ${result.resolved?.length ? html`<p><span class="chip good">Resolved since last version</span> ${result.resolved.length} issue${result.resolved.length > 1 ? 's' : ''} flagged last time ${result.resolved.length > 1 ? 'are' : 'is'} no longer present.</p>` : ''}
    ${result.strengths.length ? html`<h3>What worked</h3><ul>${result.strengths.map((s) => html`<li>${s}</li>`)}</ul>` : ''}
  </section>`;
}

export function exampleBlock(lesson) {
  const e = lesson.exampleResponse;
  let inner;
  if (lesson.type === 'evidence') {
    inner = html`
      <div class="table-wrap" tabindex="0" role="region" aria-label="Table, scrolls sideways on small screens"><table><caption>Answer key</caption><thead><tr><th scope="col">Claim</th><th scope="col">Verdict</th><th scope="col">Why</th></tr></thead>
      <tbody>${lesson.claims.map((c) => html`<tr><th scope="row">${c.key}</th><td>${lesson.verdicts.find(([v]) => v === c.expected[0])[1]}${c.source ? ` (Source ${c.source})` : ''}</td><td>${c.explain}</td></tr>`)}
      <tr><th scope="row">${lesson.independent.key}</th><td>Contradicted by a source (Source A)</td><td>${lesson.independent.explain}</td></tr></tbody></table></div>
      <h3>Example corrected answer</h3><p>${lesson.exampleCorrected}</p>
      <h3>Example uncertainty statement</h3><p>${lesson.exampleUncertainty}</p>`;
  } else if (lesson.type === 'numbers') {
    const label = (list, v) => list.find(([k]) => k === v)?.[1] || v;
    inner = html`<dl class="kv">
      <dt>Question and assumption</dt><dd>${e.question}</dd>
      <dt>Definition</dt><dd>${label(lesson.definitions, e.definition)}. ${e.definition_reason}</dd>
      <dt>Missing value</dt><dd>${e.missing_row} ${e.handling_note}</dd>
      <dt>Other issue</dt><dd>${e.other_issue}</dd>
      <dt>Figures</dt><dd>${REGIONS.map((reg) => `${reg} ${e.values[reg]}%`).join(', ')}. Top: ${e.top_region}.</dd>
      <dt>Check</dt><dd>${e.check_method}</dd>
      <dt>Recommendation</dt><dd>${e.recommendation}</dd>
      <dt>Independent check</dt><dd>${lesson.independent.explain}</dd></dl>
      <div class="table-wrap" tabindex="0" role="region" aria-label="Answer key, scrolls sideways on small screens"><table><caption>All three definitions, with East Q2 estimated at £33,250</caption>
      <thead><tr><th scope="col">Region</th><th scope="col">Gross (£)</th><th scope="col">Net (£)</th><th scope="col">Growth Q1 to Q2</th></tr></thead>
      <tbody>${REGIONS.map((reg) => html`<tr><th scope="row">${reg}</th><td>${lesson.answerKey[reg].gross.toLocaleString('en-GB')}</td><td>${lesson.answerKey[reg].net.toLocaleString('en-GB')}</td><td>${lesson.answerKey[reg].growth}%</td></tr>`)}</tbody></table></div>
      <p>East leads on gross revenue, North on net revenue and West on growth. Treating the blank as zero would make East's total £32,500 and its growth −100%.</p>`;
  } else if (lesson.type === 'suitability') {
    inner = html`<dl class="kv">${Object.entries(e.decisions).map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl><h3>Example own-course decision</h3><p>${e.own}</p>`;
  } else {
    inner = html`<dl class="kv">${[...lesson.briefFields.map(([k, l]) => [l, e[k]]), ['Prompt v1', e.prompt_v1], ['Evaluation v1', e.assessment_v1], ['Change', e.change_made], ['Prompt v2', e.prompt_v2], ['Evaluation v2', e.assessment_v2], ['Did it help?', e.did_it_help]].map(([k, v]) => html`<dt>${k}</dt><dd>${paras(v)}</dd>`)}</dl>`;
  }
  return html`<section class="card" aria-labelledby="ex-h"><h2 id="ex-h">Example response</h2>
    <p class="small muted">One good response, not the only one. Compare the reasoning, not the wording.</p>${inner}
    <h3>Common mistakes</h3><ul>${lesson.commonMistakes.map((m) => html`<li>${m}</li>`)}</ul></section>`;
}
