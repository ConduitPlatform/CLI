import { DeploymentConfiguration } from './types';
import { booleanPrompt, promptWithOptions } from '../utils/cli';
import {
  getBaseDeploymentPaths,
  getAvailableTags,
  setActiveDeploymentTag,
  getMatchingUiTag,
} from './utils';
import { Command, ux } from '@oclif/core';
import { pullComposeFiles, getProfilesFromCompose } from '../docker/files';
import * as path from 'path';
import * as fs from 'fs-extra';

export class Setup {
  private readonly manifestBasePath: string;
  private readonly deployConfigBasePath: string;
  private supportedModules: string[] = [];
  private _deploymentConfig: DeploymentConfiguration = {
    modules: [],
    environment: {},
  };

  get deploymentConfig() {
    return this._deploymentConfig;
  }

  constructor(
    private readonly command: Command,
    private readonly userConfiguration: boolean,
    private readonly selectedTag: string,
  ) {
    this.manifestBasePath = getBaseDeploymentPaths(command).manifestBasePath;
    this.deployConfigBasePath = getBaseDeploymentPaths(command).configBasePath;
  }

  async setupEnvironment() {
    const manifestDir = path.join(this.manifestBasePath, this.selectedTag);
    try {
      await pullComposeFiles(this.selectedTag, manifestDir);
    } catch (e) {
      ux.error(`Failed to download compose files: ${(e as Error).message}`, { exit: -1 });
    }
    if (!this.userConfiguration) {
      this._deploymentConfig.modules.push('mongodb');
    } else {
      await this.indexSupportedModules();
      await this.selectModules();
    }
    await this.configureEnvironment();
  }

  private async indexSupportedModules() {
    const composePath = path.join(this.manifestBasePath, this.selectedTag, 'compose.yml');
    this.supportedModules = getProfilesFromCompose(composePath);
  }

  private async selectModules() {
    this._deploymentConfig.modules.push(
      await promptWithOptions(
        `Select database engine type`,
        ['mongodb', 'postgres'],
        'mongodb',
        false,
      ),
    );
    for (const pkg of this.supportedModules) {
      if (pkg === 'mongodb' || pkg === 'postgres') continue;
      const enable = await booleanPrompt(`Bring up ${pkg}?`, 'no');
      if (enable) this._deploymentConfig.modules.push(pkg);
    }
  }

  private async configureEnvironment() {
    const uiTags = await getAvailableTags('Conduit-UI');
    const selectedUiTag = await getMatchingUiTag(this.selectedTag, uiTags);
    this._deploymentConfig.environment = {
      COMPOSE_PROJECT_NAME: 'conduit',
      IMAGE_TAG: this.selectedTag,
      UI_IMAGE_TAG: selectedUiTag,
    };
    // TODO: Parse .env file and prompt for overrides
    if (this._deploymentConfig.modules.includes('postgres')) {
      this._deploymentConfig.environment.DB_CONN_URI =
        'postgres://conduit:pass@conduit-postgres:5432/conduit';
      this._deploymentConfig.environment.DB_TYPE = 'postgres';
      this._deploymentConfig.environment.DB_PORT = '5432';
    }
  }

  async storeDeploymentConfig() {
    const deployConfigPath = path.join(this.deployConfigBasePath, this.selectedTag);
    await fs.ensureDir(this.deployConfigBasePath);
    await fs.writeJson(deployConfigPath, this._deploymentConfig);
    setActiveDeploymentTag(this.command, this.selectedTag);
  }
}
