import * as path from 'path';
import { describe, expect, it, vi } from 'vitest';
import { createTempWorkspace, removeTempWorkspace } from '../helpers/temp-workspace';
import { createMockCommand } from '../helpers/command';
import { readManifest } from '../../src/conduit-manifest';
import { ProjectInit } from '../../src/commands/project/init';
import { ProjectModuleAdd } from '../../src/commands/project/module/add';
import { ProjectModuleRm } from '../../src/commands/project/module/rm';

const mocks = vi.hoisted(() => ({
  promptWithOptions: vi.fn(),
  booleanPrompt: vi.fn(),
  dockerGetInstance: vi.fn(),
}));

vi.mock('../../src/utils/cli', () => ({
  promptWithOptions: mocks.promptWithOptions,
  booleanPrompt: mocks.booleanPrompt,
}));

vi.mock('../../src/docker', () => ({
  Docker: {
    getInstance: mocks.dockerGetInstance,
  },
}));

describe('project workflow integration smoke', () => {
  it('creates and mutates manifest in a temp project workspace', async () => {
    const workspace = await createTempWorkspace('cli-integration-');
    process.chdir(workspace);

    mocks.dockerGetInstance.mockReturnValue({
      containerIsUp: vi.fn().mockResolvedValue(false),
      compose: { up: vi.fn(), stop: vi.fn() },
    });

    mocks.promptWithOptions.mockResolvedValueOnce('mongodb');
    mocks.booleanPrompt.mockResolvedValueOnce(false);

    const initCmd = createMockCommand(ProjectInit, { flags: { dir: '.conduit' } });
    await initCmd.run();

    let manifest = readManifest(path.join(workspace, '.conduit'));
    expect(manifest?.modules ?? []).toEqual([]);

    const addCmd = createMockCommand(ProjectModuleAdd, {
      flags: { dir: '.conduit' },
      args: { name: 'chat' },
    });
    await addCmd.run();

    manifest = readManifest(path.join(workspace, '.conduit'));
    expect(manifest?.modules).toContain('chat');

    const rmCmd = createMockCommand(ProjectModuleRm, {
      flags: { dir: '.conduit' },
      args: { name: 'chat' },
    });
    await rmCmd.run();

    manifest = readManifest(path.join(workspace, '.conduit'));
    expect(manifest?.modules ?? []).not.toContain('chat');

    await removeTempWorkspace(workspace);
  });
});
