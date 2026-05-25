/**
 * Post-build script that writes a version.json file into the Angular
 * production output directory. The VersionCheckService polls this file
 * to detect new deployments.
 *
 * Usage: node scripts/generate-version.mjs
 */

import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

let buildId;
try {
  buildId = execSync('git rev-parse --short HEAD', { cwd: root })
    .toString()
    .trim();
} catch {
  // Fallback to timestamp if git is not available (e.g. in a Docker build
  // that does not copy .git).
  buildId = Date.now().toString();
}

const outPath = resolve(root, 'apps/web/dist/madcreate-web/browser/version.json');
const payload = JSON.stringify({ buildId }, null, 2) + '\n';

writeFileSync(outPath, payload, 'utf-8');
console.log(`version.json written to ${outPath} (buildId: ${buildId})`);
