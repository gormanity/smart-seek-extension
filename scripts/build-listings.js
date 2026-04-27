// build-listings.js — Generate per-store listing copy from store/listing.data.js.
//
// Output: dist/store/{chrome,edge,firefox}.md
//
// Each file contains the listing copy for one store. Code-fenced blocks are
// the verbatim text to paste into the store's submission form.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import listing from "../store/listing.data.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(repoRoot, "dist", "store");

const manifest = JSON.parse(
  readFileSync(join(repoRoot, "manifest.json"), "utf8"),
);

mkdirSync(outDir, { recursive: true });

writeFileSync(join(outDir, "chrome.md"), renderChrome(listing));
writeFileSync(join(outDir, "edge.md"), renderEdge(listing));
writeFileSync(join(outDir, "firefox.md"), renderFirefox(listing));

console.log(`Wrote ${outDir}/{chrome,edge,firefox}.md`);

function bullets(items) {
  return items.map((s) => `- ${s}`).join("\n");
}

function fence(text) {
  return "```\n" + text + "\n```";
}

function header(store) {
  return `# ${store} listing — ${listing.meta.name}

> Generated from \`store/listing.data.js\`. Do not edit by hand.
`;
}

function renderChrome(l) {
  const justifications = l.chrome.permissionJustifications
    .map(
      (p) =>
        `**${p.permission}**

${fence(p.justification)}

_(${p.justification.length} chars)_`,
    )
    .join("\n\n");

  const reviewerIntro = l.reviewerNotes.intro;
  const reviewerBullets = bullets(l.reviewerNotes.verification);
  const reviewerClose = l.reviewerNotes.closingNote;

  return `${header("Chrome Web Store")}
## Product details

**Name:**

${fence(l.meta.name)}

**Short description (132 char limit):**

${fence(l.copy.shortDescription)}

_(${l.copy.shortDescription.length} chars)_

**Version notes:**

${fence(l.copy.versionNotes)}

---

## Store listing

### Description (16,000 char limit)

${fence(l.copy.detailedDescription)}

_(${l.copy.detailedDescription.length} chars)_

### Category

${l.categories.chrome}

### Language

${l.meta.language}

### Official URL

${l.meta.officialUrl}

### Homepage URL

${l.meta.homepageUrl}

### Support URL

${l.meta.supportUrl}

---

## Privacy

### Single purpose (1,000 char limit)

${fence(l.chrome.singlePurpose)}

_(${l.chrome.singlePurpose.length} chars)_

### Permission justifications (1,000 char limit each)

${justifications}

### Remote code justification

${fence(l.chrome.remoteCodeJustification)}

_(${l.chrome.remoteCodeJustification.length} chars)_

### Privacy policy URL

${l.meta.privacyPolicyUrl}

---

## Test instructions

### Additional instructions

${reviewerIntro}

${reviewerBullets}

${reviewerClose}
`;
}

function renderEdge(l) {
  const totalWords = l.edge.searchTerms.reduce(
    (n, t) => n + t.split(/\s+/).length,
    0,
  );

  const certNotes = [
    l.reviewerNotes.intro,
    "",
    bullets(l.reviewerNotes.verification),
    "",
    l.reviewerNotes.closingNote,
  ].join("\n");

  return `${header("Edge Add-ons")}
## Properties

### 1. Category (1 only)

${l.categories.edge}

### Support Details

**1. Does this product access, collect, or transmit personal information?**

**No** — the extension stores only user preferences (seek amount, key bindings) via the browser's built-in sync storage. No personal data is collected or transmitted.

**2. Privacy policy URL**

${l.meta.privacyPolicyUrl}

**3. Website**

${l.meta.homepageUrl}

**4. Support contact detail**

${l.meta.supportUrl}

## Store Listing

### 1. Description

${fence(l.copy.detailedDescription)}

_(${l.copy.detailedDescription.length} chars)_

### 2. YouTube video URL

_(not set — optional)_

### 3. Search terms

<!-- Edge: max 7 terms · 30 chars per term · 21 words total -->

${bullets(l.edge.searchTerms)}

_Total: ${totalWords} words_

## Submission

### 1. Notes for certification (less than 2,000 characters)

${fence(certNotes)}

_(${certNotes.length} chars)_
`;
}

function renderFirefox(l) {
  const verification = [
    ...l.reviewerNotes.verification,
    ...l.firefox.reviewerVerification,
  ];

  const reviewerNotes = [
    l.reviewerNotes.intro,
    "",
    bullets(verification),
    "",
    l.reviewerNotes.closingNote,
    "",
    "Known limitations:",
    "",
    bullets(l.firefox.knownLimitations),
    "",
    `Bug reports and feature requests: ${l.meta.supportUrl}`,
  ].join("\n");

  const supportEmail = l.meta.supportEmail
    ? l.meta.supportEmail
    : "_(not set — optional)_";

  return `${header("Firefox AMO")}
## 1. Name

_Automatically populated from \`manifest.json\` (\`name\` field)._

${fence(manifest.name)}

## 2. Summary (250 char limit)

_Automatically populated from \`manifest.json\` (\`description\` field)._

${fence(manifest.description)}

_(${manifest.description.length} chars)_

## 3. Description

_Supports markdown. The first 250 characters are the most important — see https://extensionworkshop.com/documentation/develop/create-an-appealing-listing/#make-use-of-markdown_

${fence(l.copy.detailedDescription)}

_(${l.copy.detailedDescription.length} chars)_

## 4. Categories (up to 3)

${bullets(l.categories.firefox)}

## 5. Support email

${supportEmail}

## 6. Support website

${l.meta.supportUrl}

## 7. License

${l.meta.license}

## 8. This add-on has a Privacy Policy?

**Yes**

## 9. Privacy policy

${l.meta.privacyPolicyUrl}

_(Or paste the full text from \`store/privacy-policy.md\` if AMO requires inline content.)_

## 10. Notes to reviewer

${fence(reviewerNotes)}

## 11. Do you need to submit source code?

**Yes** — esbuild bundles TypeScript into the .zip submitted to AMO, so reviewers need access to the original sources.

Source repository: ${l.meta.officialUrl}

Build instructions:

${fence(l.firefox.sourceBuildInstructions)}
`;
}
