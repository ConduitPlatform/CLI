import {
  REDIS_VERSION,
  MONGO_VERSION,
  POSTGRES_VERSION,
} from '../../demo/constants';
import { getContainerName, getImageName, demoIsDeployed } from '../../demo/utils';
import { ConduitPackageConfiguration, Package, PackageConfiguration } from '../../demo/types';
import { getDefaultConfiguration } from '../../demo/baseConfig';
import { booleanPrompt, promptWithOptions } from '../../utils/cli';
import { getPort, portNumbers } from '../../utils/getPort';
import { Docker } from '../../docker/Docker';
import DemoStart from './start';
import DemoCleanup from './cleanup';
import { Command, Flags, CliUx } from '@oclif/core';
import axios from 'axios';
import * as fs from 'fs-extra';
import * as path from 'path';

export default class DemoSetup extends Command {
  static description = 'Bootstraps a local Conduit demo deployment with minimal configuration';
  static flags = {
    config: Flags.boolean({
      description: 'Enable manual deployment configuration',
    }),
  };

  private readonly networkName = 'conduit-demo';
  private selectedPackages: Package[] = [];
  private defaultPackageConfiguration: { [key: string]: Pick<PackageConfiguration, 'env' | 'ports'> } = {};
  private legacyMode: boolean = false; // < v0.14
  private conduitTags: string[] = [];
  private conduitUiTags: string[] = [];
  private selectedDbEngine: 'mongodb' | 'postgres' = 'mongodb';
  private selectedConduitTag: string = '';
  private selectedConduitUiTag: string = '';
  private demoConfiguration: ConduitPackageConfiguration = {
    networkName: this.networkName,
    packages: {},
  }
  private dbUsername: string = 'conduit';
  private dbPassword: string = 'pass';


  async run() {
    const userConfiguration = (await this.parse(DemoSetup)).flags.config;

    // Handle Existing Demo Deployments
    if (await demoIsDeployed(this)) {
      const replaceDemo = await booleanPrompt(
        'An existing demo deployment was detected. Are you sure you wish to overwrite it?'
      );
      if (replaceDemo) {
        await DemoCleanup.run(['--silent']);
      } else {
        console.log('Setup canceled');
        process.exit(0);
      }
    }

    // Configuration
    await this.getConduitTags();
    await this.getConduitUiTags();
    if (userConfiguration) {
      await this.configureDeployment();
    } else {
      this.selectedConduitTag = this.conduitTags[0];
      this.selectedConduitUiTag = this.conduitUiTags[0];
      const { packageConfiguration, defaultPackages } = getDefaultConfiguration(this.selectedConduitTag);
      this.defaultPackageConfiguration = packageConfiguration;
      this.selectedDbEngine = 'mongodb';
      this.selectedPackages = defaultPackages.concat('Mongo');
    }
    await this.processConfiguration();
    await this.storeDemoConfig(this);

    // Call demo:start
    await DemoStart.run();
  }

  async configureDeployment() {
    // Select Tags
    let latestConduitTag = (this.conduitTags)[0];
    let latestConduitUiTag = (this.conduitUiTags)[0];
    while (!this.conduitTags.includes(this.selectedConduitTag)) {
      this.selectedConduitTag = await CliUx.ux.prompt(
        'Specify your desired Conduit version',
        { default: latestConduitTag },
      );
    }
    while (!this.conduitUiTags.includes(this.selectedConduitUiTag)) {
      this.selectedConduitUiTag = await CliUx.ux.prompt(
        'Specify your desired Conduit UI version',
        { default: latestConduitUiTag },
      );
    }
    const { packageConfiguration, defaultPackages, legacyMode } = getDefaultConfiguration(this.selectedConduitTag);
    this.defaultPackageConfiguration = packageConfiguration;
    this.selectedPackages = defaultPackages;
    this.legacyMode = legacyMode;

    // Select Modules
    const nonModules: Package[] = ['Core', 'UI', 'Redis', 'Mongo', 'Postgres'];
    const modules = this.selectedPackages.filter(pkg => !nonModules.includes(pkg));
    console.log('\nThe following Conduit modules are going to be brought up by default:')
    console.log(modules.join(', '));
    const chooseExtraModules = await booleanPrompt('\nSpecify additional modules?', 'no');
    if (chooseExtraModules) {
      const availableExtras = Object.keys(this.defaultPackageConfiguration).filter(
        pkg => !this.selectedPackages.includes(pkg as Package) && !nonModules.includes(pkg as Package)
      ) as Package[];
      for (const pkg of availableExtras) {
        const addModule = await booleanPrompt(`Bring up ${pkg}?`, 'no');
        if (addModule) this.selectedPackages.push(pkg);
      }
    }

    // Select Database Engine
    const dbEngineType = await promptWithOptions(
      '\nSpecify database engine type to be used',
      ['mongodb', 'postgres'],
      'mongodb',
      false,
    );
    this.selectedPackages.push(dbEngineType === 'mongodb' ? 'Mongo' : 'Postgres');
    this.selectedDbEngine = dbEngineType === 'mongodb' ? 'mongodb' : 'postgres';

    // Specify DB Engine Credentials
    this.dbUsername = await CliUx.ux.prompt('Specify database username', { default: 'conduit' });
    this.dbPassword = await CliUx.ux.prompt('Specify database password', { default: 'pass' });
  }

  private async processConfiguration() {
    this.sortPackages();
    const docker = new Docker(this.networkName);
    await docker.createNetwork();
    console.log('\nSetting up container environment. This may take some time...')
    for (const pkg of this.selectedPackages) {
      const containerName = getContainerName(pkg);
      this.demoConfiguration.packages[pkg] = {
        image: getImageName(pkg, this.selectedConduitTag),
        tag: pkg === 'Redis' ? REDIS_VERSION
          : pkg === 'Mongo' ? MONGO_VERSION
          : pkg === 'Postgres' ? POSTGRES_VERSION
          : pkg === 'UI' ? this.selectedConduitUiTag
          : this.selectedConduitTag,
        containerName: containerName,
        env: this.defaultPackageConfiguration[pkg].env,
        ports: this.defaultPackageConfiguration[pkg].ports.length > 0
          ? await this.getServicePortBindings(this.defaultPackageConfiguration[pkg].ports)
          : [],
      };
      await docker.pull(pkg, this.demoConfiguration.packages[pkg]!.tag);
    }
    // Update Env Vars
    this.demoConfiguration.packages['Core'].env = {
      ...this.demoConfiguration.packages['Core'].env,
      REDIS_PORT: this.demoConfiguration.packages['Redis'].ports[0].split(':')[1],
    };
    if (!this.legacyMode) {
      this.demoConfiguration.packages['Core'].env = {
        ...this.demoConfiguration.packages['Core'].env,
        ADMIN_HTTP_PORT: this.demoConfiguration.packages['Core'].ports[1].split(':')[1],
        ADMIN_SOCKET_PORT: this.demoConfiguration.packages['Core'].ports[2].split(':')[1],
      }
      this.demoConfiguration.packages['Router'].env = {
        ...this.demoConfiguration.packages['Router'].env,
        CLIENT_HTTP_PORT: this.demoConfiguration.packages['Router'].ports[0].split(':')[1],
        CLIENT_SOCKET_PORT: this.demoConfiguration.packages['Router'].ports[1].split(':')[1],
      }
    } else {
      this.demoConfiguration.packages['Core'].env = {
        ...this.demoConfiguration.packages['Core'].env,
        PORT: this.demoConfiguration.packages['Core'].ports[1].split(':')[1],
        SOCKET_PORT: this.demoConfiguration.packages['Core'].ports[2].split(':')[1],
      }
    }
    let dbHost: string;
    let dbPort: string;
    let dbDatabase: string;
    if (this.selectedDbEngine === 'mongodb') {
      dbHost = 'conduit-mongo';
      dbPort = this.demoConfiguration.packages['Mongo'].ports[0].split(':')[1];
      dbDatabase = ''; // specifying this is trickier for Mongo
      this.demoConfiguration.packages['Mongo'].env['MONGO_INITDB_ROOT_USERNAME'] = this.dbUsername;
      this.demoConfiguration.packages['Mongo'].env['MONGO_INITDB_ROOT_PASSWORD'] = this.dbPassword;
    } else {
      dbHost = 'conduit-postgres';
      dbPort = this.demoConfiguration.packages['Postgres'].ports[0].split(':')[1];
      dbDatabase = 'conduit';
      this.demoConfiguration.packages['Postgres'].env['POSTGRES_USER'] = this.dbUsername;
      this.demoConfiguration.packages['Postgres'].env['POSTGRES_PASSWORD'] = this.dbPassword;
    }
    this.demoConfiguration.packages['Database'].env = {
      ...this.demoConfiguration.packages['Database'].env,
      DB_TYPE: this.selectedDbEngine,
      DB_CONN_URI: `${this.selectedDbEngine}://${this.dbUsername}:${this.dbPassword}@${dbHost}:${dbPort}`
        + (dbDatabase ? `/${dbDatabase}` : ''),
    };
    const conduitGrpcPort = this.demoConfiguration.packages['Core'].ports[0].split(':')[1];
    const conduitHttpPort = this.demoConfiguration.packages['Core'].ports[1].split(':')[1];
    this.demoConfiguration.packages['UI'].env['CONDUIT_URL'] = `http://localhost:${conduitHttpPort}`;
    Object.keys(this.demoConfiguration.packages).forEach(pkg => {
      if (this.demoConfiguration.packages[pkg].env.hasOwnProperty('CONDUIT_SERVER')) {
        this.demoConfiguration.packages[pkg].env['CONDUIT_SERVER'] =
          `${getContainerName('Core')}:${conduitGrpcPort}`;
      }
    });
    // Display Information
    console.log(`\nDatabase Credentials for ${this.selectedDbEngine === 'mongodb' ? 'MongoDB' : 'PostgreSQL'}:`);
    console.log(`Username:\t${this.dbUsername}`);
    console.log(`Password:\t${this.dbPassword}`);
    console.log('\n');
  }

  private sortPackages() {
    const reordered = this.selectedPackages.filter(pkg => ['Redis', 'Mongo', 'Postgres'].includes(pkg));
    reordered.forEach(pkg => {
      const packageIndex = this.selectedPackages.indexOf(pkg);
      this.selectedPackages.splice(packageIndex, 1);
      this.selectedPackages.unshift(pkg);
    });
  }

  private async storeDemoConfig(command: Command) {
    await fs.ensureFile(path.join(command.config.configDir, 'demo.json'));
    await fs.writeJSON(path.join(command.config.configDir, 'demo.json'), this.demoConfiguration);
  }

  private async getConduitTags() {
    this.conduitTags = await this._getTags('ConduitPlatform/Conduit');
  }

  private async getConduitUiTags() {
    this.conduitUiTags = await this._getTags('ConduitPlatform/Conduit-UI');
  }

  private async _getTags(project: string) {
    const res = await axios.get(
      `https://api.github.com/repos/${project}/releases`,
      { headers: { Accept: 'application/vnd.github.v3+json' } },
    );
    const releases: string[] = [];
    const rcReleases: string[] = [];
    res.data.forEach((release: any) => {
      if (release.tag_name.indexOf('-rc') === -1) {
        releases.push(release.tag_name);
      } else {
        rcReleases.push(release.tag_name);
      }
    });
    releases.sort().reverse();
    rcReleases.sort().reverse();
    releases.push(...rcReleases);
    releases.push('dev');
    return releases;
  }

  private async getServicePortBindings(requestedPorts: string[]) {
    const portBindings: string[] = [];
    for (const p of requestedPorts) {
      const portRange = portNumbers(Number(p), Number(p) + 5); // target range or default to any available
      portBindings.push(`${await getPort({ port: portRange })}:${p}`); // host:container
    }
    return portBindings;
  }
}
