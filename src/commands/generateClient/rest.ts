import { Command, Flags, CliUx } from '@oclif/core';
import { promptWithOptions } from '../../utils/cli';
import { getClientType, getOutputPath, getBaseUrl } from '../../utils/generateClient';
import * as fs from 'fs';
const { execSync } = require('child_process');

export default class GenerateClientRest extends Command {
  static description = `Generates a REST API client library for Conduit'S REST API`;
  static flags = {
    'client-type': Flags.string({
      char: 't',
      description: 'The client type to generate a library for'
    }),
    'output-path': Flags.string({
      char: 'p',
      description: 'Path to store archived library in',
    }),
  }
  private supportedClientTypes: string[] = [];

  async run() {
    const javaVersion = this.getJavaVersion();
    if (!javaVersion) {
      // This is a temporary solution until we figure out the best way to approach this using Docker
      console.log('Failed to detect Java installation.');
      CliUx.ux.exit(-1);
    }
    const url = await getBaseUrl(this);
    const parsedFlags = (await this.parse(GenerateClientRest)).flags;
    console.log(`Conduit's REST API supports both application and administration requests.`);
    const requestType = (await promptWithOptions(
      'Specify target request type',
      ['app', 'admin'],
      'app',
    )) as 'app' | 'admin';
    this.getSupportedClientTypes();
    const clientType = await getClientType(parsedFlags, this.supportedClientTypes);
    const libPath = await getOutputPath(parsedFlags, 'rest', requestType);
    const inputSpec = (requestType === 'admin') ? 'admin/swagger.json' : 'swagger.json';
    try {
      execSync(
        `npx @openapitools/openapi-generator-cli generate \
        -i ${url}/${inputSpec} -g ${clientType} -o ${libPath} --skip-validate-spec`
      );
      const zipPath = await this.convertToZip(libPath);
      console.log(`\nClient library archive available in: ${zipPath}`);
    } catch (error) {
      console.error(error);
      CliUx.ux.exit(-1);
    }
  }

  private async convertToZip(libPath: string) {
    const zipPath = `${libPath}.zip`
    execSync(`zip -r ${zipPath} ${libPath}`);
    fs.rm(libPath, { recursive: true, force: true }, (err) => {
      if (err) {
        console.error(err)
        return
      }
    });
    return zipPath;
  }

  private getSupportedClientTypes() {
    try {
      this.supportedClientTypes = execSync('npx @openapitools/openapi-generator-cli list -s')
        .toString().split(',');
    } catch (error) {
      console.error(error);
      CliUx.ux.exit(-1);
    }
  }

  private getJavaVersion() {
    try {
      const javaVersion = execSync('java --version 2> /dev/null').toString().split(' ')[1];
      console.log(javaVersion);
      return javaVersion;
    } catch (error) {
      return false;
    }
  }
}
