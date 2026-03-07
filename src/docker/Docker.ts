import Dockerode = require('dockerode');
import { execSync } from 'child_process';
import { ux } from '@oclif/core';
import { ComposeManager } from './compose';

export class Docker {
  private static _instance: Docker | undefined;
  private readonly docker: Dockerode;
  readonly compose: ComposeManager;

  private constructor() {
    this.assertAvailable();
    this.docker = new Dockerode({
      socketPath: process.env.DOCKER_SOCKET ?? '/var/run/docker.sock',
    });
    this.compose = new ComposeManager();
  }

  static getInstance(): Docker {
    if (Docker._instance) return Docker._instance;
    Docker._instance = new Docker();
    return Docker._instance;
  }

  async containerIsUp(name: string): Promise<boolean> {
    const containers = await this.docker.listContainers({ all: false });
    return containers.some(c => c.Names.some(n => n.endsWith(`/${name}`)));
  }

  async listVolumes(nameFilter: string): Promise<string[]> {
    const result = await this.docker.listVolumes({ filters: { name: [nameFilter] } });
    return (result.Volumes ?? []).map(v => v.Name);
  }

  async removeVolume(name: string): Promise<void> {
    const volume = this.docker.getVolume(name);
    await volume.remove();
  }

  private assertAvailable(): void {
    try {
      if (process.platform === 'win32') {
        execSync('where docker', { stdio: 'pipe' });
      } else {
        execSync('which docker', { stdio: 'pipe' });
      }
    } catch {
      ux.error('Could not detect Docker executable. Is Docker installed?');
      process.exit(-1);
    }
    try {
      execSync('docker stats --no-stream', { stdio: 'pipe' });
    } catch {
      ux.error('Docker daemon is not running. Please start Docker and retry.');
      process.exit(-1);
    }
    try {
      const out = execSync('docker compose version', {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      if (!out.includes('Docker Compose') && !out.includes('compose')) {
        ux.error('Docker Compose v2 is required. Run: docker compose version');
        process.exit(-1);
      }
    } catch {
      ux.error('Docker Compose v2 is required. Is Docker Compose installed?');
      process.exit(-1);
    }
  }
}
