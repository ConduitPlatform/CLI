import { Command, CliUx } from '@oclif/core';
import * as path from 'path';
import * as fs from 'fs-extra';

export function listLocalDeployments(command: Command) {
  const deploymentBasePath = path.join(command.config.configDir, 'deploy');
  return fs.readdirSync(deploymentBasePath).filter(file => {
    return fs.statSync(path.join(deploymentBasePath, file)).isFile();
  });
}

export function getDeploymentPaths(command: Command, tag: string) {
  const manifestPath = path.join(command.config.cacheDir, 'deploy', 'manifests', tag);
  const deploymentPath = path.join(command.config.configDir, 'deploy', tag);
  const composePath = path.join(manifestPath, 'compose.yml');
  const envPath = path.join(manifestPath, 'env');
  if (
    !fs.existsSync(manifestPath) ||
    !fs.existsSync(deploymentPath) ||
    !fs.existsSync(envPath)
  ) {
    CliUx.ux.error(
      `Target deployment "${tag}" does not exist. Did you run deploy setup?`,
    );
    CliUx.ux.exit(-1);
  }
  return { manifestPath, deploymentPath, composePath, envPath };
}
