/**
 * pack.js — Produce distributable zip archives.
 *
 * Usage: node scripts/pack.js
 *
 * Outputs:
 *   dist/yttv-seek-chrome.zip   — For Chrome Web Store
 *   dist/yttv-seek-firefox.zip  — For Firefox Add-ons (AMO)
 *
 * Both archives contain the same source; the manifest already includes
 * browser_specific_settings for Firefox (ignored by Chrome).
 */

import { execSync } from 'child_process';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const root  = new URL('..', import.meta.url).pathname;
const dist  = join(root, 'dist');

if (!existsSync(dist)) mkdirSync(dist);

const include = [
  'src/',
  'icons/',
  'LICENSE',
].join(' ');

function zip(name) {
  const out = join(dist, name);
  execSync(`zip -r "${out}" ${include}`, { cwd: root, stdio: 'inherit' });
  console.log(`Created ${out}`);
}

zip('yttv-seek-chrome.zip');
zip('yttv-seek-firefox.zip');
