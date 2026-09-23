// Proposed rubric. Not yet calibrated with educators: every public surface that
// shows it must say so (see RUBRIC_STATUS).
export const RUBRIC_STATUS =
  'Proposed rubric, version 0.1. It has not yet been calibrated with educators or validated against student work. Pilot institutions will moderate it before it informs any grade.';

export const LEVELS = [
  { value: 0, short: 'Not yet', label: 'Not yet demonstrated' },
  { value: 1, short: 'Substantial support', label: 'Demonstrated with substantial support' },
  { value: 2, short: 'Limited support', label: 'Demonstrated with limited support' },
  { value: 3, short: 'Independent', label: 'Independently demonstrated' },
];

export const levelLabel = (v) => (v === null || v === undefined ? 'Not assessed' : LEVELS[v]?.label ?? 'Unknown');

// The seven observable competencies from the brief, grouped into six rubric
// criteria. `statements` lists which competency statements each criterion covers.
export const COMPETENCIES = [
  {
    code: 'task_definition',
    title: 'Task definition',
    summary: 'Defines the objective, inputs, constraints, audience and success criteria before using AI.',
    statements: ['Define objectives, inputs, constraints, and success criteria.'],
    levels: [
      'Starts without a stated objective, or the objective does not match the assignment.',
      'States an objective and some constraints after prompting from hints or feedback; success criteria are vague or missing.',
      'States objective, audience, inputs and constraints; at least two success criteria can be checked, with minor gaps.',
      'Without prompting, writes a complete brief whose success criteria are specific enough for someone else to check the result against.',
    ],
  },
  {
    code: 'tool_selection',
    title: 'Tool and approach selection',
    summary: 'Recognises when AI is appropriate, chooses a suitable tool or method, and breaks the task into steps.',
    statements: [
      'Recognize when AI is appropriate and when another method is better.',
      'Select tools and divide a task into manageable steps.',
    ],
    levels: [
      'Uses AI where the rules, data sensitivity or need for verified facts make it unsuitable, or cannot explain the choice.',
      'Makes a reasonable choice when the key consideration is pointed out; explanation names one factor.',
      'Makes appropriate choices in familiar cases and names the relevant factors (rules, information, checkability, value); misses an edge case.',
      'Makes and justifies appropriate choices in unfamiliar cases, including choosing a non-AI method where it is better, and sequences the work into checkable steps.',
    ],
  },
  {
    code: 'instruction_quality',
    title: 'Instruction quality',
    summary: 'Writes and revises instructions that give the model the context, inputs, constraints and output format the task needs.',
    statements: ['Construct and revise instructions suited to the task.'],
    levels: [
      'Instructions omit the task context, so the output cannot meet the assignment.',
      'Instructions include the main request and some context after hints; important constraints or inputs are missing.',
      'Instructions carry the objective, audience, key constraints and relevant inputs; the output format is mostly specified.',
      'Instructions are fitted to the task: they carry what the model needs and nothing that should not be shared, and length and structure serve the task rather than a template.',
    ],
    note: 'Prompt length, professional vocabulary or use of a template are not evidence for this criterion on their own.',
  },
  {
    code: 'verification',
    title: 'Verification',
    summary: 'Checks accuracy, sources, calculations, assumptions and omissions, and records the checks.',
    statements: ['Check accuracy, sources, calculations, assumptions, and omissions.'],
    levels: [
      'Accepts output without checking, or keeps a fabricated or contradicted claim in the final work.',
      'Checks some claims after hints; identifies obvious errors but misses unsupported claims or omissions.',
      'Checks most claims against sources and records evidence; catches fabricated references; misses one subtle issue (for example, an over-generalised survey).',
      'Systematically checks every consequential claim, calculation and omission, records the evidence, and states what remains uncertain.',
    ],
  },
  {
    code: 'revision',
    title: 'Revision',
    summary: 'Uses evaluation to make a targeted change and judges whether it helped.',
    statements: ['Construct and revise instructions suited to the task.', 'Check accuracy … and omissions (applied to a second attempt).'],
    levels: [
      'Does not revise, or resubmits without addressing the identified issue.',
      'Revises in response to specific feedback; the change addresses part of the issue.',
      'Makes a targeted revision that addresses the identified issue and explains the change.',
      'Identifies what to change from their own evaluation, changes one thing at a time, and uses evidence to judge whether it helped — including saying when it did not.',
    ],
  },
  {
    code: 'responsible_use',
    title: 'Responsible use and integration',
    summary: 'Follows assignment rules and data limits, keeps responsibility for the final work, and discloses AI use accurately.',
    statements: [
      'Integrate useful output while retaining responsibility for the final work.',
      'Explain AI use and follow the assignment\'s academic integrity rules.',
    ],
    levels: [
      'Breaks the assignment\'s AI rules or data limits, or submits AI output as own work without disclosure.',
      'Follows the rules when reminded; disclosure is present but incomplete.',
      'Follows the rules and data limits; disclosure states the tool, purpose and what was checked.',
      'Follows the rules unprompted, explains which parts are their own judgement, and writes a disclosure another reader could audit against the saved record.',
    ],
  },
];

export const competencyByCode = Object.fromEntries(COMPETENCIES.map((c) => [c.code, c]));

// Proposed alignment with UNESCO's AI Competency Framework for Students (2024):
// 12 competencies across four dimensions and three progression levels. Names
// follow the published framework; re-check them against the official PDF before
// each public revision. This is our reading, not UNESCO approval or certification.
export const UNESCO_ALIGNMENT = [
  { dimension: 'Human-centred mindset', level: 'Understand', competency: 'Human agency', coverage: 'partial', modules: [1, 7], note: 'Students decide when not to use AI and keep decisions their own. We do not teach the wider societal framing.' },
  { dimension: 'Human-centred mindset', level: 'Apply', competency: 'Human accountability', coverage: 'addressed', modules: [7, 8], note: 'Students retain responsibility for final work and disclose AI use.' },
  { dimension: 'Human-centred mindset', level: 'Create', competency: 'Citizenship in the era of AI', coverage: 'gap', modules: [], note: 'Not covered. The course focuses on academic and professional tasks.' },
  { dimension: 'Ethics of AI', level: 'Understand', competency: 'Embodied ethics', coverage: 'partial', modules: [7], note: 'Bias checks, ownership and privacy in coursework only.' },
  { dimension: 'Ethics of AI', level: 'Apply', competency: 'Safe and responsible use', coverage: 'addressed', modules: [1, 4, 7], note: 'Privacy decisions, approved data use, source verification.' },
  { dimension: 'Ethics of AI', level: 'Create', competency: 'Ethics by design', coverage: 'gap', modules: [], note: 'Not covered. Students do not design AI systems.' },
  { dimension: 'AI techniques and applications', level: 'Understand', competency: 'AI foundations', coverage: 'partial', modules: [1], note: 'Practical capabilities and limitations only; no technical explanation of how models are trained.' },
  { dimension: 'AI techniques and applications', level: 'Apply', competency: 'Application skills', coverage: 'addressed', modules: [2, 3, 4, 5, 6, 8], note: 'The core of the course.' },
  { dimension: 'AI techniques and applications', level: 'Create', competency: 'Creating AI tools', coverage: 'gap', modules: [], note: 'Not covered.' },
  { dimension: 'AI system design', level: 'Understand', competency: 'Problem scoping', coverage: 'partial', modules: [1, 2], note: 'Students scope tasks for AI assistance, not problems for AI system design.' },
  { dimension: 'AI system design', level: 'Apply', competency: 'Architecture design', coverage: 'gap', modules: [], note: 'Not covered.' },
  { dimension: 'AI system design', level: 'Create', competency: 'Iteration and feedback loops', coverage: 'partial', modules: [2, 8], note: 'Iterating on instructions and checks, not on AI systems.' },
];
