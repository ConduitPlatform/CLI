import * as fs from 'fs-extra';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import {
  getManifestPath,
  readManifest,
  writeManifest,
  getProfilesFromManifest,
} from '../../src/conduit-manifest';
import { createTempWorkspace, removeTempWorkspace } from '../helpers/temp-workspace';

describe('conduit-manifest', () => {
  it('writes and reads a manifest', async () => {
    const workspace = await createTempWorkspace();
    const conduitDir = path.join(workspace, '.conduit');

    await writeManifest(
      { version: 'latest', database: 'postgres', modules: ['chat'] },
      conduitDir,
    );

    const manifest = readManifest(conduitDir);
    expect(manifest).toEqual({
      version: 'latest',
      database: 'postgres',
      modules: ['chat'],
    });

    await removeTempWorkspace(workspace);
  });

  it('returns null for invalid manifest yaml', async () => {
    const workspace = await createTempWorkspace();
    const conduitDir = path.join(workspace, '.conduit');
    await fs.ensureDir(conduitDir);
    await fs.writeFile(getManifestPath(conduitDir), '::::invalid::::', 'utf8');

    const manifest = readManifest(conduitDir);
    expect(manifest).toBeNull();

    await removeTempWorkspace(workspace);
  });

  it('deduplicates database and module profiles', () => {
    const profiles = getProfilesFromManifest({
      version: 'latest',
      database: 'mongodb',
      modules: ['chat', 'chat', 'email'],
    });

    expect(profiles).toEqual(['mongodb', 'chat', 'email']);
  });
});
