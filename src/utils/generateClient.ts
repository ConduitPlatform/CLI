import { Command } from '@oclif/command';
import cli from 'cli-ux';
import { booleanPrompt, promptWithOptions } from './cli';
import * as fs from 'fs';
import * as path from 'path';
import { recoverUrl } from './requestUtils';
import Init from '../commands/init';

export interface GenerateClientFlags {
  'client-type': string | undefined,
  'output-path': string | undefined,
}

export async function getClientType(parsedFlags: GenerateClientFlags, options?: string[]) {
  let clientType: string | undefined = parsedFlags['client-type'];
  if (!clientType) {
    if (!options) {
      clientType = (await cli.prompt('Specify client type')).toLowerCase();
    } else {
      clientType = await promptWithOptions('Specify client type', options);
    }
  }
  return clientType as string;
}

export async function getOutputPath(
  parsedFlags: GenerateClientFlags,
  apiType: 'rest' | 'graphql',
  requestType?: 'app' | 'admin',
) {
  if (apiType === 'rest' && !requestType) {
    console.error('Call to getOutputPath() with REST api type requires a request type');
    cli.exit(-1);
  }
  let outputPath: string | undefined = parsedFlags['output-path'];
  while (!outputPath || !validateDirectoryPath(outputPath)) {
    outputPath = await cli.prompt('Specify output directory path', { default: process.cwd() });
  }
  let directoryName = `conduit-${apiType}-`;
  if (apiType === 'rest') {
    directoryName += requestType + '-';
  }
  directoryName += getTimestamp();
  outputPath = path.resolve(outputPath, directoryName);
  return outputPath;
}

export async function getBaseUrl(command: Command) {
  const { url } = await recoverUrl(command)
    .catch(async _ => {
      const runInit = await booleanPrompt(
        'No configuration found. Run init and proceed?', 'yes');
      if (!runInit) {
        console.log('Aborting');
        process.exit(0);
      }
      const init = new Init(command.argv, command.config);
      await init.run();
      return await recoverUrl(command);
    });
  return url;
}

function validateDirectoryPath(path: string) {
  return fs.existsSync(path) && fs.lstatSync(path).isDirectory();
}

function getTimestamp() {
  const date = new Date();
  const year = date.getFullYear();
  const month = ('0' + (date.getMonth() + 1)).slice(-2);
  const day = ('0' + date.getDate()).slice(-2);
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();
  return `${year}-${month}-${day}_${hour}:${minute}:${second}`;
}
