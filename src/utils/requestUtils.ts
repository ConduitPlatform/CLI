import * as fs from 'fs-extra';
import * as path from 'path';
import { Command } from '@oclif/core';
import { Requests } from '../http/http';
import { booleanPrompt } from './cli';
import { Init } from '../commands/init';

export interface ApiConfig {
  adminUrl: string;
  token: string;
  appUrl?: string;
}

export async function getRequestClient(command: Command): Promise<Requests> {
  const apiConfigPath = path.join(command.config.configDir, 'config.json');
  if (!fs.existsSync(apiConfigPath)) {
    const runInit = await booleanPrompt(
      'No configuration found. Run init and proceed?',
      'yes',
    );
    if (!runInit) {
      console.log('Aborting');
      process.exit(0);
    }
    const init = new Init(command.argv, command.config);
    await init.run();
  }
  const apiConfig = (await fs.readJSON(apiConfigPath)) as ApiConfig;
  if (!apiConfig.adminUrl || !apiConfig.token) {
    const runInit = await booleanPrompt(
      'Invalid configuration (missing adminUrl or token). Run init and proceed?',
      'yes',
    );
    if (!runInit) {
      console.log('Aborting');
      process.exit(0);
    }
    const init = new Init(command.argv, command.config);
    await init.run();
    return getRequestClient(command);
  }
  const requestClient = new Requests(
    command,
    apiConfig.adminUrl,
    apiConfig.token,
    apiConfig.appUrl,
  );
  const ok = await requestClient.verifyConnection();
  if (!ok) {
    const runInit = await booleanPrompt(
      'Connection to Conduit failed. Run init to reconfigure?',
      'yes',
    );
    if (!runInit) {
      console.log('Aborting');
      process.exit(0);
    }
    const init = new Init(command.argv, command.config);
    await init.run();
    return getRequestClient(command);
  }
  return requestClient;
}

export async function recoverApiConfig(command: Command): Promise<ApiConfig> {
  const apiConfig = await fs.readJSON(path.join(command.config.configDir, 'config.json'));
  return {
    adminUrl: apiConfig.adminUrl as string,
    token: apiConfig.token as string,
    appUrl: apiConfig.appUrl as string | undefined,
  };
}

export async function storeConfiguration(
  command: Command,
  config: { adminUrl: string; token: string; appUrl?: string },
) {
  await fs.ensureFile(path.join(command.config.configDir, 'config.json'));
  await fs.writeJSON(path.join(command.config.configDir, 'config.json'), config);
}
