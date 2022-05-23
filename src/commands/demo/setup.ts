import {
  REDIS_VERSION,
  MONGO_VERSION,
  POSTGRES_VERSION,
} from '../../demo/constants';
import { getContainerName, getImageName, demoIsDeployed } from '../../demo/utils';
import { ConduitPackageConfiguration, Package, PackageConfiguration } from '../../demo/types';
import { booleanPrompt, promptWithOptions } from '../../utils/cli';
import { Docker } from '../../docker/Docker';
import DemoStart from './start';
import DemoCleanup from './cleanup';
import { Command } from '@oclif/command';
import axios from 'axios';
import cli from 'cli-ux';
import * as fs from 'fs-extra';
import * as path from 'path';

const CONDUIT_SERVER = `${getContainerName('Core')}:55152`;
const DEMO_CONFIG: { [key: string]: Pick<PackageConfiguration, 'env' | 'ports'> } = {
  'Core': {
    env: {
      REDIS_HOST: 'conduit-redis',
      REDIS_PORT: '6379',
      MASTER_KEY: 'M4ST3RK3Y',
    },
    ports: ['55152', '3000', '3001'],
  },
  'UI': {
    env: {
      CONDUIT_URL: 'http://localhost:3000',
      MASTER_KEY: 'M4ST3RK3Y',
    },
    ports: ['8080'],
  },
  'Database': {
    env: {
      CONDUIT_SERVER,
      REGISTER_NAME: 'true',
    },
    ports: [],
  },
  'Authentication': {
    env: {
      CONDUIT_SERVER,
      REGISTER_NAME: 'true',
    },
    ports: [],
  },
  'Chat': {
    env: {
      CONDUIT_SERVER,
      REGISTER_NAME: 'true',
    },
    ports: [],
  },
  'Email': {
    env: {
      CONDUIT_SERVER,
      REGISTER_NAME: 'true',
    },
    ports: [],
  },
  'Forms': {
    env: {
      CONDUIT_SERVER,
      REGISTER_NAME: 'true',
    },
    ports: [],
  },
  'PushNotifications': {
    env: {
      CONDUIT_SERVER,
      REGISTER_NAME: 'true',
    },
    ports: [],
  },
  'SMS': {
    env: {
      CONDUIT_SERVER,
      REGISTER_NAME: 'true',
    },
    ports: [],
  },
  'Storage': {
    env: {
      CONDUIT_SERVER,
      REGISTER_NAME: 'true',
    },
    ports: [],
  },
  'Redis': {
    env: {},
    ports: ['6379'],
  },
  'Mongo': {
    env: {},
    ports: ['27017'],
  },
  'Postgres': {
    env: {},
    ports: ['5432'],
  },
}

export default class DemoSetup extends Command {
  static description = 'Bootstraps a local Conduit demo deployment with minimal configuration';

  private readonly networkName = 'conduit';
  private selectedPackages: Package[] = ['Core', 'UI', 'Database', 'Authentication', 'Redis', 'Mongo'];
  private conduitTags: string[] = [];
  private conduitUiTags: string[] = [];

  async run() {
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

    // Select Tags
    await this.getConduitTags();
    await this.getConduitUiTags();
    let latestConduitTag = (this.conduitTags)[0];
    let latestConduitUiTag = (this.conduitUiTags)[0];
    let conduitTag = '';
    let conduitUiTag = '';
    while (!this.conduitTags.includes(conduitTag)) {
      conduitTag = await cli.prompt('Specify your desired Conduit version', { default: latestConduitTag });
    }
    while (!this.conduitUiTags.includes(conduitUiTag)) {
      conduitUiTag = await cli.prompt('Specify your desired Conduit UI version', { default: latestConduitUiTag });
    }

    // Select Modules
    const nonModules: Package[] = ['Core', 'Redis', 'Mongo', 'Postgres'];
    const modules = this.selectedPackages.filter(pkg => !nonModules.includes(pkg));
    console.log('\nThe following Conduit modules are going to be brought up by default:')
    console.log(modules.join(', '));
    const chooseExtraModules = await booleanPrompt('\nSpecify additional modules?', 'no');
    if (chooseExtraModules) {
      const availableExtras = Object.keys(DEMO_CONFIG).filter(
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
    if (dbEngineType === 'mongodb') {
      this.selectedPackages.push('Mongo');
    }
    this.selectedPackages.push(dbEngineType === 'mongodb' ? 'Mongo' : 'Postgres');

    this.sortPackages();

    const demoConfiguration: ConduitPackageConfiguration = {
      networkName: this.networkName,
      packages: {},
    }
    const docker = new Docker(this.networkName);
    await docker.createNetwork();
    console.log('\nSetting up container environment. This may take some time...')
    for (const pkg of this.selectedPackages) {
      const containerName = getContainerName(pkg);
      demoConfiguration.packages[pkg] = {
        image: getImageName(pkg),
        tag: pkg === 'Redis' ? REDIS_VERSION
          : pkg === 'Mongo' ? MONGO_VERSION
          : pkg === 'Postgres' ? POSTGRES_VERSION
          : pkg === 'UI' ? conduitUiTag
          : conduitTag,
        containerName: containerName,
        env: DEMO_CONFIG[pkg].env,
        ports: DEMO_CONFIG[pkg].ports,
      };
      await docker.pull(pkg, demoConfiguration.packages[pkg]!.tag);
    }
    demoConfiguration.packages['Database']!.env = {
      ...demoConfiguration.packages['Database']!.env,
      DB_TYPE: dbEngineType,
      DB_CONN_URI: dbEngineType === 'mongodb'
        ? 'mongodb://conduit-mongo:27017'
        : 'postgres://conduit:pass@localhost:5432/conduit'
    };

    // Store Demo Configuration
    await this.storeDemoConfig(this, demoConfiguration);

    // Call demo:start
    const startDemo = await booleanPrompt('\nStart the Demo?', 'yes');
    if (startDemo) {
      await DemoStart.run();
    }
  }

  private sortPackages() {
    const reordered = this.selectedPackages.filter(pkg => ['Redis', 'Mongo', 'Postgres'].includes(pkg));
    reordered.forEach(pkg => {
      const packageIndex = this.selectedPackages.indexOf(pkg);
      this.selectedPackages.splice(packageIndex, packageIndex + 1);
      this.selectedPackages.unshift(pkg);
    });
  }

  private async storeDemoConfig(command: Command, config: ConduitPackageConfiguration) {
    await fs.ensureFile(path.join(command.config.configDir, 'demo.json'));
    await fs.writeJSON(path.join(command.config.configDir, 'demo.json'), config);
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
    res.data.forEach((release: any) => { releases.push(release.tag_name); });
    releases.sort().reverse();
    releases.push('latest');
    return releases;
  }
}
