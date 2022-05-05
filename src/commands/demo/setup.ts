import { REDIS_VERSION, MONGO_VERSION, POSTGRES_VERSION } from '../../docker/constants';
import { ConduitPackageConfiguration, Package, PackageConfiguration } from '../../docker/types';
import { tagIsValid, getContainerName, getImageName } from '../../docker/utils';
import { booleanPrompt, promptWithOptions } from '../../utils/cli';
import { Docker } from '../../docker/Docker';
import { Command } from '@oclif/command';
import cli from 'cli-ux';
import * as fs from "fs-extra";
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
      // DB_TYPE: 'mongodb',
      // DB_CONN_URI: 'mongodb://localhost:27017',
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

  private selectedPackages: Package[] = ['Core', 'UI', 'Database', 'Authentication', 'Redis', 'Mongo'];
  private demoConfiguration: ConduitPackageConfiguration = {};

  async run() {
    // Select Tags
    let latestConduitTag = 'v0.12.6'; // TODO: Let users specify via arg, default to latest supported min version of major
    let latestConduitUiTag = 'v0.12.3';
    let conduitTag = '';
    let conduitUiTag = '';
    while (!tagIsValid(conduitTag)) {
      conduitTag = await cli.prompt('Specify your desired Conduit version', { default: latestConduitTag });
    }
    while (!tagIsValid(conduitUiTag)) {
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

    const docker = new Docker('conduit');
    await docker.createNetwork();
    console.log('\nSetting up container environment. This may take some time...')
    for (const pkg of this.selectedPackages) {
      const containerName = getContainerName(pkg);
      this.demoConfiguration[pkg] = {
        image: getImageName(pkg),
        tag: pkg === 'Redis' ? REDIS_VERSION
          : pkg === 'Mongo' ? MONGO_VERSION
            : pkg === 'Postgres' ? POSTGRES_VERSION
              : pkg === 'UI' ? conduitUiTag
                : conduitTag,
        containerName: containerName,
        networkName: containerName,
        env: DEMO_CONFIG[pkg].env,
        ports: DEMO_CONFIG[pkg].ports,
      };
      await docker.pull(pkg, this.demoConfiguration[pkg]!.tag);
    }
    this.demoConfiguration['Database']!.env = {
      ...this.demoConfiguration['Database']!.env,
      DB_TYPE: dbEngineType,
      DB_CONN_URI: dbEngineType === 'mongodb'
        ? 'mongodb://conduit-mongo:27017'
        : 'postgres://conduit:pass@localhost:5432/conduit'
    };

    // Store Demo Configuration
    await this.storeDemoConfig(this, this.demoConfiguration);

    // Call demo:start
    // TODO
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
}
