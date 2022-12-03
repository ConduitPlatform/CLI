import { Command, CliUx } from '@oclif/core';
import { CliUpdate } from './cli/update';
import { getRequestClient } from '../utils/requestUtils';
import { Requests } from '../http/http';
import { generateSchema } from '../generators/Schema/Schema.generator';

export class GenerateSchema extends Command {
  static description = 'Generate Schema TS files for registered Conduit schemas';

  static examples = [
    `$ conduit generate-schema
...
Generating schemas
`,
  ];

  static args = [{ name: 'path' }];

  async run() {
    await CliUpdate.displayUpdateHint(this);
    const { args } = await this.parse(GenerateSchema);
    CliUx.ux.action.start('Recovering credentials');
    let requestClient: Requests;
    try {
      requestClient = await getRequestClient(this);
      CliUx.ux.action.stop('Done');
    } catch (e) {
      CliUx.ux.action.stop('Failed to recover');
      return;
    }
    if (!args.path) {
      return this.log('Path not provided!');
    }
    const schemas: {
      schemas: any[];
      count: number;
    } = await requestClient.getSchemasRequest(0, 5000);
    this.log('Found schemas: ', schemas.count);
    CliUx.ux.action.start('Generating schemas');
    for (let i = 0; i < schemas.count; i++) {
      await generateSchema(schemas.schemas[i], args.path);
    }
    CliUx.ux.action.stop();
  }
}
