import { Command, Flags } from '@oclif/core';
import { Docker } from '../../docker';
import { DeployStop } from './stop';
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
    const flags = (await this.parse(DeployRemove)).flags;
    this.wipeData = flags['wipe-data'] ?? false;
    this.stickToDefaults = flags.defaults ?? false;
    this.docker = Docker.getInstance();
    const target = getActiveDeploymentTag(this);
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
    this.deploymentConfig = await fs.readJSONSync(deploymentConfigPath);
    const env = {
      ...JSON.parse(JSON.stringify(process.env)),
      ...this.deploymentConfig.environment,
    };
    process.env = processEnv;
    if (!this.wipeData && !this.stickToDefaults) {
      this.log(
        'You may remove your existing deployment while preserving persistent data volumes.',
      );
      this.wipeData = await booleanPrompt(
        'Do you wish to permanently wipe persistent data? 🗑️ ',
        'no',
      );
    }
    if (await deploymentIsRunning(this)) {
      await DeployStop.run();
    }
    const result = await this.docker.compose.rm({
      cwd,
      env,
      log: true,
      volumes: this.wipeData,
    });
    if (result.exitCode !== 0) {
      this.error(result.stderr || 'docker compose rm failed', { exit: 1 });
    }
    if (this.wipeData) {
      await this.removeNamedVolumes();
    }
    this.log(`Removing deployment configuration for ${target}...`);
    fs.rmSync(deploymentConfigPath, { recursive: true, force: true });
    unsetActiveDeployment(this);
  }

  private async removeNamedVolumes(): Promise<void> {
    const composeFile = parse(fs.readFileSync(this.composePath, 'utf8')) as {
      volumes?: Record<string, unknown>;
    };
    const definedVolumes = Object.keys(composeFile.volumes ?? {});
    const volumeNames: string[] = [];
    for (const vol of definedVolumes) {
      const matches = await this.docker.listVolumes(vol);
      volumeNames.push(...matches);
    }
    await Promise.all(volumeNames.map(v => this.docker.removeVolume(v)));
  }
}
