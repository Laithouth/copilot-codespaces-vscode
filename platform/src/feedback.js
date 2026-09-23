// Provisional formative feedback. Deterministic, rule-based checks against each
// lesson's answer key. They pick the one or two most consequential issues so the
// student has something specific to revise. Educators review everything here
// before it counts, and the rules are deliberately conservative: they flag
// likely problems and never decide a grade.

const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const has = (s, ...needles) => {
  const t = String(s || '').toLowerCase();
  return needles.some((n) => t.includes(n.toLowerCase()));
};
import { salesFigures, REGIONS } from './content/lessons.js';

const clampSupport = (level, { hintsUsed, versionNo }) =>
  hintsUsed > 0 || versionNo > 1 ? Math.min(level, 2) : level;

export const MAX_SHOWN = 2;

export function evaluate(lesson, response, ctx = {}) {
  const context = { hintsUsed: 0, versionNo: 1, previousIssueCodes: [], ...ctx };
  const fn = { evidence: evaluateEvidence, suitability: evaluateSuitability, brief: evaluateBrief, numbers: evaluateNumbers, extraction: evaluateExtraction, claims: evaluateClaims, decisions: evaluateDecisions, capstone: evaluateCapstone }[lesson.type];
  if (!fn) throw new Error(`No evaluator for lesson type ${lesson.type}`);
  const result = fn(lesson, response || {}, context);
  result.issues.sort((a, b) => a.priority - b.priority);
  result.shown = result.issues.slice(0, MAX_SHOWN);
  if (context.versionNo > 1) {
    const now = new Set(result.issues.map((i) => i.code));
    const resolved = context.previousIssueCodes.filter((c) => !now.has(c));
    result.resolved = resolved;
    // Revision: did the new version resolve what was flagged last time?
    const prevShown = context.previousIssueCodes.slice(0, MAX_SHOWN);
    const fixedShown = prevShown.filter((c) => !now.has(c)).length;
    result.provisional.revision = prevShown.length === 0 ? null : fixedShown === prevShown.length ? 2 : fixedShown > 0 ? 1 : 0;
  }
  return result;
}

function evaluateEvidence(lesson, r, ctx) {
  const issues = [];
  const strengths = [];
  const verdicts = r.verdicts || {};
  const checks = lesson.claims.map((c) => {
    const v = verdicts[c.key] || {};
    const verdict = v.verdict || '';
    return {
      claim_key: c.key,
      verdict,
      source_ref: v.source || '',
      note: v.note || '',
      correct: verdict ? (c.expected.includes(verdict) ? 1 : 0) : 0,
      near: verdict && (c.near || []).includes(verdict),
    };
  });
  const byKey = Object.fromEntries(checks.map((c) => [c.claim_key, c]));
  const unanswered = checks.filter((c) => !c.verdict).map((c) => c.claim_key);
  const corrected = r.corrected || '';
  const uncertainty = r.uncertainty || '';

  if (unanswered.length) {
    issues.push({ code: 'unanswered', priority: 0, title: `Some claims have no verdict yet (${unanswered.join(', ')}).`, why: 'Every claim that could affect the committee\'s decision needs checking, not just the ones that look wrong.', next: 'Give each claim a verdict and note where you found the evidence.' });
  }
  const c5 = byKey.C5;
  if (c5.verdict && !c5.correct) {
    issues.push({ code: 'fabricated_accepted', priority: 1, title: c5.near ? 'You noticed claim C5 isn\'t in the sources. The reference itself is also a problem.' : 'Claim C5 relies on a reference you haven\'t verified.', why: 'The reference is not among the supplied sources. If you cannot find a reference, treat it as possibly invented: an invented citation in work you submit is a serious integrity problem even if you did not create it.', next: 'Try to find the reference. If you can\'t, mark it as unverifiable and remove it and its 20% figure from your answer.' });
  }
  // A sentence that mentions the reference only to say it was removed is fine.
  const retainsFabrication = String(corrected).split(/(?<=[.!?])\s+/).some((sentence) =>
    has(sentence, 'marlow', 'achebe', 'public library management', '20%')
    && !has(sentence, 'removed', 'remove', 'could not', "couldn't", 'cannot', "can't", 'unverif', 'not find', 'not found', 'invented', 'fabricat', 'excluded'));
  if (retainsFabrication) {
    issues.push({ code: 'fabricated_retained', priority: 2, title: 'Your corrected answer still uses the unverified reference or its 20% figure.', why: 'Anything you cannot verify should not reach the reader, even in softened form.', next: 'Remove the reference and the figure, or replace them with something you have checked.' });
  }
  const c6 = byKey.C6;
  if (c6.verdict && !c6.correct) {
    issues.push({ code: 'cost_missed', priority: 3, title: 'Claim C6 about cost and staffing needs another look.', why: 'This claim decides whether the proposal is affordable. A source contradicts it directly.', next: 'Read Source C and compare it with "minimal cost by using existing staff".' });
  }
  const c2 = byKey.C2;
  const sentences = String(corrected).split(/(?<=[.!?])\s+/);
  const keepsWrongFigure = sentences.some((t) => has(t, '16%') && !has(t, 'not 16', 'instead', 'rather than', 'corrected', 'wrong', 'incorrect', 'removed'));
  const keepsCausalClaim = sentences.some((t) => /\bcaused\b/i.test(t) && !has(t, 'not', 'may', 'might', 'cannot', "can't", 'unclear', 'unknown'));
  if ((c2.verdict && !c2.correct) || keepsWrongFigure || keepsCausalClaim) {
    issues.push({ code: 'membership_misstated', priority: 4, title: c2.correct ? 'Your corrected answer keeps the 16% figure or the word "caused".' : 'Check the membership figure in claim C2 against Source A.', why: 'Source A reports a different figure and notes other possible causes. Stating the wrong number or a causal link would mislead the committee.', next: 'Use the figure from Source A and describe it as an association, with the caveat the source gives.' });
  }
  const c3 = byKey.C3;
  if (c3.verdict === 'supported') {
    issues.push({ code: 'survey_overgeneralised', priority: 5, title: 'Claim C3 describes the survey more strongly than the source does.', why: 'Source B says respondents chose to take part. A self-selected survey shows what respondents think, not what residents generally think.', next: 'Mark how far the source supports the claim and describe the survey accurately in your answer.' });
  }
  if (byKey.C4.verdict && !byKey.C4.correct) {
    issues.push({ code: 'unsupported_accepted', priority: 6, title: 'Look again at where claim C4 is supported.', why: 'A claim can be plausible and still have no evidence behind it in the sources you were given.', next: 'Search the three sources for anything about who the Sunday visitors were.' });
  }
  if (!corrected.trim()) {
    issues.push({ code: 'no_corrected', priority: 7, title: 'Write the corrected answer.', why: 'The committee needs a usable answer, not only a list of problems.', next: 'Rewrite the answer using only checked claims, with the source for each.' });
  } else if (!has(corrected, '74,000', '74000', 'cost', 'budget', 'fund')) {
    issues.push({ code: 'omission_cost', priority: 8, title: 'Your corrected answer leaves out the cost.', why: 'Source C is the main trade-off in the decision. Leaving it out makes the answer one-sided.', next: 'Add the cost estimate and the funding options from Source C.' });
  }
  if (words(uncertainty) < 12) {
    issues.push({ code: 'uncertainty_missing', priority: 9, title: 'Say what remains uncertain.', why: 'The sources leave real questions open, such as whether trial attendance would last. Stating them tells the reader how far to rely on the answer.', next: 'List two or three things the sources cannot tell you.' });
  }
  const noEvidence = checks.filter((c) => c.verdict && ['supported', 'partly_supported', 'contradicted'].includes(c.verdict) && !c.source_ref).length;
  if (noEvidence >= 2) {
    issues.push({ code: 'evidence_unrecorded', priority: 10, title: 'Record which source supports or contradicts each claim.', why: 'A recorded check can be reviewed by someone else. An unrecorded one cannot.', next: 'Choose the source for each claim you marked as supported, partly supported or contradicted.' });
  }

  const ind = r.independent || {};
  const independentCorrect = ind.verdict ? lesson.independent.expected.includes(ind.verdict) : null;

  const correctCount = checks.filter((c) => c.correct).length;
  if (byKey.C5.correct) strengths.push('You identified the unverifiable reference.');
  if (byKey.C6.correct) strengths.push('You caught the contradiction about cost and staffing.');
  if (correctCount === checks.length) strengths.push('Every claim verdict matches the answer key.');
  if (independentCorrect) strengths.push('Your independent check (C7) was correct without hints.');

  let level;
  const retained = issues.some((i) => i.code === 'fabricated_retained');
  if (retained || correctCount <= 1) level = 0;
  else if (correctCount <= 3 || issues.some((i) => i.code === 'fabricated_accepted')) level = 1;
  else if (correctCount <= 5 || issues.length > 0) level = 2;
  else level = 3;
  level = clampSupport(level, ctx);

  return {
    issues,
    strengths,
    evidenceChecks: checks.map(({ near, ...c }) => c),
    metrics: { claimsCorrect: correctCount, claimsTotal: checks.length, independentCorrect },
    provisional: { verification: level },
  };
}

function evaluateSuitability(lesson, r, ctx) {
  const issues = [];
  const strengths = [];
  const decisions = r.decisions || {};
  const items = [...lesson.scenarios, lesson.independent];
  let correct = 0;
  const reasonless = [];
  for (const s of items) {
    const d = decisions[s.key] || {};
    if (!d.decision) {
      issues.push({ code: `missing_${s.key}`, priority: 0, title: `Scenario ${s.key} has no decision yet.`, why: 'Each scenario tests a different consideration.', next: 'Choose a decision and give your reason.' });
      continue;
    }
    const ok = s.expected.includes(d.decision);
    if (ok) correct++;
    const reasoned = words(d.reason) >= 6 && s.keywords.some((k) => has(d.reason, k));
    if (!ok) {
      issues.push({
        code: `wrong_${s.key}`,
        priority: s.critical ? 1 : 4,
        title: `Look again at scenario ${s.key}.`,
        why: s.key === 'S3' ? 'The assignment rules settle this one before anything else.' : s.key === 'S2' ? 'Other people\'s personal and confidential information is involved, and the tool is not approved for it.' : 'One of the four questions points to a different answer here.',
        next: 'Go through the four questions for this scenario in order and see which one decides it.',
      });
    } else if (!reasoned) {
      reasonless.push(s.key);
    }
  }
  if (reasonless.length) {
    issues.push({ code: 'reasons_thin', priority: 5, title: `Your reasons for ${reasonless.join(', ')} don't yet say which consideration decided it.`, why: 'The decision alone doesn\'t show whether you could make the same call in a new situation.', next: 'Name the rule, information, checking or value point that decided each one.' });
  }
  const own = `${r.own_task || ''} ${r.own_reason || ''}`;
  const factors = [['rule', 'allow', 'permit', 'policy', 'brief', 'guide'], ['personal', 'confiden', 'information', 'data', 'share', 'private'], ['check', 'verify', 'accura', 'source'], ['time', 'faster', 'better', 'instead', 'value', 'useful', 'method']]
    .filter((group) => group.some((k) => has(own, k))).length;
  if (!r.own_decision || words(r.own_reason) < 20) {
    issues.push({ code: 'own_task_missing', priority: 6, title: 'Complete the decision for a task from your own course.', why: 'Applying the questions to your own coursework is the part that transfers.', next: 'Describe the task, choose a decision and explain it in three to five sentences.' });
  } else if (factors < 2) {
    issues.push({ code: 'own_task_thin', priority: 7, title: 'Your own-course explanation covers only one of the four questions.', why: 'Decisions usually turn on more than one factor, and the one you skip is often the rule.', next: 'Add what the rules say and how you would check the output.' });
  } else {
    strengths.push('Your own-course decision refers to several of the four questions.');
  }
  if (decisions.S2?.decision === 'not_suitable' && decisions.S3?.decision === 'not_suitable') strengths.push('You identified both cases where AI should not be used as described.');

  let level;
  const critical = issues.some((i) => i.priority === 1);
  if (correct <= 2) level = 0;
  else if (critical || correct <= 4) level = 1;
  else if (issues.length > 0) level = 2;
  else level = 3;
  level = clampSupport(level, ctx);
  return { issues, strengths, evidenceChecks: [], metrics: { decisionsCorrect: correct, decisionsTotal: items.length }, provisional: { tool_selection: level } };
}

function evaluateBrief(lesson, r, ctx) {
  const issues = [];
  const strengths = [];
  const missing = lesson.briefFields.filter(([k]) => !String(r[k] || '').trim()).map(([, label]) => label);
  if (missing.length) {
    issues.push({ code: 'brief_incomplete', priority: 0, title: `Your brief is missing: ${missing.join(', ')}.`, why: 'Each part of the brief is a decision the model would otherwise guess.', next: 'Fill in the missing parts before writing the prompt.' });
  }
  const criteria = String(r.success_criteria || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const vague = criteria.filter((c) => /^(good|high[- ]quality|engaging|clear|professional|interesting)\.?$/i.test(c) || words(c) < 4);
  if (criteria.length < 2 || vague.length > 0) {
    issues.push({ code: 'criteria_uncheckable', priority: 1, title: criteria.length < 2 ? 'Write at least two success criteria.' : 'Some success criteria can\'t be checked yet.', why: 'You will use these to judge the output. "Engaging" can\'t be ticked or crossed; "fits in three hours a week" can.', next: 'Rewrite each criterion as something another person could check against the output.' });
  }
  const p1 = r.prompt_v1 || '';
  const constraintsCarried = [['3 hours', 'three hours', '3 hrs', 'hours a week', 'hours per week'], ['300'], ['cake'], ['ads', 'advert', 'paid'], ['film', 'video']]
    .filter((g) => g.some((k) => has(p1, k))).length;
  if (!p1.trim()) {
    issues.push({ code: 'prompt_missing', priority: 2, title: 'Write your initial prompt.', why: 'The prompt is how your brief reaches the model.', next: 'Write a prompt that carries the key parts of your brief.' });
  } else if (constraintsCarried < 3) {
    issues.push({ code: 'constraints_not_carried', priority: 2, title: 'Your prompt leaves out constraints from your brief.', why: 'The model only knows what you tell it. Without Sam\'s time limit, budget and goal (cake orders), it will give generic advice, which the marking guidance penalises.', next: 'Check the prompt against your brief and include the constraints that would change the answer.' });
  }
  if (p1.trim() && !has(p1, 'bakery', 'crumb', 'sam', 'profile', 'notes', '[p1', 'p1', 'p2')) {
    issues.push({ code: 'inputs_not_given', priority: 3, title: 'Your prompt doesn\'t give the model the client information.', why: 'Without the source pack, the model has to invent the business, and recommendations won\'t be specific to the client.', next: 'Paste or summarise P1 and P2 in the prompt.' });
  }
  if (!String(r.assessment_v1 || '').trim()) {
    issues.push({ code: 'no_evaluation', priority: 4, title: 'Evaluate the output against your success criteria.', why: 'Without an evaluation, you can\'t tell what to change.', next: 'For each criterion, say whether it was met, partly met or not met.' });
  }
  if (!String(r.change_made || '').trim() || !String(r.prompt_v2 || '').trim()) {
    issues.push({ code: 'no_revision', priority: 5, title: 'Make one targeted revision.', why: 'The revision is where you test whether your evaluation was right.', next: 'Change one thing linked to a criterion that was not met, and keep both versions.' });
  } else if (words(r.did_it_help) < 15 || !has(r.did_it_help, 'criteri', 'met', 'word', 'hour', 'measure', 'because')) {
    issues.push({ code: 'judgement_unsupported', priority: 6, title: 'Say which criterion changed and how you know.', why: 'One better output doesn\'t show a prompt is reliably better. Your judgement should point to evidence and say how confident you can be.', next: 'Name the criterion that improved (or didn\'t) and what in the output shows it.' });
  }
  if (!missing.length && criteria.length >= 2 && !vague.length) strengths.push('Your brief is complete and your success criteria are checkable.');
  if (constraintsCarried >= 3) strengths.push('Your prompt carries the client\'s key constraints.');

  const briefLevel = missing.length > 2 ? 0 : missing.length || issues.some((i) => i.code === 'criteria_uncheckable') ? 1 : 3;
  const promptLevel = !p1.trim() ? 0 : constraintsCarried < 2 ? 1 : constraintsCarried < 4 || issues.some((i) => i.code === 'inputs_not_given') ? 2 : 3;
  return {
    issues,
    strengths,
    evidenceChecks: [],
    metrics: { criteriaCount: criteria.length, constraintsCarried },
    provisional: { task_definition: clampSupport(briefLevel, ctx), instruction_quality: clampSupport(promptLevel, ctx) },
  };
}

// Accepts "£61,500", "61500", "25%", "25.0" and similar.
export function parseNumber(v) {
  const t = String(v ?? '').replace(/[£$,%\s]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

function closeTo(actual, expected, metric) {
  if (actual === null || expected === null || expected === undefined) return false;
  return metric === 'growth' ? Math.abs(actual - expected) <= 0.6 : Math.abs(actual - expected) <= Math.max(50, Math.abs(expected) * 0.01);
}

function evaluateNumbers(lesson, r, ctx) {
  const issues = [];
  const strengths = [];
  const metric = ['gross', 'net', 'growth'].includes(r.definition) ? r.definition : null;
  const handling = r.handling || '';
  const figures = salesFigures(handling === 'exclude' ? 'exclude' : 'estimate');
  const values = Object.fromEntries(REGIONS.map((reg) => [reg, parseNumber(r.values?.[reg])]));
  const recommendation = r.recommendation || '';

  if (!r.definition || !handling || REGIONS.some((reg) => values[reg] === null) || !r.top_region || !recommendation.trim()) {
    const missing = [!r.definition && 'a definition', !handling && 'how you handled the missing value', REGIONS.some((reg) => values[reg] === null) && 'a figure for every region', !r.top_region && 'the top region', !recommendation.trim() && 'the recommendation'].filter(Boolean);
    issues.push({ code: 'numbers_incomplete', priority: 0, title: `Still needed: ${missing.join(', ')}.`, why: 'Each step depends on the one before; a recommendation without figures, or figures without a definition, can\'t be checked.', next: 'Complete the missing steps, then submit again.' });
  }
  const foundMissing = has(r.missing_row, 'east') && has(r.missing_row, 'q2', '2025-q2', 'second quarter', 'quarter 2');
  // A gross total for East of about £32,500 without choosing "exclude" means the blank was counted as zero.
  const impliedZero = handling !== 'exclude' && metric === 'gross' && closeTo(values.East, 32500, 'gross');
  if (handling === 'zero' || impliedZero) {
    issues.push({ code: 'missing_as_zero', priority: 1, title: 'The blank East Q2 revenue has been counted as zero.', why: 'A blank means the figure is unknown, not that East sold nothing. Counting it as zero makes East look as if its sales collapsed, which could send the rep to the wrong region.', next: 'Estimate the missing value from the other data (check the unit price in the other rows), or ask for the real figure, and say which you did.' });
  } else if (!foundMissing) {
    issues.push({ code: 'missing_not_found', priority: 1, title: 'Look again for a missing value before calculating.', why: 'One cell in the dataset is blank. Most spreadsheet functions quietly treat blanks as zero, so you need to spot it yourself.', next: 'Scan every row of Dataset D and name the row with the gap.' });
  }
  if (handling === 'exclude') {
    issues.push({ code: 'exclude_bias', priority: 2, title: 'Leaving East\'s missing quarter out makes the comparison unfair.', why: 'East would then be compared on one quarter against the others\' two. Its totals would look half their real size, and its growth couldn\'t be calculated.', next: 'Estimate the missing figure (and say how), or ask for it, so all four regions are compared on the same basis.' });
  }
  if (!r.definition || !r.question?.trim() || words(r.definition_reason) < 8) {
    issues.push({ code: 'definition_unstated', priority: 3, title: 'Say what "top performer" means here, and why.', why: 'Gross revenue, net revenue and growth each point to a different region. Without a stated definition, the answer can\'t be checked or trusted.', next: 'Write the question you would ask the manager, choose a definition, and give the reason from the manager\'s note.' });
  }
  let valuesCorrect = null;
  if (metric && handling !== 'zero') {
    const wrong = REGIONS.filter((reg) => values[reg] !== null && figures[reg][metric] !== null && !closeTo(values[reg], figures[reg][metric], metric));
    valuesCorrect = REGIONS.filter((reg) => figures[reg][metric] !== null && closeTo(values[reg], figures[reg][metric], metric)).length;
    if (wrong.length) {
      issues.push({ code: 'values_wrong', priority: 4, title: `Check your ${metric === 'growth' ? 'growth' : `${metric} revenue`} figure${wrong.length > 1 ? 's' : ''} for ${wrong.join(', ')}.`, why: 'The figures don\'t match a recalculation from Dataset D under the definition and handling you chose.', next: metric === 'growth' ? 'Growth = (Q2 ÷ Q1 − 1) × 100. Recalculate one region by hand and compare.' : metric === 'net' ? 'Net = Q1 + Q2 gross revenue, minus both quarters\' returns. Recalculate one region by hand and compare.' : 'Gross = Q1 + Q2 revenue for the region. Recalculate one region by hand and compare.' });
    }
    const ranked = REGIONS.filter((reg) => figures[reg][metric] !== null).sort((a, b) => figures[b][metric] - figures[a][metric]);
    if (r.top_region && ranked.length && r.top_region !== ranked[0]) {
      issues.push({ code: 'top_inconsistent', priority: 5, title: `Your top region doesn't match your own definition.`, why: 'The recommendation has to follow from the measure you chose, or the reasoning falls apart.', next: 'Compare the four figures for your chosen measure again, and pick the region they support.' });
    }
    const checkRegion = REGIONS.includes(r.check_region) ? r.check_region : null;
    const checkValue = parseNumber(r.check_value);
    if (!checkRegion || checkValue === null || words(r.check_method) < 6 || !closeTo(checkValue, figures[checkRegion][metric], metric)) {
      issues.push({ code: 'no_recalculation', priority: 6, title: checkRegion && checkValue !== null ? 'Your independent recalculation doesn\'t match the data.' : 'Recalculate one key figure yourself.', why: 'A figure you have checked a second way is one you can defend. This is also how you catch a formula that gives plausible-looking wrong answers.', next: 'Pick one region, work its figure out by hand from Dataset D, and write down how.' });
    }
  }
  if (!has(`${r.other_issue} ${recommendation}`, 'return')) {
    issues.push({ code: 'returns_missed', priority: 7, title: 'Look at the returns column.', why: 'One region\'s returns are far higher than the others\'. That changes how its revenue should be read.', next: 'Compare returns with gross revenue for each region.' });
  }
  if (['estimate', 'ask'].includes(handling) && recommendation.trim() && !has(recommendation, 'estimat', 'assum', 'missing', 'blank')) {
    issues.push({ code: 'assumption_undisclosed', priority: 8, title: 'Your recommendation doesn\'t mention the estimated figure.', why: 'The manager should know that part of the result depends on an estimate you made.', next: 'Add one sentence saying what was missing and how you estimated it.' });
  }
  if (recommendation.trim() && !has(recommendation, 'limit', 'two quarters', 'only two', 'half-year only', 'margin', 'does not', 'doesn\'t', 'cannot', 'can\'t', 'not tell', 'caveat')) {
    issues.push({ code: 'limitations_missing', priority: 9, title: 'State the limits of this analysis.', why: 'Two quarters of data with one estimated value is a thin basis for a hiring decision. Saying so is part of an honest recommendation.', next: 'Add what the data can\'t tell you (for example, the short period, costs or margins).' });
  }
  if (words(recommendation) > 150) {
    issues.push({ code: 'too_long', priority: 10, title: `Your recommendation is ${words(recommendation)} words; the limit is 150.`, why: 'The manager asked for a recommendation, not a report.', next: 'Keep the decision, the key figure, the main caveat and the limits.' });
  }

  const ind = r.independent || {};
  const kg = parseNumber(ind.kg);
  const independentCorrect = ind.correct ? ind.correct === 'no' && kg !== null && Math.abs(kg - lesson.independent.expectedKg) <= 0.02 : null;

  if (foundMissing && ['estimate', 'ask'].includes(handling)) strengths.push('You found the missing value and handled it openly.');
  if (valuesCorrect === 4) strengths.push('All four figures match the data for your chosen definition.');
  if (!issues.some((i) => i.code === 'no_recalculation') && metric) strengths.push('Your independent recalculation matches.');
  if (independentCorrect) strengths.push('You caught the wrong conversion formula by testing it.');

  const codes = new Set(issues.map((i) => i.code));
  let verification;
  if (codes.has('missing_as_zero') || codes.has('missing_not_found') || codes.has('numbers_incomplete')) verification = 0;
  else if (codes.has('values_wrong') || codes.has('no_recalculation')) verification = 1;
  else if (codes.has('returns_missed') || codes.has('exclude_bias') || codes.has('top_inconsistent') || independentCorrect === false) verification = 2;
  else verification = 3;
  const taskDefinition = codes.has('definition_unstated') ? (r.definition ? 1 : 0) : 3;

  return {
    issues,
    strengths,
    evidenceChecks: [],
    metrics: { definition: r.definition || null, handling: handling || null, valuesCorrect, independentCorrect },
    provisional: { task_definition: clampSupport(taskDefinition, ctx), verification: clampSupport(verification, ctx) },
  };
}

// ---- Module 3: extraction ----------------------------------------------------

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
// Returns YYYY-MM-DD for "1 March 2026", "March 1, 2026", "01/03/2026" (day first),
// "2026-03-01" or "1st of March 2026"; null otherwise.
export function parseDate(v) {
  const t = String(v || '').toLowerCase().replace(/(\d+)(st|nd|rd|th)/g, '$1').replace(/\bof\b/g, ' ').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  const pad = (n) => String(n).padStart(2, '0');
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = t.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  m = t.match(/^(\d{1,2}) ([a-z]+) (\d{4})$/);
  if (m && MONTHS.findIndex((x) => x.startsWith(m[2].slice(0, 3))) >= 0) return `${m[3]}-${pad(MONTHS.findIndex((x) => x.startsWith(m[2].slice(0, 3))) + 1)}-${pad(m[1])}`;
  m = t.match(/^([a-z]+) (\d{1,2}) (\d{4})$/);
  if (m && MONTHS.findIndex((x) => x.startsWith(m[1].slice(0, 3))) >= 0) return `${m[3]}-${pad(MONTHS.findIndex((x) => x.startsWith(m[1].slice(0, 3))) + 1)}-${pad(m[2])}`;
  return null;
}

function cellCorrect(c, value) {
  const v = String(value || '').toLowerCase();
  if (!v.trim()) return false;
  if (c.date) return [].concat(c.date).includes(parseDate(value));
  if (c.number !== undefined) return parseNumber(String(value).replace(/days?/i, '')) === c.number;
  if (c.accept) return c.accept.some((a) => v.includes(a));
  if (c.all) return c.all.every((group) => group.some((a) => v.includes(a)));
  return false;
}

function evaluateExtraction(lesson, r, ctx) {
  const issues = []; const strengths = [];
  const cells = r.cells || {};
  const results = Object.fromEntries(lesson.cells.map((c) => [c.key, cellCorrect(c, cells[c.key]?.value)]));
  const empty = lesson.cells.filter((c) => !String(cells[c.key]?.value || '').trim()).map((c) => c.label);
  const correct = Object.values(results).filter(Boolean).length;
  if (empty.length) issues.push({ code: 'cells_empty', priority: 0, title: `Some fields are empty: ${empty.join(', ')}.`, why: 'An empty cell is ambiguous: missing from the document, or missed by you?', next: 'Fill every field, writing "not stated" where the document really says nothing.' });
  const pay = parseNumber(String(cells.payment?.value || '').replace(/days?/i, ''));
  if (pay === 30) issues.push({ code: 'amendment_missed', priority: 1, title: 'Payment terms: a later clause changes this.', why: 'Clause 9 amends clause 4. Taking the first value you find is the most common extraction error, for people and AI alike.', next: 'Read the whole agreement, including amendments, and use the clause that applies.' });
  else if (!results.payment && cells.payment?.value) issues.push({ code: 'cell_wrong_payment', priority: 3, title: 'Check the payment terms again.', why: 'The value doesn\'t match the agreement.', next: 'Find every clause that mentions payment.' });
  if (!results.footnote && !empty.includes('Other supplier obligation')) issues.push({ code: 'footnote_missed', priority: 2, title: 'There is a supplier obligation you haven\'t captured.', why: 'Obligations in footnotes are binding too, and they are easy to miss when skimming.', next: 'Check the footnotes and small print.' });
  const wrongOther = lesson.cells.filter((c) => !['payment', 'footnote'].includes(c.key) && !results[c.key] && String(cells[c.key]?.value || '').trim()).map((c) => c.label);
  if (wrongOther.length) issues.push({ code: 'cells_wrong', priority: 3, title: `Check these values against the agreement: ${wrongOther.join(', ')}.`, why: 'They don\'t match the document.', next: wrongOther.some((l) => /date/i.test(l)) ? 'For dates, convert words to numbers carefully, and work out "twelve months from" the start date.' : 'Find the clause each value comes from and compare word by word.' });
  const unsourced = lesson.cells.filter((c) => String(cells[c.key]?.value || '').trim() && !String(cells[c.key]?.where || '').trim()).length;
  if (unsourced >= 3) issues.push({ code: 'checks_unrecorded', priority: 4, title: 'Say which clause each value came from.', why: 'A cell with its clause noted can be checked by someone else in seconds.', next: 'Fill in "Where in the document" for each field.' });
  const p = r.prompt || '';
  const hasBoundary = /<\/?\w+>|"""|```|document:|between .* tags|---/i.test(p);
  const hasExample = has(p, 'example', 'e.g.', 'for instance', 'such as', '| ');
  const hasMissing = has(p, 'not stated', 'missing', 'not found', 'not in the document', 'n/a', 'unknown', 'if a field', 'blank', 'null', 'not present');
  const promptScore = [hasBoundary, hasExample, hasMissing].filter(Boolean).length;
  if (!p.trim()) issues.push({ code: 'prompt_missing', priority: 5, title: 'Write the extraction instruction.', why: 'A reusable instruction is half the deliverable.', next: 'Write the instruction you would give an AI for any similar agreement.' });
  else {
    if (!hasMissing) issues.push({ code: 'prompt_no_missing_rule', priority: 5, title: 'Your instruction doesn\'t say what to do when a field is missing.', why: 'Without a rule, models tend to fill gaps with plausible guesses.', next: 'Add: if a field isn\'t in the document, write "not stated".' });
    if (!hasBoundary) issues.push({ code: 'prompt_no_boundary', priority: 6, title: 'Mark where the document starts and ends.', why: 'Clear markers stop the model confusing your instructions with the document\'s text.', next: 'Wrap the document in tags such as <document> … </document>.' });
    if (!hasExample) issues.push({ code: 'prompt_no_example', priority: 7, title: 'Show one example row.', why: 'An example fixes the format far more reliably than describing it.', next: 'Add one example row in the exact format you want.' });
  }
  const indOk = { start: parseDate(r.ind_start) === lesson.independentKey.start, fee: parseNumber(r.ind_fee) === lesson.independentKey.fee, notice: parseNumber(r.ind_notice) === lesson.independentKey.notice };
  const independentCorrect = r.ind_start || r.ind_fee || r.ind_notice ? Object.values(indOk).every(Boolean) : null;
  if (!issues.some((i) => i.code === 'amendment_missed') && results.payment) strengths.push('You caught the amendment to the payment terms.');
  if (results.footnote) strengths.push('You found the obligation in the footnote.');
  if (promptScore === 3) strengths.push('Your instruction has a boundary, an example and a missing-field rule.');
  if (independentCorrect) strengths.push('Your independent extraction was correct, including the Schedule 1 fee.');
  let verification = correct === lesson.cells.length ? 3 : correct >= lesson.cells.length - 1 && results.payment && results.footnote ? 2 : correct >= lesson.cells.length / 2 ? 1 : 0;
  if (!results.payment || !results.footnote) verification = Math.min(verification, 1);
  if (independentCorrect === false) verification = Math.min(verification, 2);
  return { issues, strengths, evidenceChecks: [], metrics: { cellsCorrect: correct, cellsTotal: lesson.cells.length, promptFeatures: promptScore, independentCorrect },
    provisional: { verification: clampSupport(verification, ctx), instruction_quality: clampSupport(p.trim() ? promptScore : 0, ctx) } };
}

// ---- Module 6: claims against sources, plus a written brief -----------------

function evaluateClaims(lesson, r, ctx) {
  const issues = []; const strengths = [];
  const verdicts = r.verdicts || {};
  const checks = lesson.claims.map((c) => {
    const v = verdicts[c.key] || {};
    return { claim_key: c.key, verdict: v.verdict || '', source_ref: v.source || '', note: '', correct: v.verdict && c.expected.includes(v.verdict) ? 1 : 0 };
  });
  const unanswered = checks.filter((c) => !c.verdict).map((c) => c.claim_key);
  if (unanswered.length) issues.push({ code: 'unanswered', priority: 0, title: `Some claims have no verdict yet (${unanswered.join(', ')}).`, why: 'Each claim in the draft could end up in front of the director.', next: 'Give each claim a verdict and the report you used.' });
  for (const c of lesson.claims) {
    const chk = checks.find((x) => x.claim_key === c.key);
    if (chk.verdict && !chk.correct) issues.push({ ...c.issue });
  }
  const brief = r.brief_text || '';
  const sentences = brief.split(/(?<=[.!?])\s+/);
  if (!brief.trim()) issues.push({ code: 'no_brief', priority: 6, title: 'Write the brief.', why: 'The director needs a usable brief, not only a checked draft.', next: 'Write up to 250 words using only what the reports support.' });
  else {
    if (sentences.some((t) => has(t, 'turnover', '15%') && !has(t, 'no ', 'not ', 'none', 'removed'))) issues.push({ code: 'brief_unsupported', priority: 2, title: 'Your brief includes the turnover figure, which no report contains.', why: 'Unsourced figures shouldn\'t reach the reader.', next: 'Remove it.' });
    if (sentences.some((t) => has(t, 'productivity rose', 'productivity increased', 'more productive') && !has(t, 'said', 'report', 'felt', 'self', 'respond', 'survey'))) issues.push({ code: 'brief_productivity', priority: 2, title: 'Your brief presents self-reported productivity as a measured result.', why: 'Only R2 measured output, and it fell.', next: 'Attribute the 41% to what respondents said, and give the measured figure alongside.' });
    if (!has(brief, 'warehouse', 'new system', 'software')) issues.push({ code: 'brief_confounder_missing', priority: 3, title: 'Your brief leaves out why the 3% fall can\'t be blamed on hybrid working.', why: 'Without the warehouse-system caveat, the director will read the fall as caused by hybrid working.', next: 'Add the caveat from R2 in one sentence.' });
    if (!(has(brief, 'disagree', 'conflict', 'differ', 'however', 'but ', 'different story', 'contrast', 'whereas', 'while '))) issues.push({ code: 'brief_disagreement_hidden', priority: 4, title: 'Say that the sources disagree.', why: 'What staff said (R1) and what was measured (R2) point in different directions. Blending them hides the most important finding.', next: 'Set the two side by side and say they disagree.' });
    if (!has(brief, '12 manager', 'twelve manager', 'managers only', 'only manager', '12 team manager')) issues.push({ code: 'brief_weak_source', priority: 5, title: 'Mention how narrow the external review\'s evidence is.', why: 'R3 is based on 12 managers\' views; the director should know that before relying on it.', next: 'Add that detail where you mention R3.' });
    if (!has(brief, 'interpretation')) issues.push({ code: 'interpretation_unlabelled', priority: 7, title: 'Label your own judgement.', why: 'The director needs to see which parts are evidence and which are your reading of it.', next: 'Put your judgement after "Interpretation:".' });
    if (words(brief) > 250) issues.push({ code: 'too_long', priority: 8, title: `Your brief is ${words(brief)} words; the limit is 250.`, why: 'The director asked for a short brief.', next: 'Cut background and repetition; keep the findings, the caveats and your interpretation.' });
  }
  const independentCorrect = r.ind_report ? r.ind_report === 'R2' && has(r.ind_limit, 'warehouse', 'system', 'software', 'separate', 'confound', 'other cause') : null;
  const correct = checks.filter((c) => c.correct).length;
  const crit = lesson.claims.filter((c) => c.critical).every((c) => checks.find((x) => x.claim_key === c.key).correct);
  if (crit) strengths.push('You caught both the reversed productivity claim and the unsupported cause.');
  if (brief.trim() && !issues.some((i) => i.code.startsWith('brief_'))) strengths.push('Your brief keeps the caveats and reports the disagreement.');
  if (independentCorrect) strengths.push('You identified the measured evidence and its limitation without hints.');
  const briefIssues = issues.filter((i) => i.code.startsWith('brief_') || i.code === 'no_brief').length;
  let verification = unanswered.length || correct <= 1 ? 0 : !crit || briefIssues >= 2 ? 1 : correct < lesson.claims.length || briefIssues || independentCorrect === false ? 2 : 3;
  return { issues, strengths, evidenceChecks: checks, metrics: { claimsCorrect: correct, claimsTotal: lesson.claims.length, independentCorrect }, provisional: { verification: clampSupport(verification, ctx) } };
}

// ---- Module 7: workflow decisions, revised workflow and disclosure ---------

function evaluateDecisions(lesson, r, ctx) {
  const issues = []; const strengths = [];
  const d = r.decisions || {};
  let correct = 0; const thin = [];
  for (const it of lesson.items) {
    const x = d[it.key] || {};
    if (!x.decision) { issues.push({ code: `missing_${it.key}`, priority: 0, title: `Step ${it.key} has no decision yet.`, why: 'Each step raises a different policy question.', next: 'Choose keep, change or remove, and give your reason.' }); continue; }
    if (it.expected.includes(x.decision)) {
      correct++;
      if (words(x.reason) < 5 || !it.keywords.some((k) => has(x.reason, k))) thin.push(it.key);
    } else issues.push({ code: `wrong_${it.key}`, priority: it.critical ? 1 : 3, title: `Look again at step ${it.key}.`, why: it.why, next: 'Check the step against the policy clause it touches.' });
  }
  if (thin.length) issues.push({ code: 'reasons_thin', priority: 4, title: `Your reasons for ${thin.join(', ')} don't say what decides it.`, why: 'Naming the policy point is what lets you make the same call in a new situation.', next: 'Say which part of the policy (data, ownership, checking or disclosure) decides each one.' });
  const rev = r.revised || '';
  if (!rev.trim()) issues.push({ code: 'no_revised', priority: 5, title: 'Write the revised workflow.', why: 'Decisions only matter once they change what the group does.', next: 'Write the workflow as numbered steps.' });
  else if (has(rev, 'phone', 'student id', 'id number', 'marks') && !has(rev, 'no personal', 'without', 'remove', 'not ', 'never')) issues.push({ code: 'revised_keeps_data', priority: 2, title: 'Your revised workflow still sends personal data to an AI tool.', why: 'Phone numbers, ID numbers and marks are other students\' personal data (policy clause 2).', next: 'Take them out of any AI step.' });
  const disc = r.disclosure_text || '';
  const discParts = { tool: has(disc, 'university ai assistant', 'approved'), purpose: has(disc, 'timeline', 'bias', 'leading', 'wording', 'language', 'suggest'), checks: has(disc, 'check', 'verif', 'review'), own: has(disc, 'own', 'we wrote', 'our analysis', 'our conclusions', 'ourselves') };
  const missingParts = Object.entries(discParts).filter(([, v]) => !v).map(([k]) => ({ tool: 'which tool', purpose: 'what it was used for', checks: 'what you checked', own: 'what is your own work' }[k]));
  if (!disc.trim()) issues.push({ code: 'no_disclosure', priority: 5, title: 'Write the disclosure statement.', why: 'The policy requires it (clause 5).', next: 'State the tools, the purposes, what you checked and what is your own work.' });
  else if (missingParts.length) issues.push({ code: 'disclosure_incomplete', priority: 6, title: `Your disclosure doesn't say ${missingParts.join(', ')}.`, why: 'A disclosure someone could check against the record names the tool, the purpose, the checks and what is your own.', next: 'Add the missing parts in a sentence each.' });
  const ind = { decision: r.ind_decision, reason: r.ind_reason };
  const independentCorrect = ind.decision ? lesson.independentItem.expected.includes(ind.decision) && lesson.independentItem.keywords.some((k) => has(ind.reason, k)) : null;
  const critOk = lesson.items.filter((i) => i.critical).every((i) => i.expected.includes(d[i.key]?.decision));
  if (critOk) strengths.push('You caught all three serious problems: others\' data, others\' work and the missing disclosure.');
  if (disc.trim() && !missingParts.length) strengths.push('Your disclosure names the tool, purposes, checks and your own work.');
  if (independentCorrect) strengths.push('You handled the job-application scenario correctly without hints.');
  let responsible = !critOk ? (correct >= 4 ? 1 : 0) : issues.some((i) => ['no_revised', 'no_disclosure', 'revised_keeps_data'].includes(i.code)) ? 1 : issues.some((i) => ['disclosure_incomplete', 'reasons_thin'].includes(i.code)) || independentCorrect === false || correct < lesson.items.length ? 2 : 3;
  const tool = correct === lesson.items.length ? 3 : critOk ? 2 : correct >= 3 ? 1 : 0;
  return { issues, strengths, evidenceChecks: [], metrics: { decisionsCorrect: correct, decisionsTotal: lesson.items.length, independentCorrect }, provisional: { responsible_use: clampSupport(responsible, ctx), tool_selection: clampSupport(tool, ctx) } };
}

// ---- Module 8: independent application --------------------------------------

function numbersIn(text) {
  return [...String(text || '').matchAll(/£?\s?(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/g)].map((m) => Number(m[1].replace(/,/g, '')));
}

function evaluateCapstone(lesson, r, ctx) {
  const issues = []; const strengths = [];
  const required = [['plan', 'the plan'], ['tools', 'your tool choices'], ['checks', 'what you checked'], ['final_work', 'the final work'], ['explanation', 'the explanation']];
  const missing = required.filter(([k]) => !String(r[k] || '').trim()).map(([, l]) => l);
  if (missing.length) issues.push({ code: 'record_incomplete', priority: 0, title: `Still needed: ${missing.join(', ')}.`, why: 'In this module the record is part of the evidence: your educator assesses the decisions as well as the result.', next: 'Complete each part of the record.' });
  const criteria = String(r.plan || '').split('\n').map((l) => l.trim()).filter((l) => words(l) >= 4);
  if (r.plan && criteria.length < 3) issues.push({ code: 'plan_thin', priority: 2, title: 'Your plan needs checkable success criteria.', why: 'Criteria written before you start are what you judge the result against.', next: 'Add at least two criteria, one per line, that someone else could check.' });
  const final = r.final_work || '';
  const nums = numbersIn(`${final} ${r.checks}`);
  const hasA = nums.some((n) => Math.abs(n - 29) < 0.01);
  const hasB = nums.some((n) => n >= 99 && n <= 149) || nums.some((n) => Math.abs(n - 2.48) < 0.01);
  const extraOnly = nums.some((n) => (n >= 24 && n <= 25) || (n >= 49 && n <= 50)) && !nums.some((n) => n >= 99 && n <= 149);
  if (final.trim()) {
    if (extraOnly) issues.push({ code: 'fees_extra_only', priority: 1, title: 'Your Option B cost seems to cover only the extra orders.', why: 'The fact sheet says both services charge on all online orders, including existing customers who switch.', next: 'Recalculate Option B on all online orders, then compare with Option A.' });
    else if (!hasA || !hasB) issues.push({ code: 'comparison_missing', priority: 1, title: 'Show the cost comparison behind your recommendation.', why: 'Sam needs to see what each option would cost at realistic order numbers.', next: 'Give Option A\'s monthly cost and Option B\'s cost at the order numbers you think are realistic.' });
    if (!has(final, 'guess', 'uncertain', 'estimate', 'no data', 'assum', 'unknown', 'may not', 'might not', 'bonus')) issues.push({ code: 'uncertainty_missing', priority: 3, title: 'Say how uncertain the extra orders are.', why: 'The 10–20 extra orders are Sam\'s guess, with no data behind it.', next: 'Say so in one sentence, and base the recommendation on something that holds either way.' });
    if (words(final) > 200) issues.push({ code: 'final_too_long', priority: 5, title: `Your recommendation is ${words(final)} words; the limit is 200.`, why: 'Sam asked for a short recommendation.', next: 'Keep the decision, the key figures and the main caveat.' });
  }
  if (r.checks && !/\d/.test(r.checks)) issues.push({ code: 'checks_vague', priority: 4, title: 'Show the calculations you checked.', why: 'A check someone can repeat is evidence; "I checked it" is not.', next: 'Write out the key calculation.' });
  if (r.explanation && words(r.explanation) < 40) issues.push({ code: 'explanation_thin', priority: 6, title: 'Explain your decisions in more detail.', why: 'The explanation shows your reasoning, which the final work alone can\'t.', next: 'Cover what you decided, what you used AI for, what you checked and what you changed.' });
  if (r.explanation && words(r.explanation) > 150) issues.push({ code: 'explanation_too_long', priority: 7, title: `Your explanation is ${words(r.explanation)} words; the limit is 150.`, why: 'Concise is part of the task.', next: 'Keep the key decisions.' });
  if (hasA && hasB && !extraOnly) strengths.push('Your recommendation compares both options on all online orders.');
  if (criteria.length >= 3) strengths.push('Your plan sets out checkable criteria before the work.');
  const verification = missing.includes('what you checked') || missing.includes('the final work') ? 0 : issues.some((i) => ['fees_extra_only', 'comparison_missing'].includes(i.code)) ? 1 : issues.some((i) => ['uncertainty_missing', 'checks_vague'].includes(i.code)) ? 2 : 3;
  const taskDefinition = !r.plan ? 0 : criteria.length < 3 ? 1 : 3;
  return { issues, strengths, evidenceChecks: [], metrics: { comparisonCorrect: hasA && hasB && !extraOnly }, provisional: { task_definition: clampSupport(taskDefinition, ctx), verification: clampSupport(verification, ctx) } };
}
