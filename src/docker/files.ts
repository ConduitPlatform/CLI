import axios from 'axios';
import * as fs from 'fs-extra';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import type { Readable, Writable } from 'stream';
import * as yaml from 'js-yaml';

const GITHUB_RAW = 'https://raw.githubusercontent.com/ConduitPlatform/Conduit';

export interface ComposeFileSet {
  composePath: string;
  envPath: string;
  manifestDir: string;
}

export async function downloadComposeFile(
  tag: string,
  gitPath: string,
  destDir: string,
  destFileName: string,
): Promise<string> {
  await fs.ensureDir(destDir);
  const url = `${GITHUB_RAW}/${tag}/${gitPath}`;
  const response = await axios.get<Readable>(url, { responseType: 'stream' });
  const filePath = path.join(destDir, destFileName);
  const writer = fs.createWriteStream(filePath);
  await pipeline(response.data as Readable, writer as Writable);
  return filePath;
}

export async function pullComposeFiles(
  tag: string,
  manifestDir: string,
): Promise<ComposeFileSet> {
  const files: Array<[string, string]> = [
    ['docker/docker-compose.yml', 'compose.yml'],
    ['docker/.env', 'env'],
    ['docker/prometheus.cfg.yml', 'prometheus.cfg.yml'],
    ['docker/loki.cfg.yml', 'loki.cfg.yml'],
  ];
  for (const [gitPath, destName] of files) {
    await downloadComposeFile(tag, gitPath, manifestDir, destName);
  }
  return {
    composePath: path.join(manifestDir, 'compose.yml'),
    envPath: path.join(manifestDir, 'env'),
    manifestDir,
  };
}

export function getProfilesFromCompose(composePath: string): string[] {
  const content = fs.readFileSync(composePath, 'utf-8');
  const parsed = yaml.load(content) as {
    services?: Record<string, { profiles?: string[] }>;
  };
  const profiles = new Set<string>();
  if (parsed?.services) {
    for (const svc of Object.values(parsed.services)) {
      if (Array.isArray(svc?.profiles)) {
        svc.profiles.forEach((p: string) => profiles.add(p));
      }
    }
  }
  return Array.from(profiles);
}
