import { DeploymentConfiguration } from './types';
import { booleanPrompt, promptWithOptions } from '../utils/cli';
import {
  getBaseDeploymentPaths,
  getAvailableTags,
  setActiveDeploymentTag,
  getMatchingUiTag,
} from './utils';
import { CliUx, Command } from '@oclif/core';
import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';

export class Setup {
  private readonly manifestBasePath: string;
  private readonly deployConfigBasePath: string;
  private supportedModules: string[] = [];
  private deploymentConfig: DeploymentConfiguration = {
    modules: [],
    environment: {},
  };

  constructor(
    private readonly command: Command,
    private readonly userConfiguration: boolean,
    private readonly selectedTag: string,
  ) {
    this.manifestBasePath = getBaseDeploymentPaths(command).manifestBasePath;
    this.deployConfigBasePath = getBaseDeploymentPaths(command).configBasePath;
  }

  async setupEnvironment() {
    // Pull Compose Files
    await this.pullComposeFiles();
    // Select Modules
    if (!this.userConfiguration) {
      this.deploymentConfig.modules.push('mongodb');
    } else {
      await this.indexSupportedModules();
      await this.selectModules();
    }
    // Configure Environment
    await this.configureEnvironment();
    // Store User Configuration
    await this.storeDeploymentConfig();
  }

  private async indexSupportedModules() {
    // TODO: Parse and store dependencies too
    let modules: string[] = [];
    const composeFile = yaml.load(
      fs.readFileSync(
        path.join(this.manifestBasePath, this.selectedTag, 'compose.yml'),
        'utf-8',
      ),
    ) as { services: { [key: string]: { profiles?: string[] } } };
    Object.entries(composeFile.services).forEach(([_, serviceDefinition]) => {
      if (serviceDefinition.profiles) {
        modules = modules.concat(serviceDefinition.profiles);
      }
    });
    this.supportedModules = modules;
  }

  private async selectModules() {
    this.deploymentConfig.modules.push(
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
      if (enable) this.deploymentConfig.modules.push(pkg);
    }
  }

  private async configureEnvironment() {
    const uiTags = await getAvailableTags('Conduit-UI');
    const selectedUiTag = await getMatchingUiTag(this.selectedTag, uiTags);
    this.deploymentConfig.environment = {
      IMAGE_TAG: this.selectedTag,
      UI_IMAGE_TAG: selectedUiTag,
    };
    // TODO: Parse .env file and prompt for overrides
    if (this.deploymentConfig.modules.includes('postgres')) {
      this.deploymentConfig.environment.DB_CONN_URI =
        'postgres://conduit:pass@conduit-postgres:5432/conduit';
      this.deploymentConfig.environment.DB_TYPE = 'postgres';
      this.deploymentConfig.environment.DB_PORT = '5432';
    }
  }

  private async storeDeploymentConfig() {
    const deployConfigPath = path.join(this.deployConfigBasePath, this.selectedTag);
    await fs.ensureDir(this.deployConfigBasePath);
    await fs.ensureFile(deployConfigPath);
    fs.writeJsonSync(deployConfigPath, this.deploymentConfig);
    setActiveDeploymentTag(this.command, this.selectedTag);
  }

  private async pullComposeFiles() {
    await this.pullFile('docker/docker-compose.yml', 'compose', 'compose.yml');
    await this.pullFile('docker/.env', 'env', 'env');
    await this.pullFile(
      'docker/prometheus.cfg.yml',
      'prometheus configuration',
      'prometheus.cfg.yml',
    );
    await this.pullFile('docker/loki.cfg.yml', 'loki configuration', 'loki.cfg.yml');
  }

  private async pullFile(gitPath: string, humanName: string, dstFileName: string) {
    const cacheDir = path.join(this.manifestBasePath, this.selectedTag);
    await fs.ensureDir(cacheDir);
    const url = `https://raw.githubusercontent.com/ConduitPlatform/Conduit/${this.selectedTag}/${gitPath}`;
    await axios
      .get(url, { responseType: 'stream' })
      .then(async response => {
        const filePath = path.join(cacheDir, dstFileName);
        await fs.ensureFile(filePath);
        response.data.pipe(fs.createWriteStream(filePath));
      })
      .catch(() => CliUx.ux.error(`Failed to download ${humanName} file`, { exit: -1 }));
  }
}
