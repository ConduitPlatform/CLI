import * as fs from 'fs-extra';
import * as path from 'path';
import { Command } from '@oclif/core';
import { Requests } from '../http/http';
import { booleanPrompt } from './cli';
import { Init } from '../commands/init';

export async function getRequestClient(command: Command) {
  const apiConfigPath = path.join(command.config.configDir, 'config.json');
  const adminConfigPath = path.join(command.config.configDir, 'admin.json');
  if (!fs.existsSync(apiConfigPath) || !fs.existsSync(adminConfigPath)) {
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
  const apiConfig = await fs.readJSON(apiConfigPath);
  const adminConfig = await fs.readJSON(adminConfigPath);
  // Initialize Requests Client
  const requestClient = new Requests(command, apiConfig.adminUrl, apiConfig.appUrl);
  await requestClient.initialize(
    adminConfig.admin,
    adminConfig.password,
    apiConfig.masterKey,
    !!apiConfig.appUrl,
  );
  return requestClient;
}

export async function recoverApiConfig(command: Command) {
  const apiConfig = await fs.readJSON(path.join(command.config.configDir, 'config.json'));
  return {
    adminUrl: apiConfig.adminUrl as string,
    appUrl: apiConfig.appUrl as string,
    masterKey: apiConfig.masterKey as string,
  };
}

export async function recoverAdminCredentials(command: Command) {
  const apiConfig = await fs.readJSON(path.join(command.config.configDir, 'admin.json'));
  return {
    admin: apiConfig.admin as string,
    password: apiConfig.password as string,
  };
}

export async function recoverSecurityClientConfig(command: Command) {
  const securityClientConfig = await fs.readJSON(
    path.join(command.config.configDir, 'securityClient.json'),
  );
  return {
    clientId: securityClientConfig.clientId as string,
    clientSecret: securityClientConfig.clientSecret as string,
  };
}

export async function storeConfiguration(
  command: Command,
  environment: { adminUrl: string; appUrl: string; masterKey: string },
  admin: { admin: string; password: string },
) {
  await fs.ensureFile(path.join(command.config.configDir, 'config.json'));
  await fs.ensureFile(path.join(command.config.configDir, 'admin.json'));
  await fs.writeJSON(path.join(command.config.configDir, 'config.json'), environment);
  await fs.writeJSON(path.join(command.config.configDir, 'admin.json'), admin);
}

export async function storeSecurityClientConfiguration(
  command: Command,
  securityClient: { clientId: string; clientSecret: string },
) {
  await fs.ensureFile(path.join(command.config.configDir, 'securityClient.json'));
  await fs.writeJSON(
    path.join(command.config.configDir, 'securityClient.json'),
    securityClient,
  );
}
