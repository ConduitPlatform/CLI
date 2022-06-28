import { Command } from '@oclif/core';
import * as path from 'path';

export function getDeploymentManifestPath(command: Command, name: string, tag: string) {
  if (name.startsWith('@')) {
    const [scope, pkgName] = name.split('/');
    return path.resolve(command.config.configDir, 'deploy', 'manifests', 'deployments', scope, pkgName, tag);
  }
  return path.resolve(command.config.configDir, 'deploy', 'manifests', 'deployments', name, tag);
}

export function getPackageManifestPath(command: Command, name: string, tag: string) {
  if (name.startsWith('@')) {
    const [scope, pkgName] = name.split('/');
    return path.resolve(command.config.configDir, 'deploy', 'manifests', 'packages', scope, pkgName, tag);
  }
  return path.resolve(command.config.configDir, 'deploy', 'manifests', 'packages', name, tag);
}
