import { Command, Flags } from '@oclif/core';
import * as path from 'path';
import { CONDUIT_DIR } from '../../conduit-manifest';
import { runDoctorChecks } from '../../utils/doctor';

export class ProjectDoctor extends Command {
  static description = 'Run local preflight checks for Conduit project workflows';

  static flags = {
    dir: Flags.string({
      description: 'Path to .conduit directory',
      default: CONDUIT_DIR,
    }),
  };

  async run() {
    const { flags } = await this.parse(ProjectDoctor);
    const conduitDir = path.resolve(process.cwd(), flags.dir);
    const checks = await runDoctorChecks(conduitDir);
    const failed = checks.filter(check => !check.ok);

    this.log('Conduit doctor checks:\n');
    for (const check of checks) {
      const status = check.ok ? '[OK]' : '[FAIL]';
      this.log(`${status} ${check.name}: ${check.details}`);
      if (!check.ok && check.fix) {
        this.log(`       fix: ${check.fix}`);
      }
    }

    if (failed.length > 0) {
      this.error(`Doctor found ${failed.length} failing check(s).`, { exit: 2 });
    }
  }
}
