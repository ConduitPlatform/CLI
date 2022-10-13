import { CliUx, Command, Flags } from '@oclif/core';
import { DeployStart } from './start';
import { DeployUpdate } from './update';
import {
  abortAsFriends,
  assertValidConduitTag,
  compareTags,
  deploymentIsRunning,
  getActiveDeploymentTagOrUndefined,
  getAvailableTags,
  selectConduitTag,
} from '../../deploy/utils';
import { Setup } from '../../deploy/Setup';
import { TagComparison } from '../../deploy/types';
import { booleanPrompt } from '../../utils/cli';

export class DeploySetup extends Command {
  static description = 'Bootstrap a local Conduit deployment';
  static flags = {
    config: Flags.boolean({
      description: 'Enable manual deployment configuration',
    }),
    target: Flags.string({
      description: 'Specify target tag',
    }),
  };

  private userConfiguration!: boolean;
  private targetTag?: string;
  private conduitTags!: string[];

  async run() {
    const flags = (await this.parse(DeployUpdate)).flags;
    this.userConfiguration = flags.config ?? false;
    this.targetTag = flags.target;
    // Get Available Conduit Releases
    this.conduitTags = await getAvailableTags('Conduit');
    if (this.targetTag) {
      assertValidConduitTag(this.conduitTags, this.targetTag);
    }
    // Check Deployment Status
    const activeTag = getActiveDeploymentTagOrUndefined(this);
    if (activeTag) {
      await this.handleExistingDeployment(activeTag);
    } else {
      const conduitTag = await selectConduitTag(
        this.conduitTags,
        this.userConfiguration,
        this.targetTag,
      );
      const setup = new Setup(this, this.userConfiguration, conduitTag);
      await setup.setupEnvironment();
      await DeployStart.run();
    }
  }

  private async handleExistingDeployment(activeTag: string) {
    CliUx.ux.log(`You already have a deployed Conduit (${activeTag}) environment.`);
    const latestStable = await selectConduitTag(this.conduitTags, false);
    const tagComparison = compareTags(activeTag, latestStable);
    if (tagComparison === TagComparison.SecondIsNewer) {
      // Update Available
      CliUx.ux.log(
        'Our dedicated team of highly trained marsupials ' +
          `has detected an available update (${latestStable}).`,
      );
      const update = await booleanPrompt('Do you wish to upgrade your deployment?');
      if (!update) abortAsFriends();
      const updateArgs = [
        ...(this.userConfiguration ? ['--config'] : []),
        ...(this.targetTag ? ['--target', this.targetTag] : []),
      ];
      await DeployUpdate.run(updateArgs);
    } else {
      // No Update Available
      let start: boolean;
      if (await deploymentIsRunning(this)) {
        start = await booleanPrompt(
          'Do you wish to restart your already running deployment?',
        );
      } else {
        start = await booleanPrompt('Do you wish to start your deployment?', 'yes');
      }
      if (!start) abortAsFriends();
      await DeployStart.run();
    }
  }
}
