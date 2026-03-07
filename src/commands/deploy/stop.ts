import { Command } from '@oclif/core';
import { Docker } from '../../docker';
import { getTargetDeploymentPaths } from '../../deploy/utils';
import { DeploymentConfiguration } from '../../deploy/types';
import * as dotenv from 'dotenv';
import * as fs from 'fs-extra';

export class DeployStop extends Command {
  static description = 'Bring down your local Conduit deployment';

  private docker!: Docker;
  private deploymentConfig!: DeploymentConfiguration;

  async run() {
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
    const env = {
      ...JSON.parse(JSON.stringify(process.env)),
      ...this.deploymentConfig.environment,
    };
    process.env = processEnv;
    const result = await this.docker.compose.stop({
      cwd,
      env,
      profiles: this.deploymentConfig.modules,
      log: true,
    });
    if (result.exitCode !== 0) {
      this.error(result.stderr || 'docker compose stop failed', { exit: 1 });
    }
  }
}
