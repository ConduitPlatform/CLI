export type Package =
  | 'Core'
  | 'UI'
  | 'Database'
  | 'Router'
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
  | 'docker.io/conduitplatform/conduit'
  | 'docker.io/conduitplatform/conduit-ui'
  | 'docker.io/conduitplatform/database'
  | 'docker.io/conduitplatform/router'
  | 'docker.io/conduitplatform/authentication'
  | 'docker.io/conduitplatform/chat'
  | 'docker.io/conduitplatform/email'
  | 'docker.io/conduitplatform/forms'
  | 'docker.io/conduitplatform/push-notifications'
  | 'docker.io/conduitplatform/sms'
  | 'docker.io/conduitplatform/storage'
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
