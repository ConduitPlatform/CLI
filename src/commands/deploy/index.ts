import { Command, Flags } from '@oclif/core';
import { DeploymentManager, ManifestManager } from '../../deploy';
import { promptWithOptions } from '../../utils/cli';

// Process:
// 1. Pull / Create Package/Deployment Manifests
// 2. Run `conduit deploy setup DEPLOYMENT_NAME`
// 3. Search for local deployment package
// 4. Found ? Select it : Ask for search & pull from registry
// 5. Got a manifest? Continue : Exit
// 6. Look up all Package Manifests to be used
// 7. Pull missing ones if any
// 8. Got all of them? Continue : Exit
// 9. Run Validations *
// 10. Execute  pre-run script
// 11. Run Packages **
// 12. Execute post-run script
// 13. Store Configuration

// Validation (*)
// 1. Run Feature Validation Scripts
// 2. Validate Feature Package Dependencies against selected DeploymentManifest Packages
// 3. Run _global.ts (cross-arg validation script)

// Running Packages (**) (validators already finished before this stage)
// 1. Bring up non-running dependencies in specified order (recursion)
// 2. Execute pre-run script
// 3. Run actual package
// 4. Execute post-run script

export class DeployCreate extends Command {
  static description = 'Creates a new Conduit deployment';
  static flags = {
    config: Flags.boolean({
      description: 'Enable manual deployment configuration',
    }),
  };

  async run() {
    const userConfiguration = (await this.parse(DeployCreate)).flags.config;
    const manifestManager = new ManifestManager(this);
    await manifestManager.fetchDefaultDeploymentManifest();

    // Deployment Selection
    let { deployment: selectedDeployment, tag: selectedTag } = manifestManager.latestStableDeploymentManifest;
    if (!userConfiguration) {
      // TODO: More auto-selected stuff
    } else {
      const deploymentManifests = manifestManager.getLocalDeploymentManifests();
      selectedDeployment = await promptWithOptions(
        'Specify desired deployment target',
        [...deploymentManifests.keys()],
        selectedDeployment,
      );
      selectedTag = await promptWithOptions(
        'Specify desired deployment version',
        deploymentManifests.get(selectedDeployment)!,
        selectedTag,
      );
    }

    // Validate & Configure Deployment
    await manifestManager.selectDeployment(selectedDeployment, selectedTag);

    // Spin Up Deployment
    const deploymentManager = new DeploymentManager(this, manifestManager);
    await deploymentManager.run();

    // console.log('Running Deploy Create');
    //
    // // TEST

    // const { jsonManifest, preRunScriptPath, postRunScriptPath } = await manifestManager.parsePackageManifest(
    //   '@conduitplatform/conduit',
    //   '14.0',
    // );
    // if (preRunScriptPath) {
    //   await require(preRunScriptPath).run();
    // }
    // console.log('\n\nDO STUFF BETWEEN PRE-POST\n\n')
    // if (postRunScriptPath) {
    //   await require(postRunScriptPath).run();
    // }
    // await manifestManager.parsePackageManifest('redis', '7.0.2');
  }
}
