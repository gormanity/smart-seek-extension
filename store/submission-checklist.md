# Submission Checklist — Smart Seek for YouTube TV

---

## Before submitting to any store

- [ ] `make pack` — produces `dist/smart-seek-chrome.zip` and `dist/smart-seek-firefox.zip`
- [ ] Verify the extension works in Chrome (load `dist/` unpacked)
- [ ] Verify the extension works in Firefox (load `dist/manifest.json` temporarily)
- [ ] Screenshots captured (see `screenshots.md`)

---

## Chrome Web Store

**Account:** https://chrome.google.com/webstore/devconsole
**One-time fee:** $5 USD

- [ ] Developer account created and fee paid
- [ ] Upload `dist/smart-seek-chrome.zip`
- [ ] Name: `Smart Seek for YouTube TV`
- [ ] Short description: (see `listing.md`)
- [ ] Detailed description: (see `listing.md`)
- [ ] Category: Productivity
- [ ] Language: English
- [ ] Screenshots uploaded (1280×800 PNG)
- [ ] Icon: auto-extracted from zip (`icons/icon-128.png`)
- [ ] Privacy practices form completed:
  - "This extension does not collect or use user data"
  - Single purpose: adds seek controls to YouTube TV
- [ ] Permission justifications submitted (see `listing.md`)
- [ ] Privacy policy URL: `https://github.com/gormanity/smart-seek-extension/blob/main/store/privacy-policy.md`
- [ ] Homepage URL: `https://github.com/gormanity/smart-seek-extension`
- [ ] Submit for review (typically 1–7 business days)

---

## Firefox Add-ons (AMO)

**Account:** https://addons.mozilla.org/developers/
**Fee:** Free

- [ ] Developer account created
- [ ] Upload `dist/smart-seek-firefox.zip`
- [ ] Name: `Smart Seek for YouTube TV`
- [ ] Summary: (see `listing.md`)
- [ ] Description: (see `listing.md`)
- [ ] Category: Other
- [ ] License: MIT
- [ ] Homepage: `https://github.com/gormanity/smart-seek-extension`
- [ ] Screenshots uploaded
- [ ] Source code submitted (required — AMO needs to verify compiled output):
  - Upload a zip of the repo source, or provide GitHub URL
  - Include build note from `listing.md`
- [ ] Submit for review (automated for listed extensions; manual review may follow)

---

## Microsoft Edge Add-ons

**Account:** https://partner.microsoft.com/dashboard (requires Microsoft account)
**Fee:** Free

- [ ] Partner Center account created
- [ ] Upload `dist/smart-seek-chrome.zip` (same zip as Chrome — Edge is Chromium-based)
- [ ] Name: `Smart Seek for YouTube TV`
- [ ] Short description: (see `listing.md`)
- [ ] Detailed description: (see `listing.md`)
- [ ] Category: Productivity
- [ ] Language: English (en-US)
- [ ] Screenshots uploaded (1366×768 minimum)
- [ ] Privacy policy URL: `https://github.com/gormanity/smart-seek-extension/blob/main/store/privacy-policy.md`
- [ ] Support URL: `https://github.com/gormanity/smart-seek-extension/issues`
- [ ] Submit for review (typically 1–3 business days)
