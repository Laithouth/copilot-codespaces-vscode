# 7. Pricing and commercial sustainability

No revenue forecasts, conversion rates or willingness-to-pay figures are assumed. Public pricing says **"Request a quote"** until prices and costs are validated.

## Offer

1. **Fixed-scope paid pilot** (6–8 weeks, one department). The scope, deliverables (including the pilot report), learner numbers and AI allowance are fixed in advance.
2. **Annual licence** after a pilot that met its agreed success criteria:
   - **Department licence**: one department, defined learner numbers and allowance.
   - **Institution licence**: multiple departments, central administration, and integrations once they are built and tested with the institution's systems.
3. **Individual access** is not offered now.

**Included in every paid plan:** basic accessibility, privacy protections, tenant isolation, backups and deletion, and student data export. These are not upsells.

## Pricing drivers

| Driver | Why it affects cost |
|---|---|
| Learner count | Hosting, support load, and model usage all scale with learners |
| Included model usage | The main variable cost; set as a monthly run allowance per institution |
| Instructor tools and courses | Onboarding and support effort |
| Onboarding | Staff time per institution and per educator group |
| Integrations (SSO, LMS) | Build, testing and maintenance per platform |
| Support | Hours, response times, named contacts |
| Optional customisation | Discipline-specific tasks and materials |

## Cost model

Per institution per year:

```
total_cost = inference + hosting + support + curriculum_maintenance + onboarding

inference              = Σ_runs (input_tokens × input_price + output_tokens × output_price)
                       ≈ active_learners × runs_per_learner × cost_per_run
hosting                = (server + database + backups + monitoring) × share for this institution
support                = support_hours × loaded_hourly_cost
curriculum_maintenance = (content review hours per year × cost) ÷ number of licensed institutions
onboarding             = (admin setup + educator sessions) × hours × cost   (mostly year one)

cost_per_active_learner = total_cost ÷ learners with at least one submission
```

Every model run stores `input_tokens` and `output_tokens`, so inference cost can be measured, not estimated, once a pilot runs.

### Illustrative inference estimate (not validated)

Measured from the built lessons:

- **Module 4 rewrite prompt:** about 2,700 characters including sources and the system instruction, roughly **700 input tokens**.
- **Module 2 prompt:** about 700 characters plus pasted client notes (about 700 characters), roughly **350–400 input tokens**.
- **Output** is capped at 2,000 tokens per run. With low effort, a typical answer of 300–600 tokens is assumed, including any thinking tokens. **This needs measuring.**

At the list price for the default model setting (`claude-opus-5`, US$5 per million input tokens and US$25 per million output tokens, from Anthropic's published price table as cached on 24 June 2026; **re-check current pricing before quoting**):

| Case | Input | Output | Cost per run |
|---|---|---|---|
| Typical (assumed) | 700 tokens | 600 tokens | ≈ US$0.019 |
| Worst case (output cap reached) | 700 tokens | 2,000 tokens | ≈ US$0.054 |

With the three built modules, a learner might make roughly 3–8 runs (two in Module 2 and one to three in Module 4, plus retries). That is roughly **US$0.06–0.43 per learner** in inference at list price. These are planning figures only; the institution can choose a cheaper model through the "Approved model" setting, and actual costs come from the `model_runs` table.

Hosting, support, maintenance and onboarding are **not estimated here**. They depend on the hosting choice and staffing, and must be filled in from real quotes before pricing.

## How usage caps prevent unexpected spend

- Each institution has a **monthly model-run limit** (default 0, meaning off) and an **alert threshold** (default 80%). Administrators see usage against the limit and a status label.
- When the limit is reached, the server refuses further runs, records each refused request as `budget_exceeded`, and shows students a clear message. Lessons stay completable without the live AI step.
- Every run has a fixed maximum output (2,000 tokens) and uses low effort by default.
- Only successful runs count toward the limit. Refusals, errors and unavailable-provider attempts are recorded but not counted.
- *Known limitation:* the limit is a run count, not a currency amount. Two simultaneous requests at the boundary could exceed it by one. A spending-based limit and provider-side spend caps are planned.

## Sustainability principles

- Unlimited AI usage is not assumed to be affordable. Every plan has an allowance.
- The course works without live AI (the evidence lesson uses supplied material; the brief lesson accepts recorded output). An outage or a spent budget therefore does not stop teaching.
- Test willingness to pay through buyer conversations and the decision to fund a paid pilot, and record the results. Don't infer it from surveys.
