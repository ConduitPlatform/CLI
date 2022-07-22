import { Command, CliUx } from '@oclif/core';
import { Docker } from '../docker';
import * as path from 'path';
import * as fs from 'fs-extra';
const { execSync } = require('child_process');

export async function listLocalDeployments(command: Command, running = false) {
  const deploymentBasePath = path.join(command.config.configDir, 'deploy');
  const deployments = fs.readdirSync(deploymentBasePath).filter(file => {
    return fs.statSync(path.join(deploymentBasePath, file)).isFile();
  });
  let onlineDeployments: string[];
  if (running) {
    onlineDeployments = [];
    for (const deployment of deployments) {
      if (await Docker.getInstance().containerIsUp(`conduit-${deployment}`)) {
        onlineDeployments.push(deployment);
      }
    }
  } else {
    onlineDeployments = deployments;
  }
  return onlineDeployments;
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

export function assertDockerComposeCompat() {
  try {
    const composeVersionString = execSync('docker-compose --version', {
      stdio: [],
    }).toString();
    if (composeVersionString.startsWith('docker-compose version')) return;
  } catch {}
  let exit = false;
  try {
    const output = execSync('docker compose --help', { stdio: [] }).toString();
    if (output.includes('Available Commands:')) {
      exit = true;
      CliUx.ux.log('Docker compose plugin (v2) is not yet supported');
      CliUx.ux.log('Please install docker-compose (v1) or set up a shell alias for it');
    }
  } catch {}
  if (exit) CliUx.ux.exit(-1);
  CliUx.ux.log('Please install docker-compose (v1)');
  CliUx.ux.exit(-1);
}
