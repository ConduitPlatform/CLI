import { CliUx, Command, Flags } from '@oclif/core';
import { TagComparison } from '../../deploy/types';
import {
  abortAsEnemies,
  compareTags,
  getActiveDeploymentTag,
  getActiveDeploymentUiTag,
  getAvailableTags,
  getMatchingUiTag,
  selectConduitTag,
} from '../../deploy/utils';
import { booleanPrompt } from '../../utils/cli';
import { DeployRemove } from './rm';
import { DeployStart } from './start';
import { CliUpdate } from '../cli/update';
import { Setup } from '../../deploy/Setup';
import { Docker } from '../../docker';

export class DeployUpdate extends Command {
  static description = 'Update your local Conduit deployment';
  static flags = {
    config: Flags.boolean({
      description: 'Enable manual deployment configuration',
    }),
    target: Flags.string({
      description: 'Specify target tag',
    }),
  };

  private targetConduitTag!: string;
  private wipeData: boolean = false;

  async run() {
    await CliUpdate.displayUpdateHint(this);
    const flags = (await this.parse(DeployUpdate)).flags;
    const userConfiguration = flags.config ?? false;
    const targetTag = flags.target;
    Docker.getInstance(); // init or fail early
    // Retrieve Target Deployment
    const currentConduitTag = getActiveDeploymentTag(this);
    // Get Available Conduit Releases
    const conduitTags = await getAvailableTags('Conduit');
    this.targetConduitTag = await selectConduitTag(
      conduitTags,
      userConfiguration,
      targetTag,
    );
    // Check For Updates
    const tagComparison = await this.availableUpdate(currentConduitTag);
    // Compare Tags
    if (tagComparison === TagComparison.FirstIsNewer) {
      // Current tag is more recent => Redeploy, Wipe Data
      CliUx.ux.log(
        `You are about to downgrade your deployment from '${currentConduitTag}' to '${this.targetConduitTag}' 🤔`,
      );
      CliUx.ux.log('Continuing will replace existing deployment, wiping your data 🗑️');
      this.wipeData = true;
    } else if (tagComparison === TagComparison.SecondIsNewer) {
      // Current tag is older => Update, Persist Data
      CliUx.ux.log('Continuing will update existing deployment, preserving your data ✅');
    } else if (tagComparison === TagComparison.Equal) {
      // Same tag => Redeploy, Persist Data
      CliUx.ux.log(
        'Continuing will replace existing deployment, preserving your data ✅',
      );
    }
    const accept = await booleanPrompt(
      'Continue?',
      tagComparison === TagComparison.FirstIsNewer ? 'no' : 'yes',
    );
    if (!accept) {
      abortAsEnemies();
    }
    // Remove Existing Deployment
    const removeArgs = [...(this.wipeData ? ['--wipe-data'] : []), '--defaults'];
    await DeployRemove.run(removeArgs);
    // Setup New Deployment
    const setup = new Setup(this, userConfiguration, this.targetConduitTag);
    await setup.setupEnvironment();
    // Start New Deployment
    await DeployStart.startDeployment(
      this,
      this.targetConduitTag,
      setup.deploymentConfig,
    );
    // Update Deployment Configuration After Successful Start
    await setup.storeDeploymentConfig();
  }

  private async availableUpdate(currentConduitTag: string) {
    const uiTags = await getAvailableTags('Conduit-UI');
    const currentUiTag = getActiveDeploymentUiTag(this);
    const targetUiTag = await getMatchingUiTag(this.targetConduitTag, uiTags);
    const conduitTagComparison = compareTags(currentConduitTag, this.targetConduitTag);
    const conduitUpdate = conduitTagComparison === TagComparison.SecondIsNewer;
    const uiUpdate =
      compareTags(currentUiTag, targetUiTag) === TagComparison.SecondIsNewer;
    if (!conduitUpdate && !uiUpdate) {
      CliUx.ux.log('No Conduit updates available... 👍');
      CliUx.ux.exit(0);
    }
    if (conduitUpdate) {
      CliUx.ux.log(`Conduit Update:\t${currentConduitTag} -> ${this.targetConduitTag}`);
    }
    if (uiUpdate) {
      CliUx.ux.log(`Conduit-UI Update:\t${currentUiTag} -> ${targetUiTag}`);
    }
    return conduitTagComparison;
  }
}
