/**
 * gen-icons.js — Render icons/icon.svg to PNG at each required size.
 *
 * Usage: npm run gen-icons
 *
 * Outputs normal and off-state icons:
 *   icons/icon-16.png
 *   icons/icon-48.png
 *   icons/icon-128.png
 *   icons/icon-300.png  (Edge Add-on store)
 *   icons/icon-off-16.png
 *   icons/icon-off-48.png
 *   icons/icon-off-128.png
 *   icons/icon-off-300.png
 */

import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const iconSources = [
  { input: 'icon.svg', output: 'icon' },
  { input: 'icon-off.svg', output: 'icon-off' },
];

for (const { input, output } of iconSources) {
  const svg = readFileSync(join(root, `icons/${input}`), 'utf8');

  for (const size of [16, 48, 128, 300]) {
    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
    const png   = resvg.render().asPng();
    writeFileSync(join(root, `icons/${output}-${size}.png`), png);
    console.log(`  icons/${output}-${size}.png`);
  }
}
