// Firefox WebExtensions compatibility — browser may be undefined in Chrome
declare const browser: typeof chrome | undefined;

// Build-time flag — esbuild replaces with `true` in dev builds, `false` in prod
// (see scripts/build.js). Vitest defines it as `false` so tests match prod.
declare const __DEV__: boolean;
