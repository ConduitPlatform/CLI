import { describe, expect, it, vi } from 'vitest';
import { createMockCommand } from '../helpers/command';
import { ProjectStatus } from '../../src/commands/project/status';

const mocks = vi.hoisted(() => ({
  readManifest: vi.fn(),
  dockerGetInstance: vi.fn(),
  existsSync: vi.fn(),
  getRequestClient: vi.fn(),
  readStateFromFiles: vi.fn(),
  computeStateDiff: vi.fn(),
  hasStateDrift: vi.fn(),
}));

vi.mock('../../src/conduit-manifest', async original => {
  const actual = await original<typeof import('../../src/conduit-manifest')>();
  return {
    ...actual,
    readManifest: mocks.readManifest,
  };
});

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

vi.mock('../../src/utils/requestUtils', () => ({
  getRequestClient: mocks.getRequestClient,
}));

vi.mock('../../src/utils/stateFiles', () => ({
  readStateFromFiles: mocks.readStateFromFiles,
}));

vi.mock('../../src/utils/stateDiff', () => ({
  computeStateDiff: mocks.computeStateDiff,
  hasStateDrift: mocks.hasStateDrift,
}));

describe('project status command', () => {
  it('reports drift state when --drift is enabled', async () => {
    mocks.readManifest.mockReturnValueOnce({
      version: 'latest',
      database: 'postgres',
      modules: ['chat'],
    });
    mocks.dockerGetInstance.mockReturnValue({
      containerIsUp: vi.fn().mockResolvedValue(true),
    });
    mocks.existsSync.mockImplementation((target: string) =>
      target.endsWith('/.conduit/configs'),
    );
    mocks.getRequestClient.mockResolvedValueOnce({
      stateExport: vi.fn().mockResolvedValue({
        configs: { modules: {} },
        modules: {},
      }),
    });
    mocks.readStateFromFiles.mockResolvedValueOnce({});
    mocks.computeStateDiff.mockReturnValueOnce({ summary: ['diff'] });
    mocks.hasStateDrift.mockReturnValueOnce(true);
    const logMock = vi.fn();

    const command = createMockCommand(
      ProjectStatus,
      { flags: { dir: '.conduit', drift: true } },
      { log: logMock },
    );

    await command.run();

    expect(logMock).toHaveBeenCalledWith(expect.stringContaining('Drift: detected'));
  });
});
