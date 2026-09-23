// Usage: npm run create-institution -- "Institution name" "Admin Name" admin@example.edu [--demo] [--platform-admin]
import { openDb, audit } from '../src/db.js';
import { createInstitution } from '../src/routes/admin.js';

const args = process.argv.slice(2);
const [name, adminName, adminEmail] = args.filter((a) => !a.startsWith('--'));
if (!name || !adminName || !adminEmail) {
  console.error('Usage: npm run create-institution -- "Institution name" "Admin Name" admin@example.edu [--demo] [--platform-admin]');
  process.exit(1);
}
const db = openDb();
const { instId, userId, invite } = createInstitution(db, { name, adminName, adminEmail, isDemo: args.includes('--demo') });
if (args.includes('--platform-admin')) db.prepare('UPDATE users SET is_platform_admin = 1 WHERE id = ?').run(userId);
audit(db, null, instId, 'institution_created_cli');
const base = process.env.PUBLIC_URL || 'http://localhost:3000';
console.log(`Created institution ${instId}.`);
console.log(invite ? `Invitation link for ${adminEmail} (valid 14 days): ${base}/invite/${invite}` : `${adminEmail} already has an account.`);
