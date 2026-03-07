import { Command, Flags } from '@oclif/core';
import * as path from 'path';
import * as fs from 'fs-extra';
import { Docker } from '../../docker';
import { readManifest, CONDUIT_DIR } from '../../conduit-manifest';
import { getRequestClient } from '../../utils/requestUtils';
import { readStateFromFiles } from '../../utils/stateFiles';
import { computeStateDiff, hasStateDrift } from '../../utils/stateDiff';
import { raiseCommandError } from '../../utils/commandErrors';

export class ProjectStatus extends Command {
  static description = 'Show Conduit project and deployment status';

  static flags = {
    dir: Flags.string({
      description: 'Path to .conduit directory',
      default: CONDUIT_DIR,
    }),
    drift: Flags.boolean({
      description: 'Compare local .conduit state with the running deployment',
      default: false,
    }),
  };

  async run() {
    const { flags } = await this.parse(ProjectStatus);
    const conduitDir = path.resolve(process.cwd(), flags.dir);
    const manifest = readManifest(conduitDir);
    if (!manifest) {
      this.log(`No ${flags.dir}/conduit.yml found.`);
      return;
    }
    this.log('Manifest:');
    this.log(`  version: ${manifest.version}`);
    this.log(`  database: ${manifest.database}`);
    this.log(`  modules: ${(manifest.modules ?? []).join(', ') || 'none'}`);
    const docker = Docker.getInstance();
    const running = await docker.containerIsUp('conduit');
    this.log(`\nDeployment: ${running ? 'running' : 'stopped'}`);
    const hasConfigs = fs.existsSync(path.join(conduitDir, 'configs'));
    const hasModules = fs.existsSync(path.join(conduitDir, 'modules'));
    if (hasConfigs) this.log('State: configs/ present');
    if (hasModules) this.log('State: modules/ present');

    if (flags.drift) {
      if (!hasConfigs && !hasModules) {
        this.log('Drift: skipped (no local state files found).');
        return;
      }
      this.log('\nDrift: checking...');
      let requestClient;
      try {
        requestClient = await getRequestClient(this);
      } catch (error) {
        raiseCommandError(this, 'Credential recovery for drift check', error);
      }
      let remote;
      try {
        remote = await requestClient.stateExport();
      } catch (error) {
        raiseCommandError(this, 'Remote state export for drift check', error);
      }
      const local = await readStateFromFiles(conduitDir);
      const summary = computeStateDiff(local, remote);
      const driftDetected = hasStateDrift(summary);
      this.log(`Drift: ${driftDetected ? 'detected' : 'clean'}`);
    }
  }
}
