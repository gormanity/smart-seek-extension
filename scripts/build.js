/**
 * build.js — Compile and bundle TypeScript source.
 *
 * Usage:
 *   node scripts/build.js          → local production build to dist/{chrome,firefox}/
 *   node scripts/build.js --store  → store production build to dist/{chrome,firefox}/
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

const CHROMIUM_LOCAL_PROD_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4nDuJ5bADVadx4BaHERDvyxqSd9dnScyGtoQKe42YHf7WxlfaOiHt9N4MZqsQm74ubMa/ePUG0NhKD6vYutJkUMeR3s/qj7GX0HuKHOW70ToUytW3RwuUiK25yidrf6uo0Vrip9SAtaOgy4P7J0AKOMT2wH+q5ElvJRFTHoOO5eeJkcBvBfIEn9GGPDRZ2gmFOB1LAPe29LrX/tGHYGdvzVuHwpKYoBk1/KH/O4RCgU9S4Fx/HLyzTxrbJtKzxZb7R33VhZCN0mMY/2rt8qtOhxZwuKMxaNYZXiGzwIDAQAB';
const CHROMIUM_STORE_PROD_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwmux7/Q03n8mBt6LAJnjDtFZZEb2gQy+KRBiu3EE6x3t4M4xYTflsNfSggEO6vSyjdxUC0nIiPgITV/4x7wxYylLMERs8g1rJkb7oJXzWoBOWBEMJYX8etcsu5rIo651zlqdT6heZ5hD3MZHEmF0kvimKQL52n+ULGUwsNuUqUbnBK7igT6s2XAzOHZNsb3To+Qu967BsNGGdxua2qtUd87FprybQTlwAKx13cVduCaGytRrA7AiU/zL/b6hjr1/RenAhd6TTAI1C8VPQHpVak7I+aSCuOS5RZbIMOQxHTGYklFaqd8+lxZ3i+JcNiH1Aqjeu1LjgeGRQrtU+sVi9QIDAQAB';
const CHROMIUM_DEV_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAy3DtTHvPRIbLHZpYamH2Dv+jJetmpfT9bk/MN02GpFQucbmfygOwW/VK332Gybdj8zFn0cApwztnPX0wMySC/Caoo+s8+X3P6lVQ2RGdBzn0eggl1CmihxK5XNd/bhZ/iagORNkwDF6reYxTghpXOomHsPtOjdpcF4lrLSKvplMa//e/h6/uL5+pd8k4VLgZn8wdjRqDvGIbje4m0jfqpPf9Wc8DhyDoKidMyKa1vpsYQGZDNgaln3/TJthlS9HH0u++zbdPaVq0ECxtzLM/3msqJZh2y73TA5GNR816RMc/yPrvnv4EFoQHwDlDXmmAs5jD7mYB5YRW56Lc5GDvrwIDAQAB';
const CHROMIUM_LOCAL_PROD_EXTENSION_ID = 'gakejpcpkepgdgllnppopcglacnongao';
const CHROMIUM_STORE_PROD_EXTENSION_ID = 'agfmeelnmijibhmffkbhebpgmjbhddkc';
const CHROMIUM_DEV_EXTENSION_ID = 'nmbehanjefalgbpkichpmdfofmjllgfi';

const isDev = process.argv.includes('--dev');
const isStore = process.argv.includes('--store');
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
  if (browser.name === 'chrome') {
    const prodKey = isStore ? CHROMIUM_STORE_PROD_KEY : CHROMIUM_LOCAL_PROD_KEY;
    manifest.key = isDev ? CHROMIUM_DEV_KEY : prodKey;
    manifest.externally_connectable = {
      ids: isDev
        ? [CHROMIUM_LOCAL_PROD_EXTENSION_ID, CHROMIUM_STORE_PROD_EXTENSION_ID]
        : [CHROMIUM_DEV_EXTENSION_ID],
    };
  }
  if (isDev) {
    manifest.name = `${manifest.name} (dev)`;
    if (manifest.browser_specific_settings?.gecko?.id) {
      manifest.browser_specific_settings.gecko.id = 'smart-seek-dev@gormanity';
    }
  }
  writeFileSync(`${outDir}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
}

console.log(`Build complete (${isDev ? 'dev' : 'prod'} → ${baseDir}/{chrome,firefox}/).`);
