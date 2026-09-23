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
  const fn = { evidence: evaluateEvidence, suitability: evaluateSuitability, brief: evaluateBrief, numbers: evaluateNumbers }[lesson.type];
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
