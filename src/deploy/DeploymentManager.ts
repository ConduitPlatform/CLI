import { Command } from '@oclif/core';
import { ManifestManager } from './ManifestManager';
import { DeploymentManifest, PackageManifest } from './types';
import * as fs from 'fs-extra';
import * as path from 'path';

interface Package extends PackageManifest {
  container: string,
}

interface Deployment extends DeploymentManifest {
  network: string,
}

export class DeploymentManager {
  private readonly deploymentConfigPath: string;
  private readonly manifestManager: ManifestManager;

  constructor(command: Command, manifestManager: ManifestManager) {
    this.deploymentConfigPath = path.resolve(command.config.configDir, 'deploy', 'deployments');
    this.manifestManager = manifestManager;
  }

  async run() {
    // 1. Get deployment and packages via ManifestManager
    // 2. Run any remaining Package and Deployment validations via ManifestManager
    // 3. Generate container names
    // 4. Generate network name
    // 5. Create network
    // 6. Specify env vars and ports based on features (how?)
    // 7. Run containers in order
    // 8. Display useful info
    // 9. Store deployment config
  }

  async start() {

  }

  async stop() {

  }

  async rm() {

  }

  listBootstrappedDeployments() {
    // TODO
  }

  private storeDeploymentConfig() {

  }

  private retrieveDeploymentConfig() {

  }
}
