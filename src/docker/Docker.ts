import Dockerode = require('dockerode');
import { execSync } from 'child_process';
import { CliUx } from '@oclif/core';
import { DockerCompose } from './dockerCompose';

export class Docker {
  private static _instance?: Docker;
  private readonly docker: Dockerode;
  readonly compose: DockerCompose;

  private constructor() {
    this.assertAvailable();
    this.docker = new Dockerode({
      socketPath: process.env.DOCKER_SOCKET ?? '/var/run/docker.sock',
    });
    this.compose = new DockerCompose();
  }

  static getInstance() {
    if (Docker._instance) return Docker._instance;
    Docker._instance = new Docker();
    return Docker._instance;
  }

  async containerIsUp(name: string) {
    return (await this.docker.listContainers({ all: false })).some(container => {
      return container.Names.includes(`/${name}`);
    });
  }

  async listVolumes(nameSelect: string) {
    return this.docker
      .listVolumes({ filters: { name: [nameSelect] } })
      .then(v => v.Volumes.map(info => info.Name));
  }

  async removeVolume(name: string) {
    const volume = this.docker.getVolume(name);
    return volume
      .remove()
      .then(_ => true)
      .catch(_ => false);
  }

  private assertAvailable() {
    let dockerInstalled = false;
    try {
      const detectedExec =
        process.platform === 'win32'
          ? execSync('where docker').toString().split('\n')[0] // windows
          : execSync('which docker').toString().trim(); // linux/mac
      dockerInstalled = !detectedExec.endsWith('not found');
    } catch {}
    if (!dockerInstalled) {
      CliUx.ux.error('Could not detect Docker executable. Is Docker installed?');
      process.exit(-1);
    }
    const dockerRunning = () => {
      try {
        execSync('docker stats --no-stream', { stdio: 'pipe' });
        return true;
      } catch {
        return false;
      }
    };
    if (!dockerRunning()) {
      switch (process.platform) {
        case 'darwin':
          CliUx.ux.log('Starting Docker daemon...');
          try {
            execSync('open /Applications/Docker.app');
          } catch {}
          break;
        case 'linux':
        case 'win32':
          // TODO
          break;
      }
      let retries = 20; // 20s
      while (!dockerRunning() && retries > 0) {
        waitSync(1000);
        retries -= 1;
      }
    }
    if (!dockerRunning()) {
      CliUx.ux.error('Could not start Docker. Please start Docker daemon and retry.');
      process.exit(-1);
    }
  }
}

function waitSync(ms: number) {
  const start = Date.now();
  let now = start;
  while (now - start < ms) {
    now = Date.now();
  }
}
