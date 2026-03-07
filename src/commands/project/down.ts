import { Command, Flags, ux } from '@oclif/core';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as dotenv from 'dotenv';
import { Docker } from '../../docker';
import {
  readManifest,
  getProfilesFromManifest,
  CONDUIT_DIR,
} from '../../conduit-manifest';
import { failPrecondition } from '../../utils/commandErrors';

export class ProjectDown extends Command {
  static description = 'Stop local Conduit started from .conduit/conduit.yml';

  static flags = {
    dir: Flags.string({
      description: 'Path to .conduit directory',
      default: CONDUIT_DIR,
    }),
  };

  async run() {
    const { flags } = await this.parse(ProjectDown);
    const cwd = process.cwd();
    const conduitDir = path.resolve(cwd, flags.dir);
    const manifest = readManifest(conduitDir);
    if (!manifest) {
      failPrecondition(
        this,
        `No ${flags.dir}/conduit.yml found.`,
        'Run `conduit project init`.',
      );
    }
    Docker.getInstance();
    const tag = manifest.version === 'latest' ? 'main' : manifest.version;
    const manifestBasePath = path.join(this.config.cacheDir, 'deploy', 'manifests');
    const manifestDir = path.join(manifestBasePath, tag);
    if (!fs.existsSync(path.join(manifestDir, 'compose.yml'))) {
      failPrecondition(
        this,
        'Compose files are not cached.',
        'Run `conduit project up` first.',
      );
    }
    dotenv.config({ path: path.join(manifestDir, 'env') });
    const projectName = `conduit-${path.basename(cwd).replace(/\W/g, '-')}`;
    const env = {
      ...process.env,
      COMPOSE_PROJECT_NAME: projectName,
    };
    const profiles = getProfilesFromManifest(manifest);
    const docker = Docker.getInstance();
    ux.action.start('Stopping Conduit');
    const result = await docker.compose.stop({
      cwd: manifestDir,
      env,
      profiles,
      log: true,
    });
    ux.action.stop(result.exitCode === 0 ? 'Done' : 'Failed');
    if (result.exitCode !== 0) {
      this.error(result.stderr || 'docker compose stop failed', { exit: 1 });
    }
  }
}
