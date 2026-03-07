import { Command, Flags, ux } from '@oclif/core';
import * as path from 'path';
import { getRequestClient } from '../../utils/requestUtils';
import { readStateFromFiles } from '../../utils/stateFiles';
import { computeStateDiff, hasStateDrift, printStateDiff } from '../../utils/stateDiff';
import { raiseCommandError } from '../../utils/commandErrors';

const DEFAULT_STATE_DIR = '.conduit';

export class StateDiff extends Command {
  static description =
    'Show differences between local state files and remote Conduit state';

  static examples = [`$ conduit state diff`, `$ conduit state diff --dir .conduit`];

  static flags = {
    dir: Flags.string({
      description: 'Directory containing local state files (default: .conduit)',
      default: DEFAULT_STATE_DIR,
    }),
    'fail-on-drift': Flags.boolean({
      description: 'Exit non-zero when differences are detected (useful in CI)',
      default: false,
    }),
  };

  async run() {
    const { flags } = await this.parse(StateDiff);
    const dir = path.resolve(process.cwd(), flags.dir);

    ux.action.start('Recovering credentials');
    const requestClient = await getRequestClient(this);
    ux.action.stop('Done');

    ux.action.start('Fetching remote state');
    let remote;
    try {
      remote = await requestClient.stateExport();
    } catch (e) {
      ux.action.stop('Failed');
      raiseCommandError(this, 'State export', e);
    }
    ux.action.stop('Done');

    ux.action.start('Reading local state');
    const local = await readStateFromFiles(dir);
    ux.action.stop('Done');

    const summary = computeStateDiff(local, remote);
    printStateDiff(summary);
    const failOnDrift =
      flags['fail-on-drift'] || (flags as { failOnDrift?: boolean }).failOnDrift;
    if (failOnDrift && hasStateDrift(summary)) {
      this.error('State drift detected.', { exit: 2 });
    }
  }
}
