import { Args, Command, Flags } from '@oclif/core';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as dotenv from 'dotenv';
import { Docker } from '../../../docker';
import {
  readManifest,
  writeManifest,
  getProfilesFromManifest,
  CONDUIT_DIR,
} from '../../../conduit-manifest';
import { failPrecondition } from '../../../utils/commandErrors';

export class ProjectModuleRm extends Command {
  static description = 'Remove an optional module from .conduit/conduit.yml';

  static examples = [`$ conduit project module rm chat`];

  static flags = {
    dir: Flags.string({
      description: 'Path to .conduit directory',
      default: CONDUIT_DIR,
    }),
  };

  static args = {
    name: Args.string({
      description: 'Module name to remove',
      required: true,
    }),
  };

  async run() {
    const { flags, args } = await this.parse(ProjectModuleRm);
    const conduitDir = path.resolve(process.cwd(), flags.dir);
    const manifest = readManifest(conduitDir);
    if (!manifest) {
      failPrecondition(
        this,
        `No ${flags.dir}/conduit.yml found.`,
        'Run `conduit project init`.',
      );
    }
    const name = args.name.toLowerCase();
    const modules = manifest.modules ?? [];
    const idx = modules.indexOf(name);
    if (idx === -1) {
      this.log(`Module ${name} is not in the manifest.`);
      return;
    }
    modules.splice(idx, 1);
    manifest.modules = modules;
    await writeManifest(manifest, conduitDir);
    this.log(`Removed ${name} from .conduit/conduit.yml`);
    const docker = Docker.getInstance();
    const running = await docker.containerIsUp('conduit');
    if (running) {
      const tag = manifest.version === 'latest' ? 'main' : manifest.version;
      const manifestDir = path.join(this.config.cacheDir, 'deploy', 'manifests', tag);
      if (fs.existsSync(path.join(manifestDir, 'compose.yml'))) {
        dotenv.config({ path: path.join(manifestDir, 'env') });
        const cwd = process.cwd();
        const projectName = `conduit-${path.basename(cwd).replace(/\W/g, '-')}`;
        const env = { ...process.env, COMPOSE_PROJECT_NAME: projectName };
        const result = await docker.compose.stop({
          cwd: manifestDir,
          env,
          profiles: getProfilesFromManifest(manifest),
          log: true,
        });
        if (result.exitCode === 0) {
          const upResult = await docker.compose.up({
            cwd: manifestDir,
            env,
            profiles: getProfilesFromManifest(manifest),
            log: true,
          });
          if (upResult.exitCode === 0) {
            this.log('Deployment updated.');
          }
        }
      }
    }
  }
}
