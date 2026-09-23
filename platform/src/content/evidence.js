// Evidence register. Every research statement on the public site comes from an
// entry here. `use` is the wording we allow ourselves; `doNotUse` records figures
// from the original synthesis that were wrong or could not be confirmed.
//
// Method (23 September 2026): key facts were checked against publisher abstracts,
// conference proceedings pages, indexing services and the publisher's press
// material as returned by web search. Full texts could not be retrieved from the
// build environment. Entries marked 'abstract-checked' must be re-read in full
// before any figure beyond those listed in `use` is published.

export const REVIEW_DATE = '23 September 2026';

export const STATUS = {
  'abstract-checked': 'Key facts checked against the abstract or publisher summary; full text not yet re-read',
  'partly-checked': 'Study details confirmed; reported figures not yet confirmed',
  unverified: 'Not verified; not used on the public site',
};

export const EVIDENCE = [
  {
    id: 'E1',
    short: 'The Prompt Report',
    citation: 'Schulhoff, S. et al. (2024). The Prompt Report: A Systematic Survey of Prompt Engineering Techniques. arXiv:2406.06608.',
    url: 'https://arxiv.org/abs/2406.06608',
    version: 'arXiv preprint, first posted June 2024; revised versions exist. Peer-review status not confirmed in this check.',
    population: 'Research literature (not people): a PRISMA-guided review of 1,565 papers, plus a small benchmark using GPT-3.5-turbo on MMLU.',
    design: 'Systematic literature review and taxonomy.',
    outcome: 'A vocabulary of 33 terms and a taxonomy of 58 text-based prompting techniques in six groups (plus 40 techniques for other modalities).',
    limitations: 'Describes techniques, not learners. The benchmark covers one older model and one dataset, so its rankings may not hold for current models or real tasks.',
    use: 'Prompting is better understood as a family of techniques suited to different tasks than as a single knack. A review of 1,565 papers catalogued 58 text-based techniques.',
    doNotUse: [
      'The attached synthesis cited this report as arXiv:2402.07927. That identifier belongs to a different paper; the correct identifier is 2406.06608.',
      '"Up to 90 percentage points" from prompt changes and "32 researchers from OpenAI, Google and Stanford": not confirmed in our check, so not published.',
    ],
    status: 'abstract-checked',
  },
  {
    id: 'E2',
    short: 'Prompt-format sensitivity',
    citation: 'Sclar, M., Choi, Y., Tsvetkov, Y. & Suhr, A. (2024). Quantifying Language Models\' Sensitivity to Spurious Features in Prompt Design. ICLR 2024.',
    url: 'https://openreview.net/pdf?id=RIu5lyNXjT',
    version: 'Peer-reviewed conference paper, ICLR 2024 (arXiv:2310.11324 is the preprint).',
    population: 'Several open-source language models (2023 generation) on few-shot classification-style tasks.',
    design: 'Controlled experiments varying only meaning-preserving prompt formatting (for example separators, spacing, casing).',
    outcome: 'Performance differed by up to 76 accuracy points across formats for LLaMA-2-13B. Sensitivity remained when model size, number of examples or instruction tuning increased.',
    limitations: 'Older models and structured few-shot tasks. It measures model behaviour, not human skill, and the size of the effect on current chat models for open-ended tasks is not established by this study.',
    use: 'Small formatting changes that keep meaning the same can change model accuracy substantially: in one peer-reviewed study, by up to 76 points for one open-source model. One good output is therefore weak evidence that a prompt is reliably better.',
    doNotUse: [
      'The synthesis dates this to 2023 and calls it a preprint; the peer-reviewed version appeared at ICLR 2024.',
      'GPT-3.5 median 6.4 / maximum 56 points and "average spread roughly 10 points": not confirmed in our check, so not published.',
    ],
    status: 'abstract-checked',
  },
  {
    id: 'E3',
    short: 'BCG consultant experiment (2024)',
    citation: 'BCG Henderson Institute (2024). GenAI Doesn\'t Just Increase Productivity. It Expands Capabilities. Boston Consulting Group, September 2024.',
    url: 'https://www.bcg.com/publications/2024/gen-ai-increases-productivity-and-expands-capabilities',
    version: 'Industry publication and press release, September 2024. Not a peer-reviewed article.',
    population: '480 BCG consultants who completed the study, with 44 BCG data scientists (working without AI) setting the benchmark.',
    design: 'Randomised: consultants were assigned to use or not use GenAI, each doing two of three 90-minute data-science tasks (data cleaning code, predictive modelling, checking statistical analyses).',
    outcome: 'Consultants using GenAI averaged 86% of the data-scientist benchmark, 49 percentage points above those without it (as reported by BCG). Consultants who had never coded reached 84% of the benchmark with GenAI.',
    limitations: 'One firm, short tasks, authored by the firm. It measures performance while AI is available, not learning. It says nothing about the effect of prompt instruction.',
    use: 'In a randomised BCG experiment with 480 consultants, those given GenAI performed much closer to a data-scientist benchmark on unfamiliar tasks than those without it. This shows what AI access can do during a task, not that anyone learned the skill.',
    doNotUse: [
      'Do not attribute the 758-consultant sample to this study. That figure belongs to an earlier, different BCG/Harvard experiment.',
      'The claim that gains were not retained without AI, the quotation "doing with GenAI does not immediately nor inherently mean learning to do", "15 points more likely to choose the right method" and "10% faster": not confirmed in our check. Re-read the full report before using any of them.',
    ],
    status: 'partly-checked',
  },
  {
    id: 'E4',
    short: 'Generative AI at Work',
    citation: 'Brynjolfsson, E., Li, D. & Raymond, L. (2025). Generative AI at Work. Quarterly Journal of Economics, 140(2), 889–942.',
    url: 'https://academic.oup.com/qje/article/140/2/889/7990658',
    version: 'Peer-reviewed journal article, 2025. An earlier NBER working paper (No. 31161, 2023) reported different estimates; they are not interchangeable.',
    population: '5,172 customer-support agents at one software company.',
    design: 'Staggered introduction of an AI conversational assistant (natural experiment).',
    outcome: 'Issues resolved per hour rose by 15% on average (published estimate). Less experienced and lower-skilled workers improved in speed and quality; the most experienced and highest-skilled saw small speed gains and small quality declines.',
    limitations: 'One firm and one occupation. The assistant was built into the workflow, so this is evidence about AI assistance, not about teaching people to prompt.',
    use: 'In a peer-reviewed study of 5,172 support agents, AI assistance raised productivity by 15% on average, with gains concentrated among less experienced and lower-skilled workers.',
    doNotUse: [
      'The synthesis cites the 2023 working paper and its 14% / 13.8% / 35% figures. Use the published 2025 estimates, and label any working-paper figure as such.',
    ],
    status: 'abstract-checked',
  },
  {
    id: 'E5',
    short: 'Prompt-engineering clinic, pre-post pilot',
    citation: 'Brief Prompt-Engineering Clinic Substantially Improves AI Literacy and Reduces Technology Anxiety in First-Year Teacher-Education Students: A Pre–Post Pilot Study. Education Sciences, 15(8), 1010 (2025).',
    url: 'https://www.mdpi.com/2227-7102/15/8/1010',
    version: 'Peer-reviewed journal article, August 2025.',
    population: '45 first-year teacher-education students in Peru.',
    design: 'Single-group pre–post pilot of a three-session clinic, no comparison group. Validated Spanish 12-item AI-literacy and technology-anxiety scales; paired t-tests.',
    outcome: 'The authors report a large increase in self-reported AI literacy and a reduction in technology anxiety.',
    limitations: 'No control group, one site, small sample, short follow-up. The scales measure self-reported literacy and anxiety, not task performance or transfer.',
    use: 'A small pre–post pilot (45 students, no control group) reported higher self-reported AI literacy after three sessions of prompt instruction. It is encouraging but cannot show lasting skill or transfer.',
    doNotUse: [
      'Specific means, effect sizes and correlations quoted in the synthesis (2.85 to 3.55, d = 0.91, and others): not yet confirmed against the full text.',
    ],
    status: 'partly-checked',
  },
  {
    id: 'E6',
    short: 'AI user survey (arXiv:2507.18638)',
    citation: 'Prompt Engineering and the Effectiveness of Large Language Models in Enhancing Human Productivity. arXiv:2507.18638.',
    url: 'https://arxiv.org/abs/2507.18638',
    version: 'Preprint. The synthesis dates it 2026; the identifier indicates first submission in July 2025.',
    population: 'Reported as 243 self-selected professional and student AI users.',
    design: 'Cross-sectional self-report survey.',
    outcome: 'Not checked.',
    limitations: 'Self-selected sample and self-reported outcomes.',
    use: null,
    doNotUse: ['All figures (83.7%, 75.7%, 55%, 3.24/5): not verified. Not used.'],
    status: 'unverified',
  },
  {
    id: 'E7',
    short: 'UNESCO AI Competency Framework for Students',
    citation: 'UNESCO (2024). AI competency framework for students.',
    url: 'https://www.unesco.org/en/articles/ai-competency-framework-students',
    version: 'Published 2024.',
    population: 'Framework document, not a study.',
    design: '12 competencies across four dimensions (human-centred mindset, ethics of AI, AI techniques and applications, AI system design) and three progression levels (understand, apply, create).',
    outcome: 'Used as a reference for our proposed curriculum alignment.',
    limitations: 'Designed mainly for school curricula; our alignment is our own reading.',
    use: 'We map our modules to parts of UNESCO\'s framework as a proposed alignment. It is not UNESCO approval or certification.',
    doNotUse: [],
    status: 'abstract-checked',
  },
];

// Policy context: kept apart from research findings. Re-check official sources
// before publishing and before any sales conversation that relies on it.
export const POLICY = [
  {
    title: 'EU AI Act, Article 4 (AI literacy)',
    text: 'Article 4 has applied since 2 February 2025 to providers and deployers of AI systems. Secondary legal sources report that Regulation (EU) 2026/1744 (the "Digital Omnibus on AI"), published on 24 July 2026 and in force from 27 July 2026, replaced Article 4 so that providers and deployers must "take measures to support the development of AI literacy" of their staff, without having to guarantee a specific level for any individual. The same sources report that supervision by national authorities began on 2 August 2026.',
    status: 'Checked against secondary legal commentary only. Confirm the text on EUR-Lex before relying on it.',
    caution: 'Article 4 concerns staff and people operating AI systems on an organisation\'s behalf. A student course or certificate does not by itself satisfy any institution\'s legal duties.',
    url: 'https://digital-strategy.ec.europa.eu/en/faqs/ai-literacy-questions-answers',
  },
];
