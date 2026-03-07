import { describe, expect, it, vi } from 'vitest';
import { createMockCommand } from '../helpers/command';
import { ProjectModuleAdd } from '../../src/commands/project/module/add';
import { ProjectModuleRm } from '../../src/commands/project/module/rm';

const mocks = vi.hoisted(() => ({
  readManifest: vi.fn(),
  writeManifest: vi.fn(),
  dockerGetInstance: vi.fn(),
  getProfilesFromManifest: vi.fn().mockReturnValue(['mongodb']),
}));

vi.mock('../../src/conduit-manifest', async original => {
  const actual = await original<typeof import('../../src/conduit-manifest')>();
  return {
    ...actual,
    readManifest: mocks.readManifest,
    writeManifest: mocks.writeManifest,
    getProfilesFromManifest: mocks.getProfilesFromManifest,
  };
});

vi.mock('../../src/docker', () => ({
  Docker: {
    getInstance: mocks.dockerGetInstance,
  },
}));

describe('project module commands', () => {
  it('adds a module and persists manifest', async () => {
    mocks.readManifest.mockReturnValueOnce({
      version: 'latest',
      database: 'mongodb',
      modules: [],
    });
    mocks.dockerGetInstance.mockReturnValue({
      containerIsUp: vi.fn().mockResolvedValue(false),
      compose: { up: vi.fn(), stop: vi.fn() },
    });

    const command = createMockCommand(ProjectModuleAdd, {
      flags: { dir: '.conduit' },
      args: { name: 'chat' },
    });

    await command.run();

    expect(mocks.writeManifest).toHaveBeenCalledWith(
      expect.objectContaining({
        modules: ['chat'],
      }),
      expect.stringContaining('.conduit'),
    );
  });

  it('removes a module and persists manifest', async () => {
    mocks.readManifest.mockReturnValueOnce({
      version: 'latest',
      database: 'mongodb',
      modules: ['chat', 'storage'],
    });
    mocks.dockerGetInstance.mockReturnValue({
      containerIsUp: vi.fn().mockResolvedValue(false),
      compose: { up: vi.fn(), stop: vi.fn() },
    });

    const command = createMockCommand(ProjectModuleRm, {
      flags: { dir: '.conduit' },
      args: { name: 'chat' },
    });

    await command.run();

    expect(mocks.writeManifest).toHaveBeenCalledWith(
      expect.objectContaining({
        modules: ['storage'],
      }),
      expect.stringContaining('.conduit'),
    );
  });
});
