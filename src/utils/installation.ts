import { InstallationType } from '../interfaces';

export function getInstallationType(): InstallationType {
  if (process.env.npm_execpath) {
    return InstallationType.NPM;
  } else {
    return InstallationType.SYSTEM;
  }
}
