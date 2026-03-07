import * as fs from 'fs-extra';
import * as path from 'path';
import type { ConduitManifest } from '../../src/conduit-manifest';
import type { StateExportResponse } from '../../src/interfaces/state';

export async function writeManifestFixture(
  conduitDir: string,
  manifest?: Partial<ConduitManifest>,
): Promise<void> {
  const full: ConduitManifest = {
    version: 'latest',
    database: 'mongodb',
    modules: [],
    ...manifest,
  };
  await fs.ensureDir(conduitDir);
  await fs.writeFile(
    path.join(conduitDir, 'conduit.yml'),
    `version: "${full.version}"\ndatabase: ${full.database}\nmodules:\n${(full.modules ?? []).map(m => `  - ${m}`).join('\n')}\n`,
    'utf8',
  );
}

export function stateExportFixture(): StateExportResponse {
  return {
    configs: {
      modules: {
        database: { enabled: true },
      },
    },
    modules: {
      database: {
        models: [{ name: 'users', collection: 'users' }],
      },
    },
  };
}
