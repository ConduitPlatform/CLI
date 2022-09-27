import { Command, Flags, CliUx } from '@oclif/core';
import dockerCompose from '../../docker/dockerCompose';
import { DeploymentConfiguration } from '../../deploy/types';
import { listLocalDeployments, getDeploymentPaths } from '../../deploy/utils';
import * as fs from 'fs-extra';
import * as dotenv from 'dotenv';
import * as open from 'open';

export class DeployStart extends Command {
  static description = 'Bring up a local Conduit deployment';
  static flags = {
    target: Flags.string({
      char: 't',
      description: 'Specify target deployment',
    }),
  };

  private deploymentConfig!: DeploymentConfiguration;

  async run() {
    // Select Target Deployment
    let target = (await this.parse(DeployStart)).flags.target;
    if (!target) {
      const availableDeployments = await listLocalDeployments(this);
      CliUx.ux.log('Available Deployment Targets:');
      availableDeployments.forEach(target => CliUx.ux.log(`- ${target}`));
      do {
        target = (await CliUx.ux.prompt('Select a target')) as string;
      } while (!availableDeployments.includes(target));
    }
    // Retrieve Compose Files
    const {
      manifestPath: cwd,
      envPath,
      deploymentPath,
    } = getDeploymentPaths(this, target);
    const processEnv = JSON.parse(JSON.stringify(process.env));
    process.env = {};
    dotenv.config({ path: envPath });
    // Retrieve User Configuration
    this.deploymentConfig = await fs.readJSONSync(deploymentPath);
    const composeOptions = this.deploymentConfig.modules.map(m => ['--profile', m]);
    const env = {
      ...JSON.parse(JSON.stringify(process.env)),
      ...this.deploymentConfig.environment,
    };
    process.env = processEnv;
    // Run Docker Compose
    await dockerCompose
      .upAll({
        cwd,
        env,
        log: true,
        composeOptions,
      })
      .catch(err => {
        CliUx.ux.error(err.message);
        CliUx.ux.exit(-1);
      });
    // Launch Conduit UI
    await open('http://localhost:8080');
  }
}
