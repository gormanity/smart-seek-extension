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
  const out = `${dir}/${name}.png`;
  execFileSync(CHROME, [
    '--headless=new',
    `--screenshot=${out}`,
    '--window-size=1280,870',   // 870 = 800 content + ~70px Chrome internal overhead
    '--force-device-scale-factor=1',
    '--no-sandbox',
    `file://${dir}/${name}.html`,
  ], { stdio: 'pipe' });
  // Crop to the intended 1280×800 — Chrome captures the full window including overhead
  execFileSync('magick', [out, '-crop', '1280x800+0+0', '+repage', out]);
  console.log(`${name}.png done`);
}
