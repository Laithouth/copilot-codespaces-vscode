// Builds the deliverables for a customer or reseller:
//   dist/<name>-<version>-source.zip   the platform source, ready for `docker build` or `npm ci && npm start`
//   dist/prototype/ and dist/prototype.zip   the clickable prototype (via export:prototype)
import { readFileSync, rmSync, mkdirSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const name = `${pkg.name}-${pkg.version}`;
const stage = join(ROOT, 'dist', name);
rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });
for (const p of ['src', 'public', 'scripts', 'test', 'docs', 'package.json', 'package-lock.json', 'README.md', 'Dockerfile', '.dockerignore', '.gitignore']) {
  cpSync(join(ROOT, p), join(stage, p), { recursive: true });
}
execFileSync('python3', ['-c', 'import shutil,sys; shutil.make_archive(sys.argv[1], "zip", sys.argv[2], sys.argv[3])', join(ROOT, 'dist', `${name}-source`), join(ROOT, 'dist'), name]);
rmSync(stage, { recursive: true, force: true });
execFileSync(process.execPath, ['--disable-warning=ExperimentalWarning', join(ROOT, 'scripts', 'export-prototype.js')], { stdio: 'inherit' });
console.log(`Release built: dist/${name}-source.zip and dist/prototype.zip`);
