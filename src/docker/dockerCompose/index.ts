// Forked from https://github.com/PDMLab/docker-compose

import { spawn, execSync } from 'child_process';
import { parse as yamlParse } from 'yaml';
import mapPorts from './map-ports';
import { CliUx } from '@oclif/core';

export interface IDockerComposeOptions {
  cwd?: string;
  executablePath?: string;
  config?: string | string[];
  configAsString?: string;
  log?: boolean;
  composeOptions?: string[] | (string | string[])[];
  commandOptions?: string[] | (string | string[])[];
  env?: NodeJS.ProcessEnv;
  callback?: (chunk: Buffer, streamSource?: 'stdout' | 'stderr') => void;
}

export type DockerComposePortResult = {
  address: string;
  port: number;
};

export type DockerComposeVersionResult = {
  version: string;
};

export type DockerComposeConfigResult = {
  config: {
    version: Record<string, string>;
    services: Record<string, string | Record<string, string>>;
    volumes: Record<string, string>;
  };
};

export type DockerComposeConfigServicesResult = {
  services: string[];
};

export type DockerComposeConfigVolumesResult = {
  volumes: string[];
};

export interface IDockerComposeLogOptions extends IDockerComposeOptions {
  follow?: boolean;
}

export interface IDockerComposeBuildOptions extends IDockerComposeOptions {
  parallel?: boolean;
}

export interface IDockerComposePushOptions extends IDockerComposeOptions {
  ignorePushFailures?: boolean;
}

export interface IDockerComposeResult {
  exitCode: number | null;
  out: string;
  err: string;
}

export type TypedDockerComposeResult<T> = {
  exitCode: number | null;
  out: string;
  err: string;
  data: T;
};

const nonEmptyString = (v: string) => v !== '';

export type DockerComposePsResult = {
  services: Array<{
    name: string;
    command: string;
    state: string;
    ports: Array<{
      mapped?: { address: string; port: number };
      exposed: { port: number; protocol: string };
    }>;
  }>;
};

class DockerCompose {
  private readonly composeVersion = 1 | 2;
  private readonly executablePath: string;

  constructor(composeVersion?: 1 | 2, executablePath?: string) {
    const fallbackExecPath = this.composeVersion === 1 ? 'docker-compose' : 'docker';
    this.composeVersion = composeVersion ?? this.inferComposeVersion();
    if (executablePath) {
      this.executablePath = executablePath;
    } else {
      try {
        const detectedExecPath = execSync(`which ${fallbackExecPath}`).toString().trim();
        this.executablePath = detectedExecPath.endsWith('not found')
          ? fallbackExecPath
          : detectedExecPath;
      } catch {
        this.executablePath = fallbackExecPath;
      }
    }
  }

  private inferComposeVersion() {
    try {
      const res = execSync('docker compose --help').toString().trim();
      if (res.startsWith('Usage:  docker compose')) {
        return 2;
      }
    } catch {}
    try {
      execSync('docker-compose --help');
      return 1;
    } catch {}
    CliUx.ux.log('Could not detect docker compose version. Is docker compose installed?');
    process.exit(-1);
  }

  mapPsOutput(output: string, options?: IDockerComposeOptions): DockerComposePsResult {
    let isQuiet = false;
    if (options?.commandOptions) {
      isQuiet =
        options.commandOptions.includes('-q') ||
        options.commandOptions.includes('--quiet') ||
        options.commandOptions.includes('--services');
    }
    const services =
      this.composeVersion === 1
        ? // Compose v1
          output
            .split(`\n`)
            .filter(nonEmptyString)
            .filter((_, index) => isQuiet || index > 1)
            .map(line => {
              let nameFragment = line;
              let commandFragment = '';
              let stateFragment = '';
              let untypedPortsFragment = '';
              if (!isQuiet) {
                [nameFragment, commandFragment, stateFragment, untypedPortsFragment] =
                  line.split(/\s{3,}/);
              }
              return {
                name: nameFragment.trim(),
                command: commandFragment.trim(),
                state: stateFragment.trim(),
                ports: mapPorts(untypedPortsFragment.trim()),
              };
            })
        : // Compose v2
          output
            .split(`\n`)
            .filter(nonEmptyString)
            .filter((_, index) => isQuiet || index > 0)
            .map(line => {
              let nameFragment = line;
              let commandFragment = '';
              let stateFragment = '';
              let serviceFragment = '';
              let untypedPortsFragment = '';
              if (!isQuiet) {
                [
                  nameFragment,
                  commandFragment,
                  serviceFragment,
                  stateFragment,
                  untypedPortsFragment,
                ] = line.split(/\s{3,}/);
              }
              return {
                name: nameFragment.trim(),
                command: commandFragment.trim(),
                service: serviceFragment.trim(),
                state: stateFragment.trim(),
                ports: mapPorts(untypedPortsFragment.trim()),
              };
            });
    return { services };
  }

  /**
   * Converts supplied yml files to cli arguments
   * https://docs.docker.com/compose/reference/overview/#use--f-to-specify-name-and-path-of-one-or-more-compose-files
   */
  private configToArgs(config?: string | any[]): string[] {
    if (typeof config === 'undefined') {
      return [];
    } else if (typeof config === 'string') {
      return ['-f', config];
    } else if (config instanceof Array) {
      return config.reduce((args, item): string[] => args.concat(['-f', item]), []);
    }
    throw new Error(`Invalid argument supplied: ${config}`);
  }

  /**
   * Converts docker-compose commandline options to cli arguments
   */
  private composeOptionsToArgs(
    composeOptions: string[] | (string | string[])[],
  ): string[] {
    let composeArgs: string[] = [];

    composeOptions.forEach((option: string[] | string): void => {
      if (option instanceof Array) {
        composeArgs = composeArgs.concat(option);
      }
      if (typeof option === 'string') {
        composeArgs = composeArgs.concat([option]);
      }
    });

    return composeArgs;
  }

  /**
   * Executes docker-compose command with common options
   */
  execCompose(
    command: string,
    args: (string | number)[],
    options: IDockerComposeOptions = {},
  ): Promise<IDockerComposeResult> {
    return new Promise((resolve, reject): void => {
      const composeOptions = options.composeOptions || [];
      const commandOptions = options.commandOptions || [];
      let composeArgs = this.composeOptionsToArgs(composeOptions);
      const isConfigProvidedAsString = !!options.configAsString;

      const configArgs = isConfigProvidedAsString
        ? ['-f', '-']
        : this.configToArgs(options.config);

      composeArgs = composeArgs.concat(
        configArgs.concat(
          // @ts-ignore
          [command].concat(this.composeOptionsToArgs(commandOptions), args),
        ),
      );

      const cwd = options.cwd;
      const env = options.env || undefined;

      const childProc = spawn(
        this.executablePath,
        this.composeVersion === 1 ? composeArgs : ['compose', ...composeArgs],
        {
          cwd,
          env,
        },
      );

      childProc.on('error', (err): void => {
        reject(err);
      });

      const result: IDockerComposeResult = {
        exitCode: null,
        err: '',
        out: '',
      };

      childProc.stdout.on('data', (chunk): void => {
        result.out += chunk.toString();
        options.callback?.(chunk, 'stdout');
      });

      childProc.stderr.on('data', (chunk): void => {
        result.err += chunk.toString();
        options.callback?.(chunk, 'stderr');
      });

      childProc.on('exit', (exitCode): void => {
        result.exitCode = exitCode;
        if (exitCode === 0) {
          resolve(result);
        } else {
          reject(result);
        }
      });

      if (isConfigProvidedAsString) {
        childProc.stdin.write(options.configAsString);
        childProc.stdin.end();
      }

      if (options.log) {
        childProc.stdout.pipe(process.stdout);
        childProc.stderr.pipe(process.stderr);
      }
    });
  }

  /**
   * Determines whether or not to use the default non-interactive flag -d for up commands
   */
  private shouldUseDefaultNonInteractiveFlag(
    options: IDockerComposeOptions = {},
  ): boolean {
    const commandOptions = options.commandOptions || [];
    const containsOtherNonInteractiveFlag = commandOptions.reduce(
      (memo: boolean, item: string | string[]) => {
        return (
          memo &&
          !item.includes('--abort-on-container-exit') &&
          !item.includes('--no-start')
        );
      },
      true,
    );
    return containsOtherNonInteractiveFlag;
  }

  upAll(options?: IDockerComposeOptions): Promise<IDockerComposeResult> {
    const args = this.shouldUseDefaultNonInteractiveFlag(options) ? ['-d'] : [];
    return this.execCompose('up', args, options);
  }

  upMany(
    services: string[],
    options?: IDockerComposeOptions,
  ): Promise<IDockerComposeResult> {
    const args = this.shouldUseDefaultNonInteractiveFlag(options)
      ? ['-d'].concat(services)
      : services;
    return this.execCompose('up', args, options);
  }

  upOne(service: string, options?: IDockerComposeOptions): Promise<IDockerComposeResult> {
    const args = this.shouldUseDefaultNonInteractiveFlag(options)
      ? ['-d', service]
      : [service];
    return this.execCompose('up', args, options);
  }

  down(options?: IDockerComposeOptions): Promise<IDockerComposeResult> {
    return this.execCompose('down', [], options);
  }

  stop(options?: IDockerComposeOptions): Promise<IDockerComposeResult> {
    return this.execCompose('stop', [], options);
  }

  stopOne(
    service: string,
    options?: IDockerComposeOptions,
  ): Promise<IDockerComposeResult> {
    return this.execCompose('stop', [service], options);
  }

  stopMany(
    options?: IDockerComposeOptions,
    ...services: string[]
  ): Promise<IDockerComposeResult> {
    return this.execCompose('stop', [...services], options);
  }

  pauseOne(
    service: string,
    options?: IDockerComposeOptions,
  ): Promise<IDockerComposeResult> {
    return this.execCompose('pause', [service], options);
  }

  unpauseOne(
    service: string,
    options?: IDockerComposeOptions,
  ): Promise<IDockerComposeResult> {
    return this.execCompose('unpause', [service], options);
  }

  kill(options?: IDockerComposeOptions): Promise<IDockerComposeResult> {
    return this.execCompose('kill', [], options);
  }

  rm(
    options?: IDockerComposeOptions,
    ...services: string[]
  ): Promise<IDockerComposeResult> {
    return this.execCompose('rm', ['-f', ...services], options);
  }

  exec(
    container: string,
    command: string | string[],
    options?: IDockerComposeOptions,
  ): Promise<IDockerComposeResult> {
    const args = Array.isArray(command) ? command : command.split(/\s+/);

    return this.execCompose('exec', ['-T', container].concat(args), options);
  }

  run(
    container: string,
    command: string | string[],
    options?: IDockerComposeOptions,
  ): Promise<IDockerComposeResult> {
    const args = Array.isArray(command) ? command : command.split(/\s+/);

    return this.execCompose('run', ['-T', container].concat(args), options);
  }

  buildAll(options: IDockerComposeBuildOptions = {}): Promise<IDockerComposeResult> {
    return this.execCompose('build', options.parallel ? ['--parallel'] : [], options);
  }

  buildMany(
    services: string[],
    options: IDockerComposeBuildOptions = {},
  ): Promise<IDockerComposeResult> {
    return this.execCompose(
      'build',
      options.parallel ? ['--parallel'].concat(services) : services,
      options,
    );
  }

  buildOne(
    service: string,
    options?: IDockerComposeBuildOptions,
  ): Promise<IDockerComposeResult> {
    return this.execCompose('build', [service], options);
  }

  pullAll(options: IDockerComposeOptions = {}): Promise<IDockerComposeResult> {
    return this.execCompose('pull', [], options);
  }

  pullMany(
    services: string[],
    options: IDockerComposeOptions = {},
  ): Promise<IDockerComposeResult> {
    return this.execCompose('pull', services, options);
  }

  pullOne(
    service: string,
    options?: IDockerComposeOptions,
  ): Promise<IDockerComposeResult> {
    return this.execCompose('pull', [service], options);
  }

  async config(
    options?: IDockerComposeOptions,
  ): Promise<TypedDockerComposeResult<DockerComposeConfigResult>> {
    try {
      const result = await this.execCompose('config', [], options);
      const config = yamlParse(result.out);
      return {
        ...result,
        data: { config },
      };
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async configServices(
    options?: IDockerComposeOptions,
  ): Promise<TypedDockerComposeResult<DockerComposeConfigServicesResult>> {
    try {
      const result = await this.execCompose('config', ['--services'], options);
      const services = result.out.split('\n').filter(nonEmptyString);
      return {
        ...result,
        data: { services },
      };
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async configVolumes(
    options?: IDockerComposeOptions,
  ): Promise<TypedDockerComposeResult<DockerComposeConfigVolumesResult>> {
    try {
      const result = await this.execCompose('config', ['--volumes'], options);
      const volumes = result.out.split('\n').filter(nonEmptyString);
      return {
        ...result,
        data: { volumes },
      };
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async ps(
    options?: IDockerComposeOptions,
  ): Promise<TypedDockerComposeResult<DockerComposePsResult>> {
    try {
      const result = await this.execCompose('ps', [], options);
      const data = this.mapPsOutput(result.out, options);
      return {
        ...result,
        data,
      };
    } catch (error) {
      return Promise.reject(error);
    }
  }

  push(options: IDockerComposePushOptions = {}): Promise<IDockerComposeResult> {
    return this.execCompose(
      'push',
      options.ignorePushFailures ? ['--ignore-push-failures'] : [],
      options,
    );
  }

  restartAll(options?: IDockerComposeOptions): Promise<IDockerComposeResult> {
    return this.execCompose('restart', [], options);
  }

  restartMany(
    services: string[],
    options?: IDockerComposeOptions,
  ): Promise<IDockerComposeResult> {
    return this.execCompose('restart', services, options);
  }

  restartOne(
    service: string,
    options?: IDockerComposeOptions,
  ): Promise<IDockerComposeResult> {
    return this.restartMany([service], options);
  }

  logs(
    services: string | string[],
    options: IDockerComposeLogOptions = {},
  ): Promise<IDockerComposeResult> {
    let args = Array.isArray(services) ? services : [services];

    if (options.follow) {
      args = ['--follow', ...args];
    }

    return this.execCompose('logs', args, options);
  }

  async port(
    service: string,
    containerPort: string | number,
    options?: IDockerComposeOptions,
  ): Promise<TypedDockerComposeResult<DockerComposePortResult>> {
    const args = [service, containerPort];

    try {
      const result = await this.execCompose('port', args, options);
      const [address, port] = result.out.split(':');
      return {
        ...result,
        data: {
          address,
          port: Number(port),
        },
      };
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async version(
    options?: IDockerComposeOptions,
  ): Promise<TypedDockerComposeResult<DockerComposeVersionResult>> {
    try {
      const result = await this.execCompose('version', ['--short'], options);
      const version = result.out.replace('\n', '').trim();
      return {
        ...result,
        data: { version },
      };
    } catch (error) {
      return Promise.reject(error);
    }
  }
}

const dockerCompose = new DockerCompose();
export default dockerCompose;
