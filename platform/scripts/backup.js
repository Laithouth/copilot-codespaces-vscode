// Consistent snapshot of the database using SQLite's VACUUM INTO.
// This is a manual command. Scheduled, encrypted, off-site backups with tested
// restores are still required before a pilot (see docs/10-feature-status.md).
import { mkdirSync } from 'node:fs';
import { openDb } from '../src/db.js';

const dir = process.env.BACKUP_DIR || 'data/backups';
mkdirSync(dir, { recursive: true });
const file = `${dir}/practicum-${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
openDb().exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
console.log(`Backup written to ${file}`);
