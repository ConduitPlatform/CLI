import { Command, flags } from '@oclif/command';
import { getRequestClient } from '../utils/requestUtils';
import cli from 'cli-ux';
import { Requests } from '../http/http';
import { generateSchema } from '../generators/Schema/Schema.generator';

export default class GenerateSchema extends Command {
  static description = 'Generate Schema TS files for registered Conduit schemas';

  static examples = [
    `$ conduit generate-schema
...
Generating schemas
`,
  ];

  static flags = {
    help: flags.help({ char: 'h' }),
  };

  static args = [{ name: 'path' }];

  async run() {
    const { args, flags } = this.parse(GenerateSchema);
    cli.action.start('Recovering credentials');
    let requestClient: Requests;
    try {
      requestClient = await getRequestClient(this);
      cli.action.stop('Done');
    } catch (e) {
      cli.action.stop('Failed to recover');
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
    cli.action.start('Generating schemas');
    for (let i = 0; i < schemas.count; i++) {
      await generateSchema(schemas.schemas[i], args.path);
    }
    cli.action.stop();
  }
}
