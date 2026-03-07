import { spawn } from 'child_process';

export interface ComposeOptions {
  cwd: string;
  env: NodeJS.ProcessEnv;
  /** Profile names (e.g. ['mongodb', 'chat']) */
  profiles?: string[];
  /** If true, pipe compose stdout/stderr to process */
  log?: boolean;
}

export interface ComposeResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

function runDockerCompose(
  args: string[],
  options: ComposeOptions,
): Promise<ComposeResult> {
  const fullArgs = ['compose', ...args];
  return new Promise((resolve, reject) => {
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    const child = spawn('docker', fullArgs, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: options.log ? ['inherit', 'pipe', 'pipe'] : ['inherit', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk);
      if (options.log) process.stdout.write(chunk);
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk);
      if (options.log) process.stderr.write(chunk);
    });

    child.on('error', reject);
    child.on('close', exitCode => {
      resolve({
        exitCode,
        stdout: Buffer.concat(stdoutChunks).toString(),
        stderr: Buffer.concat(stderrChunks).toString(),
      });
    });
  });
}

export class ComposeManager {
  private withProfiles(baseArgs: string[], options: ComposeOptions): string[] {
    if (!options.profiles?.length) return baseArgs;
    const profileArgs = options.profiles.flatMap(p => ['--profile', p]);
    return [...profileArgs, ...baseArgs];
  }

  async up(options: ComposeOptions): Promise<ComposeResult> {
    const args = this.withProfiles(['up', '-d'], options);
    return runDockerCompose(args, options);
  }

  async stop(options: ComposeOptions): Promise<ComposeResult> {
    const args = this.withProfiles(['stop'], options);
    return runDockerCompose(args, options);
  }

  async down(options: ComposeOptions): Promise<ComposeResult> {
    return runDockerCompose(['down'], options);
  }

  async rm(options: ComposeOptions & { volumes?: boolean }): Promise<ComposeResult> {
    const args: string[] = ['rm', '-f'];
    if (options.volumes) {
      args.push('--volumes');
    }
    return runDockerCompose(args, options);
  }

  async ps(options: ComposeOptions): Promise<ComposeResult> {
    return runDockerCompose(['ps'], options);
  }

  async pull(options: ComposeOptions): Promise<ComposeResult> {
    const args = this.withProfiles(['pull'], options);
    return runDockerCompose(args, options);
  }
}
