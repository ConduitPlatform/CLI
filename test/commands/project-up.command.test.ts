import { describe, expect, it, vi } from 'vitest';
import { createMockCommand } from '../helpers/command';
import { ProjectUp } from '../../src/commands/project/up';

const mocks = vi.hoisted(() => ({
  readManifest: vi.fn(),
  getProfilesFromManifest: vi.fn(),
  pullComposeFiles: vi.fn(),
  waitForHealthy: vi.fn(),
  dockerComposeUp: vi.fn(),
  dockerGetInstance: vi.fn(),
  existsSync: vi.fn(),
  readStateFromFiles: vi.fn(),
  getRequestClient: vi.fn(),
  ensureLocalAuthForProjectUp: vi.fn(),
  explainStateApplyFailure: vi.fn(),
}));

vi.mock('../../src/conduit-manifest', async original => {
  const actual = await original<typeof import('../../src/conduit-manifest')>();
  return {
    ...actual,
    readManifest: mocks.readManifest,
    getProfilesFromManifest: mocks.getProfilesFromManifest,
  };
});

vi.mock('../../src/docker/files', () => ({
  pullComposeFiles: mocks.pullComposeFiles,
}));

vi.mock('../../src/docker/health', () => ({
  waitForHealthy: mocks.waitForHealthy,
}));

vi.mock('../../src/docker', () => ({
  Docker: {
    getInstance: mocks.dockerGetInstance,
  },
}));

vi.mock('fs-extra', () => ({
  default: {
    existsSync: mocks.existsSync,
  },
  existsSync: mocks.existsSync,
}));

vi.mock('../../src/utils/stateFiles', () => ({
  readStateFromFiles: mocks.readStateFromFiles,
}));

vi.mock('../../src/utils/requestUtils', () => ({
  getRequestClient: mocks.getRequestClient,
}));

vi.mock('../../src/utils/localAuthBootstrap', () => ({
  ensureLocalAuthForProjectUp: mocks.ensureLocalAuthForProjectUp,
  explainStateApplyFailure: mocks.explainStateApplyFailure,
}));

describe('project up command', () => {
  function arrangeProjectUp() {
    mocks.readManifest.mockReturnValue({
      version: 'latest',
      database: 'postgres',
      modules: ['chat'],
    });
    mocks.getProfilesFromManifest.mockReturnValue(['postgres', 'chat']);
    mocks.pullComposeFiles.mockResolvedValue(undefined);
    mocks.waitForHealthy.mockResolvedValue(true);
    mocks.dockerComposeUp.mockResolvedValue({ exitCode: 0, stderr: '', stdout: '' });
    mocks.dockerGetInstance.mockReturnValue({
      compose: { up: mocks.dockerComposeUp },
    });
  }

  it('exits with error when manifest is missing', async () => {
    mocks.readManifest.mockReturnValueOnce(null);

    const command = createMockCommand(ProjectUp, {
      flags: { dir: '.conduit', 'no-state-push': true },
    });

    await expect(command.run()).rejects.toThrow('No .conduit/conduit.yml found');
  });

  it('starts compose with derived env and profiles', async () => {
    arrangeProjectUp();
    mocks.existsSync.mockReturnValue(false);

    const logMock = vi.fn();
    const command = createMockCommand(
      ProjectUp,
      { flags: { dir: '.conduit', 'no-state-push': true } },
      { log: logMock, config: { cacheDir: '/tmp/cache' } },
    );

    await command.run();

    expect(mocks.pullComposeFiles).toHaveBeenCalledWith(
      'main',
      '/tmp/cache/deploy/manifests/main',
    );
    expect(mocks.dockerComposeUp).toHaveBeenCalledWith(
      expect.objectContaining({
        cwd: '/tmp/cache/deploy/manifests/main',
        profiles: ['postgres', 'chat'],
      }),
    );
    expect(logMock).toHaveBeenCalledWith(
      expect.stringContaining('http://localhost:8080'),
    );
  });

  it('tries local auth bootstrap before automatic state push', async () => {
    arrangeProjectUp();
    mocks.existsSync.mockImplementation((target: string) =>
      target.endsWith('/.conduit/configs'),
    );
    mocks.explainStateApplyFailure.mockImplementation(
      () =>
        'State apply failed (auth): local admin rejected credentials. Run `conduit init --relogin` and retry.',
    );
    mocks.readStateFromFiles.mockResolvedValue({
      configs: { modules: {} },
      modules: {},
    });
    const stateImport = vi.fn().mockResolvedValue({});
    mocks.getRequestClient.mockResolvedValue({ stateImport });

    const command = createMockCommand(
      ProjectUp,
      { flags: { dir: '.conduit', 'no-state-push': false } },
      { config: { cacheDir: '/tmp/cache' } },
    );

    await command.run();

    expect(mocks.ensureLocalAuthForProjectUp).toHaveBeenCalledTimes(1);
    expect(mocks.getRequestClient).toHaveBeenCalledTimes(1);
    expect(stateImport).toHaveBeenCalledTimes(1);
  });

  it('prints a categorized hint when state apply fails with auth error', async () => {
    arrangeProjectUp();
    mocks.existsSync.mockImplementation((target: string) =>
      target.endsWith('/.conduit/configs'),
    );
    mocks.readStateFromFiles.mockResolvedValue({
      configs: { modules: {} },
      modules: {},
    });
    mocks.getRequestClient.mockResolvedValue({
      stateImport: vi.fn().mockRejectedValue({
        response: { status: 401 },
        message: 'Unauthorized',
      }),
    });
    const logMock = vi.fn();

    const command = createMockCommand(
      ProjectUp,
      { flags: { dir: '.conduit', 'no-state-push': false } },
      { log: logMock, config: { cacheDir: '/tmp/cache' } },
    );

    await command.run();

    expect(logMock).toHaveBeenCalledWith(
      expect.stringContaining('State apply failed (auth):'),
    );
  });
});
