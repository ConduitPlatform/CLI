import { Command } from '@oclif/core';

export const CLI_EXIT_CODES = {
  GENERAL: 1,
  PRECONDITION: 2,
  AUTH: 3,
  NETWORK: 4,
  TIMEOUT: 5,
} as const;

type ErrorLike = {
  code?: string;
  message?: string;
  response?: { status?: number; data?: unknown };
};

function normalizeMessage(message: string): string {
  return message.replace(/\s+/g, ' ').trim();
}

export function classifyError(error: unknown): {
  exitCode: number;
  reason: string;
  suggestion?: string;
} {
  const e = (error ?? {}) as ErrorLike;
  const status = e.response?.status;
  if (status === 401 || status === 403) {
    return {
      exitCode: CLI_EXIT_CODES.AUTH,
      reason: 'authentication failed',
      suggestion: 'Run `conduit init --relogin` and retry.',
    };
  }
  if (status === 400 || status === 404 || status === 409 || status === 422) {
    return {
      exitCode: CLI_EXIT_CODES.GENERAL,
      reason: 'request was rejected by Conduit',
    };
  }

  const code = e.code ?? '';
  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
    return {
      exitCode: CLI_EXIT_CODES.TIMEOUT,
      reason: 'request timed out',
      suggestion: 'Retry after services are healthy.',
    };
  }
  if (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'EHOSTUNREACH' ||
    code === 'ERR_NETWORK'
  ) {
    return {
      exitCode: CLI_EXIT_CODES.NETWORK,
      reason: 'could not reach target service',
      suggestion: 'Check service URL and connectivity.',
    };
  }

  return {
    exitCode: CLI_EXIT_CODES.GENERAL,
    reason: normalizeMessage(e.message ?? 'unexpected error'),
  };
}

export function formatActionError(action: string, error: unknown): string {
  const e = (error ?? {}) as ErrorLike;
  const detail =
    typeof e.message === 'string' && e.message.trim().length > 0
      ? normalizeMessage(e.message)
      : classifyError(error).reason;
  return `${action} failed: ${detail}`;
}

export function raiseCommandError(
  command: Command,
  action: string,
  error: unknown,
): never {
  const { exitCode, suggestion } = classifyError(error);
  const message = formatActionError(action, error);
  const full = suggestion ? `${message} ${suggestion}` : message;
  return command.error(full, { exit: exitCode });
}

export function failPrecondition(
  command: Command,
  message: string,
  suggestion?: string,
): never {
  const full = suggestion ? `${message} ${suggestion}` : message;
  return command.error(full, { exit: CLI_EXIT_CODES.PRECONDITION });
}
