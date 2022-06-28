import { Command, CliUx } from '@oclif/core';
import { DeploymentManifest, PackageManifest } from './types';
import { getDeploymentManifestPath, getPackageManifestPath } from './utils';
import * as fs from 'fs-extra';
import * as path from 'path';

export class ManifestManager {
  private readonly command: Command;
  private readonly deploymentManifestPath: string;
  private readonly packageManifestPath: string;
  private _localDeploymentManifests: Map<string, string[]> = new Map(); // deployment, tags[]
  // private _localPackageManifests: Map<string, string[]> = new Map(); // package, tags[]
  private selectedDeploymentManifest?: {
    jsonManifest: DeploymentManifest,
    preRunScriptPath?: string,
    postRunScriptPath?: string,
    globalValidatorPath?: string,
  };
  private selectedPackageManifests: Map<string, {
    jsonManifest: PackageManifest,
    preRunScriptPath?: string,
    postRunScriptPath?: string,
    validators: Map<string, string>, // name, path (includes globalValidator)
  }> = new Map();

  constructor(command: Command) {
    this.command = command;
    this.deploymentManifestPath = path.resolve(command.config.configDir, 'deploy', 'manifests', 'deployments');
    this.packageManifestPath = path.resolve(command.config.configDir, 'deploy', 'manifests', 'packages');
    this.getLocalDeploymentManifests();
  }

  private get localDeploymentManifests() {
    if ([...this._localDeploymentManifests.keys()].length === 0) {
      CliUx.ux.error('No manifest files available.');
      CliUx.ux.exit(-1);
    }
    return this._localDeploymentManifests;
  }

  /** Selects target deployment, retrieves manifest files, runs validations. */
  async selectDeployment(deployment: string, tag: string) {
    CliUx.ux.log(`Selected Deployment: ${deployment}:${tag}`);
    await this.processDeploymentManifest(deployment, tag);
    // Override Package Configurations
    for (const pkg of this.selectedDeploymentManifest!.jsonManifest.packages) {
      await this.processPackageManifest(pkg.name, pkg.tag);
      const pkgName = pkg.name;
      const pkgManifest = this.selectedPackageManifests.get(pkgName)!;
      // Apply Package Configuration Updates
      const pkgEnv = pkg.defaultConfiguration?.env;
      const pkgPorts = pkg.defaultConfiguration?.ports;
      const pkgFeatures = pkg.defaultConfiguration?.features;
      if (pkgEnv) {
        pkgManifest.jsonManifest.defaultConfiguration.env = pkgEnv;
      }
      if (pkgPorts) {
        pkgManifest.jsonManifest.defaultConfiguration.ports = pkgPorts;
      }
      if (pkgFeatures) {
        pkgManifest.jsonManifest.defaultConfiguration.features = pkgFeatures;
      }
      // TODO: If userConfig => let user override stuff too
      // Set Validators
      const packageManifestPath = getPackageManifestPath(this.command, deployment, tag);
      pkgManifest.jsonManifest.features.forEach(feature => {
        if (feature.validator) {
          if (!feature.validator.endsWith('.js')) {
            CliUx.ux.error(
              `Package manifest validation failed for ${packageManifestPath}\n` +
                `Invalid validator reference: ${feature.validator}!`,
              {
                exit: -1,
                suggestions: [ // TODO: Replace this with a user-targeted suggestion post-devel
                  'Validator references should match the exact filename of the Js file (ex: validPort.js)'
                ],
              },
            );
          }
          const manifestPath = getPackageManifestPath(this.command, pkgName, tag);
          const validatorPath = path.resolve(manifestPath, 'validators', feature.validator);
          if (!fs.pathExistsSync(validatorPath)) {
            CliUx.ux.error(
              `Package manifest validation failed for ${packageManifestPath}\n` +
                `Requested validator script does not exist: ${path}!`,
              { exit: -1 },
            );
          }
          pkgManifest.validators.set(feature.validator, validatorPath);
        }
      });
    }

    // Run Validations
    CliUx.ux.log('\nValidations Configuration...');
    if (this.selectedDeploymentManifest!.globalValidatorPath) {
      await this.runValidator(this.selectedDeploymentManifest?.globalValidatorPath!);
    }
    for (const pkg of this.selectedPackageManifests.keys()) {
      for (const [_, path] of this.selectedPackageManifests.get(pkg)!.validators) {
        await this.runValidator(path);
      }
    }
  }

  async runValidator(scriptPath: string) {
    const type = scriptPath.startsWith(this.deploymentManifestPath) ? 'deployment' : 'package';
    const relativePath = scriptPath.split(
      type === 'deployment' ? this.deploymentManifestPath : this.packageManifestPath
    )[1].slice(1);
    CliUx.ux.log(`Running ${type} validator: ${relativePath}`);
    await require(scriptPath).run(); // TODO: Pass in context
  }

  async processDeploymentManifest(deployment: string, tag: string) {
    await this._processManifest('Deployment', deployment, tag);
  }

  async processPackageManifest(pkg: string, tag: string) {
    await this._processManifest('Package', pkg, tag);
  }

  private async _processManifest(
    type: 'Deployment' | 'Package',
    target: string,
    tag: string,
  ) {
    const manifestPath = type === 'Deployment'
      ? getDeploymentManifestPath(this.command, target, tag)
      : getPackageManifestPath(this.command, target, tag);
    if (!fs.existsSync(path.resolve(manifestPath))) {
      CliUx.ux.log(`Could not locate ${target}:${tag} ${type} manifest locally.`);
      // TODO: Attempt fetching...
    }
    const jsonManifestPath = path.resolve(manifestPath, 'manifest.json');
    if (!fs.existsSync(jsonManifestPath)) {
      CliUx.ux.error(
        `${type} manifest validation failed for ${manifestPath}\n` +
          `JSON manifest file does not exist!`,
        {exit: -1},
      );
    }
    const jsonManifest: DeploymentManifest | PackageManifest = await fs.readJSON(jsonManifestPath);
    // Validator Script Availability Checks
    const preRunScriptPath = path.resolve(manifestPath, 'preRun.js');
    const preRunExists = fs.pathExistsSync(preRunScriptPath);
    if (jsonManifest.preRunScript && !preRunExists) {
      CliUx.ux.error(
        `${type} manifest validation failed for ${manifestPath}\n` +
          `Requested preRun script does not exist!`,
        {exit: -1},
      );
    }
    if (!jsonManifest.preRunScript && preRunExists) {
      CliUx.ux.error(
        `${type} manifest validation failed for ${manifestPath}\n` +
          `Found preRun script with none being requested in the manifest!`,
        {exit: -1},
      );
    }
    const postRunScriptPath = path.resolve(manifestPath, 'postRun.js');
    const postRunExists = fs.pathExistsSync(postRunScriptPath);
    if (jsonManifest.postRunScript && !postRunExists) {
      CliUx.ux.error(
        `${type} manifest validation failed for ${manifestPath}\n` +
          `Requested postRun script does not exist!`,
        {exit: -1},
      );
    }
    if (!jsonManifest.postRunScript && postRunExists) {
      CliUx.ux.error(
        `${type} manifest validation failed for ${manifestPath}\n` +
          `Found postRun script with none being requested in the manifest!`,
        {exit: -1},
      );
    }
    // Set Global Validator
    const globalValidatorScriptPath = path.resolve(manifestPath, 'validators', '_global.js');
    const globalValidatorExists = fs.pathExistsSync(globalValidatorScriptPath);
    if (jsonManifest.globalValidationScript && !globalValidatorExists) {
      CliUx.ux.error(
        `${type} manifest validation failed for ${manifestPath}\n` +
          `Requested global validator script does not exist!`,
        {exit: -1},
      );
    }
    if (!jsonManifest.globalValidationScript && globalValidatorExists) {
      CliUx.ux.error(
        `${type} manifest validation failed for ${manifestPath}\n` +
          `Found global validator script with none being requested in the manifest!`,
        {exit: -1},
      );
    }
    // Store Manifest Data
    if (type === 'Deployment') {
      this.selectedDeploymentManifest = {
        jsonManifest: jsonManifest as DeploymentManifest,
        preRunScriptPath,
        postRunScriptPath,
        ...(jsonManifest.globalValidationScript && {globalValidatorScriptPath}),
      };
    } else {
      this.selectedPackageManifests.set(jsonManifest.name, {
        jsonManifest: jsonManifest as PackageManifest,
        preRunScriptPath,
        postRunScriptPath,
        validators: new Map( // further populated after features have been overridden by deployment/user
          jsonManifest.globalValidationScript ? [['_global.ts', globalValidatorScriptPath]] : []
        ),
      });
    }
  }

  get latestStableDeploymentManifest() {
    // TODO: This is not sorted yet!
    const conduitManifests = this.localDeploymentManifests.get('@conduitplatform/conduit');
    if (!conduitManifests || conduitManifests.length < 1) {
      CliUx.ux.error('No @conduitplatform/conduit deployment manifests available!');
      CliUx.ux.exit(-1);
    }
    return {
      deployment: '@conduitplatform/conduit',
      tag: conduitManifests[0],
    };
  }

   /** Returns all the individual deployment manifest entries available on the system. */
  getLocalDeploymentManifests() {
    const manifestTargets = fs.readdirSync(this.deploymentManifestPath, {withFileTypes: true})
      .filter(child => child.isDirectory())
      .map(dirent => dirent.name);
    let index = 0;
    while (index < manifestTargets.length) {
      const manifest = manifestTargets[index];
      if (manifest.startsWith('@')) {
        const pkgDirs = fs.readdirSync(
          path.resolve(this.deploymentManifestPath, manifest),
          { withFileTypes: true },
        )
          .filter(child => child.isDirectory())
          .map(dirent => `${manifest}/${dirent.name}`);
        if (pkgDirs.length > 0) {
          manifestTargets.splice(index, 1, ...pkgDirs);
          index += pkgDirs.length - 1;
        } else {
          CliUx.ux.error(`Scoped deployment directory ${manifest} contains no deployment manifests!`);
          CliUx.ux.exit(-1);
        }
      }
      index++;
    }
    this._localDeploymentManifests.clear();
    manifestTargets.forEach(target => {
      const pkgPath = path.resolve(this.deploymentManifestPath, ...target.split('/'));
      const tags = fs.readdirSync(pkgPath, { withFileTypes: true })
        .filter(child => child.isDirectory())
        .map(dirent => dirent.name);
      tags.forEach(tag => {
        if (!this._localDeploymentManifests.has(target)) {
          this._localDeploymentManifests.set(target, [tag]);
        } else {
          this._localDeploymentManifests.get(target)!.push(tag);
        }
      });
    });
    return this.localDeploymentManifests;
  }

  // Remote Registry Tooling
  /** Fetches the latest stable deployment manifest of @conduitplatform/conduit */
  async fetchDefaultDeploymentManifest() {
    // TODO
    return Promise.resolve(null);
  }

  /** Fetches a remote package manifest object from the registry. */
  private async fetchPackageManifest(pkg: string, tag: string): Promise<PackageManifest | null> {
    // TODO
    return Promise.resolve(null);
  }

  /** Fetches a remote deployment manifest object from the registry. */
  private async fetchDeploymentManifest(deployment: string, tag: string): Promise<DeploymentManifest | null> {
    // TODO
    return Promise.resolve(null);
  }
}


// TODO:
// -- pre/postRun scripts
// -- run by DeploymentManager, in order
// todo() {
//   const preRunScript = jsonManifest.preRunScript ? await require(path.resolve(manifestPath, 'preRun.js')) : null;
//   const postRunScript = jsonManifest.postRunScript ? await require(path.resolve(manifestPath, 'postRun.js')) : null;
//   if (type === 'Deployment') {
//     this.selectedDeploymentManifest = {
//       jsonManifest: jsonManifest as DeploymentManifest,
//       preRunScript,
//       postRustring
//     };
//   } else {
//     this.selectedPackageManifests.set(jsonManifest.name, {
//       jsonManifest: jsonManifest as PackageManifest,
//       preRunScript,
//       postRunScript,
//     });
//   }
// }