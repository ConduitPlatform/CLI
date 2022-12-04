import { Command, CliUx } from '@oclif/core';
import { Docker } from '../../docker';
import { CliUpdate } from '../cli/update';
import { getTargetDeploymentPaths } from '../../deploy/utils';
import { DeploymentConfiguration } from '../../deploy/types';
import * as dotenv from 'dotenv';
import * as fs from 'fs-extra';

export class DeployStop extends Command {
  static description = 'Bring down your local Conduit deployment';

  private docker!: Docker;
  private deploymentConfig!: DeploymentConfiguration;

  async run() {
    await CliUpdate.displayUpdateHint(this);
    this.docker = Docker.getInstance(); // init or fail early
    // Retrieve Compose Files
    const {
      manifestPath: cwd,
      envPath,
      deploymentConfigPath,
    } = getTargetDeploymentPaths(this);
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
    await this.docker.compose
      .stop({
        cwd,
        env,
        log: true,
        composeOptions,
      })
      .catch(err => {
        CliUx.ux.error(err.message);
        CliUx.ux.exit(-1);
      });
  }
}
