import { Command, Flags, CliUx } from '@oclif/core';
import dockerCompose from 'docker-compose';
import { DeployStop } from './stop';
import { listLocalDeployments, getDeploymentPaths } from '../../deploy/utils';
import * as fs from 'fs';

export class DeployRemove extends Command {
  static description = 'Bring down a local Conduit deployment';
  static flags = {
    target: Flags.string({
      char: 't',
      description: 'Specify target deployment',
    }),
  };

  private deploymentPath!: string;

  async run() {
    // Select Target Deployment
    let target = (await this.parse(DeployRemove)).flags.target;
    if (!target) {
      const availableDeployments = await listLocalDeployments(this);
      if (availableDeployments.length === 0) {
        CliUx.ux.log('No deployments available.');
        CliUx.ux.exit(0);
      }
      CliUx.ux.log('Available Deployment Targets:');
      availableDeployments.forEach(target => CliUx.ux.log(`- ${target}`));
      do {
        target = (await CliUx.ux.prompt('Select a target')) as string;
      } while (!availableDeployments.includes(target));
    }
    // Retrieve Compose Files
    const { manifestPath: cwd, deploymentPath } = getDeploymentPaths(this, target);
    this.deploymentPath = deploymentPath;
    // Stop Deployment
    const runningDeployments = await listLocalDeployments(this, true);
    if (runningDeployments.includes(target)) {
      await DeployStop.run(['--target', target]);
    }
    // Run Docker Compose
    await dockerCompose
      .rm({
        cwd,
        log: true,
      })
      .catch(err => {
        CliUx.ux.error(err.message);
        CliUx.ux.exit(-1);
      });
    // Purge Deployment Configuration
    CliUx.ux.log(`Removing deployment configuration for ${target}...`);
    fs.rmSync(this.deploymentPath, { recursive: true, force: true });
  }
}
