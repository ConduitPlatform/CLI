import { PackageImage } from './constants';
import { ConduitPackageConfiguration, Package } from './types';
import { Docker } from '../docker/Docker';
import { Command } from '@oclif/command';
import { kebabCase } from 'lodash';
import * as fs from 'fs-extra';
import * as path from 'path';

export async function retrieveDemoConfig(command: Command): Promise<ConduitPackageConfiguration> {
  return await fs.readJSON(path.join(command.config.configDir, 'demo.json'))
    .catch(() => { throw new Error('No demo configuration available'); });
}

export function getNetworkName(config: ConduitPackageConfiguration) {
  return config.networkName;
}

export function getImageName(packageName: Package) {
  return PackageImage[packageName];
}

export function getContainerName(packageName: Package) {
  return packageName === 'Core' ? 'conduit' : `conduit-${kebabCase(packageName)}`;
}

export async function demoIsDeployed(command: Command) {
  try {
    await fs.access(path.join(command.config.configDir, 'demo.json'));
    return true
  } catch {
    return false
  }
}

export async function demoIsRunning(docker: Docker, config: ConduitPackageConfiguration) {
  for (const pkg of Object.keys(config.packages) as Package[]) {
    if (await docker.containerExists(pkg, false, true)) {
      return true;
    }
  }
  return false;
}
