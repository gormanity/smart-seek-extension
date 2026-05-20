import { describe, it, expect, vi, afterEach } from 'vitest';

import {
  coordinateRuntime,
  DEV_HEARTBEAT_INTERVAL_MS,
  DEV_HEARTBEAT_STALE_MS,
  PROD_START_GRACE_MS,
} from '../src/content/runtime-coordinator.js';

function makeRuntime() {
  return {
    start: vi.fn(),
    stop: vi.fn(),
  };
}

function postDevHeartbeat(): void {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: { source: 'smart-seek-extension', type: 'dev-heartbeat' },
      source: window,
    }),
  );
}

async function flushMessages(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

afterEach(() => {
  vi.useRealTimers();
});

describe('runtime coordinator', () => {
  it('dev starts immediately and announces presence', () => {
    vi.useFakeTimers();
    const runtime = makeRuntime();
    const postMessage = vi.spyOn(window, 'postMessage');

    coordinateRuntime({ isDev: true, runtime });

    expect(runtime.start).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith(
      { source: 'smart-seek-extension', type: 'dev-heartbeat' },
      '*',
    );

    vi.advanceTimersByTime(DEV_HEARTBEAT_INTERVAL_MS);
    expect(postMessage).toHaveBeenCalledTimes(2);
  });

  it('prod starts after the grace window when no dev build appears', () => {
    vi.useFakeTimers();
    const runtime = makeRuntime();

    coordinateRuntime({ isDev: false, runtime });

    expect(runtime.start).not.toHaveBeenCalled();
    vi.advanceTimersByTime(PROD_START_GRACE_MS - 1);
    expect(runtime.start).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(runtime.start).toHaveBeenCalledTimes(1);
  });

  it('prod stays suspended while dev heartbeat is fresh', async () => {
    vi.useFakeTimers();
    const runtime = makeRuntime();
    const onHeartbeat = vi.fn();

    coordinateRuntime({ isDev: false, onHeartbeat, runtime });
    postDevHeartbeat();
    await flushMessages();

    expect(onHeartbeat).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(PROD_START_GRACE_MS);
    expect(runtime.start).not.toHaveBeenCalled();

    postDevHeartbeat();
    await flushMessages();
    expect(onHeartbeat).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(DEV_HEARTBEAT_STALE_MS - PROD_START_GRACE_MS - 1);
    expect(runtime.start).not.toHaveBeenCalled();
  });

  it('prod suspends if dev appears after prod already started', async () => {
    vi.useFakeTimers();
    const runtime = makeRuntime();
    const onSuspend = vi.fn();

    coordinateRuntime({ isDev: false, onSuspend, runtime });
    vi.advanceTimersByTime(PROD_START_GRACE_MS);
    expect(runtime.start).toHaveBeenCalledTimes(1);

    postDevHeartbeat();
    await flushMessages();

    expect(runtime.stop).toHaveBeenCalledTimes(1);
    expect(onSuspend).toHaveBeenCalledTimes(1);

    postDevHeartbeat();
    await flushMessages();
    expect(runtime.stop).toHaveBeenCalledTimes(1);
    expect(onSuspend).toHaveBeenCalledTimes(1);
  });

  it('prod resumes after heartbeat staleness', async () => {
    vi.useFakeTimers();
    const runtime = makeRuntime();
    const onResume = vi.fn();

    coordinateRuntime({ isDev: false, onResume, runtime });
    postDevHeartbeat();
    await flushMessages();

    vi.advanceTimersByTime(DEV_HEARTBEAT_STALE_MS - 1);
    expect(runtime.start).not.toHaveBeenCalled();
    expect(onResume).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(runtime.start).toHaveBeenCalledTimes(1);
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('prod extends the stale timeout on repeated dev heartbeats', async () => {
    vi.useFakeTimers();
    const runtime = makeRuntime();

    coordinateRuntime({ isDev: false, runtime });
    postDevHeartbeat();
    await flushMessages();

    vi.advanceTimersByTime(DEV_HEARTBEAT_INTERVAL_MS);
    postDevHeartbeat();
    await flushMessages();

    vi.advanceTimersByTime(DEV_HEARTBEAT_STALE_MS - 1);
    expect(runtime.start).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(runtime.start).toHaveBeenCalledTimes(1);
  });

  it('does not leak optional state hook failures', async () => {
    vi.useFakeTimers();
    const runtime = makeRuntime();

    coordinateRuntime({
      isDev: false,
      onResume: () => {
        throw new Error('status hook failed');
      },
      onSuspend: () => {
        throw new Error('status hook failed');
      },
      runtime,
    });

    expect(() => postDevHeartbeat()).not.toThrow();
    await flushMessages();
    expect(() => vi.advanceTimersByTime(DEV_HEARTBEAT_STALE_MS)).not.toThrow();
    expect(runtime.start).toHaveBeenCalledTimes(1);
  });
});
