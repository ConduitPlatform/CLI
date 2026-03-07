import * as path from 'path';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';

export interface ConduitManifest {
  version: string;
  database: 'mongodb' | 'postgres';
  modules?: string[];
}

const DEFAULT_MANIFEST: ConduitManifest = {
  version: 'latest',
  database: 'mongodb',
  modules: [],
};

export const CONDUIT_DIR = '.conduit';
export const MANIFEST_FILENAME = 'conduit.yml';

export function getConduitDir(cwd: string = process.cwd()): string {
  return path.resolve(cwd, CONDUIT_DIR);
}

export function getManifestPath(conduitDir?: string): string {
  const dir = conduitDir ?? getConduitDir();
  return path.join(dir, MANIFEST_FILENAME);
}

export function readManifest(conduitDir?: string): ConduitManifest | null {
  const manifestPath = getManifestPath(conduitDir);
  if (!fs.existsSync(manifestPath)) return null;
  try {
    const content = fs.readFileSync(manifestPath, 'utf-8');
    const parsed = yaml.load(content) as Partial<ConduitManifest>;
    if (!parsed?.version || !parsed?.database) return null;
    return {
      ...DEFAULT_MANIFEST,
      ...parsed,
      modules: Array.isArray(parsed.modules) ? parsed.modules : [],
    };
  } catch {
    return null;
  }
}

export async function writeManifest(
  manifest: ConduitManifest,
  conduitDir?: string,
): Promise<void> {
  const dir = conduitDir ?? getConduitDir();
  await fs.ensureDir(dir);
  const manifestPath = path.join(dir, MANIFEST_FILENAME);
  await fs.writeFile(manifestPath, yaml.dump(manifest), 'utf-8');
}

export function getProfilesFromManifest(manifest: ConduitManifest): string[] {
  const profiles = [manifest.database, ...(manifest.modules ?? [])];
  return [...new Set(profiles)];
}
