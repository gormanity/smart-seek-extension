/**
 * pack.js — Produce distributable zip archives.
 *
 * Usage: node scripts/pack.js  (or via `npm run pack` which runs build first)
 *
 * Outputs:
 *   dist/smart-seek-{version}-chrome.zip   — For Chrome Web Store
 *   dist/smart-seek-{version}-firefox.zip  — For Firefox Add-ons (AMO)
 *
 * Both archives contain the same source; the manifest already includes
 * browser_specific_settings for Firefox (ignored by Chrome).
 */

import { execSync } from 'child_process';
import { mkdirSync, existsSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

if (!existsSync(dist)) mkdirSync(dist);

// Remove macOS metadata files that macOS silently drops into directories.
execSync('find . -name ".DS_Store" -delete', { cwd: dist });

function zip(name) {
  const out = join(dist, name);
  // Remove stale archive so zip always creates a fresh file (not an update).
  if (existsSync(out)) rmSync(out);
  execSync(`zip -r "${out}" . -x "*.zip"`, { cwd: dist, stdio: 'inherit' });
  console.log(`Created ${out}`);
}

zip(`smart-seek-${version}-chrome.zip`);
zip(`smart-seek-${version}-edge.zip`);
zip(`smart-seek-${version}-firefox.zip`);
