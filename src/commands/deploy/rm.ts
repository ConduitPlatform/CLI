import { Command } from '@oclif/core';

export class DeployRemove extends Command {
  static description = 'Removes a Conduit deployment';

  async run() {
    console.log('Running Deploy Remove');
  }
}
