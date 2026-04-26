/**
 * pack.js — Produce distributable zip archives.
 *
 * Usage: node scripts/pack.js  (or via `npm run pack` which runs build first)
 *
 * Reads from per-browser unpacked dirs produced by build.js:
 *   dist/chrome/   → smart-seek-{version}-chrome.zip
 *                  → smart-seek-{version}-edge.zip
 *   dist/firefox/  → smart-seek-{version}-firefox.zip
 *
 * Manifests are already flavored at build time, so this script only zips.
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

if (!existsSync(dist)) mkdirSync(dist);

function zip(name, sourceDir) {
  // Remove macOS metadata files that can sneak in.
  execSync('find . -name ".DS_Store" -delete', { cwd: sourceDir });
  const out = join(dist, name);
  if (existsSync(out)) rmSync(out);
  execSync(`zip -r "${out}" . -x "*.zip"`, { cwd: sourceDir, stdio: 'inherit' });
  console.log(`Created ${out}`);
}

zip(`smart-seek-${version}-chrome.zip`,  join(dist, 'chrome'));
zip(`smart-seek-${version}-edge.zip`,    join(dist, 'chrome'));
zip(`smart-seek-${version}-firefox.zip`, join(dist, 'firefox'));
