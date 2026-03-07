import { execSync } from 'child_process';
import * as net from 'net';
import { readManifest } from '../conduit-manifest';

export interface DoctorCheck {
  name: string;
  ok: boolean;
  details: string;
  fix?: string;
}

async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

function checkDockerBinary(): DoctorCheck {
  try {
    execSync(process.platform === 'win32' ? 'where docker' : 'which docker', {
      stdio: 'pipe',
    });
    return {
      name: 'Docker CLI',
      ok: true,
      details: 'docker executable is available.',
    };
  } catch {
    return {
      name: 'Docker CLI',
      ok: false,
      details: 'docker executable was not found.',
      fix: 'Install Docker Desktop and ensure `docker` is in PATH.',
    };
  }
}

function checkDockerDaemon(): DoctorCheck {
  try {
    execSync('docker stats --no-stream', { stdio: 'pipe' });
    return {
      name: 'Docker daemon',
      ok: true,
      details: 'Docker daemon is running.',
    };
  } catch {
    return {
      name: 'Docker daemon',
      ok: false,
      details: 'Docker daemon is not responding.',
      fix: 'Start Docker Desktop and retry `conduit project doctor`.',
    };
  }
}

function checkComposeV2(): DoctorCheck {
  try {
    const out = execSync('docker compose version', {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    const hasCompose =
      out.includes('Docker Compose') || out.toLowerCase().includes('compose');
    if (!hasCompose) {
      return {
        name: 'Docker Compose v2',
        ok: false,
        details: 'docker compose command did not return a v2 version string.',
        fix: 'Install Docker Compose v2 (`docker compose version`).',
      };
    }
    return {
      name: 'Docker Compose v2',
      ok: true,
      details: out.trim(),
    };
  } catch {
    return {
      name: 'Docker Compose v2',
      ok: false,
      details: 'docker compose command failed.',
      fix: 'Install Docker Compose v2 and verify with `docker compose version`.',
    };
  }
}

function checkManifest(conduitDir: string): DoctorCheck {
  const manifest = readManifest(conduitDir);
  if (manifest) {
    return {
      name: '.conduit manifest',
      ok: true,
      details: `Found conduit.yml (version=${manifest.version}, db=${manifest.database}).`,
    };
  }
  return {
    name: '.conduit manifest',
    ok: false,
    details: 'No valid .conduit/conduit.yml was found.',
    fix: 'Run `conduit project init` to create the manifest.',
  };
}

export async function runDoctorChecks(conduitDir: string): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];
  checks.push(checkManifest(conduitDir));
  checks.push(checkDockerBinary());
  checks.push(checkDockerDaemon());
  checks.push(checkComposeV2());

  const uiPortAvailable = await isPortAvailable(8080);
  checks.push({
    name: 'Port 8080 (UI)',
    ok: uiPortAvailable,
    details: uiPortAvailable ? 'Port is available.' : 'Port is already in use.',
    fix: uiPortAvailable
      ? undefined
      : 'Stop the process using port 8080 or run Conduit on a free port.',
  });

  const adminPortAvailable = await isPortAvailable(3030);
  checks.push({
    name: 'Port 3030 (Admin API)',
    ok: adminPortAvailable,
    details: adminPortAvailable ? 'Port is available.' : 'Port is already in use.',
    fix: adminPortAvailable
      ? undefined
      : 'Stop the process using port 3030 before running `conduit project up`.',
  });

  return checks;
}
