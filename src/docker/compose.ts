import * as v1 from 'docker-compose';
import { v2 } from 'docker-compose';
import { execSync } from 'child_process';
import { CliUx } from '@oclif/core';

export const getCompose = () => {
  const version = inferComposeVersion();
  const execPath = detectComposeExecPath(version);
  const targetCompose = version === 1 ? v1 : v2;
  return {
    execCompose: (...args: Parameters<typeof targetCompose.execCompose>) => {
      const [cmd, argv, options, ...restArgs] = args;
      args = [cmd, argv, { executablePath: execPath, ...options }, ...restArgs];
      return targetCompose.execCompose(...args);
    },

    upAll: (...args: Parameters<typeof targetCompose.upAll>) => {
      const [options, ...restArgs] = args;
      args = [{ executablePath: execPath, ...options }, ...restArgs];
      return targetCompose.upAll(...args);
    },

    stop: (...args: Parameters<typeof targetCompose.stop>) => {
      const [options, ...restArgs] = args;
      args = [{ executablePath: execPath, ...options }, ...restArgs];
      return targetCompose.stop(...args);
    },

    rm: (...args: Parameters<typeof targetCompose.rm>) => {
      const [options, ...restArgs] = args;
      args = [{ executablePath: execPath, ...options }, ...restArgs];
      return targetCompose.rm(...args);
    },
  };
};

export type Compose = ReturnType<typeof getCompose>;

const inferComposeVersion = () => {
  try {
    const res = execSync('docker compose version --short').toString().trim();
    if (parseInt(res) >= 2) {
      return 2;
    }
  } catch {}
  try {
    const res = execSync('docker-compose version --short').toString().trim();
    if (parseInt(res) === 1) {
      return 1;
    }
  } catch {}
  CliUx.ux.log('Could not detect Docker Compose version. Is Docker Compose installed?');
  process.exit(-1);
};

const detectComposeExecPath = (version: 1 | 2) => {
  const fallbackExec = version === 1 ? 'docker-compose' : 'docker';
  try {
    const detectedExec =
      process.platform === 'win32'
        ? execSync(`where ${fallbackExec}`).toString().split('\n')[0] // windows
        : execSync(`which ${fallbackExec}`).toString().trim(); // linux/mac
    return detectedExec.endsWith('not found') ? fallbackExec : detectedExec;
  } catch {
    return fallbackExec;
  }
};
