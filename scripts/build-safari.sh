#!/usr/bin/env bash
# build-safari.sh — Convert the built web extension to a Safari Web Extension app.
#
# Requires macOS with Xcode (xcrun safari-web-extension-converter).
# Run `make build` first to populate dist/.
#
# Output: dist/smart-seek-{version}-safari-macos.zip

set -euo pipefail

APP_NAME="Smart Seek for YouTube TV"
BUNDLE_ID="com.gormanity.smart-seek"
SAFARI_DIR="safari-build"
VERSION=$(node -p "require('./package.json').version")
MANIFEST="dist/manifest.json"
APP_PATH="$SAFARI_DIR/DerivedData/Build/Products/Release/$APP_NAME.app"
ZIP="dist/smart-seek-${VERSION}-safari-macos.zip"

# Patch manifest for Safari (same as Chrome: service_worker only, no background.scripts).
# Save the original and restore it on exit so dist/ stays clean.
MANIFEST_BACKUP=$(mktemp)
cp "$MANIFEST" "$MANIFEST_BACKUP"
restore_manifest() { cp "$MANIFEST_BACKUP" "$MANIFEST"; rm -f "$MANIFEST_BACKUP"; }
trap restore_manifest EXIT

echo "→ Patching manifest for Safari…"
node -e "
  const fs = require('fs');
  const m = JSON.parse(fs.readFileSync('$MANIFEST', 'utf8'));
  delete m.background.scripts;          // Chrome/Safari MV3: service_worker only
  delete m.background.type;             // unsupported by Safari (service workers are modules by default)
  if (m.options_ui) delete m.options_ui.open_in_tab;  // unsupported by Safari
  delete m.browser_specific_settings;   // Firefox-only key
  fs.writeFileSync('$MANIFEST', JSON.stringify(m, null, 2));
"

echo "→ Converting extension to Xcode project…"
xcrun safari-web-extension-converter dist/ \
  --project-location "$SAFARI_DIR" \
  --app-name "$APP_NAME" \
  --bundle-identifier "$BUNDLE_ID" \
  --swift \
  --macos-only \
  --no-prompt \
  --force

# The converter derives the app's bundle ID from the app name (spaces→hyphens)
# instead of using --bundle-identifier, so the app and extension IDs don't share
# a prefix. Patch the pbxproj to root both under $BUNDLE_ID.
echo "→ Fixing bundle IDs in Xcode project…"
ORG_PREFIX=$(echo "$BUNDLE_ID" | cut -d. -f1,2)          # e.g. com.gormanity
APP_NAME_DASHED=$(echo "$APP_NAME" | tr ' ' '-')          # e.g. Smart-Seek-for-YouTube-TV
AUTO_BUNDLE_ID="$ORG_PREFIX.$APP_NAME_DASHED"             # what the converter set on the app
sed -i '' \
  "s/$AUTO_BUNDLE_ID/$BUNDLE_ID/g" \
  "$SAFARI_DIR/$APP_NAME/$APP_NAME.xcodeproj/project.pbxproj"

echo "→ Building (ad-hoc signed)…"
xcodebuild \
  -project "$SAFARI_DIR/$APP_NAME/$APP_NAME.xcodeproj" \
  -scheme "$APP_NAME" \
  -configuration Release \
  -derivedDataPath "$SAFARI_DIR/DerivedData" \
  CODE_SIGN_IDENTITY="-" \
  CODE_SIGNING_REQUIRED=YES \
  DEVELOPMENT_TEAM="" \
  PROVISIONING_PROFILE_SPECIFIER="" \
  build

if [[ ! -d "$APP_PATH" ]]; then
  echo "Error: app not found at $APP_PATH" >&2
  exit 1
fi

echo "→ Packaging…"
ditto -c -k --keepParent "$APP_PATH" "$ZIP"
echo "Created $ZIP"
