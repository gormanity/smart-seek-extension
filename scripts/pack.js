/**
 * pack.js — Produce distributable zip archives.
 *
 * Usage: node scripts/pack.js  (or via `npm run pack` which runs build first)
 *
 * Outputs:
 *   dist/smart-seek-chrome.zip   — For Chrome Web Store
 *   dist/smart-seek-firefox.zip  — For Firefox Add-ons (AMO)
 *
 * Both archives contain the same source; the manifest already includes
 * browser_specific_settings for Firefox (ignored by Chrome).
 */

import { execSync } from 'child_process';
import { mkdirSync, existsSync, rmSync } from 'fs';
import { join } from 'path';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');

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

zip('smart-seek-chrome.zip');
zip('smart-seek-firefox.zip');
