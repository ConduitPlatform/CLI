import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { StateExportResponse, StateImportBody } from '../interfaces/state';

const CONFIGS_DIR = 'configs';
const MODULES_DIR = 'modules';

/**
 * Sanitize a resource name for use as a filename (no path separators, no leading dots).
 */
function sanitizeFileName(name: string): string {
  return name.replace(/[/\\]/g, '_').replace(/^\.+/, '');
}

/**
 * Get the identifying name for a resource record (used as filename).
 * Prefer "name" field, then fall back to "path" or first string field, then index.
 */
function getResourceName(record: Record<string, unknown>, index: number): string {
  if (typeof record.name === 'string' && record.name) {
    return sanitizeFileName(record.name);
  }
  if (typeof record.path === 'string' && record.path) {
    return sanitizeFileName(record.path);
  }
  for (const v of Object.values(record)) {
    if (typeof v === 'string' && v && !v.startsWith('_')) {
      return sanitizeFileName(v.slice(0, 80));
    }
  }
  return `item_${index}`;
}

/**
 * Remove existing contents of .conduit configs and modules dirs (for --clean).
 */
export async function cleanStateDir(dir: string): Promise<void> {
  const configsPath = path.join(dir, CONFIGS_DIR);
  const modulesPath = path.join(dir, MODULES_DIR);
  if (await fs.pathExists(configsPath)) {
    await fs.emptyDir(configsPath);
  }
  if (await fs.pathExists(modulesPath)) {
    await fs.emptyDir(modulesPath);
  }
}

/**
 * Write exported state to the directory structure: configs/*.yml and modules/<module>/<resourceType>/*.yml
 */
export async function writeStateToFiles(
  dir: string,
  data: StateExportResponse,
): Promise<{ configCount: number; resourceCountByModule: Record<string, number> }> {
  await fs.ensureDir(dir);
  const configsPath = path.join(dir, CONFIGS_DIR);
  const modulesPath = path.join(dir, MODULES_DIR);
  await fs.ensureDir(configsPath);
  await fs.ensureDir(modulesPath);

  let configCount = 0;
  const resourceCountByModule: Record<string, number> = {};

  const modules = data.configs?.modules ?? {};
  for (const [moduleName, config] of Object.entries(modules)) {
    const safeName = sanitizeFileName(moduleName);
    const filePath = path.join(configsPath, `${safeName}.yml`);
    await fs.writeFile(filePath, yaml.dump(config, { lineWidth: -1 }), 'utf8');
    configCount += 1;
  }

  const moduleData = data.modules ?? {};
  for (const [moduleName, resourceTypes] of Object.entries(moduleData)) {
    const safeModuleName = sanitizeFileName(moduleName);
    const modulePath = path.join(modulesPath, safeModuleName);
    await fs.ensureDir(modulePath);
    let moduleResourceCount = 0;
    for (const [resourceType, records] of Object.entries(resourceTypes)) {
      if (!Array.isArray(records)) continue;
      const typePath = path.join(modulePath, resourceType);
      await fs.ensureDir(typePath);
      for (let i = 0; i < records.length; i++) {
        const record = records[i] as Record<string, unknown>;
        const name = getResourceName(record, i);
        const filePath = path.join(typePath, `${name}.yml`);
        await fs.writeFile(filePath, yaml.dump(record, { lineWidth: -1 }), 'utf8');
        moduleResourceCount += 1;
      }
    }
    if (moduleResourceCount > 0) {
      resourceCountByModule[moduleName] = moduleResourceCount;
    }
  }

  return { configCount, resourceCountByModule };
}

/**
 * Read state from the directory structure back into StateImportBody shape.
 */
export async function readStateFromFiles(dir: string): Promise<StateImportBody> {
  const configsPath = path.join(dir, CONFIGS_DIR);
  const modulesPath = path.join(dir, MODULES_DIR);
  const result: StateImportBody = {};

  if (await fs.pathExists(configsPath)) {
    result.configs = { modules: {} };
    const entries = await fs.readdir(configsPath, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isFile() && (ent.name.endsWith('.yml') || ent.name.endsWith('.yaml'))) {
        const moduleName = ent.name.replace(/\.(yml|yaml)$/, '');
        const content = await fs.readFile(path.join(configsPath, ent.name), 'utf8');
        const config = yaml.load(content) as object;
        result.configs!.modules[moduleName] = config;
      }
    }
  }

  if (await fs.pathExists(modulesPath)) {
    result.modules = {};
    const moduleDirs = await fs.readdir(modulesPath, { withFileTypes: true });
    for (const modEnt of moduleDirs) {
      if (!modEnt.isDirectory()) continue;
      const moduleName = modEnt.name;
      const modulePath = path.join(modulesPath, modEnt.name);
      result.modules[moduleName] = {};
      const typeDirs = await fs.readdir(modulePath, { withFileTypes: true });
      for (const typeEnt of typeDirs) {
        if (!typeEnt.isDirectory()) continue;
        const typePath = path.join(modulePath, typeEnt.name);
        const files = await fs.readdir(typePath, { withFileTypes: true });
        const records: unknown[] = [];
        for (const f of files) {
          if (f.isFile() && (f.name.endsWith('.yml') || f.name.endsWith('.yaml'))) {
            const content = await fs.readFile(path.join(typePath, f.name), 'utf8');
            const record = yaml.load(content);
            records.push(record);
          }
        }
        result.modules[moduleName][typeEnt.name] = records;
      }
    }
  }

  return result;
}
