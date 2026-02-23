/**
 * screenshots.mjs — Render store screenshot HTML mockups to PNG.
 *
 * Usage: node scripts/screenshots.mjs
 *
 * Requires: Google Chrome installed at the default macOS path.
 * Outputs 1280×800 PNGs to store/screenshots/.
 */

import { execFileSync } from 'child_process';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const dir = resolve(fileURLToPath(import.meta.url), '../../store/screenshots');
const files = ['01-osd', '02-popup', '03-options'];

for (const name of files) {
  execFileSync(CHROME, [
    '--headless=new',
    `--screenshot=${dir}/${name}.png`,
    '--window-size=1280,870',   // 870 = 800 visible + ~70px browser chrome overhead
    '--force-device-scale-factor=1',
    '--no-sandbox',
    `file://${dir}/${name}.html`,
  ], { stdio: 'pipe' });
  console.log(`${name}.png done`);
}
