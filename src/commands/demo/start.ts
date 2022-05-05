import { ConduitPackageConfiguration, Package } from '../../docker/types';
import { formatEnv, formatPorts } from '../../docker/utils';
import { Docker } from '../../docker/Docker';
import { Command } from '@oclif/command';
import cli from 'cli-ux';
import * as fs from "fs-extra";
import * as path from 'path';

export default class DemoStart extends Command {
  static description = 'Spins up your local Conduit demo deployment';

  private selectedPackages: Package[] = [];
  private demoConfiguration: ConduitPackageConfiguration = {};

  async run() {
    // Retrieve Demo Configuration
    this.demoConfiguration = await this.retrieveDemoConfig(this)
      .catch(err => {
        cli.error(err.message, { exit: -1 });
      });

    // Start Containers
    const docker = new Docker('conduit');
    await this.startModules(docker);
  }

  private async startModules(docker: Docker) {
    for (const pkg of Object.keys(this.demoConfiguration) as Package[]) {
      if (pkg === 'Database') {
        // TODO: Database module should wait for mongo/pg OR implement container health check here (also for Core/Redis)
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      await docker.run(
        pkg,
        this.demoConfiguration[pkg]!.tag,
        formatEnv(this.demoConfiguration[pkg]!.env),
        formatPorts(this.demoConfiguration[pkg]!.ports),
      );
    }
  }

  private async retrieveDemoConfig(command: Command): Promise<ConduitPackageConfiguration> {
    return await fs.readJSON(path.join(command.config.configDir, 'demo.json'))
      .catch(_ => { throw new Error('No demo configuration available'); });
  }
}
