import { Command, Flags, CliUx } from '@oclif/core';
import dockerCompose from 'docker-compose';
import { listLocalDeployments, getDeploymentPaths } from '../../deploy/utils';

export class DeployStop extends Command {
  static description = 'Bring down a local Conduit deployment';
  static flags = {
    target: Flags.string({
      char: 't',
      description: 'Specify target deployment',
    }),
  };

  async run() {
    // Select Target Deployment
    let target = (await this.parse(DeployStop)).flags.target;
    if (!target) {
      const availableDeployments = await listLocalDeployments(this, true);
      if (availableDeployments.length === 0) {
        CliUx.ux.log('No running deployments available.');
        CliUx.ux.exit(0);
      }
      CliUx.ux.log('Available Deployment Targets:');
      availableDeployments.forEach(target => CliUx.ux.log(`- ${target}`));
      do {
        target = (await CliUx.ux.prompt('Select a target')) as string;
      } while (!availableDeployments.includes(target));
    }
    // Retrieve Compose Files
    const { manifestPath: cwd } = getDeploymentPaths(this, target);
    // Run Docker Compose
    await dockerCompose
      .stop({
        cwd,
        log: true,
      })
      .catch(err => {
        CliUx.ux.error(err.message);
        CliUx.ux.exit(-1);
      });
  }
}
