import { describe, expect, it, vi } from 'vitest';
import { createMockCommand } from '../helpers/command';
import { StatePush } from '../../src/commands/state/push';
import { StatePull } from '../../src/commands/state/pull';
import { StateDiff } from '../../src/commands/state/diff';

const mocks = vi.hoisted(() => ({
  readStateFromFiles: vi.fn(),
  writeStateToFiles: vi.fn(),
  cleanStateDir: vi.fn(),
  getRequestClient: vi.fn(),
  computeStateDiff: vi.fn(),
  printStateDiff: vi.fn(),
  hasStateDrift: vi.fn(),
}));

vi.mock('../../src/utils/stateFiles', async original => {
  const actual = await original<typeof import('../../src/utils/stateFiles')>();
  return {
    ...actual,
    readStateFromFiles: mocks.readStateFromFiles,
    writeStateToFiles: mocks.writeStateToFiles,
    cleanStateDir: mocks.cleanStateDir,
  };
});

vi.mock('../../src/utils/requestUtils', () => ({
  getRequestClient: mocks.getRequestClient,
}));

vi.mock('../../src/utils/stateDiff', () => ({
  computeStateDiff: mocks.computeStateDiff,
  printStateDiff: mocks.printStateDiff,
  hasStateDrift: mocks.hasStateDrift,
}));

describe('state commands', () => {
  it('state push dry-run does not call API', async () => {
    mocks.readStateFromFiles.mockResolvedValueOnce({
      configs: { modules: { database: { enabled: true } } },
      modules: { database: { models: [{ name: 'users' }] } },
    });
    const logMock = vi.fn();
    const command = createMockCommand(
      StatePush,
      {
        flags: {
          dir: '.conduit',
          'dry-run': true,
          'configs-only': false,
          'modules-only': false,
        },
      },
      { log: logMock },
    );

    await command.run();

    expect(mocks.getRequestClient).not.toHaveBeenCalled();
    expect(logMock).toHaveBeenCalledWith(
      expect.stringContaining('Would import 1 config(s)'),
    );
  });

  it('state pull cleans and writes exported state', async () => {
    mocks.getRequestClient.mockResolvedValueOnce({
      stateExport: vi.fn().mockResolvedValue({
        configs: { modules: {} },
        modules: {},
      }),
    });
    mocks.writeStateToFiles.mockResolvedValueOnce({
      configCount: 0,
      resourceCountByModule: {},
    });

    const command = createMockCommand(StatePull, {
      flags: { dir: '.conduit', clean: true },
    });

    await command.run();

    expect(mocks.cleanStateDir).toHaveBeenCalledTimes(1);
    expect(mocks.writeStateToFiles).toHaveBeenCalledTimes(1);
  });

  it('state diff computes and prints summary', async () => {
    mocks.getRequestClient.mockResolvedValueOnce({
      stateExport: vi.fn().mockResolvedValue({
        configs: { modules: {} },
        modules: {},
      }),
    });
    mocks.readStateFromFiles.mockResolvedValueOnce({});
    mocks.computeStateDiff.mockReturnValueOnce({ summary: [] });

    const command = createMockCommand(StateDiff, {
      flags: { dir: '.conduit' },
    });

    await command.run();

    expect(mocks.computeStateDiff).toHaveBeenCalledTimes(1);
    expect(mocks.printStateDiff).toHaveBeenCalledWith({ summary: [] });
  });

  it('state diff fails with exit code when fail-on-drift is enabled', async () => {
    mocks.getRequestClient.mockResolvedValueOnce({
      stateExport: vi.fn().mockResolvedValue({
        configs: { modules: {} },
        modules: {},
      }),
    });
    mocks.readStateFromFiles.mockResolvedValueOnce({});
    mocks.computeStateDiff.mockReturnValueOnce({ summary: ['diff'] });
    mocks.hasStateDrift.mockReturnValueOnce(true);

    const command = createMockCommand(StateDiff, {
      flags: { dir: '.conduit', 'fail-on-drift': true, failOnDrift: true },
    });

    await expect(command.run()).rejects.toThrow('State drift detected.');
  });
});
