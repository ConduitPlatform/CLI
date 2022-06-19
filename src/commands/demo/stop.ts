import { Command, flags } from '@oclif/command';
import { Docker } from '../../docker/Docker';
import { retrieveDemoConfig, getNetworkName } from '../../demo/utils';
import { Package } from '../../demo/types';

export default class DemoStop extends Command {
  static description = 'Terminates your local Conduit demo deployment';
  static flags = {
    silent: flags.boolean(),
  };

  private silent: boolean = false;

  async run() {
    this.silent = this.parse(DemoStop).flags.silent;

    // Retrieve Demo Configuration
    const demoConfiguration = await retrieveDemoConfig(this)
      .catch(() => {
        if (!this.silent) console.log('No demo configuration available. Nothing to do here.');
        process.exit(0);
      });

    // Stop Containers
    const docker = new Docker(getNetworkName(demoConfiguration));
    if (!this.silent) console.log('Stopping Conduit demo');
    for (const pkg of Object.keys(demoConfiguration.packages)) {
      await docker.stop(pkg as Package, this.silent);
    }
  }
}
