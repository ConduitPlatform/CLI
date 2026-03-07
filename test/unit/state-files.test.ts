import * as fs from 'fs-extra';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import {
  cleanStateDir,
  readStateFromFiles,
  writeStateToFiles,
} from '../../src/utils/stateFiles';
import { createTempWorkspace, removeTempWorkspace } from '../helpers/temp-workspace';
import { stateExportFixture } from '../helpers/fixtures';

describe('stateFiles', () => {
  it('writes and reads state with expected structure', async () => {
    const workspace = await createTempWorkspace();
    const stateDir = path.join(workspace, '.conduit');
    const fixture = stateExportFixture();

    const writeResult = await writeStateToFiles(stateDir, fixture);
    expect(writeResult.configCount).toBe(1);
    expect(writeResult.resourceCountByModule.database).toBe(1);

    const readResult = await readStateFromFiles(stateDir);
    expect(readResult.configs?.modules.database).toEqual({ enabled: true });
    expect(readResult.modules?.database.models).toHaveLength(1);

    await removeTempWorkspace(workspace);
  });

  it('sanitizes resource filenames that include separators', async () => {
    const workspace = await createTempWorkspace();
    const stateDir = path.join(workspace, '.conduit');

    await writeStateToFiles(stateDir, {
      configs: { modules: {} },
      modules: {
        database: {
          models: [{ name: '../unsafe/path' }],
        },
      },
    });

    const files = await fs.readdir(path.join(stateDir, 'modules', 'database', 'models'));
    expect(files).toEqual(['_unsafe_path.yml']);

    await removeTempWorkspace(workspace);
  });

  it('cleans configs and modules directories', async () => {
    const workspace = await createTempWorkspace();
    const stateDir = path.join(workspace, '.conduit');
    await fs.ensureDir(path.join(stateDir, 'configs'));
    await fs.ensureDir(path.join(stateDir, 'modules', 'database', 'models'));
    await fs.writeFile(path.join(stateDir, 'configs', 'database.yml'), 'x: 1', 'utf8');
    await fs.writeFile(
      path.join(stateDir, 'modules', 'database', 'models', 'users.yml'),
      'name: users',
      'utf8',
    );

    await cleanStateDir(stateDir);

    expect(await fs.readdir(path.join(stateDir, 'configs'))).toEqual([]);
    expect(await fs.readdir(path.join(stateDir, 'modules'))).toEqual([]);

    await removeTempWorkspace(workspace);
  });
});
