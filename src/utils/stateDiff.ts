import chalk = require('chalk');
import type { StateExportResponse, StateImportBody } from '../interfaces/state';

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return a === b;
  const keysA = Object.keys(a as object).sort();
  const keysB = Object.keys(b as object).sort();
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (!keysB.includes(k)) return false;
    if (
      !deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
    ) {
      return false;
    }
  }
  return true;
}

function getResourceKey(record: Record<string, unknown>, index: number): string {
  if (typeof record.name === 'string' && record.name) return record.name;
  if (typeof record.path === 'string' && record.path) return record.path;
  for (const v of Object.values(record)) {
    if (typeof v === 'string' && v && !String(v).startsWith('_'))
      return String(v).slice(0, 80);
  }
  return `#${index}`;
}

function indexByKey(records: unknown[]): Map<string, unknown> {
  const map = new Map<string, unknown>();
  records.forEach((r, i) => {
    const key = getResourceKey(r as Record<string, unknown>, i);
    map.set(key, r);
  });
  return map;
}

export interface DiffSummary {
  configAdded: string[];
  configRemoved: string[];
  configModified: string[];
  moduleResourceAdded: Array<{ module: string; type: string; key: string }>;
  moduleResourceRemoved: Array<{ module: string; type: string; key: string }>;
  moduleResourceModified: Array<{ module: string; type: string; key: string }>;
}

export function hasStateDrift(summary: DiffSummary): boolean {
  return (
    summary.configAdded.length > 0 ||
    summary.configRemoved.length > 0 ||
    summary.configModified.length > 0 ||
    summary.moduleResourceAdded.length > 0 ||
    summary.moduleResourceRemoved.length > 0 ||
    summary.moduleResourceModified.length > 0
  );
}

/**
 * Compare local state (from files) with remote state (from API).
 * Returns a structured diff summary.
 */
export function computeStateDiff(
  local: StateImportBody,
  remote: StateExportResponse,
): DiffSummary {
  const summary: DiffSummary = {
    configAdded: [],
    configRemoved: [],
    configModified: [],
    moduleResourceAdded: [],
    moduleResourceRemoved: [],
    moduleResourceModified: [],
  };

  const localConfigModules = new Set(Object.keys(local.configs?.modules ?? {}));
  const remoteConfigModules = new Set(Object.keys(remote.configs?.modules ?? {}));
  for (const name of localConfigModules) {
    if (!remoteConfigModules.has(name)) summary.configAdded.push(name);
    else if (!deepEqual(local.configs!.modules[name], remote.configs!.modules[name])) {
      summary.configModified.push(name);
    }
  }
  for (const name of remoteConfigModules) {
    if (!localConfigModules.has(name)) summary.configRemoved.push(name);
  }

  const localModules = local.modules ?? {};
  const remoteModules = remote.modules ?? {};
  const allModuleNames = new Set([
    ...Object.keys(localModules),
    ...Object.keys(remoteModules),
  ]);

  for (const moduleName of allModuleNames) {
    const localTypes = localModules[moduleName] ?? {};
    const remoteTypes = remoteModules[moduleName] ?? {};
    const allTypes = new Set([...Object.keys(localTypes), ...Object.keys(remoteTypes)]);

    for (const resourceType of allTypes) {
      const localRecords = (localTypes[resourceType] as unknown[]) ?? [];
      const remoteRecords = (remoteTypes[resourceType] as unknown[]) ?? [];
      const localMap = indexByKey(localRecords);
      const remoteMap = indexByKey(remoteRecords);
      const localKeys = new Set(localMap.keys());
      const remoteKeys = new Set(remoteMap.keys());

      for (const key of localKeys) {
        if (!remoteKeys.has(key)) {
          summary.moduleResourceAdded.push({
            module: moduleName,
            type: resourceType,
            key,
          });
        } else if (!deepEqual(localMap.get(key), remoteMap.get(key))) {
          summary.moduleResourceModified.push({
            module: moduleName,
            type: resourceType,
            key,
          });
        }
      }
      for (const key of remoteKeys) {
        if (!localKeys.has(key)) {
          summary.moduleResourceRemoved.push({
            module: moduleName,
            type: resourceType,
            key,
          });
        }
      }
    }
  }

  return summary;
}

/**
 * Print the diff summary to the terminal with chalk colors.
 */
export function printStateDiff(summary: DiffSummary): void {
  const {
    configAdded,
    configRemoved,
    configModified,
    moduleResourceAdded,
    moduleResourceRemoved,
    moduleResourceModified,
  } = summary;

  let hasAny = false;

  if (configAdded.length > 0) {
    hasAny = true;
    console.log(chalk.green('\nConfig added:'));
    configAdded.forEach(name => console.log(chalk.green(`  + ${name}`)));
  }
  if (configRemoved.length > 0) {
    hasAny = true;
    console.log(chalk.red('\nConfig removed:'));
    configRemoved.forEach(name => console.log(chalk.red(`  - ${name}`)));
  }
  if (configModified.length > 0) {
    hasAny = true;
    console.log(chalk.yellow('\nConfig modified:'));
    configModified.forEach(name => console.log(chalk.yellow(`  ~ ${name}`)));
  }

  if (moduleResourceAdded.length > 0) {
    hasAny = true;
    console.log(chalk.green('\nResources added:'));
    moduleResourceAdded.forEach(({ module, type, key }) =>
      console.log(chalk.green(`  + ${module}/${type}/${key}`)),
    );
  }
  if (moduleResourceRemoved.length > 0) {
    hasAny = true;
    console.log(chalk.red('\nResources removed:'));
    moduleResourceRemoved.forEach(({ module, type, key }) =>
      console.log(chalk.red(`  - ${module}/${type}/${key}`)),
    );
  }
  if (moduleResourceModified.length > 0) {
    hasAny = true;
    console.log(chalk.yellow('\nResources modified:'));
    moduleResourceModified.forEach(({ module, type, key }) =>
      console.log(chalk.yellow(`  ~ ${module}/${type}/${key}`)),
    );
  }

  if (!hasAny) {
    console.log(chalk.gray('No differences between local and remote state.'));
  }
}
