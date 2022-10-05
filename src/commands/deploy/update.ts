import { Command, CliUx, Flags } from '@oclif/core';
import { TagComparison } from '../../deploy/types';
import {
  compareTags,
  abortAsEnemies,
  getActiveDeploymentTag,
  getAvailableTags,
  selectConduitTag,
} from '../../deploy/utils';
import { booleanPrompt } from '../../utils/cli';
import { DeployRemove } from './rm';
import { DeployStart } from './start';
import { Setup } from '../../deploy/Setup';

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

  private conduitTag!: string;
  private wipeData: boolean = false;

  async run() {
    const flags = (await this.parse(DeployUpdate)).flags;
    const userConfiguration = flags.config ?? false;
    const targetTag = flags.target;
    // Retrieve Target Deployment
    const activeTag = getActiveDeploymentTag(this);
    // Get Available Conduit Releases
    const conduitTags = await getAvailableTags('Conduit');
    // Get Target Tag
    this.conduitTag = await selectConduitTag(conduitTags, userConfiguration, targetTag);
    if (activeTag === this.conduitTag) {
      CliUx.ux.log('No updates available... 👍');
      CliUx.ux.exit(0);
    }
    CliUx.ux.log(`Deployed Release:\t${activeTag}`);
    CliUx.ux.log(`Target Release:  \t${this.conduitTag}`);
    // Compare Tags
    const tagComparison = compareTags(activeTag, this.conduitTag);
    if (tagComparison === TagComparison.FirstIsNewer) {
      // Current tag is more recent => Redeploy, Wipe Data
      CliUx.ux.log(
        `You are about to downgrade your deployment from '${activeTag}' to '${this.conduitTag}' 🤔`,
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
    const accept = await booleanPrompt('Continue?', 'no');
    if (!accept) {
      abortAsEnemies();
    }
    // Remove Existing Deployment
    const removeArgs = [...(this.wipeData ? ['--wipe-data'] : []), '--defaults'];
    await DeployRemove.run(removeArgs);
    // Setup New Deployment
    const setup = new Setup(this, userConfiguration, this.conduitTag);
    await setup.setupEnvironment();
    // Run New Deployment
    await DeployStart.run();
  }
}
