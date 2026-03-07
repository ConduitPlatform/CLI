import { Command, Flags, ux } from '@oclif/core';
import * as path from 'path';
import { getRequestClient } from '../../utils/requestUtils';
import { readStateFromFiles } from '../../utils/stateFiles';
import { raiseCommandError } from '../../utils/commandErrors';

const DEFAULT_STATE_DIR = '.conduit';

export class StatePush extends Command {
  static description = 'Push local Conduit state (YAML files) to the remote instance';

  static examples = [
    `$ conduit state push`,
    `$ conduit state push --dry-run`,
    `$ conduit state push --configs-only`,
  ];

  static flags = {
    dir: Flags.string({
      description: 'Directory containing state files (default: .conduit)',
      default: DEFAULT_STATE_DIR,
    }),
    'dry-run': Flags.boolean({
      description: 'Show what would be imported without applying',
      default: false,
    }),
    'configs-only': Flags.boolean({
      description: 'Import only configs',
      default: false,
    }),
    'modules-only': Flags.boolean({
      description: 'Import only module resources',
      default: false,
    }),
  };

  async run() {
    const { flags } = await this.parse(StatePush);
    const dir = path.resolve(process.cwd(), flags.dir);

    let body = await readStateFromFiles(dir);
    if (flags['configs-only']) {
      body = { configs: body.configs };
    } else if (flags['modules-only']) {
      body = { modules: body.modules };
    }

    const configCount = Object.keys(body.configs?.modules ?? {}).length;
    let moduleResourceCount = 0;
    if (body.modules) {
      for (const types of Object.values(body.modules)) {
        for (const arr of Object.values(types)) {
          moduleResourceCount += Array.isArray(arr) ? arr.length : 0;
        }
      }
    }

    if (flags['dry-run']) {
      this.log(
        `Would import ${configCount} config(s) and ${moduleResourceCount} resource(s).`,
      );
      return;
    }

    ux.action.start('Recovering credentials');
    const requestClient = await getRequestClient(this);
    ux.action.stop('Done');

    ux.action.start('Importing state');
    let result;
    try {
      result = await requestClient.stateImport(body);
    } catch (e) {
      ux.action.stop('Failed');
      raiseCommandError(this, 'State import', e);
    }
    ux.action.stop('Done');

    this.log('\nConfig results:');
    for (const [name, r] of Object.entries(result.configResults ?? {})) {
      const status = r.success ? 'OK' : `FAIL: ${r.error ?? 'unknown'}`;
      this.log(`  ${name}: ${status}`);
    }
    this.log('\nModule results:');
    for (const [moduleName, moduleResult] of Object.entries(result.moduleResults ?? {})) {
      if ('error' in moduleResult && typeof moduleResult.error === 'string') {
        this.log(`  ${moduleName}: ${moduleResult.error}`);
      } else {
        for (const [resourceType, entry] of Object.entries(
          moduleResult as Record<
            string,
            { created?: number; updated?: number; failed?: number; errors?: string[] }
          >,
        )) {
          const created = entry.created ?? 0;
          const updated = entry.updated ?? 0;
          const failed = entry.failed ?? 0;
          this.log(
            `  ${moduleName}/${resourceType}: created=${created} updated=${updated} failed=${failed}`,
          );
          if (entry.errors?.length) {
            entry.errors.forEach(err => this.log(`    - ${err}`));
          }
        }
      }
    }
  }
}
