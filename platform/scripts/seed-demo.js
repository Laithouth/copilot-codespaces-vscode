// Creates the clearly labelled demonstration institution (see src/demo.js).
import { randomBytes } from 'node:crypto';
import { openDb } from '../src/db.js';
import { seedDemo, DEMO_PEOPLE, DEMO_INSTITUTION } from '../src/demo.js';

const password = process.env.DEMO_PASSWORD || randomBytes(9).toString('base64url');
const res = seedDemo(openDb(), { password });
if (!res) {
  console.log('Demo institution already exists. Delete the database file to reseed.');
  process.exit(0);
}
console.log(`Demo institution created: "${DEMO_INSTITUTION}".`);
console.log(`All demo accounts use the password: ${password}`);
for (const [name, email] of DEMO_PEOPLE) console.log(`  ${email}  (${name})`);
