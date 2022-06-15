import * as fs from 'fs-extra';
import * as path from 'path';
import Command from '@oclif/command';
import { Requests } from '../http/http';
import { booleanPrompt } from './cli';
import Init from './../commands/init';

export async function getRequestClient(command: Command) {
  const apiConfigPath = path.join(command.config.configDir, 'config.json');
  const adminConfigPath = path.join(command.config.configDir, 'admin.json');
  if (!fs.existsSync(apiConfigPath) || !fs.existsSync(adminConfigPath)) {
    const runInit = await booleanPrompt(
      'No configuration found. Run init and proceed?', 'yes');
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
  const requestClient = new Requests(apiConfig.url, apiConfig.masterKey);
  await requestClient.initialize(adminConfig.admin, adminConfig.password);
  return requestClient;
}

export async function recoverApiConfig(command: Command) {
  const apiConfig = await fs.readJSON(path.join(command.config.configDir, 'config.json'));
  return { url: apiConfig.url, masterKey: apiConfig.masterKey };
}

export async function storeConfiguration(
  command: Command,
  environment: { url: string; masterKey: string },
  admin: { admin: string, password: string },
) {
  await fs.ensureFile(path.join(command.config.configDir, 'config.json'));
  await fs.ensureFile(path.join(command.config.configDir, 'admin.json'));
  await fs.writeJSON(path.join(command.config.configDir, 'config.json'), environment);
  await fs.writeJSON(path.join(command.config.configDir, 'admin.json'), admin);
}
