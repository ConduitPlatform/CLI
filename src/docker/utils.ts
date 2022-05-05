import { PackageImage, MIN_MAJOR_CONDUIT_VERSION, MAX_MAJOR_CONDUIT_VERSION } from './constants';
import { Package, PackageConfiguration } from './types';
import { kebabCase } from 'lodash';
import cli from 'cli-ux';

export function getImageName(packageName: Package) {
  return PackageImage[packageName];
}

export function getContainerName(packageName: Package) {
  return packageName === 'Core' ? 'conduit' : `conduit-${kebabCase(packageName)}`;
}

export function formatEnv(env: PackageConfiguration['env']) {
  const formatted: string[] = [];
  for (const [key, value] of Object.entries(env)) { formatted.push(`${key}=${value}`); }
  return formatted;
}

export function formatPorts(ports: PackageConfiguration['ports']) {
  const formatted: { [key: string]: { 'HostPort': string }[] } = {};
  ports.forEach(port => { formatted[`${port}/tcp`] = [{ 'HostPort': port }]; });
  return formatted;
}

export function buildPackageConfig(
  packageName: Package,
  tag: string,
  networkName: string,
  env: { [field: string]: string },
  ports: string[],
): PackageConfiguration {
  return {
    image: getImageName(packageName),
    tag,
    containerName: getContainerName(packageName),
    networkName,
    env,
    ports,
  };
}

export function parsePort(value: string): number | null {
  const port = Number(value);
  if (isNaN(port) || port < 1 || port > 65535) {
    cli.warn('Invalid port value');
    return null;
  }
  if (portUnavailable(port)) {
    cli.warn(`Port ${port} is already in use`);
    return null;
  }
  return port;
}

function portUnavailable(port: number) {
  // TODO
  return false;
}

export function tagIsValid(tag: string) {
  // TODO: Auto-fetch and compare against all available minor versions between min/max major
  if (tag[0] !== 'v') return false;
  const targetMajor = Number(tag.split('.')[1]); // pre-1.0
  const minMajor = Number(MIN_MAJOR_CONDUIT_VERSION.split('.')[1]); // pre-1.0
  const maxMajor = Number(MAX_MAJOR_CONDUIT_VERSION.split('.')[1]); // pre-1.0
  return !(isNaN(targetMajor) || targetMajor < minMajor || targetMajor > maxMajor);
}
