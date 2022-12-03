import { Command, CliUx, Flags } from '@oclif/core';
import { Docker } from '../../docker';
import { DeployStop } from './stop';
import { CliUpdate } from '../cli/update';
import {
  getTargetDeploymentPaths,
  getActiveDeploymentTag,
  unsetActiveDeployment,
  deploymentIsRunning,
} from '../../deploy/utils';
import { booleanPrompt } from '../../utils/cli';
import { DeploymentConfiguration } from '../../deploy/types';
import { parse } from 'yaml';
import * as fs from 'fs-extra';
import * as dotenv from 'dotenv';

export class DeployRemove extends Command {
  static description = 'Remove your local Conduit deployment';
  static flags = {
    'wipe-data': Flags.boolean({
      description: 'Wipe data volumes',
    }),
    defaults: Flags.boolean({
      description: 'Select default values',
    }),
  };

  private docker!: Docker;
  private wipeData!: boolean;
  private stickToDefaults!: boolean;
  private composePath!: string;
  private deploymentConfig!: DeploymentConfiguration;

  async run() {
    await CliUpdate.displayUpdateHint(this);
    const flags = (await this.parse(DeployRemove)).flags;
    this.wipeData = flags['wipe-data'] ?? false;
    this.stickToDefaults = flags.defaults ?? false;
    this.docker = Docker.getInstance(); // init or fail early
    // Retrieve Target Deployment
    const target = getActiveDeploymentTag(this);
    // Retrieve Compose Files
    const {
      manifestPath: cwd,
      envPath,
      deploymentConfigPath,
      composePath,
    } = getTargetDeploymentPaths(this);
    this.composePath = composePath;
    const processEnv = JSON.parse(JSON.stringify(process.env));
    process.env = {};
    dotenv.config({ path: envPath });
    // Retrieve User Configuration
    this.deploymentConfig = await fs.readJSONSync(deploymentConfigPath);
    const composeOptions = this.deploymentConfig.modules.map(m => ['--profile', m]);
    if (this.wipeData) {
      composeOptions.push(['-v']);
    }
    const env = {
      ...JSON.parse(JSON.stringify(process.env)),
      ...this.deploymentConfig.environment,
    };
    process.env = processEnv;
    // Prompt Data Wipe
    if (!this.wipeData && !this.stickToDefaults) {
      CliUx.ux.log(
        'You may remove your existing deployment while preserving persistent data volumes.',
      );
      this.wipeData = await booleanPrompt(
        'Do you wish to permanently wipe persistent data? 🗑️ ',
        'no',
      );
    }
    // Stop Deployment
    if (await deploymentIsRunning(this)) {
      await DeployStop.run();
    }
    // Run Docker Compose
    await this.docker.compose
      .rm({
        cwd,
        env,
        log: true,
        composeOptions,
      })
      .catch(err => {
        CliUx.ux.error(err.message);
        CliUx.ux.exit(-1);
      });
    // Remove Named Volumes
    if (this.wipeData) {
      await this.removeNamedVolumes();
    }
    // Purge Deployment Configuration
    CliUx.ux.log(`Removing deployment configuration for ${target}...`);
    fs.rmSync(deploymentConfigPath, { recursive: true, force: true });
    unsetActiveDeployment(this);
  }

  /*
   * Removes named container volumes.
   * Required as compose rm -v only removes anonymous volumes
   */
  private async removeNamedVolumes() {
    // Retrieve Defined Modules
    const composeFile = parse(fs.readFileSync(this.composePath, 'utf8'));
    const definedVolumes = Object.keys(composeFile.volumes ?? {});
    // Find Used Modules
    let volumes: string[] = [];
    for (const vol of definedVolumes) {
      const matches = await this.docker.listVolumes(vol);
      volumes = volumes.concat(matches);
    }
    volumes.forEach(v => this.docker.removeVolume(v));
  }
}
