import { Command, Flags, CliUx } from '@oclif/core';
import { DeployStart } from './start';
import { DeploymentConfiguration } from '../../deploy/types';
import { booleanPrompt, promptWithOptions } from '../../utils/cli';
import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';

export class DeploySetup extends Command {
  static description = 'Bootstraps a local Conduit deployment';
  static flags = {
    config: Flags.boolean({
      description: 'Enable manual deployment configuration',
    }),
  };

  private readonly manifestBasePath = path.join(
    this.config.cacheDir,
    'deploy',
    'manifests',
  );
  private readonly deployConfigBasePath = path.join(this.config.configDir, 'deploy');
  private userConfiguration!: boolean;
  private conduitTags: string[] = [];
  private selectedTag!: string;
  private deploymentConfig: DeploymentConfiguration = {
    modules: [],
    environment: {},
  };
  private supportedModules: string[] = [];

  async run() {
    // Get Conduit Releases
    await this.getTags();
    this.userConfiguration = (await this.parse(DeploySetup)).flags.config;
    // Select Target Release
    if (!this.userConfiguration) {
      this.selectedTag = this.conduitTags[0];
    } else {
      while (!this.conduitTags.includes(this.selectedTag)) {
        this.selectedTag = await CliUx.ux.prompt('Specify your desired Conduit version', {
          default: this.conduitTags[0],
        });
        if (!this.conduitTags.includes(this.selectedTag)) {
          CliUx.ux.log(
            `Please choose a valid target tag. Example: ${this.conduitTags[0]}\n`,
          );
        }
      }
    }
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
    // Start Deployment
    await DeployStart.run(['--target', this.selectedTag]);
  }

  private async pullComposeFiles() {
    let manifestUrl: string, envUrl: string;
    const cacheDir = path.join(
      this.config.cacheDir,
      'deploy',
      'manifests',
      this.selectedTag,
    );
    const tagPrefix = this.selectedTag.slice(1).split('.').slice(0, 2).join('.');
    if (this.conduitTags[0].startsWith(`v${tagPrefix}`)) {
      manifestUrl =
        'https://raw.githubusercontent.com/ConduitPlatform/Conduit/main/docker/docker-compose.yml';
      envUrl =
        'https://raw.githubusercontent.com/ConduitPlatform/Conduit/main/docker/.env';
    } else if (!isNaN(parseFloat(tagPrefix)) && parseFloat(tagPrefix) < 0.15) {
      const targetBranch = `v${tagPrefix}.x`;
      manifestUrl = `https://raw.githubusercontent.com/ConduitPlatform/Conduit/${targetBranch}/docker/docker-compose.yml`;
      envUrl = `https://raw.githubusercontent.com/ConduitPlatform/Conduit/${targetBranch}/docker/.env`;
    } else {
      // (number && >= 0.15) or !number
      manifestUrl = `https://github.com/ConduitPlatform/Conduit/blob/${this.selectedTag}/docker/docker-compose.yml`;
      envUrl = `https://github.com/ConduitPlatform/Conduit/blob/${this.selectedTag}/docker/.env`;
    }
    await fs.ensureDir(cacheDir);
    await axios
      .get(manifestUrl, { responseType: 'stream' })
      .then(async response => {
        const filePath = path.join(cacheDir, 'compose.yml');
        await fs.ensureFile(filePath);
        response.data.pipe(fs.createWriteStream(filePath));
      })
      .catch(() => CliUx.ux.error('Failed to download compose file', { exit: -1 }));
    await axios
      .get(envUrl, { responseType: 'stream' })
      .then(async response => {
        const filePath = path.join(cacheDir, 'env');
        await fs.ensureFile(filePath);
        response.data.pipe(fs.createWriteStream(filePath));
      })
      .catch(() => CliUx.ux.error('Failed to download env file', { exit: -1 }));
  }

  private async getTags() {
    const res = await axios.get(
      'https://api.github.com/repos/ConduitPlatform/Conduit/releases',
      { headers: { Accept: 'application/vnd.github.v3+json' } },
    );
    const releases: string[] = [];
    const rcReleases: string[] = [];
    res.data.forEach((release: any) => {
      if (release.tag_name.indexOf('-') === -1) {
        releases.push(release.tag_name);
      } else {
        rcReleases.push(release.tag_name);
      }
    });
    releases.sort().reverse();
    rcReleases.sort().reverse();
    releases.push(...rcReleases);
    this.conduitTags = releases;
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
    if (!this.supportedModules.includes('postgres')) {
      this.deploymentConfig.modules.push('mongodb');
    } else {
      this.deploymentConfig.modules.push(
        await promptWithOptions(
          `Select database engine type`,
          ['mongodb', 'postgres'],
          'mongodb',
          false,
        ),
      );
    }
    for (const pkg of this.supportedModules) {
      if (pkg === 'mongodb' || pkg === 'postgres') continue;
      const enable = await booleanPrompt(`Bring up ${pkg}?`, 'no');
      if (enable) this.deploymentConfig.modules.push(pkg);
    }
  }

  private async configureEnvironment() {
    // TODO: Parse .env file and prompt for overrides
    if (this.deploymentConfig.modules.includes('postgres')) {
      this.deploymentConfig.environment.DB_CONN_URI =
        'postgres://conduit:pass@conduit-postgres:5432/conduit';
      this.deploymentConfig.environment.DB_TYPE = this.selectedTag.startsWith('v0.11')
        ? 'sql'
        : 'postgres';
      this.deploymentConfig.environment.DB_PORT = '5432';
    }
  }

  private async storeDeploymentConfig() {
    const deployConfigPath = path.join(this.deployConfigBasePath, this.selectedTag);
    await fs.ensureDir(this.deployConfigBasePath);
    await fs.ensureFile(deployConfigPath);
    fs.writeJsonSync(deployConfigPath, this.deploymentConfig);
  }
}
