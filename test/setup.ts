import { afterEach, beforeEach, vi } from 'vitest';

const baseEnv = { ...process.env };
const baseCwd = process.cwd();

beforeEach(() => {
  process.env = { ...baseEnv };
  process.chdir(baseCwd);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
