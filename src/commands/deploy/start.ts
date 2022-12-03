import { Command, CliUx } from '@oclif/core';
import { Docker } from '../../docker';
import { DeploymentConfiguration } from '../../deploy/types';
import { getTargetDeploymentPaths } from '../../deploy/utils';
import { sleep } from '../../utils/sleep';
import * as fs from 'fs-extra';
import * as dotenv from 'dotenv';
import * as open from 'open';
import axios from 'axios';
import chalk = require('chalk');

export class DeployStart extends Command {
  static description = 'Bring up your local Conduit deployment';

  async run() {
    Docker.getInstance(); // init or fail early
    await DeployStart.startDeployment(this);
  }

  static async startDeployment(
    command: Command,
    tag?: string,
    deploymentConfig?: DeploymentConfiguration,
  ) {
    const docker = Docker.getInstance();
    const {
      manifestPath: cwd,
      envPath,
      deploymentConfigPath: readDeploymentConfigPath,
    } = getTargetDeploymentPaths(command, tag, true);
    if (!tag || !deploymentConfig) {
      // Called directly (terminal)
      deploymentConfig = (await fs.readJSONSync(
        readDeploymentConfigPath,
      )) as DeploymentConfiguration;
    }
    const processEnv = JSON.parse(JSON.stringify(process.env));
    process.env = {};
    dotenv.config({ path: envPath });
    const composeOptions = deploymentConfig.modules.map(m => ['--profile', m]);
    const env = {
      ...JSON.parse(JSON.stringify(process.env)),
      ...deploymentConfig.environment,
    };
    process.env = processEnv;
    // Run Docker Compose
    await docker.compose
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
    await DeployStart.bringUpUi();
  }

  static async bringUpUi() {
    CliUx.ux.log(`\n 💻 ${chalk.bgBlueBright.bold('   Launching Dashboard   ')} 💻`);
    let uiServing = false;
    let warnedOnce = false;
    while (!uiServing) {
      await axios
        .get('http://localhost:8080')
        .then(() => (uiServing = true))
        .catch(() => {
          if (!warnedOnce) {
            CliUx.ux.log(chalk.italic('    This may take a while...'));
            warnedOnce = true;
          }
          sleep(1000);
        });
    }
    await open('http://localhost:8080');
  }
}
