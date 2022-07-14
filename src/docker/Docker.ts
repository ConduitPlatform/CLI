import Dockerode = require('dockerode');

export class Docker {
  private static _instance?: Docker;
  private readonly docker: Dockerode;

  private constructor() {
    this.docker = new Dockerode({
      socketPath: process.env.DOCKER_SOCKET ?? '/var/run/docker.sock',
    });
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
}
