export interface HealthCheckOptions {
  url: string;
  timeoutMs?: number;
  intervalMs?: number;
}

export async function waitForHealthy(options: HealthCheckOptions): Promise<boolean> {
  const { url, timeoutMs = 120_000, intervalMs = 2_000 } = options;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5_000) });
      if (res.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, intervalMs));
  }

  return false;
}
