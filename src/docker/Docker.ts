import { Package } from '../demo/types';
import { getImageName, getContainerName } from '../demo/utils';
import Dockerode = require('dockerode');

export class Docker {
  private readonly docker: Dockerode;
  private readonly networkName: string;

  constructor(networkName: string) {
    this.docker = new Dockerode({
      socketPath: process.env.DOCKER_SOCKET ?? '/var/run/docker.sock',
    });
    this.networkName = networkName;
  }

  async createNetwork() {
    const networkExists = (await this.docker.listNetworks())
      .some((net) => { return net.Name === this.networkName; });
    if (!networkExists) {
      console.log(`Setting up ${this.networkName} container network`);
      await this.docker.createNetwork({ Name: this.networkName });
    }
  }

  async removeNetwork() {
    const networkExists = (await this.docker.listNetworks())
      .some((net) => { return net.Name === this.networkName; });
    if (networkExists) {
      console.log(`Removing ${this.networkName} container network`);
      await this.docker.getNetwork(this.networkName).remove();
    }
  }

  async pull(packageName: Package, tag: string) {
    const repoTag = `${getImageName(packageName)}:${tag}`;
    if (await this.imageExists(packageName, tag)) return;
    console.log(`Pulling ${repoTag}...`);
    const promisifiedPull = function(docker: Dockerode, repoTag: string) {
      return new Promise((resolve, reject) => {
        docker.pull(repoTag, (err: Error, stream: NodeJS.ReadableStream) => {
          if (err) reject(err);
          docker.modem.followProgress(stream, onFinished);
          function onFinished(err: Error | null) {
            if (err) reject(err);
            else resolve();
          }
        });
      });
    };
    await promisifiedPull(this.docker, repoTag);
  }
  
  async run(
    packageName: Package,
    tag: string,
    env: string[],
    ports: { [field: string]: object[] },
    silent =  false,
  ) {
    const containerExists = await this.containerExists(packageName);
    const containerIsRunning = await this.containerExists(packageName, false, true);
    if (containerExists && containerIsRunning) {
      await this.start(packageName, false, true);
      return;
    }
    if (!silent) console.log(`Running ${packageName}`);
    await this.docker.createContainer({
      Image: `${getImageName(packageName)}:${tag}`,
      Cmd: [],
      'name': getContainerName(packageName),
      'Env': env ?? [],
      'HostConfig': {
        'NetworkMode': this.networkName,
        'PortBindings': ports,
      },
      'NetworkingConfig': {
        'EndpointsConfig': {
          'conduit': { 'Aliases': [packageName.toLowerCase()] },
        },
      },
    }).catch((e) => {
      console.error(e);
      process.exit(-1);
    });
    await this.start(packageName, true, true);
  }
  
  async start(packageName: Package, silent = false, bypassExistCheck = false) {
    if (!bypassExistCheck) await this.containerExists(packageName, true);
    const isRunning = await this.containerExists(packageName, false, true);
    if (isRunning) {
      if (!silent) console.log(`${packageName} container is already running`);
      return;
    }
    if (!silent) console.log(`Starting ${packageName}`)
    const container = this.docker.getContainer(getContainerName(packageName));
    await container.start();
  }
  
  async stop(packageName: Package, silent = false, bypassExistCheck = false) {
    if (!bypassExistCheck) await this.containerExists(packageName, true);
    const isRunning = await this.containerExists(packageName, false, true);
    if (!isRunning) {
      if (!silent) console.log(`${packageName} container is not currently running`);
      return;
    }
    if (!silent) console.log(`Stopping ${packageName}`);
    const container = this.docker.getContainer(getContainerName(packageName));
    await container.stop();
  }
  
  async rm(packageName: Package, silent = false, bypassExistCheck = false) {
    const exists = bypassExistCheck || await this.containerExists(packageName);
    if (exists) {
      if (!silent) console.log(`Removing ${packageName} container`)
      await this.docker.getContainer(getContainerName(packageName)).remove();
    }
  }
  
  async rmi(packageName: Package, tag: string, silent = false, bypassExistCheck = false) {
    const exists = bypassExistCheck || await this.imageExists(packageName, tag);
    if (exists) {
      if (!silent) console.log(`Removing ${packageName} container`)
      const repoTag = `${getImageName(packageName)}:${tag}`;
      const repoTagSlim = repoTag.substring(repoTag.lastIndexOf('/') + 1);
      const image = (await this.docker.listImages()).some(img => { return img.RepoTags?.includes(repoTag) })
        ? repoTag : repoTagSlim;
      await this.docker.getImage(image).remove();
    }
  }

  async containerExists(packageName: Package, exit = false, isRunning = false) {
    const containerExists = (await this.docker.listContainers({ all: !isRunning }))
      .some(container => { return container.Names.includes(`/${getContainerName(packageName)}`); });
    if (exit && !containerExists) {
      console.error(`${packageName} container ${isRunning ? 'is not running' : 'does not exist'}!`);
      process.exit(-1);
    }
    return containerExists;
  }

  async imageExists(packageName: Package, tag: string) {
    const repoTag = `${getImageName(packageName)}:${tag}`;
    const repoTagSlim = repoTag.substring(repoTag.lastIndexOf('/') + 1);
    return (await this.docker.listImages())
      .some(img => { return img.RepoTags?.includes(repoTag) || img.RepoTags?.includes(repoTagSlim); });
  }
}
