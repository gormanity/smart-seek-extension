/**
 * service-worker.ts — Background service worker for Smart Seek for YouTube TV.
 *
 * Responsibilities:
 *   - Write default settings to storage on first install.
 *   - Migrate settings on extension update.
 */

import { DEFAULT_SETTINGS } from '../content/seek-logic.js';
import {
  CHROMIUM_DEV_EXTENSION_ID,
  CHROMIUM_PROD_EXTENSION_IDS,
  CONTENT_DUPLICATE_STATUS_REQUEST_MESSAGE,
  DEV_BUILD_PING_INTERVAL_MS,
  DEV_BUILD_PRESENCE_MESSAGE,
  DEV_BUILD_PRESENCE_REQUEST_MESSAGE,
  DEV_BUILD_STALE_MS,
  DUPLICATE_STATUS_CHANGED_MESSAGE,
  type DuplicateStatusResponse,
  isDuplicateStatusRequestMessage,
  isDevBuildPresenceMessage,
  isDevBuildPresenceRequestMessage,
  isRuntimeStateMessage,
} from '../runtime-messages.js';

// Previous default key bindings — used to migrate users who still have the
// old values stored and haven't explicitly customised them.
const PREVIOUS_DEFAULTS = {
  backKey:    'j',
  forwardKey: 'l',
};

const NORMAL_ICON_PATHS = {
  16:  'icons/icon-16.png',
  48:  'icons/icon-48.png',
  128: 'icons/icon-128.png',
};

const OFF_ICON_PATHS = {
  16:  'icons/icon-off-16.png',
  48:  'icons/icon-off-48.png',
  128: 'icons/icon-off-128.png',
};

const NORMAL_TITLE = 'Smart Seek for YouTube TV';
const DUPLICATE_DISABLED_TITLE =
  'Smart Seek disabled while the dev build is active';

const suspendedFramesByTab = new Map<number, Set<number>>();
let currentActionState: boolean | null = null;
let externalDevBuildPresent = false;
let externalDevBuildStaleTimer: number | undefined;

function isDuplicateDisabled(): boolean {
  return externalDevBuildPresent || suspendedFramesByTab.size > 0;
}

function setFrameState(
  tabId: number,
  frameId: number,
  disabledByDuplicate: boolean,
): void {
  if (disabledByDuplicate) {
    const frames = suspendedFramesByTab.get(tabId) ?? new Set<number>();
    frames.add(frameId);
    suspendedFramesByTab.set(tabId, frames);
    return;
  }

  const frames = suspendedFramesByTab.get(tabId);
  if (!frames) return;
  frames.delete(frameId);
  if (frames.size === 0) {
    suspendedFramesByTab.delete(tabId);
  }
}

function notifyDuplicateStatusChanged(): void {
  try {
    chrome.runtime.sendMessage({ type: DUPLICATE_STATUS_CHANGED_MESSAGE }, () => {
      void chrome.runtime.lastError;
    });
  } catch {
    // The popup may not be open, and extension contexts can disappear.
  }
}

function setActionState(disabledByDuplicate: boolean): void {
  if (currentActionState === disabledByDuplicate) return;
  currentActionState = disabledByDuplicate;

  chrome.action
    .setIcon({
      path: disabledByDuplicate ? OFF_ICON_PATHS : NORMAL_ICON_PATHS,
    })
    .catch(() => {
      // Some extension reload paths can briefly make packaged icon assets
      // unavailable. The badge/title still communicate the disabled state.
    });
  chrome.action
    .setTitle({
      title: disabledByDuplicate ? DUPLICATE_DISABLED_TITLE : NORMAL_TITLE,
    })
    .catch(() => {});
  chrome.action
    .setBadgeText({
      text: disabledByDuplicate ? 'OFF' : '',
    })
    .catch(() => {});
  chrome.action
    .setBadgeBackgroundColor({
      color: '#555555',
    })
    .catch(() => {});
}

function updateDuplicateState(wasDisabledByDuplicate: boolean): void {
  setActionState(isDuplicateDisabled());

  if (isDuplicateDisabled() !== wasDisabledByDuplicate) {
    notifyDuplicateStatusChanged();
  }
}

function setExternalDevBuildPresent(present: boolean): void {
  const wasDisabledByDuplicate = isDuplicateDisabled();
  externalDevBuildPresent = present;
  updateDuplicateState(wasDisabledByDuplicate);
}

function markExternalDevBuildPresent(): void {
  setExternalDevBuildPresent(true);
  if (externalDevBuildStaleTimer !== undefined) {
    clearTimeout(externalDevBuildStaleTimer);
  }
  externalDevBuildStaleTimer = setTimeout(() => {
    externalDevBuildStaleTimer = undefined;
    setExternalDevBuildPresent(false);
  }, DEV_BUILD_STALE_MS);
}

function startDevBuildHeartbeat(): void {
  if (!__DEV__) return;

  const pingProd = (): void => {
    for (const extensionId of CHROMIUM_PROD_EXTENSION_IDS) {
      chrome.runtime.sendMessage(
        extensionId,
        { type: DEV_BUILD_PRESENCE_MESSAGE },
        () => {
          void chrome.runtime.lastError;
        },
      );
    }
  };

  pingProd();
  setInterval(pingProd, DEV_BUILD_PING_INTERVAL_MS);
}

function probeDevBuildPresence(callback?: () => void): void {
  if (__DEV__) {
    callback?.();
    return;
  }

  chrome.runtime.sendMessage(
    CHROMIUM_DEV_EXTENSION_ID,
    { type: DEV_BUILD_PRESENCE_REQUEST_MESSAGE },
    (response?: { ok?: boolean }) => {
      if (!chrome.runtime.lastError && response?.ok === true) {
        markExternalDevBuildPresent();
      }
      setTimeout(() => {
        callback?.();
      }, 0);
    },
  );
}

function sendDuplicateStatusResponse(
  sendResponse: (response: DuplicateStatusResponse) => void,
): void {
  sendResponse({
    ok: true,
    data: { duplicateDetected: isDuplicateDisabled() },
  });
}

function refreshDuplicateStatusFromActiveTab(
  sendResponse: (response: DuplicateStatusResponse) => void,
): boolean {
  probeDevBuildPresence(() => {
    refreshDuplicateStatusFromActiveTabAfterProbe(sendResponse);
  });

  return true;
}

function refreshDuplicateStatusFromActiveTabAfterProbe(
  sendResponse: (response: DuplicateStatusResponse) => void,
): void {
  if (isDuplicateDisabled()) {
    sendDuplicateStatusResponse(sendResponse);
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (tabId === undefined) {
      sendDuplicateStatusResponse(sendResponse);
      return;
    }

    chrome.tabs.sendMessage(
      tabId,
      { type: CONTENT_DUPLICATE_STATUS_REQUEST_MESSAGE },
      (response?: DuplicateStatusResponse) => {
        if (chrome.runtime.lastError || response?.ok !== true) {
          sendDuplicateStatusResponse(sendResponse);
          return;
        }

        const wasDisabledByDuplicate = isDuplicateDisabled();
        setFrameState(tabId, 0, response.data.duplicateDetected);
        updateDuplicateState(wasDisabledByDuplicate);
        sendDuplicateStatusResponse(sendResponse);
      },
    );
  });
}

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    await chrome.storage.sync.set(DEFAULT_SETTINGS);
    return;
  }

  if (reason === chrome.runtime.OnInstalledReason.UPDATE) {
    const existing = await chrome.storage.sync.get(null);
    // Migrate keys that are still at a previous default to the current default.
    for (const key of ['backKey', 'forwardKey'] as const) {
      if (existing[key] === PREVIOUS_DEFAULTS[key]) {
        existing[key] = DEFAULT_SETTINGS[key];
      }
    }
    // Fill in any missing keys with current defaults.
    await chrome.storage.sync.set({ ...DEFAULT_SETTINGS, ...existing });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (isDuplicateStatusRequestMessage(message)) {
    return refreshDuplicateStatusFromActiveTab(sendResponse);
  }

  if (!isRuntimeStateMessage(message)) return false;

  const tabId = sender.tab?.id;
  if (tabId === undefined) return false;

  const wasDisabledByDuplicate = isDuplicateDisabled();
  setFrameState(tabId, sender.frameId ?? 0, message.disabledByDuplicate);
  updateDuplicateState(wasDisabledByDuplicate);
  return false;
});

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (__DEV__) {
    if (!CHROMIUM_PROD_EXTENSION_IDS.some((extensionId) => extensionId === sender.id)) {
      return false;
    }
    if (!isDevBuildPresenceRequestMessage(message)) return false;

    sendResponse({ ok: true });
    return false;
  }

  if (sender.id !== CHROMIUM_DEV_EXTENSION_ID) return false;
  if (!isDevBuildPresenceMessage(message)) return false;

  markExternalDevBuildPresent();
  sendResponse({ ok: true });
  return false;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  const wasDisabledByDuplicate = isDuplicateDisabled();
  suspendedFramesByTab.delete(tabId);
  updateDuplicateState(wasDisabledByDuplicate);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== 'loading') return;

  const wasDisabledByDuplicate = isDuplicateDisabled();
  suspendedFramesByTab.delete(tabId);
  updateDuplicateState(wasDisabledByDuplicate);
});

startDevBuildHeartbeat();
probeDevBuildPresence();
