import { PackageConfiguration, Package } from './types';
import { tagIsLegacy } from './utils';

const DEMO_CONFIG: { [key: string]: Pick<PackageConfiguration, 'env' | 'ports'> } = {
  'Core': {
    env: {
      REDIS_HOST: 'conduit-redis',
      REDIS_PORT: '',
      MASTER_KEY: 'M4ST3RK3Y',
      ADMIN_HTTP_PORT: '3030',
      ADMIN_SOCKET_PORT: '3031',
    },
    ports: ['55152', '3030', '3031'], // gRPC, HTTP, Sockets
  },
  'UI': {
    env: {
      CONDUIT_URL: '',
      MASTER_KEY: 'M4ST3RK3Y',
    },
    ports: ['8080'],
  },
  'Database': {
    env: {
      CONDUIT_SERVER: '',
      REGISTER_NAME: 'true',
      DB_TYPE: '',
      DB_CONN_URI: '',
    },
    ports: [],
  },
  'Router': {
    env: {
      CONDUIT_SERVER: '',
      REGISTER_NAME: 'true',
      CLIENT_HTTP_PORT: '3000',
      CLIENT_SOCKET_PORT: '3001',
    },
    ports: ['3000', '3001'], // HTTP, Sockets
  },
  'Authentication': {
    env: {
      CONDUIT_SERVER: '',
      REGISTER_NAME: 'true',
    },
    ports: [],
  },
  'Chat': {
    env: {
      CONDUIT_SERVER: '',
      REGISTER_NAME: 'true',
    },
    ports: [],
  },
  'Email': {
    env: {
      CONDUIT_SERVER: '',
      REGISTER_NAME: 'true',
    },
    ports: [],
  },
  'Forms': {
    env: {
      CONDUIT_SERVER: '',
      REGISTER_NAME: 'true',
    },
    ports: [],
  },
  'PushNotifications': {
    env: {
      CONDUIT_SERVER: '',
      REGISTER_NAME: 'true',
    },
    ports: [],
  },
  'SMS': {
    env: {
      CONDUIT_SERVER: '',
      REGISTER_NAME: 'true',
    },
    ports: [],
  },
  'Storage': {
    env: {
      CONDUIT_SERVER: '',
      REGISTER_NAME: 'true',
    },
    ports: [],
  },
  'Redis': {
    env: {},
    ports: ['6379'],
  },
  'Mongo': {
    env: {
      MONGO_INITDB_ROOT_USERNAME: '',
      MONGO_INITDB_ROOT_PASSWORD: '',
    },
    ports: ['27017'],
  },
  'Postgres': {
    env: {
      POSTGRES_USER: '',
      POSTGRES_PASSWORD: '',
      POSTGRES_DB: 'conduit',
    },
    ports: ['5432'],
  },
}

export function getDefaultConfiguration(tag: string) {
  const packageConfiguration = DEMO_CONFIG;
  const defaultPackages: Package[] = ['Core', 'UI', 'Database', 'Router', 'Authentication', 'Redis'];
  const legacyMode = tagIsLegacy(tag);
  if (legacyMode) {
    defaultPackages.splice(defaultPackages.indexOf('Router'), 1);
    delete DEMO_CONFIG['Router'];
    DEMO_CONFIG['Core'].env['PORT'] = '';
    DEMO_CONFIG['Core'].env['SOCKET_PORT'] = '';
    delete DEMO_CONFIG['Core'].env['ADMIN_HTTP_PORT'];
    delete DEMO_CONFIG['Core'].env['ADMIN_SOCKET_PORT'];
  }
  return { packageConfiguration, defaultPackages, legacyMode };
}