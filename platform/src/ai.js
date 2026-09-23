// Replaceable model adapter. One provider (Anthropic) is wired up; the rest of
// the app only sees run() results. Every call is recorded in model_runs with the
// requested and served model, so lessons can be re-run when the provider changes.
import Anthropic from '@anthropic-ai/sdk';

export const DEFAULT_MODEL = process.env.AI_MODEL || 'claude-opus-5';
const MAX_OUTPUT_TOKENS = 2000;

const providers = {
  anthropic: {
    label: 'Anthropic (Claude)',
    configured: () => Boolean(process.env.ANTHROPIC_API_KEY),
    async run({ model, system, prompt }) {
      const client = new Anthropic({ timeout: 60_000, maxRetries: 1 });
      const res = await client.beta.messages.create({
        model,
        max_tokens: MAX_OUTPUT_TOKENS,
        output_config: { effort: 'low' },
        // If the model declines, the API re-runs the request on Anthropic's
        // recommended fallback model; the served model is recorded either way.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system,
        messages: [{ role: 'user', content: prompt }],
      });
      if (res.stop_reason === 'refusal') {
        return { status: 'refused', servedModel: res.model, error: 'The model declined this request.', usage: res.usage };
      }
      const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      return { status: 'ok', output: text, servedModel: res.model, usage: res.usage };
    },
  },
};

// Tests swap in a fake provider here; production never does.
export function registerProvider(name, impl) { providers[name] = impl; }

export function providerLabel(name) { return providers[name]?.label || 'None'; }

export function providerAvailability(institution) {
  if (!institution || institution.approved_provider === 'none') return { ok: false, reason: 'Your institution has not approved an AI provider for this platform.' };
  const p = providers[institution.approved_provider];
  if (!p) return { ok: false, reason: 'The approved AI provider is not supported by this server.' };
  if (!p.configured()) return { ok: false, reason: 'The AI provider is not configured on this server (no credentials), so no output can be generated here.' };
  if (institution.monthly_model_run_cap <= 0) return { ok: false, reason: 'Model runs are switched off for your institution (monthly limit is 0).' };
  return { ok: true };
}

export function monthlyUsage(db, institutionId) {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM model_runs WHERE institution_id = ? AND source = 'platform'
    AND status = 'ok' AND created_at >= datetime('now', 'start of month')`).get(institutionId);
  return row.n;
}

export function budgetState(db, institution) {
  const used = monthlyUsage(db, institution.id);
  const cap = institution.monthly_model_run_cap;
  const percent = cap > 0 ? Math.round((used / cap) * 100) : 0;
  return { used, cap, percent, alert: cap > 0 && percent >= institution.budget_alert_percent, exhausted: cap > 0 && used >= cap };
}

// Runs a prompt for a student attempt. Always writes a model_runs row, including
// for refusals, budget stops and failures, and never throws for provider errors.
export async function runForAttempt(db, { institution, attemptId, aiPolicy, prompt, system, purpose }) {
  const model = institution.approved_model || DEFAULT_MODEL;
  const record = (status, extra = {}) => {
    const info = db.prepare(`INSERT INTO model_runs (institution_id, attempt_id, source, provider, requested_model, served_model, settings, prompt, output, status, error, input_tokens, output_tokens)
      VALUES (?, ?, 'platform', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      institution.id, attemptId, institution.approved_provider, model, extra.servedModel ?? null,
      JSON.stringify({ purpose, max_tokens: MAX_OUTPUT_TOKENS, effort: 'low' }), prompt, extra.output ?? null, status, extra.error ?? null,
      extra.usage?.input_tokens ?? null, extra.usage?.output_tokens ?? null);
    return { id: Number(info.lastInsertRowid), status, ...extra };
  };

  if (aiPolicy === 'prohibited') return record('not_permitted', { error: 'AI use is not permitted for this assignment.' });
  if (!String(prompt || '').trim()) return record('error', { error: 'The prompt is empty.' });
  const avail = providerAvailability(institution);
  if (!avail.ok) return record('unavailable', { error: avail.reason });
  if (budgetState(db, institution).exhausted) {
    return record('budget_exceeded', { error: 'Your institution has reached its monthly model-run limit. Ask your educator; the limit resets at the start of next month.' });
  }
  try {
    const res = await providers[institution.approved_provider].run({ model, system, prompt });
    return record(res.status, res);
  } catch (err) {
    const status = err?.status ? ` (HTTP ${err.status})` : '';
    return record('error', { error: `The AI provider could not complete the request${status}. Your work is saved; try again later.` });
  }
}
