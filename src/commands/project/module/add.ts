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

const OPTIONAL_MODULES = [
  'chat',
  'email',
  'forms',
  'push-notifications',
  'sms',
  'storage',
];

export class ProjectModuleAdd extends Command {
  static description = 'Add an optional module to .conduit/conduit.yml';

  static examples = [`$ conduit project module add chat`];

  static flags = {
    dir: Flags.string({
      description: 'Path to .conduit directory',
      default: CONDUIT_DIR,
    }),
  };

  static args = {
    name: Args.string({
      description: 'Module name to add',
      required: true,
      options: OPTIONAL_MODULES,
    }),
  };

  async run() {
    const { flags, args } = await this.parse(ProjectModuleAdd);
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
    if (!OPTIONAL_MODULES.includes(name)) {
      failPrecondition(
        this,
        `Unknown module: ${name}.`,
        `Supported modules: ${OPTIONAL_MODULES.join(', ')}.`,
      );
    }
    const modules = manifest.modules ?? [];
    if (modules.includes(name)) {
      this.log(`Module ${name} is already enabled.`);
      return;
    }
    modules.push(name);
    manifest.modules = modules;
    await writeManifest(manifest, conduitDir);
    this.log(`Added ${name} to .conduit/conduit.yml`);
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
        const result = await docker.compose.up({
          cwd: manifestDir,
          env,
          profiles: getProfilesFromManifest(manifest),
          log: true,
        });
        if (result.exitCode === 0) {
          this.log(`Started module ${name}.`);
        }
      }
    }
  }
}
