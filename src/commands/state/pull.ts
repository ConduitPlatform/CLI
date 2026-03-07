import { Command, Flags, ux } from '@oclif/core';
import * as path from 'path';
import { getRequestClient } from '../../utils/requestUtils';
import { writeStateToFiles, cleanStateDir } from '../../utils/stateFiles';
import { raiseCommandError } from '../../utils/commandErrors';

const DEFAULT_STATE_DIR = '.conduit';

export class StatePull extends Command {
  static description =
    'Pull Conduit state from the remote instance and write to local YAML files';

  static examples = [
    `$ conduit state pull`,
    `$ conduit state pull --dir .conduit --clean`,
  ];

  static flags = {
    dir: Flags.string({
      description: 'Directory to write state files (default: .conduit)',
      default: DEFAULT_STATE_DIR,
    }),
    clean: Flags.boolean({
      description: 'Remove existing state files before writing',
      default: false,
    }),
  };

  async run() {
    const { flags } = await this.parse(StatePull);
    const dir = path.resolve(process.cwd(), flags.dir);

    ux.action.start('Recovering credentials');
    const requestClient = await getRequestClient(this);
    ux.action.stop('Done');

    ux.action.start('Exporting state from Conduit');
    let data;
    try {
      data = await requestClient.stateExport();
    } catch (e) {
      ux.action.stop('Failed');
      raiseCommandError(this, 'State export', e);
    }
    ux.action.stop('Done');

    if (flags.clean) {
      ux.action.start('Cleaning state directory');
      await cleanStateDir(dir);
      ux.action.stop('Done');
    }

    ux.action.start('Writing state files');
    const { configCount, resourceCountByModule } = await writeStateToFiles(dir, data);
    ux.action.stop('Done');

    this.log(`\nWrote ${configCount} config(s) to ${dir}/configs/`);
    const totalResources = Object.values(resourceCountByModule).reduce(
      (a, b) => a + b,
      0,
    );
    this.log(
      `Wrote ${totalResources} resource(s) across ${Object.keys(resourceCountByModule).length} module(s).`,
    );
    for (const [moduleName, count] of Object.entries(resourceCountByModule)) {
      this.log(`  ${moduleName}: ${count}`);
    }
  }
}
