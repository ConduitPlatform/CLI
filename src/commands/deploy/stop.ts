import { Command } from '@oclif/core';

export class DeployStop extends Command {
  static description = 'Removes a Conduit deployment';

  async run() {
    console.log('Running Deploy Stop');
  }
}