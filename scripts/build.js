/**
 * build.js — Compile and bundle TypeScript source.
 *
 * Usage:
 *   node scripts/build.js          → production build to dist/{chrome,firefox}/
 *   node scripts/build.js --dev    → dev build to dist-dev/{chrome,firefox}/
 *
 * Each browser gets its own unpacked dir with a flavored manifest:
 *   chrome  — background.service_worker only (drops Firefox-only scripts)
 *   firefox — background.scripts only       (drops Chrome-only service_worker)
 *
 * Dev builds get a " (dev)" name suffix and a distinct gecko.id so they can
 * be loaded alongside the AMO release in Firefox.
 *
 * Entry points (built once per browser):
 *   src/content/seek-controller.ts   → <out>/content/seek-controller.js   (IIFE)
 *   src/background/service-worker.ts → <out>/background/service-worker.js (ESM)
 *   src/options/init.ts              → <out>/options/init.js              (ESM)
 *   src/popup/popup.ts               → <out>/popup/popup.js               (ESM, es2022 for TLA)
 */

import * as esbuild from 'esbuild';
import { copyFileSync, cpSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

const isDev = process.argv.includes('--dev');
const baseDir = isDev ? 'dist-dev' : 'dist';

const define = { __DEV__: isDev ? 'true' : 'false' };

const baseManifest = JSON.parse(readFileSync('manifest.json', 'utf8'));

const browsers = [
  {
    name: 'chrome',
    patchManifest: (m) => { delete m.background.scripts; },
  },
  {
    name: 'firefox',
    patchManifest: (m) => { delete m.background.service_worker; },
  },
];

for (const browser of browsers) {
  const outDir = `${baseDir}/${browser.name}`;

  mkdirSync(`${outDir}/content`,    { recursive: true });
  mkdirSync(`${outDir}/background`, { recursive: true });
  mkdirSync(`${outDir}/options`,    { recursive: true });
  mkdirSync(`${outDir}/popup`,      { recursive: true });

  await Promise.all([
    esbuild.build({
      entryPoints: ['src/content/seek-controller.ts'],
      bundle: true,
      format: 'iife',
      outfile: `${outDir}/content/seek-controller.js`,
      target: 'es2020',
      define,
      minifySyntax: true,
    }),
    esbuild.build({
      entryPoints: ['src/background/service-worker.ts'],
      bundle: true,
      format: 'esm',
      outfile: `${outDir}/background/service-worker.js`,
      target: 'es2020',
      define,
      minifySyntax: true,
    }),
    esbuild.build({
      entryPoints: ['src/options/init.ts'],
      bundle: true,
      format: 'esm',
      outfile: `${outDir}/options/init.js`,
      target: 'es2020',
      define,
      minifySyntax: true,
    }),
    esbuild.build({
      entryPoints: ['src/popup/popup.ts'],
      bundle: true,
      format: 'esm',
      outfile: `${outDir}/popup/popup.js`,
      target: 'es2022',
      define,
      minifySyntax: true,
    }),
  ]);

  // Static assets
  copyFileSync('src/content/seek-controller.css', `${outDir}/content/seek-controller.css`);
  copyFileSync('src/options/options.html',        `${outDir}/options/options.html`);
  copyFileSync('src/options/options.css',         `${outDir}/options/options.css`);
  copyFileSync('src/popup/popup.html',            `${outDir}/popup/popup.html`);
  copyFileSync('src/popup/popup.css',             `${outDir}/popup/popup.css`);
  cpSync('icons', `${outDir}/icons`, { recursive: true });

  const manifest = structuredClone(baseManifest);
  browser.patchManifest(manifest);
  if (isDev) {
    manifest.name = `${manifest.name} (dev)`;
    if (manifest.browser_specific_settings?.gecko?.id) {
      manifest.browser_specific_settings.gecko.id = 'smart-seek-dev@gormanity';
    }
  }
  writeFileSync(`${outDir}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
}

console.log(`Build complete (${isDev ? 'dev' : 'prod'} → ${baseDir}/{chrome,firefox}/).`);
