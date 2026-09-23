// Regenerates docs/08-evidence-register.md from src/content/evidence.js, the
// same source the Research page uses, so the two cannot drift apart.
import { writeFileSync } from 'node:fs';
import { EVIDENCE, POLICY, STATUS, REVIEW_DATE } from '../src/content/evidence.js';

const cell = (s) => String(s ?? '—').replace(/\|/g, '\\|').replace(/\n/g, ' ');
let md = `# 8. Evidence register

*Generated from \`src/content/evidence.js\` by \`npm run docs:evidence\`. Do not edit by hand.*

Last review: **${REVIEW_DATE}**. Method: key facts were checked against publisher abstracts, conference proceedings pages, indexing services and publisher press material, as returned by web search. Full texts could not be retrieved from the build environment. Only the wording in "Claim we may make" is used on the public site. Figures listed under "Not used" came from the original research synthesis and were wrong or could not be confirmed.

**Rules.** (1) Third-party research explains why the product is worth testing; it is never evidence that *our* platform works. (2) Workplace gains from AI access do not show that prompt instruction caused them. (3) Short, uncontrolled classroom studies do not show lasting transfer. (4) No extreme benchmark gaps, survey percentages or selected-task results become marketing promises. (5) Legal information is kept separate and rechecked before publication.

## Summary

| ID | Source | Status |
|---|---|---|
${EVIDENCE.map((e) => `| ${e.id} | ${cell(e.short)} | ${cell(STATUS[e.status])} |`).join('\n')}

`;
for (const e of EVIDENCE) {
  md += `## ${e.id}. ${e.short}

| Field | Entry |
|---|---|
| Claim we may make | ${cell(e.use || 'None: not used on the site.')} |
| Source | [${cell(e.citation)}](${e.url}) |
| Publication version | ${cell(e.version)} |
| Population | ${cell(e.population)} |
| Study design | ${cell(e.design)} |
| Measured outcome | ${cell(e.outcome)} |
| Limitations | ${cell(e.limitations)} |
| Verification status | ${cell(STATUS[e.status])} |
| Last review | ${REVIEW_DATE} |

${e.doNotUse.length ? `**Not used / corrections:**\n\n${e.doNotUse.map((d) => `- ${d}`).join('\n')}\n` : ''}
`;
}
md += `## Policy context (kept separate from research)

${POLICY.map((p) => `### ${p.title}\n\n${p.text}\n\n- **Status:** ${p.status}\n- **Caution:** ${p.caution}\n- **Reference:** ${p.url}\n`).join('\n')}
The original synthesis also cited news reports of AI requirements at Purdue University, Indiana University, Ohio State University (AI Fluency) and the SUNY system. These were **not verified** in this review and are not used on the site. Check the institutions' own pages (for example https://oaa.osu.edu/ai-fluency) before citing them.

## Our own results

None yet. See [06-pilot-plan.md](06-pilot-plan.md) for how results will be produced and reported.
`;
writeFileSync(new URL('../docs/08-evidence-register.md', import.meta.url), md);
console.log('Wrote docs/08-evidence-register.md');
