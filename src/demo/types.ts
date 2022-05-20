export type Package =
  | 'Core'
  | 'UI'
  | 'Database'
  | 'Authentication'
  | 'Chat'
  | 'Email'
  | 'Forms'
  | 'PushNotifications'
  | 'SMS'
  | 'Storage'
  | 'Redis'
  | 'Mongo'
  | 'Postgres';

export type Image =
  | 'ghcr.io/conduitplatform/conduit'
  | 'ghcr.io/conduitplatform/conduit-ui'
  | 'ghcr.io/conduitplatform/database'
  | 'ghcr.io/conduitplatform/authentication'
  | 'ghcr.io/conduitplatform/chat'
  | 'ghcr.io/conduitplatform/email'
  | 'ghcr.io/conduitplatform/forms'
  | 'ghcr.io/conduitplatform/push-notifications'
  | 'ghcr.io/conduitplatform/sms'
  | 'ghcr.io/conduitplatform/storage'
  | 'docker.io/library/redis'
  | 'docker.io/library/mongo'
  | 'docker.io/library/postgres';

export interface PackageConfiguration {
  image: Image;
  tag: string;
  containerName: string;
  env: { [field: string]: string };
  ports: string[];
}

export interface ConduitPackageConfiguration {
  networkName: string;
  packages: { [key: string]: PackageConfiguration; };
}
