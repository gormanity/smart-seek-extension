# Privacy Policy — Smart Seek for YouTube TV

*Last updated: February 2026*

---

## Summary

Smart Seek for YouTube TV does not collect, transmit, or share any personal
data. It stores only your extension preferences in your browser's built-in
sync storage.

---

## Data stored

The extension stores exactly three values using the browser's `storage.sync` API:

| Key           | Type   | Description                          |
|---------------|--------|--------------------------------------|
| `seekAmount`  | number | Seek duration in seconds (default 5) |
| `backKey`     | string | Seek-backward key binding            |
| `forwardKey`  | string | Seek-forward key binding             |

These values are stored locally in your browser and are subject to your
browser's own sync settings (e.g. Chrome Sync, Firefox Sync). They are never
sent to any server operated by this extension.

---

## Data not collected

- No browsing history
- No personal information
- No analytics or telemetry
- No cookies
- No communication with external servers

---

## Permissions

| Permission | Purpose |
|------------|---------|
| `storage` | Save your seek amount and key binding preferences |
| Host permission: `tv.youtube.com` | Inject seek controls into YouTube TV pages |

---

## Third-party services

None. The extension makes no network requests.

---

## Changes to this policy

Any future changes will be reflected in the extension's GitHub repository:
https://github.com/gormanity/smart-seek-extension

---

## Contact

To report a concern, open an issue at:
https://github.com/gormanity/smart-seek-extension/issues
