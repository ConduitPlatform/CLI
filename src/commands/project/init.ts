import { Command, Flags } from '@oclif/core';
import * as path from 'path';
import { writeManifest, type ConduitManifest } from '../../conduit-manifest';
import { booleanPrompt, promptWithOptions } from '../../utils/cli';

export class ProjectInit extends Command {
  static description = 'Initialize a Conduit project (creates .conduit/conduit.yml)';

  static examples = [`$ conduit project init`, `$ conduit project init --dir .conduit`];

  static flags = {
    dir: Flags.string({
      description: 'Path to .conduit directory',
      default: '.conduit',
    }),
  };

  async run() {
    const { flags } = await this.parse(ProjectInit);
    const conduitDir = path.resolve(process.cwd(), flags.dir);
    const manifest: ConduitManifest = {
      version: 'latest',
      database: 'mongodb',
      modules: [],
    };
    const db = await promptWithOptions(
      'Select database engine',
      ['mongodb', 'postgres'],
      'mongodb',
      false,
    );
    manifest.database = db as 'mongodb' | 'postgres';
    const addModules = await booleanPrompt('Add optional modules now?', 'no');
    if (addModules) {
      const optional = ['chat', 'email', 'forms', 'push-notifications', 'sms', 'storage'];
      for (const mod of optional) {
        const enable = await booleanPrompt(`Enable ${mod}?`, 'no');
        if (enable) manifest.modules!.push(mod);
      }
    }
    await writeManifest(manifest, conduitDir);
    this.log(`Created ${conduitDir}/conduit.yml`);
  }
}
