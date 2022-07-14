import { Command, CliUx } from '@oclif/core';
import { Docker } from '../docker';
import * as path from 'path';
import * as fs from 'fs-extra';

export async function listLocalDeployments(command: Command, running = false) {
  const deploymentBasePath = path.join(command.config.configDir, 'deploy');
  const deployments = fs.readdirSync(deploymentBasePath).filter(file => {
    return fs.statSync(path.join(deploymentBasePath, file)).isFile();
  });
  if (running) {
    for (const deployment of deployments) {
      if (!(await Docker.getInstance().containerIsUp(`conduit-${deployment}`))) {
        deployments.splice(deployments.indexOf(deployment));
      }
    }
  }
  return deployments;
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
