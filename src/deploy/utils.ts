import { CliUx, Command } from '@oclif/core';
import { Docker } from '../docker';
import { TagComparison } from './types';
import * as path from 'path';
import * as fs from 'fs-extra';
import axios from 'axios';

export function getBaseDeploymentPaths(command: Command) {
  const configBasePath = path.join(command.config.configDir, 'deploy');
  const manifestBasePath = path.join(command.config.cacheDir, 'deploy', 'manifests');
  return { configBasePath, manifestBasePath };
}

export function getTargetDeploymentPaths(command: Command, tag?: string, chatty = false) {
  if (!tag) tag = getActiveDeploymentTag(command);
  const { configBasePath, manifestBasePath } = getBaseDeploymentPaths(command);
  const deploymentConfigPath = path.join(configBasePath, tag!);
  const manifestPath = path.join(manifestBasePath, tag!);
  const composePath = path.join(manifestPath, 'compose.yml');
  const envPath = path.join(manifestPath, 'env');
  if (
    !fs.existsSync(composePath) || !fs.existsSync(envPath) || tag
      ? false
      : !fs.existsSync(deploymentConfigPath)
  ) {
    CliUx.ux.error(
      chatty
        ? 'Deployment files could not be retrieved. Did you run deploy setup?'
        : 'No deployment available',
    );
    CliUx.ux.exit(-1);
  }
  return { deploymentConfigPath, manifestPath, composePath, envPath };
}

export function setActiveDeploymentTag(command: Command, tag: string) {
  const { configBasePath } = getBaseDeploymentPaths(command);
  fs.writeFileSync(path.join(configBasePath, 'active'), tag);
}

function _getActiveDeploymentTag(command: Command, throwOnNull = true) {
  const { configBasePath } = getBaseDeploymentPaths(command);
  let activeTag: string | undefined = undefined;
  try {
    activeTag = fs
      .readFileSync(path.join(configBasePath, 'active'), {
        encoding: 'utf-8',
        flag: 'r',
      })
      .trim();
    activeTag = activeTag !== '' ? activeTag : undefined;
  } catch {}
  if (throwOnNull && !activeTag) {
    CliUx.ux.error('No deployment available 😵', { exit: -1 });
  }
  return activeTag;
}

export function getActiveDeploymentTag(command: Command) {
  return _getActiveDeploymentTag(command)!;
}

export function getActiveDeploymentUiTag(command: Command) {
  const cfgPath = getTargetDeploymentPaths(command).deploymentConfigPath;
  const activeEnv = fs.readJSONSync(cfgPath);
  return activeEnv.environment.UI_IMAGE_TAG;
}

export function getActiveDeploymentTagOrUndefined(command: Command) {
  return _getActiveDeploymentTag(command, false);
}

export function unsetActiveDeployment(command: Command) {
  const { configBasePath } = getBaseDeploymentPaths(command);
  try {
    fs.unlinkSync(path.join(configBasePath, 'active'));
  } catch {}
}

export async function deploymentIsRunning(command: Command) {
  const tag = getActiveDeploymentTagOrUndefined(command);
  if (!tag) return false;
  if (await Docker.getInstance().containerIsUp('conduit')) {
    return true;
  }
}

export function compareTags(tagA: string, tagB: string, depth = 0): TagComparison {
  // ex format: 'v0.15.1-rc1'
  const baseVersionA = parseFloat(depth === 0 ? tagA.slice(1) : tagA);
  const baseVersionB = parseFloat(depth === 0 ? tagB.slice(1) : tagB);
  if (tagA === tagB) {
    return TagComparison.Equal;
  } else if (baseVersionA > baseVersionB) {
    return TagComparison.FirstIsNewer;
  } else if (baseVersionA < baseVersionB) {
    return TagComparison.SecondIsNewer;
  } else {
    if (depth < 2) {
      return compareTags(
        tagA.slice(tagA.indexOf('.') + 1),
        tagB.slice(tagB.indexOf('.') + 1),
        depth + 1,
      );
    } else {
      // release candidate
      if (!tagA.includes('-') && tagB.includes('-')) return TagComparison.FirstIsNewer;
      if (tagA.includes('-') && !tagB.includes('-')) return TagComparison.SecondIsNewer;
      return compareTags(
        tagA.slice(tagA.indexOf('-rc') + 3),
        tagB.slice(tagB.indexOf('-rc') + 3),
        depth + 1,
      );
    }
  }
}

export async function getAvailableTags(repo: 'Conduit' | 'Conduit-UI') {
  const MIN_SUPPORTED_VERSION = 0.15;
  const res = await axios.get(
    `https://api.github.com/repos/ConduitPlatform/${repo}/releases`,
    { headers: { Accept: 'application/vnd.github.v3+json' } },
  );
  const releases: string[] = [];
  const rcReleases: string[] = [];
  res.data.forEach((release: any) => {
    if (!release.tag_name.startsWith('v')) return;
    if (parseFloat(release.tag_name.slice(1)) < MIN_SUPPORTED_VERSION) return;
    if (release.tag_name.indexOf('-') === -1) {
      releases.push(release.tag_name);
    } else {
      rcReleases.push(release.tag_name);
    }
  });
  releases.sort().reverse();
  rcReleases.sort().reverse();
  releases.push(...rcReleases);
  if (releases.length === 0) {
    CliUx.ux.error(`No supported ${repo} versions available`, { exit: -1 });
  }
  return releases;
}

export async function selectConduitTag(
  conduitTags: string[],
  userConfig: boolean,
  explicitTag?: string,
) {
  if (explicitTag) {
    await assertValidConduitTag(conduitTags, explicitTag);
    return explicitTag;
  } else {
    let conduitTag = '';
    if (!userConfig) {
      conduitTag = conduitTags[0];
    } else {
      while (!conduitTags.includes(conduitTag)) {
        conduitTag = await CliUx.ux.prompt('Specify your desired Conduit version', {
          default: conduitTags[0],
        });
        if (!conduitTags.includes(conduitTag)) {
          CliUx.ux.log(`Please choose a valid target tag. Example: ${conduitTags[0]}\n`);
        }
      }
    }
    return conduitTag;
  }
}

export async function getMatchingUiTag(conduitTag: string, uiTags: string[]) {
  // Find Matching Ui Tag
  const baseVersion = parseFloat(conduitTag.slice(1));
  const pointReleases = uiTags.filter(tag => {
    const targetMajor = conduitTag.slice(baseVersion < 1 ? 3 : 1);
    const tagMajor = tag.slice(baseVersion < 1 ? 3 : 1);
    return parseInt(targetMajor) === parseInt(tagMajor);
  });
  pointReleases.sort().reverse();
  const stableReleases: string[] = [];
  const rcReleases: string[] = [];
  pointReleases.forEach(r => {
    if (r.includes('-')) {
      rcReleases.push(r);
    } else {
      stableReleases.push(r);
    }
  });
  if (stableReleases.length > 0) {
    return pointReleases[0];
  } else if (rcReleases.length > 0) {
    return rcReleases[0];
  } else {
    CliUx.ux.error(
      `Could not locate a compatible Conduit UI release for Conduit ${conduitTag}`,
      { exit: -1 },
    );
  }
}

export function assertValidConduitTag(conduitTags: string[], targetTag: string) {
  if (!conduitTags.includes(targetTag)) {
    CliUx.ux.error(`Unknown or unsupported Conduit tag '${targetTag}' provided!`, {
      exit: -1,
    });
  }
}

// Memes
export function abortAsFriends() {
  const abortLines = [
    'Alright then, see you around handsome 😘',
    `Don't be a stranger! 👋`,
    'After a while 🐊',
  ];
  CliUx.ux.log(abortLines[Math.floor(Math.random() * abortLines.length)]);
  CliUx.ux.exit(0);
}

export function abortAsEnemies() {
  const abortLines = [
    'Hey, make up your mind buddy! 🤔',
    'I am sworn to carry your burdens... 🙄',
    'Pathetic! How dare you disturb my slumber over this? 🧞',
  ];
  CliUx.ux.log(abortLines[Math.floor(Math.random() * abortLines.length)]);
  CliUx.ux.exit(0);
}
