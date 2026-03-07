import * as path from 'path';
import { describe, expect, it, vi } from 'vitest';
import { createTempWorkspace, removeTempWorkspace } from '../helpers/temp-workspace';
import { createMockCommand } from '../helpers/command';
import { writeStateToFiles } from '../../src/utils/stateFiles';
import { StatePush } from '../../src/commands/state/push';

const mocks = vi.hoisted(() => ({
  getRequestClient: vi.fn(),
}));

vi.mock('../../src/utils/requestUtils', () => ({
  getRequestClient: mocks.getRequestClient,
}));

describe('state smoke integration', () => {
  it('runs dry-run state push against local .conduit files', async () => {
    const workspace = await createTempWorkspace('cli-state-integration-');
    process.chdir(workspace);
    const stateDir = path.join(workspace, '.conduit');
    await writeStateToFiles(stateDir, {
      configs: { modules: { database: { enabled: true } } },
      modules: { database: { models: [{ name: 'users' }] } },
    });

    const logMock = vi.fn();
    const cmd = createMockCommand(
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

    await cmd.run();

    expect(mocks.getRequestClient).not.toHaveBeenCalled();
    expect(logMock).toHaveBeenCalledWith(
      expect.stringContaining('Would import 1 config(s)'),
    );

    await removeTempWorkspace(workspace);
  });
});
