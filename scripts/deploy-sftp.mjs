#!/usr/bin/env node
// Ship a built local directory to an SFTP host.
//
// Usage:
//   node scripts/deploy-sftp.mjs --target web
//   node scripts/deploy-sftp.mjs --target api
//
// Reads:
//   FRONTEND_SFTP_HOST/PORT/USER/PASS, FRONTEND_REMOTE_PATH    (target=web)
//   API_SFTP_HOST/PORT/USER/PASS,      API_REMOTE_PATH          (target=api)
//
// Assumes you've already run the corresponding build:
//   npm run build:web   → apps/web/dist/madcreate-web/browser
//   npm run build:api   → apps/api/dist + apps/api/node_modules (production)

import dotenv from 'dotenv';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import SftpClient from 'ssh2-sftp-client';

dotenv.config({ path: path.resolve('.deploy/.env.deploy') });

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, arg, i, all) => {
    if (arg.startsWith('--')) acc.push([arg.replace(/^--/, ''), all[i + 1]]);
    return acc;
  }, []),
);

const target = args.target;
if (!['web', 'api'].includes(target)) {
  console.error('Usage: node scripts/deploy-sftp.mjs --target <web|api>');
  process.exit(1);
}

const env = (k) => process.env[k];
const cfg = target === 'web'
  ? {
      host: env('FRONTEND_SFTP_HOST'),
      port: Number(env('FRONTEND_SFTP_PORT') ?? 22),
      user: env('FRONTEND_SFTP_USER'),
      pass: env('FRONTEND_SFTP_PASS'),
      remote: env('FRONTEND_REMOTE_PATH'),
      local: path.resolve('apps/web/dist/madcreate-web/browser'),
    }
  : {
      host: env('API_SFTP_HOST'),
      port: Number(env('API_SFTP_PORT') ?? 22),
      user: env('API_SFTP_USER'),
      pass: env('API_SFTP_PASS'),
      remote: env('API_REMOTE_PATH'),
      local: path.resolve('apps/api/dist'),
    };

for (const k of ['host', 'user', 'pass', 'remote']) {
  if (!cfg[k]) { console.error(`Missing env var for ${target} target: ${k}`); process.exit(1); }
}
try { await fs.access(cfg.local); }
catch { console.error(`Local build not found at ${cfg.local}. Run the build first.`); process.exit(1); }

const client = new SftpClient();
const startedAt = Date.now();

console.log(`→ Connecting to ${cfg.host}:${cfg.port} as ${cfg.user}…`);
await client.connect({
  host: cfg.host, port: cfg.port, username: cfg.user, password: cfg.pass, readyTimeout: 20_000,
});
console.log(`✓ Connected`);

await client.mkdir(cfg.remote, true).catch(() => undefined);

async function uploadDir(local, remote) {
  let files = 0, bytes = 0;
  for (const entry of await fs.readdir(local, { withFileTypes: true })) {
    const lp = path.join(local, entry.name);
    const rp = `${remote}/${entry.name}`;
    if (entry.isDirectory()) {
      await client.mkdir(rp, true).catch(() => undefined);
      const sub = await uploadDir(lp, rp);
      files += sub.files; bytes += sub.bytes;
    } else {
      const stat = await fs.stat(lp);
      await client.put(lp, rp);
      files += 1; bytes += stat.size;
      process.stdout.write(`\r  uploaded ${files} files (${(bytes / 1024).toFixed(0)} KB)`);
    }
  }
  return { files, bytes };
}

const { files, bytes } = await uploadDir(cfg.local, cfg.remote);
process.stdout.write('\n');
await client.end();

console.log(`✓ Done — ${files} files, ${(bytes / 1024 / 1024).toFixed(2)} MB → ${cfg.host}:${cfg.remote}`);
console.log(`  Elapsed: ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
