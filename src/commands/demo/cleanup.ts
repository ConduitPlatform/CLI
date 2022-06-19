import { Package } from '../../demo/types';
import { retrieveDemoConfig, getNetworkName, demoIsRunning } from '../../demo/utils';
import { Docker } from '../../docker/Docker';
import { booleanPrompt } from '../../utils/cli';
import { Command, flags } from '@oclif/command';
import DemoStop from './stop';
import * as fs from 'fs-extra';
import * as path from 'path';

export default class DemoCleanup extends Command {
  static description = 'Removes your local Conduit demo deployment';
  static flags = {
    silent: flags.boolean(),
  };

  private silent: boolean = false;

  async run() {
    this.silent = this.parse(DemoCleanup).flags.silent;

    // Retrieve Demo Configuration
    const demoConfiguration = await retrieveDemoConfig(this)
      .catch(() => {
        if (!this.silent) console.log('No Conduit demo available. Nothing to do here.');
        process.exit(0);
      });

    // Stop Demo
    const docker = new Docker(getNetworkName(demoConfiguration));
    let stopDemo = false;
    if (await demoIsRunning(docker, demoConfiguration)) {
      stopDemo = await booleanPrompt(
        'Proceeding will terminate an active demo deployment. Continue?',
        this.silent ? 'yes' : 'no',
        this.silent,
      );
      if (!stopDemo) {
        if (!this.silent) console.log('Cleanup canceled');
        process.exit(0);
      }
    }

    // Remove Containers and Images
    const removeImages = await booleanPrompt(
      'Delete container images?',
      'no',
      this.silent,
    );
    if (stopDemo) {
      await DemoStop.run(this.silent ? ['--silent'] : []);
    }
    if (!this.silent) console.log('Cleaning up containers' + (removeImages ? ' and images' : ''));
    for (const pkg of Object.keys(demoConfiguration.packages)) {
      await docker.rm(pkg as Package, this.silent);
      if (removeImages) await docker.rmi(pkg as Package, demoConfiguration.packages[pkg].tag, this.silent);
    }
    await docker.removeNetwork(this.silent);

    // Delete Demo Configuration
    this.deleteDemoConfig(this);
  }

  private deleteDemoConfig(command: Command) {
    fs.unlinkSync(path.join(command.config.configDir, 'demo.json'));
  }
}
