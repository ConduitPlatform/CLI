import { describe, expect, it, vi } from 'vitest';
import {
  ensureLocalAuthForProjectUp,
  explainStateApplyFailure,
} from '../../src/utils/localAuthBootstrap';

const mocks = vi.hoisted(() => ({
  axiosGet: vi.fn(),
  axiosPost: vi.fn(),
  recoverApiConfig: vi.fn(),
  storeConfiguration: vi.fn(),
  verifyConnection: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    get: mocks.axiosGet,
    post: mocks.axiosPost,
  },
}));

vi.mock('../../src/utils/requestUtils', () => ({
  recoverApiConfig: mocks.recoverApiConfig,
  storeConfiguration: mocks.storeConfiguration,
}));

vi.mock('../../src/http/http', () => ({
  Requests: class {
    async verifyConnection() {
      return mocks.verifyConnection();
    }
  },
}));

describe('localAuthBootstrap', () => {
  it('reuses existing valid configuration without bootstrapping', async () => {
    mocks.recoverApiConfig.mockResolvedValueOnce({
      adminUrl: 'https://example.com',
      token: 'cdt_existing',
      appUrl: 'https://app.example.com',
    });
    mocks.verifyConnection.mockResolvedValueOnce(true);

    await ensureLocalAuthForProjectUp({} as never, {});

    expect(mocks.axiosGet).not.toHaveBeenCalled();
    expect(mocks.axiosPost).not.toHaveBeenCalled();
    expect(mocks.storeConfiguration).not.toHaveBeenCalled();
  });

  it('bootstraps local token and stores configuration when needed', async () => {
    mocks.recoverApiConfig.mockRejectedValueOnce(new Error('missing config'));
    mocks.axiosGet.mockResolvedValueOnce({ data: { result: 'Conduit Core is online!' } });
    mocks.axiosPost
      .mockResolvedValueOnce({ data: { token: 'jwt_token' } })
      .mockResolvedValueOnce({ data: { token: 'cdt_new_local_token' } });

    await ensureLocalAuthForProjectUp({} as never, {
      ADMIN_DEFAULT_HOST_URL: 'http://localhost:3030',
      CLIENT_DEFAULT_HOST_URL: 'http://localhost:3000',
      CORE_MASTER_KEY: 'M4ST3RK3Y',
    });

    expect(mocks.axiosPost).toHaveBeenCalledTimes(2);
    expect(mocks.storeConfiguration).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        adminUrl: 'http://localhost:3030',
        token: 'cdt_new_local_token',
      }),
    );
  });

  it('does not bootstrap for non-local admin URLs', async () => {
    mocks.recoverApiConfig.mockRejectedValueOnce(new Error('missing config'));

    await ensureLocalAuthForProjectUp({} as never, {
      ADMIN_DEFAULT_HOST_URL: 'https://admin.example.com',
    });

    expect(mocks.axiosGet).not.toHaveBeenCalled();
    expect(mocks.axiosPost).not.toHaveBeenCalled();
    expect(mocks.storeConfiguration).not.toHaveBeenCalled();
  });

  it('classifies auth failures with targeted remediation', () => {
    const message = explainStateApplyFailure({
      response: { status: 401 },
      message: 'Unauthorized',
    });
    expect(message).toContain('State apply failed (auth):');
  });
});
