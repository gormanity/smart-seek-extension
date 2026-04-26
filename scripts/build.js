/**
 * build.js — Compile and bundle TypeScript source.
 *
 * Usage:
 *   node scripts/build.js          → production build to dist/
 *   node scripts/build.js --dev    → dev build to dist-dev/, with __DEV__=true
 *
 * Dev builds get a " (dev)" suffix on the manifest name and a distinct
 * gecko.id so they can be loaded alongside the AMO release in Firefox.
 *
 * Entry points:
 *   src/content/seek-controller.ts   → <out>/content/seek-controller.js   (IIFE)
 *   src/background/service-worker.ts → <out>/background/service-worker.js (ESM)
 *   src/options/init.ts              → <out>/options/init.js              (ESM)
 *   src/popup/popup.ts               → <out>/popup/popup.js               (ESM, es2022 for TLA)
 */

import * as esbuild from 'esbuild';
import { copyFileSync, cpSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

const isDev = process.argv.includes('--dev');
const outDir = isDev ? 'dist-dev' : 'dist';

const ensureDir = (dir) => mkdirSync(dir, { recursive: true });

ensureDir(`${outDir}/content`);
ensureDir(`${outDir}/background`);
ensureDir(`${outDir}/options`);
ensureDir(`${outDir}/popup`);

const define = { __DEV__: isDev ? 'true' : 'false' };

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

// Copy static assets
copyFileSync('src/content/seek-controller.css', `${outDir}/content/seek-controller.css`);
copyFileSync('src/options/options.html', `${outDir}/options/options.html`);
copyFileSync('src/options/options.css', `${outDir}/options/options.css`);
copyFileSync('src/popup/popup.html', `${outDir}/popup/popup.html`);
copyFileSync('src/popup/popup.css', `${outDir}/popup/popup.css`);

// Copy extension root files so the output is a self-contained unpacked extension.
// In dev mode the manifest is patched in-flight: name suffix + distinct gecko.id.
if (isDev) {
  const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
  manifest.name = `${manifest.name} (dev)`;
  if (manifest.browser_specific_settings?.gecko?.id) {
    manifest.browser_specific_settings.gecko.id = 'smart-seek-dev@gormanity';
  }
  writeFileSync(`${outDir}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
} else {
  copyFileSync('manifest.json', `${outDir}/manifest.json`);
}
cpSync('icons', `${outDir}/icons`, { recursive: true });

console.log(`Build complete (${isDev ? 'dev' : 'prod'} → ${outDir}/).`);
