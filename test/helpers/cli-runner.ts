import { spawn } from 'child_process';

export interface RunCliResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

export function runCli(
  args: string[],
  options?: { cwd?: string; input?: string },
): Promise<RunCliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['./bin/run', ...args], {
      cwd: options?.cwd,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));

    if (options?.input) {
      child.stdin.write(options.input);
    }
    child.stdin.end();

    child.once('error', reject);
    child.once('close', code => {
      resolve({
        code,
        stdout: Buffer.concat(stdout).toString(),
        stderr: Buffer.concat(stderr).toString(),
      });
    });
  });
}
