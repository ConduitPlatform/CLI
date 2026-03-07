import { describe, expect, it, vi } from 'vitest';
import { waitForHealthy } from '../../src/docker/health';

describe('waitForHealthy', () => {
  it('returns true when endpoint becomes healthy', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({ ok: true } as Response);

    const promise = waitForHealthy({
      url: 'http://localhost:8080',
      timeoutMs: 2_000,
      intervalMs: 250,
    });

    await vi.advanceTimersByTimeAsync(300);
    const result = await promise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toBe(true);
    vi.useRealTimers();
  });

  it('returns false on timeout', async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('down'));

    const promise = waitForHealthy({
      url: 'http://localhost:8080',
      timeoutMs: 1_000,
      intervalMs: 200,
    });

    await vi.advanceTimersByTimeAsync(1_500);
    const result = await promise;

    expect(result).toBe(false);
    vi.useRealTimers();
  });
});
