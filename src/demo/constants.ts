import { Image, Package } from './types';

export const REDIS_VERSION = 'latest';
export const MONGO_VERSION = 'latest';
export const POSTGRES_VERSION = 'latest';

export const PackageImage: Record<Package, Image> = {
  'Core': 'ghcr.io/conduitplatform/conduit',
  'UI': 'ghcr.io/conduitplatform/conduit-ui',
  'Database': 'ghcr.io/conduitplatform/database',
  'Authentication': 'ghcr.io/conduitplatform/authentication',
  'Chat': 'ghcr.io/conduitplatform/chat',
  'Email': 'ghcr.io/conduitplatform/email',
  'Forms': 'ghcr.io/conduitplatform/forms',
  'PushNotifications': 'ghcr.io/conduitplatform/push-notifications',
  'SMS': 'ghcr.io/conduitplatform/sms',
  'Storage': 'ghcr.io/conduitplatform/storage',
  // Dependencies
  'Redis': 'docker.io/library/redis',
  'Mongo': 'docker.io/library/mongo',
  'Postgres': 'docker.io/library/postgres',
} as const;
