import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type MessageListener = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
) => boolean | undefined;
type ExternalMessageListener = MessageListener;

type TabRemovedListener = (tabId: number) => void;
type TabUpdatedListener = (
  tabId: number,
  changeInfo: chrome.tabs.TabChangeInfo,
) => void;

let messageListener: MessageListener;
let externalMessageListener: ExternalMessageListener;
let tabRemovedListener: TabRemovedListener;
let tabUpdatedListener: TabUpdatedListener;
let sentMessages: unknown[];
let actionMock: {
  setBadgeBackgroundColor: ReturnType<typeof vi.fn>;
  setBadgeText: ReturnType<typeof vi.fn>;
  setIcon: ReturnType<typeof vi.fn>;
  setTitle: ReturnType<typeof vi.fn>;
};
let contentDuplicateDetected = false;
let externalDevResponds = false;
let queriedTabs: chrome.tabs.Tab[] = [];

function setupChromeMock(): void {
  sentMessages = [];
  contentDuplicateDetected = false;
  externalDevResponds = false;
  queriedTabs = [];
  actionMock = {
    setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
    setBadgeText: vi.fn().mockResolvedValue(undefined),
    setIcon: vi.fn().mockResolvedValue(undefined),
    setTitle: vi.fn().mockResolvedValue(undefined),
  };
  const chromeMock = {
    action: actionMock,
    runtime: {
      OnInstalledReason: {
        INSTALL: 'install',
        UPDATE: 'update',
      },
      lastError: undefined,
      onInstalled: { addListener: vi.fn() },
      onMessage: {
        addListener: vi.fn((listener: MessageListener) => {
          messageListener = listener;
        }),
      },
      onMessageExternal: {
        addListener: vi.fn((listener: ExternalMessageListener) => {
          externalMessageListener = listener;
        }),
      },
      sendMessage: vi.fn((...args: unknown[]) => {
        if (typeof args[0] === 'string') {
          const callback = args[2] as ((response?: unknown) => void) | undefined;
          sentMessages.push({
            extensionId: args[0],
            message:     args[1],
          });

          if (externalDevResponds) {
            callback?.({ ok: true });
            return;
          }

          chromeMock.runtime.lastError = { message: 'Receiving end does not exist.' };
          callback?.();
          chromeMock.runtime.lastError = undefined;
          return;
        }

        const callback = args[1] as (() => void) | undefined;
        sentMessages.push(args[0]);
        callback?.();
      }),
    },
    storage: {
      sync: {
        get: vi.fn(),
        set: vi.fn(),
      },
    },
    tabs: {
      query: vi.fn((_queryInfo, callback: (tabs: chrome.tabs.Tab[]) => void) => {
        callback(queriedTabs);
      }),
      sendMessage: vi.fn((_tabId, _message, callback?: (response: unknown) => void) => {
        callback?.({
          ok: true,
          data: { duplicateDetected: contentDuplicateDetected },
        });
      }),
      onRemoved: {
        addListener: vi.fn((listener: TabRemovedListener) => {
          tabRemovedListener = listener;
        }),
      },
      onUpdated: {
        addListener: vi.fn((listener: TabUpdatedListener) => {
          tabUpdatedListener = listener;
        }),
      },
    },
  };

  (globalThis as Record<string, unknown>).chrome = chromeMock;
}

function requestDuplicateStatus(): Promise<unknown> {
  return new Promise((resolve) => {
    messageListener(
      { type: 'smart-seek:get-duplicate-status' },
      {},
      (value) => {
        resolve(value);
      },
    );
  });
}

describe('background runtime state', () => {
  beforeEach(async () => {
    vi.useRealTimers();
    vi.resetModules();
    setupChromeMock();
    await import('../src/background/service-worker.js');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports no duplicate disablement by default', async () => {
    await expect(requestDuplicateStatus()).resolves.toEqual({
      ok: true,
      data: { duplicateDetected: false },
    });
    expect(actionMock.setBadgeText).not.toHaveBeenCalled();
  });

  it('probes the dev build before reporting duplicate status', async () => {
    externalDevResponds = true;

    await expect(requestDuplicateStatus()).resolves.toEqual({
      ok: true,
      data: { duplicateDetected: true },
    });
    expect(sentMessages).toContainEqual({
      extensionId: 'nmbehanjefalgbpkichpmdfofmjllgfi',
      message:     { type: 'smart-seek:get-dev-build-presence' },
    });
    expect(actionMock.setBadgeText).toHaveBeenLastCalledWith({ text: 'OFF' });
  });

  it('refreshes duplicate state from the active tab content script', async () => {
    queriedTabs = [{ id: 7 } as chrome.tabs.Tab];
    contentDuplicateDetected = true;

    await expect(requestDuplicateStatus()).resolves.toEqual({
      ok: true,
      data: { duplicateDetected: true },
    });
    expect(actionMock.setBadgeText).toHaveBeenLastCalledWith({ text: 'OFF' });
  });

  it('tracks duplicate-disabled content frames', async () => {
    messageListener(
      { type: 'smart-seek:runtime-state', disabledByDuplicate: true },
      { tab: { id: 7 } as chrome.tabs.Tab, frameId: 0 },
      () => {},
    );

    await expect(requestDuplicateStatus()).resolves.toEqual({
      ok: true,
      data: { duplicateDetected: true },
    });
    expect(actionMock.setIcon).toHaveBeenLastCalledWith({
      path: {
        16:  'icons/icon-off-16.png',
        48:  'icons/icon-off-48.png',
        128: 'icons/icon-off-128.png',
      },
    });
    expect(actionMock.setTitle).toHaveBeenLastCalledWith({
      title: 'Smart Seek disabled while the dev build is active',
    });
    expect(actionMock.setBadgeText).toHaveBeenLastCalledWith({ text: 'OFF' });
    expect(sentMessages).toContainEqual({
      type: 'smart-seek:duplicate-status-changed',
    });
  });

  it('tracks external dev build heartbeats', async () => {
    vi.useFakeTimers();

    externalMessageListener(
      { type: 'smart-seek:dev-build-presence' },
      { id: 'nmbehanjefalgbpkichpmdfofmjllgfi' },
      () => {},
    );

    expect(actionMock.setBadgeText).toHaveBeenLastCalledWith({ text: 'OFF' });

    vi.advanceTimersByTime(3499);
    expect(actionMock.setBadgeText).toHaveBeenLastCalledWith({ text: 'OFF' });

    vi.advanceTimersByTime(1);
    expect(actionMock.setBadgeText).toHaveBeenLastCalledWith({ text: '' });

    vi.useRealTimers();
  });

  it('clears duplicate state when the tab is removed', async () => {
    messageListener(
      { type: 'smart-seek:runtime-state', disabledByDuplicate: true },
      { tab: { id: 7 } as chrome.tabs.Tab, frameId: 0 },
      () => {},
    );

    tabRemovedListener(7);

    await expect(requestDuplicateStatus()).resolves.toEqual({
      ok: true,
      data: { duplicateDetected: false },
    });
    expect(actionMock.setBadgeText).toHaveBeenLastCalledWith({ text: '' });
  });

  it('clears duplicate state when the tab starts loading', async () => {
    messageListener(
      { type: 'smart-seek:runtime-state', disabledByDuplicate: true },
      { tab: { id: 7 } as chrome.tabs.Tab, frameId: 0 },
      () => {},
    );

    tabUpdatedListener(7, { status: 'loading' });

    await expect(requestDuplicateStatus()).resolves.toEqual({
      ok: true,
      data: { duplicateDetected: false },
    });
    expect(actionMock.setBadgeText).toHaveBeenLastCalledWith({ text: '' });
  });
});
