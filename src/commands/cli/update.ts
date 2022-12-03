import { CliUx, Command } from '@oclif/core';
import { get } from 'https';
import { mkdir } from 'fs/promises';
import axios from 'axios';
import * as fs from 'fs-extra';
import * as path from 'path';
import { InstallationType } from '../../interfaces';
import { getInstallationType } from '../../utils/installation';
const { spawn } = require('child_process');
import chalk = require('chalk');

const SCRIPT_URL = 'https://getconduit.dev/bootstrap';

export class CliUpdate extends Command {
  static description = 'Update your CLI';

  private readonly scriptDownloadDir = this.config.cacheDir;
  private readonly scriptPath = path.join(this.scriptDownloadDir, 'get-conduit.sh');

  async run() {
    // Update Checks
    if (!CliUpdate.platformSupported()) {
      CliUx.ux.log('Self-managed CLI updates are not supported on your platform');
      CliUx.ux.exit(-1);
    }
    if (!(await CliUpdate.updateAvailable(this, false))) {
      CliUx.ux.log('No CLI updates available... 👍');
      CliUx.ux.exit(0);
    }
    this.handleInstallationType();
    // CLI Update (System)
    await this.downloadScript().catch(() => {
      CliUx.ux.error('Failed to retrieve update script.');
      CliUx.ux.exit(-1);
    });
    await this.executeScript().catch(() => {
      CliUx.ux.error('Failed update CLI.');
      CliUx.ux.exit(-1);
    });
    this.removeScript();
  }

  static platformSupported() {
    return ['linux', 'darwin'].includes(process.platform);
  }

  static async updateAvailable(command: Command, acceptCached = true) {
    const thisVersion = `v${command.config.version}`;
    const latestVersion = await CliUpdate.getLatestVersion(command, acceptCached);
    return thisVersion !== latestVersion;
  }

  private static async getLatestVersion(command: Command, acceptCached = true) {
    let cached: { version: string; timestamp: Date } | undefined;
    const versionCacheFile = path.join(
      command.config.cacheDir,
      'latest-gh-version-cache',
    );
    if (acceptCached) {
      cached = await fs.readJSON(versionCacheFile).catch(() => undefined);
      if (cached) {
        cached.timestamp = new Date(cached.timestamp);
        const thirtyMinutesAgo = new Date().getTime() - 30 * 60 * 1000;
        if (cached.timestamp.getTime() > thirtyMinutesAgo) {
          return cached.version;
        }
      }
    }
    const ghRes = await axios
      .get('https://api.github.com/repos/ConduitPlatform/CLI/releases/latest')
      .catch(() => {
        CliUx.ux.error('Could not retrieve latest CLI release info. Try again later.');
        CliUx.ux.exit(-1);
      });
    const latestVersion = ghRes.data.tag_name;
    cached = { version: latestVersion, timestamp: new Date() };
    await fs.writeJson(versionCacheFile, cached);
    return latestVersion;
  }

  static async displayUpdateHint(command: Command) {
    const updateAvailable = (await CliUpdate.updateAvailable(command).catch()) ?? false;
    if (!updateAvailable) return;
    const installationType = getInstallationType();
    CliUx.ux.log(`\n 📣 ${chalk.bgGreen.bold('   CLI Update Available   ')} 📣`);
    if (installationType === InstallationType.SYSTEM) {
      CliUx.ux.log(` ${chalk.italic('    Run: conduit cli update')} `);
    } else if (installationType === InstallationType.NPM) {
      CliUx.ux.log(` ${chalk.italic('        Install via npm')} `);
    }
    CliUx.ux.log('');
  }

  private handleInstallationType() {
    const installationType = getInstallationType();
    if (installationType === InstallationType.SYSTEM) return;
    if (installationType === InstallationType.NPM) {
      CliUx.ux.log(chalk.magentaBright('Your CLI updates are handled by npm.'));
    }
    process.exit(0);
  }

  private removeScript() {
    try {
      fs.unlinkSync(this.scriptPath);
    } catch {}
  }

  private async downloadScript(url: string = SCRIPT_URL) {
    await mkdir(this.scriptDownloadDir, { recursive: true });
    this.removeScript();
    return await new Promise((resolve, reject) => {
      get(url, res => {
        const code = res.statusCode ?? 0;
        if (code >= 400) {
          return reject(new Error(res.statusMessage));
        }
        // handle redirects
        if (code > 300 && code < 400 && !!res.headers.location) {
          return this.downloadScript(res.headers.location);
        }
        // save the file to disk
        const fileWriter = fs.createWriteStream(this.scriptPath).on('finish', () => {
          resolve({});
        });
        res.pipe(fileWriter);
      }).on('error', error => {
        return reject(error);
      });
    });
  }

  private async executeScript() {
    return await new Promise((resolve, reject) => {
      const child = spawn('sh', [this.scriptPath, '--no-deploy']);
      child.stdout.on('data', (chunk: Buffer) => {
        CliUx.ux.log(chunk.toString());
      });
      child.on('error', () => {
        return reject(new Error('Failed to execute get-conduit.sh'));
      });
      child.on('exit', () => {
        return resolve({});
      });
    });
  }
}
