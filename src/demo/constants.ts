import { Image, Package } from './types';

export const REDIS_VERSION = 'latest';
export const MONGO_VERSION = 'latest';
export const POSTGRES_VERSION = 'latest';

export const PackageImage: Record<Package, Image> = {
  'Core': 'docker.io/conduitplatform/conduit',
  'UI': 'ghcr.io/conduitplatform/conduit-ui',
  'Database': 'docker.io/conduitplatform/database',
  'Router': 'docker.io/conduitplatform/router',
  'Authentication': 'docker.io/conduitplatform/authentication',
  'Chat': 'docker.io/conduitplatform/chat',
  'Email': 'docker.io/conduitplatform/email',
  'Forms': 'docker.io/conduitplatform/forms',
  'PushNotifications': 'docker.io/conduitplatform/push-notifications',
  'SMS': 'docker.io/conduitplatform/sms',
  'Storage': 'docker.io/conduitplatform/storage',
  // Dependencies
  'Redis': 'docker.io/library/redis',
  'Mongo': 'docker.io/library/mongo',
  'Postgres': 'docker.io/library/postgres',
} as const;
