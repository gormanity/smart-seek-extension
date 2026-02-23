/**
 * gen-icons.js — Render icons/icon.svg to PNG at each required size.
 *
 * Usage: npm run gen-icons
 *
 * Outputs:
 *   icons/icon-16.png
 *   icons/icon-48.png
 *   icons/icon-128.png
 *   icons/icon-300.png  (Edge Add-on store)
 */

import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg  = readFileSync(join(root, 'icons/icon.svg'), 'utf8');

for (const size of [16, 48, 128, 300]) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  const png   = resvg.render().asPng();
  writeFileSync(join(root, `icons/icon-${size}.png`), png);
  console.log(`  icons/icon-${size}.png`);
}
