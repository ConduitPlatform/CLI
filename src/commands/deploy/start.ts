import { Command, CliUx } from '@oclif/core';
import dockerCompose from '../../docker/dockerCompose';
import { DeploymentConfiguration } from '../../deploy/types';
import { getTargetDeploymentPaths } from '../../deploy/utils';
import * as fs from 'fs-extra';
import * as dotenv from 'dotenv';
import * as open from 'open';

export class DeployStart extends Command {
  static description = 'Bring up your local Conduit deployment';

  private deploymentConfig!: DeploymentConfiguration;

  async run() {
    // Retrieve Compose Files
    const {
      manifestPath: cwd,
      envPath,
      deploymentConfigPath,
    } = getTargetDeploymentPaths(this, true);
    const processEnv = JSON.parse(JSON.stringify(process.env));
    process.env = {};
    dotenv.config({ path: envPath });
    // Retrieve User Configuration
    this.deploymentConfig = await fs.readJSONSync(deploymentConfigPath);
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
