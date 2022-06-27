import { Package, PackageConfiguration } from '../../demo/types';
import { retrieveDemoConfig, getNetworkName } from '../../demo/utils';
import { Docker } from '../../docker/Docker';
import { Command } from '@oclif/command';
const open = require('open');

export default class DemoStart extends Command {
  static description = 'Spins up your local Conduit demo deployment';

  async run() {
    // Retrieve Demo Configuration
    const demoConfiguration = await retrieveDemoConfig(this)
      .catch(() => {
        console.log('No demo configuration available. Run setup script.');
        process.exit(0);
      });

    // Start Containers
    const docker = new Docker(getNetworkName(demoConfiguration));
    for (const pkg of Object.keys(demoConfiguration.packages) as Package[]) {
      if (pkg === 'Database') {
        // TODO: Database module should wait for mongo/pg OR implement container health check here (also for Core/Redis)
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      await docker.run(
        pkg,
        demoConfiguration.packages[pkg].tag,
        this.formatEnv(demoConfiguration.packages[pkg].env),
        this.formatPorts(demoConfiguration.packages[pkg].ports),
      );
    }

    // Launch Conduit UI
    await open(`http://localhost:${demoConfiguration.packages['UI'].ports[0]}`);
  }

  private formatEnv(env: PackageConfiguration['env']) {
    const formatted: string[] = [];
    for (const [key, value] of Object.entries(env)) { formatted.push(`${key}=${value}`); }
    return formatted;
  }

  private formatPorts(portBindings: PackageConfiguration['ports']) {
    const formatted: { [key: string]: { 'HostPort': string }[] } = {};
    portBindings.forEach(portBinding => {
      const [hostPort, containerPort] = portBinding.split(':');
      formatted[`${containerPort}/tcp`] = [{ 'HostPort': hostPort }];
    });
    return formatted;
  }
}
