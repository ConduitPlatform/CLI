import axios from 'axios';
import { Command } from '@oclif/core';
import { recoverApiConfig, storeConfiguration } from './requestUtils';
import { Requests } from '../http/http';

const DEFAULT_LOCAL_ADMIN_URL = 'http://localhost:3030';
const DEFAULT_LOCAL_APP_URL = 'http://localhost:3000';
const DEFAULT_MASTER_KEY = 'M4ST3RK3Y';
const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'admin';

interface LoginResponse {
  token?: string;
}

interface CreateApiTokenResponse {
  token?: string;
}

export type StateApplyErrorType =
  | 'auth'
  | 'unreachable'
  | 'payload'
  | 'timeout'
  | 'unknown';

function resolveLocalAdminUrl(env: NodeJS.ProcessEnv): string {
  return env.ADMIN_DEFAULT_HOST_URL ?? DEFAULT_LOCAL_ADMIN_URL;
}

function resolveLocalAppUrl(env: NodeJS.ProcessEnv): string {
  return env.CLIENT_DEFAULT_HOST_URL ?? DEFAULT_LOCAL_APP_URL;
}

function isLocalhostUrl(candidate: string): boolean {
  try {
    const parsed = new URL(candidate);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

async function isReady(adminUrl: string): Promise<boolean> {
  try {
    const res = await axios.get(`${adminUrl}/ready`, {
      timeout: 2_000,
    });
    return Boolean(res.data?.result);
  } catch {
    return false;
  }
}

async function bootstrapLocalApiToken(
  adminUrl: string,
  env: NodeJS.ProcessEnv,
): Promise<string> {
  const masterKey = env.CORE_MASTER_KEY ?? env.MASTER_KEY ?? DEFAULT_MASTER_KEY;
  const username = env.CONDUIT_LOCAL_ADMIN_USERNAME ?? DEFAULT_ADMIN_USERNAME;
  const password = env.CONDUIT_LOCAL_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;

  const login = await axios.post<LoginResponse>(
    `${adminUrl}/login`,
    { username, password },
    {
      headers: { masterkey: masterKey },
      timeout: 5_000,
    },
  );
  const jwt = login.data?.token;
  if (!jwt) {
    throw new Error('Local login succeeded but no token was returned.');
  }

  const createToken = await axios.post<CreateApiTokenResponse>(
    `${adminUrl}/api-tokens`,
    { name: `conduit-cli-local-${Date.now()}` },
    {
      headers: {
        Authorization: `Bearer ${jwt}`,
        masterkey: masterKey,
      },
      timeout: 5_000,
    },
  );
  const apiToken = createToken.data?.token;
  if (!apiToken) {
    throw new Error('Local API token creation did not return a token.');
  }

  return apiToken;
}

export async function ensureLocalAuthForProjectUp(
  command: Command,
  env: NodeJS.ProcessEnv,
): Promise<void> {
  try {
    const current = await recoverApiConfig(command);
    if (current.adminUrl && current.token) {
      const existingClient = new Requests(
        command,
        current.adminUrl,
        current.token,
        current.appUrl,
      );
      if (await existingClient.verifyConnection()) {
        return;
      }
    }
  } catch {
    // Ignore missing/invalid stored config and attempt local bootstrap.
  }

  const adminUrl = resolveLocalAdminUrl(env);
  if (!isLocalhostUrl(adminUrl)) {
    return;
  }
  if (!(await isReady(adminUrl))) {
    return;
  }

  const apiToken = await bootstrapLocalApiToken(adminUrl, env);
  await storeConfiguration(command, {
    adminUrl,
    token: apiToken,
    appUrl: resolveLocalAppUrl(env),
  });
}

export function categorizeStateApplyError(error: unknown): StateApplyErrorType {
  const e = error as {
    code?: string;
    message?: string;
    response?: { status?: number };
  };

  const status = e.response?.status;
  if (status === 401 || status === 403) {
    return 'auth';
  }
  if (status === 400 || status === 404 || status === 409 || status === 422) {
    return 'payload';
  }

  const code = e.code ?? '';
  if (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'EHOSTUNREACH' ||
    code === 'ERR_NETWORK'
  ) {
    return 'unreachable';
  }
  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
    return 'timeout';
  }

  const message = String(e.message ?? '').toLowerCase();
  if (message.includes('timeout')) {
    return 'timeout';
  }
  if (message.includes('network') || message.includes('refused')) {
    return 'unreachable';
  }

  return 'unknown';
}

export function explainStateApplyFailure(error: unknown): string {
  const category = categorizeStateApplyError(error);
  switch (category) {
    case 'auth':
      return 'State apply failed (auth): local admin rejected credentials. Run `conduit init --relogin` and retry.';
    case 'unreachable':
      return 'State apply failed (unreachable): admin API is not reachable. Check Docker health with `conduit project status` and retry.';
    case 'payload':
      return 'State apply failed (payload): local state is invalid for this deployment. Run `conduit state diff` to inspect drift.';
    case 'timeout':
      return 'State apply failed (timeout): local admin API did not respond in time. Retry once services are stable.';
    default:
      return 'State apply failed: run `conduit init --relogin` and retry `conduit state push`.';
  }
}
