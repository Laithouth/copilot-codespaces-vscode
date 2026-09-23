// Modules 3, 6, 7 and 8. These use the generic form format: `form` describes
// the student's fields, the views render and parse it, and each lesson type has
// its own rule-based evaluator in src/feedback.js. All organisations, people,
// figures and documents are fictional teaching material.

const VERDICTS = [
  ['supported', 'Supported by a report'],
  ['partly_supported', 'Partly supported or overstated'],
  ['contradicted', 'Contradicted by a report'],
  ['not_in_sources', 'Not found in the reports'],
];

// ---------------------------------------------------------------- Module 3
export const extraction = {
  slug: 'examples-and-structured-outputs',
  type: 'extraction',
  module: 3,
  title: 'Examples and structured outputs',
  version: '0.1 (September 2026)',
  minutes: '60–90',
  competencies: ['instruction_quality', 'verification'],
  summary: 'Get information out of a document into a table: mark where the document starts and ends, show one example row, say what to do when a field is missing, and check every cell.',
  intro: [
    'Asking for a table makes output easier to check. It does not make it more likely to be right. A neatly formatted table can still take a value from the wrong clause or miss something in a footnote.',
    'Three things improve extraction instructions: a clear boundary around the document, a short example of the output you want, and an instruction for fields that aren\'t there. Then every cell still needs checking against the source.',
  ],
  checklist: [
    ['Boundary', 'Put the document inside clear markers (for example <document> … </document>) so instructions and content can\'t be confused.'],
    ['Example', 'Show one row in the exact format you want.'],
    ['Missing fields', 'Say what to write when something isn\'t in the document ("not stated"), so the model doesn\'t guess.'],
    ['Check', 'Compare every cell with the clause it came from, and note the clause.'],
  ],
  workedExample: {
    title: 'Worked example: three fields from an invoice',
    scenario: 'An event invoice (fictional) says "Invoice date: 3 May 2026" at the top and "Payment due 14 days from invoice" at the bottom, with a handwritten note: "Agreed: 21 days".',
    steps: [
      'Instruction: "Extract the invoice date, payment period and total from the document between <document> tags. Use this format: Invoice date | Payment period (days) | Total (£). If a field isn\'t stated, write \'not stated\'."',
      'The first answer says payment period: 14. Checking it against the document finds the handwritten note, which changes it to 21.',
      'Record the check: "Payment period: 21 days (handwritten amendment overrides the printed 14)."',
    ],
  },
  brief: 'Your placement manager at Crumb & Co (a fictional bakery) needs the key terms of a new flour supply agreement in a table for the finance system. Extract each field, say where in the agreement you found it, and write the extraction instruction you would give an AI so a colleague could reuse it on similar agreements.',
  materials: [
    { id: 'A', title: 'Document A: Flour supply agreement (fictional)', body: '1. Parties. This agreement is between Northmill Flour Ltd ("the Supplier") and Crumb & Co ("the Buyer").\n\n2. Term. The agreement starts on the first day of March two thousand and twenty-six (the "Start Date") and runs for twelve months from the Start Date.\n\n3. Delivery. The Supplier will deliver the Buyer\'s weekly order by 7:00 each Monday.*\n\n4. Payment. The Buyer will pay each invoice within 30 days of the invoice date.\n\n5. Volume changes. The Buyer will give at least 14 days\' written notice of any change to the weekly order volume.\n\n9. Amendments. With effect from the Start Date, clause 4 is amended: the Buyer will pay each invoice within 45 days of the invoice date.\n\n* Each delivery must include the allergen certificate for that batch.' },
  ],
  cells: [
    { key: 'supplier', label: 'Supplier', accept: ['northmill'] },
    { key: 'buyer', label: 'Buyer', accept: ['crumb'] },
    { key: 'start', label: 'Start date', date: '2026-03-01' },
    { key: 'end', label: 'End date (last day)', date: ['2027-02-28', '2027-03-01'] },
    { key: 'payment', label: 'Payment terms (days)', number: 45 },
    { key: 'delivery', label: 'Delivery obligation', all: [['monday'], ['7']] },
    { key: 'notice', label: 'Volume-change notice', all: [['14']] },
    { key: 'footnote', label: 'Other supplier obligation', all: [['allergen']] },
  ],
  form: [
    { legend: 'Step 1. Extract each field and say where it came from', hint: 'Write dates as, for example, 1 March 2026. Leave "Other supplier obligation" as "not stated" if you find none.', fields: [{ kind: 'cells' }] },
    { legend: 'Step 2. Write the extraction instruction', hint: 'Write the instruction you would give an AI to fill this table from any similar agreement. It should work without you watching it.', fields: [{ kind: 'textarea', name: 'prompt', label: 'Your extraction instruction', rows: 7 }] },
    { legend: 'Step 3. Compare with the AI (optional if AI is not permitted)', fields: [{ kind: 'textarea', name: 'comparison', label: 'Which cells, if any, did the AI get wrong, and why?', rows: 3 }] },
    { legend: 'Step 4. Independent check (no hints)', hint: 'Document B (fictional cleaning contract): "Services begin on the fifteenth of January 2026. The monthly fee is £1,200 (see Schedule 1). Either party may end this contract with 30 days\' notice. Schedule 1: from the start of the contract the monthly fee is £1,350."', fields: [
      { kind: 'text', name: 'ind_start', label: 'Start date' },
      { kind: 'text', name: 'ind_fee', label: 'Monthly fee (£)', decimal: true },
      { kind: 'text', name: 'ind_notice', label: 'Notice period (days)', decimal: true },
    ] },
  ],
  independentKey: { start: '2026-01-15', fee: 1350, notice: 30 },
  aiStep: { action: 'run_extract', button: 'Run your instruction on Document A', purpose: 'extraction', promptField: 'prompt', attach: 'materials', reviewNote: 'Your instruction from Step 2 is sent with Document A attached. Compare the result with your own table in Step 3.' },
  hints: [
    'Read the whole document, including the last clauses and any footnotes, before filling any cell.',
    'Does any later clause change an earlier one?',
    'A good instruction says what to do when a field is missing. Does yours?',
  ],
  modelSystemPrompt: 'You are assisting a university student on a teaching exercise about extracting information from documents. Follow the student\'s instruction. Use only the document provided.',
  exampleResponse: {
    cells: {
      supplier: ['Northmill Flour Ltd', 'Clause 1'], buyer: ['Crumb & Co', 'Clause 1'], start: ['1 March 2026', 'Clause 2 (date written in words)'],
      end: ['28 February 2027', 'Clause 2: twelve months from the Start Date'], payment: ['45', 'Clause 9 amends clause 4 (30 days)'],
      delivery: ['Weekly order delivered by 7:00 each Monday', 'Clause 3'], notice: ['14 days\' written notice of volume changes', 'Clause 5'],
      footnote: ['Allergen certificate with each delivery', 'Footnote to clause 3'],
    },
    prompt: 'Extract the key terms from the agreement between the <document> tags into one table with these columns: Field | Value | Clause. Fields: Supplier, Buyer, Start date (DD Month YYYY), End date (last day of the term), Payment terms (days), Delivery obligation, Volume-change notice, Other supplier obligations. Read the whole document, including amendments and footnotes; if a later clause changes an earlier one, use the later clause and name both. If a field is not in the document, write "not stated". Example row: Payment terms (days) | 60 | Clause 7. <document>[agreement text]</document>',
    comparison: 'The AI gave payment terms as 30 days from clause 4 and missed the amendment in clause 9. It also left out the allergen footnote. Everything else matched.',
    independent: 'Start 15 January 2026; fee £1,350 (Schedule 1 overrides £1,200); notice 30 days.',
  },
  commonMistakes: [
    'Taking payment terms from clause 4 and missing the amendment in clause 9.',
    'Missing the obligation in the footnote.',
    'Working out the end date as 1 March 2027 without deciding whether "twelve months from" includes that day. Either is accepted if you say which.',
    'Instructions with no rule for missing fields, so the model fills gaps with guesses.',
    'Checking the table\'s format instead of each value.',
  ],
  accessibility: 'Documents are plain text with numbered clauses, so screen-reader users can move clause by clause. Each cell is a labelled text field; no drag-and-drop or table editing is needed. Nothing is timed. Alternatively, a student can read the values aloud to the educator, who records them.',
  instructorNotes: [
    'Two traps carry the lesson: the amendment in clause 9 and the footnote obligation. The automated feedback prioritises them.',
    'End date: 28 February 2027 and 1 March 2027 are both accepted. Discuss why contracts often define this explicitly.',
    'The instruction is assessed on three features that transfer: a document boundary, an example row and a missing-field rule. Length is not rewarded.',
    'If AI is permitted, most models miss at least one of the two traps. Let students discover that by comparing, rather than telling them in advance.',
  ],
};

// ---------------------------------------------------------------- Module 6
export const research = {
  slug: 'research-and-communication',
  type: 'claims',
  module: 6,
  title: 'Research and communication',
  version: '0.1 (September 2026)',
  minutes: '60–90',
  competencies: ['verification', 'instruction_quality', 'responsible_use'],
  summary: 'Turn several sources into a short brief for a non-specialist without losing caveats, averaging away disagreement or passing off interpretation as evidence.',
  intro: [
    'Summaries drift. Caveats disappear, a survey of respondents becomes "staff", a correlation becomes a cause, and two sources that disagree get blended into one smooth sentence. AI summaries are especially fluent at this.',
    'A faithful brief keeps what each source actually found, says where sources disagree, names the weakest evidence, and marks your own interpretation as interpretation.',
  ],
  checklist: [
    ['Faithful', 'Every figure and finding matches its source, including who was measured and how.'],
    ['Disagreement', 'Where sources disagree, say so. Don\'t average them.'],
    ['Strength', 'Say which evidence is strongest and weakest, and why.'],
    ['Interpretation', 'Label your own judgement as interpretation, separate from the evidence.'],
  ],
  workedExample: {
    title: 'Worked example: one sentence, two summaries',
    scenario: 'A source says: "In our pilot, 3 of 5 teams (60%) reported faster handovers; handover times were not measured."',
    steps: [
      'Drifted summary: "The pilot made handovers 60% faster." The 60% was a share of teams, and nothing was measured.',
      'Faithful summary: "Three of five pilot teams said handovers felt faster; no times were measured."',
      'For a non-specialist, the faithful version is just as short. Plain language does not require losing the caveat.',
    ],
  },
  brief: 'The operations director of Tallis Logistics (a fictional company) has asked for a brief of no more than 250 words on whether to keep hybrid working. An AI assistant drafted a summary of the three reports below. Check each claim in the draft, then write your own brief for the director. Label your own judgement with "Interpretation:".',
  materials: [
    { id: 'R1', title: 'Report R1: Staff survey, June 2025 (fictional)', body: 'The survey was sent to all 1,050 staff; 412 responded (39%). Respondents chose whether to take part.\n\nOf respondents, 68% preferred two to three office days a week, 22% preferred working fully remotely and 10% preferred full-time office working.\n\n41% of respondents said their own productivity had improved under hybrid working. Productivity was not measured in this survey.' },
    { id: 'R2', title: 'Report R2: Operations data, Q2 2024 vs Q2 2025 (fictional)', body: 'Orders processed per staff hour fell from 21.4 in Q2 2024 (full office working) to 20.8 in Q2 2025 (hybrid working), a fall of about 3%.\n\nA new warehouse management system went live in February 2025. Processing slowed for about six weeks while staff learned it. This report does not separate the effect of the new system from the effect of hybrid working.' },
    { id: 'R3', title: 'Report R3: External review by Brightline Advisory, August 2025 (fictional)', body: 'Based on interviews with 12 team managers, the review recommends three fixed office days a week to improve coordination.\n\nStaff below manager level were not interviewed.' },
  ],
  aiDraft: {
    intro: 'AI-style summary (intentionally flawed teaching material)',
    opening: 'Summary of the evidence on hybrid working at Tallis Logistics:',
  },
  claims: [
    { key: 'K1', text: 'Most staff prefer hybrid working, with 68% favouring two to three office days.', expected: ['partly_supported'], near: ['supported'], source: 'R1', explain: '68% of the 39% who responded, not of all staff; respondents chose to take part.', issue: { code: 'survey_generalised', priority: 3, title: 'Claim K1 turns survey respondents into "most staff".', why: 'Only 39% of staff responded, and they chose to. The 68% describes respondents, not the workforce.', next: 'Say "68% of the 412 staff who responded", and note that they chose to respond.' } },
    { key: 'K2', text: 'Productivity rose under hybrid working, with 41% reporting improvement.', expected: ['contradicted'], near: ['partly_supported'], source: 'R2', explain: 'R1 recorded self-reported improvement only; R2\'s measured output per hour fell about 3%.', issue: { code: 'productivity_misstated', priority: 1, title: 'Claim K2 says productivity rose, but the measured data says otherwise.', why: 'The 41% is self-reported. The only measured figure (R2) shows output per hour fell about 3%. Presenting the self-report as the result reverses the evidence.', next: 'Report both: what staff said (R1) and what was measured (R2), and say they disagree.' }, critical: true },
    { key: 'K3', text: 'Orders processed per staff hour fell by 3%, showing that hybrid working reduced efficiency.', expected: ['partly_supported'], near: ['contradicted'], source: 'R2', explain: 'The 3% fall is reported, but R2 says the new warehouse system may explain it; the cause is not established.', issue: { code: 'cause_asserted', priority: 2, title: 'Claim K3 blames hybrid working for a fall the report says it can\'t explain.', why: 'R2 notes a new warehouse system went live in the same period and slowed processing. The report does not separate the two causes.', next: 'Report the 3% fall with the warehouse-system caveat, without saying what caused it.' }, critical: true },
    { key: 'K4', text: 'An independent review recommends three fixed office days a week.', expected: ['supported', 'partly_supported'], source: 'R3', explain: 'R3 does recommend this, though it rests on 12 managers\' views only.', issue: { code: 'review_misread', priority: 5, title: 'Look again at claim K4.', why: 'R3 does make this recommendation. The weakness is its evidence base, which belongs in your brief rather than in the verdict.', next: 'Mark what R3 says, and note in your brief that it is based on 12 managers.' } },
    { key: 'K5', text: 'Hybrid working has been shown to reduce staff turnover by 15%.', expected: ['not_in_sources'], source: '', explain: 'None of the reports mentions turnover.', issue: { code: 'unsupported_accepted', priority: 4, title: 'Claim K5 isn\'t in any of the reports.', why: 'A figure with no source in front of you shouldn\'t reach the director, however plausible it sounds.', next: 'Search the three reports for turnover. If it isn\'t there, leave it out.' } },
  ],
  form: [
    { legend: 'Step 1. Check each claim in the AI draft', hint: 'Choose a verdict and the report you used.', fields: [{ kind: 'claims', verdicts: VERDICTS }] },
    { legend: 'Step 2. Write the brief (250 words or fewer)', hint: 'For the operations director: plain language, faithful to the reports. Put your own judgement after "Interpretation:".', fields: [{ kind: 'textarea', name: 'brief_text', label: 'Your brief to the operations director', rows: 11 }] },
    { legend: 'Step 3. Independent check (no hints)', fields: [
      { kind: 'select', name: 'ind_report', label: 'Which report gives the only measured (not self-reported) evidence about productivity?', options: [['R1', 'R1'], ['R2', 'R2'], ['R3', 'R3']] },
      { kind: 'text', name: 'ind_limit', label: 'What is its main limitation?' },
    ] },
  ],
  aiStep: { action: 'run_brief', button: 'Ask the AI to draft the brief (reports attached)', purpose: 'draft brief', promptLabel: 'Your instruction to the AI', promptHelp: 'For example: draft a 250-word brief for a non-specialist director, keep each report\'s caveats, and say where reports disagree. The reports are attached automatically.', reviewLabel: 'Check the AI\'s draft against the reports: what did it get wrong or leave out?', attach: 'materials' },
  hints: [
    'For each figure, ask who was counted and how: all staff, or respondents? Measured, or self-reported?',
    'Two reports talk about productivity. Do they agree?',
    'Is there anything in R2 that could explain the fall other than hybrid working?',
  ],
  modelSystemPrompt: 'You are assisting a university student on a teaching exercise about summarising sources faithfully. Use only the reports provided. Keep each report\'s caveats. Do not add figures that are not in the reports.',
  exampleResponse: {
    brief_text: 'The evidence does not settle whether hybrid working helps or harms Tallis Logistics, and the sources disagree. Staff who answered the June survey (412 of 1,050, 39%) mostly preferred two to three office days (68% of respondents), and 41% felt more productive (R1). Measured output tells a different story: orders processed per staff hour fell about 3% between Q2 2024 and Q2 2025 (R2). However, a new warehouse system went live in February 2025 and slowed work for about six weeks, so the fall cannot be attributed to hybrid working. An external review recommends three fixed office days, but it is based only on interviews with 12 managers (R3).\n\nInterpretation: the strongest evidence (R2) is confounded and the rest reflects opinions. Before deciding, compare output per hour for Q3 and Q4 2025, once the warehouse system has settled, and survey staff below manager level about coordination.',
    ind: 'R2. It cannot separate the effect of hybrid working from the new warehouse system introduced in the same period.',
  },
  commonMistakes: [
    'Repeating "41% more productive" as if productivity was measured.',
    'Blaming hybrid working for the 3% fall and missing the warehouse system.',
    'Turning "68% of respondents" into "most staff".',
    'Averaging the sources into a neat conclusion instead of reporting that they disagree.',
    'Treating a 12-manager review as evidence of what staff want.',
  ],
  accessibility: 'Reports are short plain-text documents with headings. Verdicts are labelled radio buttons, and the brief is a text field; speech input can be enabled by the institution. Nothing is timed. Alternatively, the brief can be delivered as a two-minute spoken explanation recorded by the educator.',
  instructorNotes: [
    'K2 and K3 are the most consequential: one reverses the measured evidence and the other asserts a cause the source says it can\'t establish.',
    'K4 accepts "supported" or "partly supported". The point is to discuss R3\'s narrow evidence base in the brief, not to reject its recommendation.',
    'Ask students to highlight each sentence of their brief as evidence or interpretation. Drift becomes visible quickly.',
    'If AI is permitted, compare the AI draft with the students\' briefs in class. Most AI drafts smooth over the disagreement between R1 and R2.',
  ],
};

// ---------------------------------------------------------------- Module 7
export const workflows = {
  slug: 'responsible-workflows',
  type: 'decisions',
  module: 7,
  title: 'Responsible workflows',
  version: '0.1 (September 2026)',
  minutes: '60–75',
  competencies: ['responsible_use', 'tool_selection'],
  summary: 'Review a group project workflow against a university AI policy: what information may go where, whose work it is, what must be checked, and how to disclose AI use accurately.',
  intro: [
    'Most problems with AI in coursework are not about the AI. They are about other people\'s information, other people\'s work, unchecked output, and not saying what you did.',
    'A responsible workflow uses approved tools for approved purposes, keeps other people\'s personal data and work out of places they didn\'t agree to, checks what comes back, and ends with a disclosure someone could check against what happened.',
  ],
  checklist: [
    ['Data', 'Whose information is this, and is this tool approved for it?'],
    ['Ownership', 'Is this someone else\'s work? Do they know and agree?'],
    ['Checking', 'What could be wrong in the output, and how will you check it?'],
    ['Disclosure', 'Could a reader match your disclosure to what you actually did?'],
  ],
  workedExample: {
    title: 'Worked example: one step, made responsible',
    scenario: 'Original step: "Paste our interview notes (with participants\' names) into a free chatbot to find themes."',
    steps: [
      'Data: participants\' names are personal data, and the free chatbot is not approved for it. The step needs to change.',
      'Revised step: "Replace names with codes (P1–P6), then use the University AI Assistant to suggest themes. We check each theme against the notes."',
      'Disclosure line: "We used the University AI Assistant to suggest themes from anonymised notes and checked each against the original notes."',
    ],
  },
  brief: 'A classmate, Alex (fictional), has written the workflow below for your group\'s market research project. Review it against the university\'s AI policy excerpt. For each step, decide whether to keep it, change it or remove it, and say why. Then write the revised workflow and the AI-use disclosure your group would submit.',
  materials: [
    { id: 'P', title: 'University AI policy excerpt (fictional)', body: '1. Approved tool. Students may use the University AI Assistant for coursework where the assignment permits AI. Other AI tools may be used only with public or your own non-personal information.\n\n2. Other people\'s information. Do not put anyone else\'s personal data (names, contact details, ID numbers, grades) into any AI tool except the University AI Assistant, and there only where necessary.\n\n3. Other people\'s work. Do not submit AI-altered versions of another student\'s work without their knowledge and agreement.\n\n4. Checking. You are responsible for the accuracy of anything you submit, including references.\n\n5. Disclosure. State which AI tools you used, for what, and what you checked.' },
  ],
  items: [
    { key: 'W1', text: 'Copy the group\'s contact list (names, phone numbers, student ID numbers) and everyone\'s marks from the last assignment into a free public chatbot to "work out who should do what".', expected: ['remove', 'change'], keywords: ['personal', 'phone', 'id', 'marks', 'grade', 'data', 'approved', 'policy', 'privacy', 'clause 2'], critical: true, why: 'Other students\' personal data and grades would go into an unapproved tool (policy clause 2).' },
    { key: 'W2', text: 'Use the University AI Assistant to suggest a project timeline from the assignment brief.', expected: ['keep'], keywords: ['approved', 'brief', 'no personal', 'timeline', 'allowed', 'permitted'], why: 'An approved tool, no personal data, and the group can judge the timeline.' },
    { key: 'W3', text: 'Paste a teammate\'s draft section into the chatbot and ask it to rewrite it in "better English", then swap it in without telling them.', expected: ['change', 'remove'], keywords: ['consent', 'agree', 'permission', 'ask', 'tell', 'their work', 'ownership', 'teammate', 'clause 3'], critical: true, why: 'It is the teammate\'s work; changing it with AI requires their knowledge and agreement (clause 3).' },
    { key: 'W4', text: 'Use the chatbot to generate the reference list for the report.', expected: ['change', 'remove'], keywords: ['check', 'verify', 'exist', 'real', 'library', 'database', 'fabricat', 'invent', 'clause 4'], why: 'AI can invent references. Every reference must be found and checked (clause 4).' },
    { key: 'W5', text: 'Ask the University AI Assistant whether any of our survey questions are leading or biased, then review its suggestions together.', expected: ['keep'], keywords: ['bias', 'review', 'check', 'approved', 'together', 'judge'], why: 'An approved tool for a useful check, with the group making the decisions.' },
    { key: 'W6', text: 'Submit the report without mentioning AI, because "everyone uses it".', expected: ['change'], keywords: ['disclos', 'declare', 'state', 'policy', 'clause 5', 'honest', 'integrity'], critical: true, why: 'The policy requires a disclosure of tools, purposes and checks (clause 5).' },
  ],
  form: [
    { legend: 'Step 1. Decide for each step of Alex\'s workflow', hint: 'Keep, change or remove, and say which part of the policy decides it.', fields: [{ kind: 'decisions', options: [['keep', 'Keep'], ['change', 'Change'], ['remove', 'Remove']] }] },
    { legend: 'Step 2. Write the revised workflow', fields: [{ kind: 'textarea', name: 'revised', label: 'Your group\'s revised workflow (numbered steps)', rows: 8 }] },
    { legend: 'Step 3. Write the AI-use disclosure', hint: 'The statement your group would submit with the report.', fields: [{ kind: 'textarea', name: 'disclosure_text', label: 'Disclosure statement', rows: 4 }] },
    { legend: 'Step 4. Independent scenario (no hints)', hint: 'A friend asks you to use a free chatbot to improve their job application letter. The letter includes their home address, phone number and date of birth.', fields: [
      { kind: 'radio', name: 'ind_decision', label: 'What do you do?', options: [['keep', 'Use it as asked'], ['change', 'Use it with changes'], ['remove', 'Don\'t use AI for this']] },
      { kind: 'text', name: 'ind_reason', label: 'Why, and what would you change?' },
    ] },
  ],
  independentItem: { expected: ['change', 'remove'], keywords: ['remove', 'address', 'phone', 'birth', 'personal', 'consent', 'permission', 'their', 'approved'] },
  hints: [
    'Read policy clause 2 and look for anyone else\'s personal information in the workflow.',
    'Whose work is being changed in step W3, and do they know?',
    'Which step would produce something that looks right but might not exist?',
  ],
  exampleResponse: {
    decisions: {
      W1: ['remove', 'Other students\' phone numbers, ID numbers and marks are personal data and can\'t go into an unapproved tool (clause 2). We can agree roles in a meeting instead.'],
      W2: ['keep', 'Approved tool, only the assignment brief, and we can judge the timeline ourselves.'],
      W3: ['change', 'It\'s our teammate\'s work (clause 3). Ask them first; if they agree, they can use the University AI Assistant on their own section.'],
      W4: ['change', 'AI can invent references (clause 4). Find sources in the library database and check each reference exists before listing it.'],
      W5: ['keep', 'Approved tool for a bias check, and the group reviews and decides.'],
      W6: ['change', 'The policy requires disclosure (clause 5). We add a statement of tools, purposes and checks.'],
    },
    revised: '1. Agree roles in a group meeting (no AI).\n2. Use the University AI Assistant to suggest a timeline from the assignment brief; adjust it together.\n3. Each member drafts their own section. Anyone who wants language help uses the University AI Assistant on their own section only.\n4. Find sources in the library database; check every reference exists and supports the point made.\n5. Use the University AI Assistant to check survey questions for leading wording; decide changes as a group.\n6. Submit with the disclosure below.',
    disclosure_text: 'We used the University AI Assistant to suggest a project timeline from the assignment brief and to flag possibly leading survey questions; we reviewed and decided all changes as a group. Two members used it to improve the wording of their own sections. No personal data was entered. All references were found in the library database and checked by us. The analysis and conclusions are our own.',
    ind: 'Use it with changes: remove the address, phone number and date of birth first (or ask my friend to do it), and check they are happy for their letter to go into an AI tool.',
  },
  commonMistakes: [
    'Changing W1 to "use initials" but keeping phone numbers or marks.',
    'Keeping W3 because the result would be "better English". Ownership, not quality, decides it.',
    'Keeping W4 and trusting the references.',
    'Disclosures that just say "we used AI".',
  ],
  accessibility: 'The workflow and policy are numbered plain text. Decisions are labelled radio buttons with a text reason; the revised workflow and disclosure are text fields. Nothing is timed. Alternatively, a group can talk through the six steps with the educator, who records the decisions.',
  instructorNotes: [
    'W1, W3 and W6 are critical, one each for data, ownership and disclosure. The automated feedback puts them first.',
    'W1 accepts "remove" or "change" as long as the personal data is gone. Discuss why "use initials" alone isn\'t enough when phone numbers and marks remain.',
    'The disclosure is checked for tool, purpose, checks and a statement of what is the group\'s own work. Compare it with the revised workflow: they should match.',
    'Connect this to your institution\'s real policy. The platform shows your institution\'s data rule on every workspace.',
  ],
};

// ---------------------------------------------------------------- Module 8
export const capstone = {
  slug: 'independent-application',
  type: 'capstone',
  module: 8,
  title: 'Independent application',
  version: '0.1 (September 2026)',
  minutes: '90–120',
  competencies: ['task_definition', 'tool_selection', 'instruction_quality', 'verification', 'revision', 'responsible_use'],
  summary: 'Complete an unfamiliar task from start to finish with approved AI tools and no coaching. Show your plan, prompts, checks and revisions, and explain your decisions.',
  intro: [
    'This is where the method has to work without the scaffolding. There are no hints and no worked example of this task, and your educator assesses all six criteria.',
    'Use the whole method: define the task, choose tools, instruct, check, revise and explain. Keep the record as you go; it is part of the assessment.',
  ],
  checklist: [
    ['Define', 'Objective, reader, constraints and checkable success criteria.'],
    ['Choose', 'Which parts suit AI, which don\'t, and which tool is approved.'],
    ['Instruct and check', 'Record your prompts and every check you make.'],
    ['Explain', 'Say what you decided and why, briefly.'],
  ],
  workedExample: {
    title: 'How this module works',
    scenario: 'Your educator may replace the task below with one from your own discipline. The steps stay the same.',
    steps: [
      'Plan: write the objective and your success criteria before using any tool.',
      'Work: use approved AI where it helps, and record each prompt and what you checked.',
      'Deliver: submit the final work, then a short explanation of your key decisions.',
    ],
  },
  brief: 'Crumb & Co (the fictional bakery from Module 2) is thinking of taking cake orders through an online ordering service. Using the fact sheet, write a recommendation of no more than 200 words for Sam, the owner: which option, if any, should they choose, and why?',
  materials: [
    { id: 'F', title: 'Fact sheet (fictional)', body: 'Current celebration cake orders: about 40 a month, average order £38.\n\nSam\'s guess: an online ordering page might bring 10–20 extra orders a month. There is no data behind this guess.\n\nOption A (ShopFront): £29 a month, no charge per order.\n\nOption B (OrderEasy): no monthly fee; 6% of each order plus £0.20 per order.\n\nBoth services take all online orders, including existing customers who switch to ordering online.\n\nSam can spend about one hour a week managing the page.' },
  ],
  form: [
    { legend: 'Step 1. Plan', fields: [
      { kind: 'textarea', name: 'plan', label: 'Objective, reader, constraints and success criteria (one criterion per line)', rows: 5 },
      { kind: 'textarea', name: 'tools', label: 'Which parts will you use AI for, which not, and why?', rows: 3 },
    ] },
    { legend: 'Step 2. Work record', hint: 'AI runs and output recorded from other approved tools are saved automatically below.', fields: [
      { kind: 'textarea', name: 'prompts', label: 'Prompts you used (or "none")', rows: 4 },
      { kind: 'textarea', name: 'checks', label: 'What you checked, and how (include any calculations)', rows: 5 },
      { kind: 'textarea', name: 'revisions', label: 'What you changed after checking, and why', rows: 3 },
    ] },
    { legend: 'Step 3. Final work (200 words or fewer)', fields: [{ kind: 'textarea', name: 'final_work', label: 'Your recommendation to Sam', rows: 9 }] },
    { legend: 'Step 4. Explain your decisions (150 words or fewer)', fields: [{ kind: 'textarea', name: 'explanation', label: 'Your key decisions and why', rows: 5 }] },
  ],
  aiStep: { action: 'run_capstone', button: 'Send to the AI (fact sheet attached)', purpose: 'capstone', promptLabel: 'Your prompt', promptHelp: 'Write whatever instruction you judge useful. The fact sheet is attached automatically.', reviewLabel: 'What did you check in the AI\'s output, and what did you find?', attach: 'materials' },
  hints: [],
  modelSystemPrompt: 'You are assisting a university student on an assessed task. Follow the student\'s instruction. Use only the information the student provides; if something is not provided, say so rather than inventing it.',
  exampleResponse: {
    plan: 'Objective: recommend whether Crumb & Co should use Option A, Option B or neither.\nReader: Sam, the owner; not a specialist; about one hour a week to spare.\nSuccess criteria:\nCompares the monthly cost of A and B at realistic order numbers.\nStates that the extra orders are a guess.\n200 words or fewer.',
    tools: 'AI to sanity-check my cost comparison and to tighten the wording. Not for the numbers themselves: I calculate those in a spreadsheet so I can check them.',
    prompts: '"Here is a fact sheet [attached]. Check my calculation: Option B costs 6% of £38 plus £0.20 = £2.48 per order. At 40 to 60 orders, that is £99 to £149 a month, against £29 for Option A. Is anything wrong or missing?"',
    checks: 'Per order under B: 0.06 × £38 = £2.28, plus £0.20 = £2.48. At 40 orders: £99.20; at 50: £124; at 60: £148.80. Option A: £29 at any volume. Break-even: £29 ÷ £2.48 ≈ 12 orders. The AI agreed with the arithmetic but assumed only the extra orders would go through B; the fact sheet says existing customers would too, so I kept the full volume.',
    revisions: 'I changed my draft from "B is cheaper to start" to "A is cheaper above about 12 online orders a month", after working out the break-even.',
    final_work: 'Choose Option A (ShopFront), if you go ahead. Option B charges £2.48 on an average £38 order. Once your existing customers order through the page as well, that is about £99 a month at today\'s 40 orders, and £124–£149 at 50–60 orders. Option A costs £29 a month whatever the volume. It becomes the cheaper option above about 12 online orders a month.\n\nThe extra 10–20 orders are a guess with no data behind them, so treat any growth as a bonus rather than the reason to start. A three-month trial of Option A costs £87. Check it against actual online orders and the hour a week it takes to manage.',
    explanation: 'I defined success as a cost comparison Sam could act on, and I didn\'t rely on the growth guess. I did the arithmetic myself and used AI only to check it. The AI missed that existing customers would also pay B\'s fees, which is what makes A cheaper. I added the break-even point because it holds whatever the real order numbers turn out to be.',
  },
  commonMistakes: [
    'Comparing Option A\'s monthly fee with Option B\'s fee on the extra orders only.',
    'Treating the 10–20 extra orders as a forecast.',
    'Letting AI do the calculation and not checking it.',
    'An explanation that repeats the recommendation instead of the decisions behind it.',
  ],
  accessibility: 'The fact sheet is short plain text, and every part of the record is a labelled text field; speech input can be enabled. Extended time can be arranged, since the lesson is not timed. The explanation can be given orally to the educator instead of in writing.',
  instructorNotes: [
    'Set this lesson in assessment mode. It is the main evidence of independent use on a new task. Replace the task with a discipline-specific one using "Additional instructions for students" if you prefer; the record structure stays the same.',
    'Key figures: Option B costs £2.48 per order, so £99.20 at 40 orders, £124 at 50 and £148.80 at 60; Option A costs £29. Break-even is about 12 orders.',
    'The trap is counting only the extra orders under Option B. The fact sheet says all online orders are charged.',
    'Automated checks confirm completeness, the key figures, word limits and that the uncertainty is stated. They suggest levels only for task definition and verification. You assess all six criteria.',
  ],
};
