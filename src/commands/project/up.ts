import { Command, Flags, ux } from '@oclif/core';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as dotenv from 'dotenv';
import { Docker } from '../../docker';
import { waitForHealthy } from '../../docker/health';
import { pullComposeFiles } from '../../docker/files';
import {
  readManifest,
  getProfilesFromManifest,
  CONDUIT_DIR,
} from '../../conduit-manifest';
import { getRequestClient } from '../../utils/requestUtils';
import { readStateFromFiles } from '../../utils/stateFiles';
import {
  ensureLocalAuthForProjectUp,
  explainStateApplyFailure,
} from '../../utils/localAuthBootstrap';
import { failPrecondition } from '../../utils/commandErrors';

export class ProjectUp extends Command {
  static description = 'Start local Conduit from .conduit/conduit.yml';

  static flags = {
    dir: Flags.string({
      description: 'Path to .conduit directory',
      default: CONDUIT_DIR,
    }),
    'no-state-push': Flags.boolean({
      description: 'Do not run state push after UI is healthy',
      default: false,
    }),
  };

  async run() {
    const { flags } = await this.parse(ProjectUp);
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
    const composeFilesTag = manifest.version === 'latest' ? 'main' : manifest.version;
    const imageTag = manifest.version;
    const manifestBasePath = path.join(this.config.cacheDir, 'deploy', 'manifests');
    const manifestDir = path.join(manifestBasePath, composeFilesTag);
    try {
      await pullComposeFiles(composeFilesTag, manifestDir);
    } catch (e) {
      this.error(`Failed to download compose files: ${(e as Error).message}`, {
        exit: 1,
      });
    }
    const envPath = path.join(manifestDir, 'env');
    const processEnv = JSON.parse(JSON.stringify(process.env));
    process.env = {};
    dotenv.config({ path: envPath });
    const projectName = `conduit-${path.basename(cwd).replace(/\W/g, '-')}`;
    const env = {
      ...JSON.parse(JSON.stringify(process.env)),
      COMPOSE_PROJECT_NAME: projectName,
      IMAGE_TAG: imageTag,
      UI_IMAGE_TAG: imageTag,
    };
    if (!env.DOCKER_DEFAULT_PLATFORM && process.arch === 'arm64') {
      env.DOCKER_DEFAULT_PLATFORM = 'linux/amd64';
    }
    if (manifest.database === 'postgres') {
      env.DB_CONN_URI = 'postgres://conduit:pass@conduit-postgres:5432/conduit';
      env.DB_TYPE = 'postgres';
      env.DB_PORT = '5432';
    }
    process.env = processEnv;
    const profiles = getProfilesFromManifest(manifest);
    const docker = Docker.getInstance();
    ux.action.start('Starting Conduit');
    const result = await docker.compose.up({
      cwd: manifestDir,
      env,
      profiles,
      log: true,
    });
    ux.action.stop(result.exitCode === 0 ? 'Done' : 'Failed');
    if (result.exitCode !== 0) {
      this.error(result.stderr || 'docker compose up failed', { exit: 1 });
    }
    ux.action.start('Waiting for UI');
    const healthy = await waitForHealthy({
      url: 'http://localhost:8080',
      timeoutMs: 120_000,
    });
    ux.action.stop(healthy ? 'Ready' : 'Timeout');
    if (!flags['no-state-push']) {
      const configsPath = path.join(conduitDir, 'configs');
      const modulesPath = path.join(conduitDir, 'modules');
      if (fs.existsSync(configsPath) || fs.existsSync(modulesPath)) {
        try {
          await ensureLocalAuthForProjectUp(this, env);
          const requestClient = await getRequestClient(this);
          const body = await readStateFromFiles(conduitDir);
          await requestClient.stateImport(body);
          this.log('State applied from .conduit/');
        } catch (error) {
          this.log(explainStateApplyFailure(error));
        }
      }
    }
    this.log('\nConduit UI: http://localhost:8080');
  }
}
