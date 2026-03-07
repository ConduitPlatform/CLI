import { Command, ux } from '@oclif/core';
import { Docker } from '../../docker';
import { waitForHealthy } from '../../docker/health';
import { DeploymentConfiguration } from '../../deploy/types';
import { getTargetDeploymentPaths } from '../../deploy/utils';
import * as fs from 'fs-extra';
import * as dotenv from 'dotenv';
import chalk = require('chalk');
import { failPrecondition } from '../../utils/commandErrors';

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
    const env = {
      ...JSON.parse(JSON.stringify(process.env)),
      ...deploymentConfig.environment,
    };
    process.env = processEnv;
    const result = await docker.compose.up({
      cwd,
      env,
      profiles: deploymentConfig.modules,
      log: true,
    });
    if (result.exitCode !== 0) {
      command.error(result.stderr || 'docker compose up failed', { exit: 1 });
    }
    await DeployStart.bringUpUi(command);
  }

  static async bringUpUi(command: Command) {
    const openPkg = await import('open');
    const openFn =
      (openPkg as { default?: (url: string) => Promise<unknown> }).default ?? openPkg;
    ux.stdout(`\n 💻 ${chalk.bgBlueBright.bold('   Launching Dashboard   ')} 💻\n`);
    ux.stdout(chalk.italic('    Waiting for UI to be ready...\n'));
    const healthy = await waitForHealthy({
      url: 'http://localhost:8080',
      timeoutMs: 120_000,
      intervalMs: 2_000,
    });
    if (!healthy) {
      failPrecondition(
        command,
        'UI did not become ready in time.',
        'Check `docker compose logs` and retry.',
      );
    }
    await (openFn as (url: string) => Promise<unknown>)('http://localhost:8080');
  }
}
