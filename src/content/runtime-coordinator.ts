export const DEV_HEARTBEAT_INTERVAL_MS = 1000;
export const PROD_START_GRACE_MS = 500;
export const DEV_HEARTBEAT_STALE_MS = 3500;

export const RUNTIME_COORDINATOR_TIMING = {
  prodGraceMs: PROD_START_GRACE_MS,
  devHeartbeatMs: DEV_HEARTBEAT_INTERVAL_MS,
  devStaleMs: DEV_HEARTBEAT_STALE_MS,
} as const;

const HEARTBEAT_SOURCE = 'smart-seek-extension';
const HEARTBEAT_TYPE = 'dev-heartbeat';

type Runtime = {
  start: () => void;
  stop: () => void;
};

type HeartbeatMessage = {
  source: typeof HEARTBEAT_SOURCE;
  type: typeof HEARTBEAT_TYPE;
};

type RuntimeCoordinatorOptions = {
  isDev?: boolean;
  onHeartbeat?: () => void;
  runtime: Runtime;
  onResume?: () => void;
  onSuspend?: () => void;
  timing?: Partial<typeof RUNTIME_COORDINATOR_TIMING>;
  win?: Window;
};

function isHeartbeatMessage(data: unknown): data is HeartbeatMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Partial<HeartbeatMessage>).source === HEARTBEAT_SOURCE &&
    (data as Partial<HeartbeatMessage>).type === HEARTBEAT_TYPE
  );
}

function postDevHeartbeat(win: Window): void {
  win.postMessage({ source: HEARTBEAT_SOURCE, type: HEARTBEAT_TYPE }, '*');
}

export function coordinateRuntime({
  isDev = __DEV__,
  onHeartbeat,
  onResume,
  onSuspend,
  runtime,
  timing: timingOverrides,
  win = window,
}: RuntimeCoordinatorOptions): { stop: () => void } {
  const timing = { ...RUNTIME_COORDINATOR_TIMING, ...timingOverrides };

  if (isDev) {
    runtime.start();
    postDevHeartbeat(win);
    const heartbeatInterval = win.setInterval(
      () => postDevHeartbeat(win),
      timing.devHeartbeatMs,
    );

    return {
      stop() {
        win.clearInterval(heartbeatInterval);
        runtime.stop();
      },
    };
  }

  let active = false;
  let stopped = false;
  let lastDevHeartbeat: number | null = null;
  let suspended = false;
  let startTimer: number | undefined;
  let staleTimer: number | undefined;

  const hasFreshDevHeartbeat = (): boolean =>
    lastDevHeartbeat !== null && Date.now() - lastDevHeartbeat < timing.devStaleMs;

  const notify = (callback: (() => void) | undefined): void => {
    try {
      callback?.();
    } catch {
      // Optional state hooks must not break runtime coordination.
    }
  };

  const clearStaleTimer = (): void => {
    if (staleTimer !== undefined) {
      win.clearTimeout(staleTimer);
      staleTimer = undefined;
    }
  };

  const startActiveRuntime = (): void => {
    if (stopped || active || hasFreshDevHeartbeat()) return;
    if (suspended) {
      suspended = false;
      notify(onResume);
    }
    runtime.start();
    active = true;
  };

  const stopActiveRuntime = (): void => {
    if (!active) return;
    runtime.stop();
    active = false;
  };

  const scheduleStaleCheck = (): void => {
    clearStaleTimer();
    staleTimer = win.setTimeout(() => {
      staleTimer = undefined;
      startActiveRuntime();
    }, timing.devStaleMs);
  };

  const onMessage = (event: MessageEvent): void => {
    if (event.source !== win || !isHeartbeatMessage(event.data)) return;
    lastDevHeartbeat = Date.now();
    notify(onHeartbeat);
    if (!suspended) {
      suspended = true;
      notify(onSuspend);
    }
    stopActiveRuntime();
    scheduleStaleCheck();
  };

  win.addEventListener('message', onMessage);
  startTimer = win.setTimeout(() => {
    startTimer = undefined;
    startActiveRuntime();
  }, timing.prodGraceMs);

  return {
    stop() {
      stopped = true;
      if (startTimer !== undefined) {
        win.clearTimeout(startTimer);
        startTimer = undefined;
      }
      clearStaleTimer();
      win.removeEventListener('message', onMessage);
      stopActiveRuntime();
    },
  };
}
