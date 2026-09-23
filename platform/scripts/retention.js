import { openDb } from '../src/db.js';
import { applyRetention } from '../src/retention.js';

for (const r of applyRetention(openDb())) {
  console.log(`${r.institution}: deleted ${r.attempts} attempts, ${r.challenges} challenges, ${r.runs} model runs older than ${r.cutoff} UTC`);
}
