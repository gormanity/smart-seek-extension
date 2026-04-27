// Source of truth for store listings.
// Consumed by scripts/build-listings.js to generate per-store copy in dist/store/.

export default {
  meta: {
    name: "Smart Seek for YouTube TV",
    officialUrl: "https://github.com/gormanity/smart-seek-extension",
    homepageUrl: "https://github.com/gormanity/smart-seek-extension",
    supportUrl: "https://github.com/gormanity/smart-seek-extension/issues",
    privacyPolicyUrl:
      "https://github.com/gormanity/smart-seek-extension/blob/main/store/privacy-policy.md",
    language: "English (en-US)",
    supportEmail: null,
    license: "MIT",
  },

  copy: {
    shortDescription:
      "Configurable seek controls for YouTube TV. Jump by any amount with custom key bindings.",

    detailedDescription: `Smart Seek adds configurable keyboard seek controls to YouTube TV (tv.youtube.com).

YouTube TV's built-in keyboard shortcuts only jump 15 seconds at a time — too coarse for precise navigation. Smart Seek lets you choose exactly how far to jump, and which keys trigger it.

FEATURES

• Configurable seek amount — any value from 0.1 to 300 seconds
• Configurable key bindings — any key combination you like
• Quick popup — click the toolbar icon to nudge the seek amount up or down without opening settings
• On-screen indicator — a brief seek direction + amount overlay appears on each keypress
• Always-active shortcuts — Shift+← and Shift+→ work regardless of your custom bindings
• Syncs across devices — settings are stored in your browser's built-in sync storage

DEFAULT KEY BINDINGS

  Seek backward 5 s  →  Shift+J  (configurable)
  Seek forward  5 s  →  Shift+L  (configurable)
  Seek backward      →  Shift+←  (always active)
  Seek forward       →  Shift+→  (always active)

PRIVACY

No personal data is collected or transmitted. The extension stores only your preferences (seek amount and key bindings) locally via your browser's sync storage. No external servers are contacted. Full privacy policy: https://github.com/gormanity/smart-seek-extension/blob/main/store/privacy-policy.md

OPEN SOURCE

Source code: https://github.com/gormanity/smart-seek-extension`,

    versionNotes: `Initial release. Adds configurable seek controls to YouTube TV with a
5-second default, custom key bindings, and a toolbar popup for quick
seek-amount adjustment.`,
  },

  categories: {
    chrome: "Productivity",
    edge: "Productivity",
    // AMO allows up to 3 categories from its fixed list.
    firefox: ["Other"],
  },

  reviewerNotes: {
    intro: `This add-on only runs on \`https://tv.youtube.com/*\` and enhances the existing YouTube TV web app in-page. It adds configurable keyboard hotkeys for seeking forward and backward by a user-defined number of seconds.`,

    verification: [
      "Open YouTube TV in a tab and start playing a video before testing the hotkeys.",
      "Default hotkeys: `Shift+J` (seek back), `Shift+L` (seek forward), and `Shift+ArrowLeft` / `Shift+ArrowRight` (always active, regardless of user settings).",
      "The seek amount and the `Shift+J` / `Shift+L` bindings are configurable from the extension popup or options page.",
      "Settings sync via `storage.sync` (no external service).",
      "The add-on does not use remote code, external services, analytics, or tracking.",
      "No extension-specific accounts, authentication, or test credentials are required.",
    ],

    closingNote:
      "Reviewers can test using their own normal YouTube TV session.",
  },

  chrome: {
    singlePurpose:
      "Adds configurable keyboard seek controls to YouTube TV (tv.youtube.com). Lets users seek forward and backward by any custom amount of seconds using user-configurable key bindings.",

    remoteCodeJustification:
      "This extension does not use remote code. All scripts, styles, and resources are bundled into the extension package at build time via esbuild and shipped inside the .zip submitted to the Chrome Web Store.",

    permissionJustifications: [
      {
        permission: "`storage`",
        justification:
          "Stores the user's seek amount and key binding preferences using `chrome.storage.sync` so settings persist across sessions and sync across devices.",
      },
      {
        permission: "Host permission: `*://tv.youtube.com/*`",
        justification:
          "The extension must inject a content script into YouTube TV pages to intercept keyboard events and control the video player. It has no access to any other site.",
      },
    ],
  },

  edge: {
    // Edge Add-ons constraints: max 7 terms, 30 chars per term, 21 words total.
    searchTerms: [
      "YouTube TV seek",
      "YouTube TV rewind",
      "YouTube TV skip",
      "YouTube TV keyboard",
      "custom seek controls",
      "seek forward backward",
      "YouTube TV playback",
    ],
  },

  firefox: {
    // Firefox-only additions appended to the universal reviewerNotes.verification list.
    reviewerVerification: [
      'On first install, the host permission for `tv.youtube.com` is user-controlled. The popup shows a banner with a "Grant access" button — clicking it requests the permission, after which hotkeys begin working.',
    ],

    knownLimitations: [
      "This add-on works only on `https://tv.youtube.com/*`.",
      "On first install in Firefox, the user must grant host access via the popup banner before hotkeys take effect (Firefox treats `host_permissions` as user-controlled, even on AMO installs).",
    ],

    sourceBuildInstructions: `1. npm install
2. make build

This produces the dist/ directory that was zipped for submission.
Toolchain: Node.js 20+, esbuild (TypeScript → IIFE/ESM bundles).`,
  },
};
