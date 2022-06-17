import { Command, flags } from '@oclif/command';
import { generate } from '@graphql-codegen/cli';
import cli from 'cli-ux';
import { isEmpty } from 'lodash';
import { Requests } from '../../http/http';
import { booleanPrompt } from '../../utils/cli';
import { getRequestClient } from '../../utils/requestUtils';
import { getClientType, getOutputPath, getBaseUrl } from '../../utils/generateClient';

type CONFIG_OPTIONS_BASE_T =
  | 'avoidOptionals'
  | 'immutableTypes'
  | 'preResolveTypes'
  | 'flattenGeneratedTypes'
  | 'enumsAsTypes'
  | 'fragmentMasking';

type CONFIG_OPTIONS_REACT_APOLLO_T =
  | 'reactApolloVersion'
  | 'operationResultSuffix';

export default class GenerateClientGraphql extends Command {
  static description = `Generates a GraphQL client library for Conduit's GraphQL API`;
  static flags = {
    'client-type': flags.string({
      name: 'client-type',
      description: 'The client type to generate a library for'
    }),
    'output-path': flags.string({
      name: 'output-path',
      description: 'Path to store archived library in',
    }),
  }
  private supportedClientTypes: string[] =
    ['typescript', 'react', 'react-apollo', 'angular', 'vue-urql', 'vue-apollo', 'svelte'];
  private genConfig: { [field: string]: string | boolean } = {};
  private fileNameSuffix: string = '';

  private readonly baseConfigOptions: CONFIG_OPTIONS_BASE_T[] = [
    'avoidOptionals',
    'immutableTypes',
    'preResolveTypes',
    'flattenGeneratedTypes',
    'enumsAsTypes',
    'fragmentMasking',
  ];
  private readonly reactApolloConfigOptions: CONFIG_OPTIONS_REACT_APOLLO_T[] = [
    'reactApolloVersion',
    'operationResultSuffix',
  ];

  async run() {
    const url = await getBaseUrl(this);
    const parsedFlags = this.parse(GenerateClientGraphql).flags;
    cli.action.start('Recovering credentials');
    let requestClient: Requests;
    try {
      requestClient = await getRequestClient(this);
      cli.action.stop('Done');
    } catch (e) {
      cli.action.stop('Failed to recover');
      return;
    }
    let headers = {};
    if (requestClient.securityClient) {
      headers = {
        clientid: requestClient.securityClient.clientId,
        clientsecret: requestClient.securityClient.clientSecret,
      };
    }
    const clientType = await getClientType(parsedFlags, this.supportedClientTypes);
    await this.getConfig(clientType);
    const plugins = this.configurePlugins(clientType);
    const libPath = (await getOutputPath(parsedFlags, 'graphql')) + this.fileNameSuffix;
    try {
      await generate({
        schema: {
          [`${url}/graphql`]: {
            headers,
          },
        },
        generates: {
          [libPath]: {
            plugins,
            config: this.genConfig,
          },
        },
      });
      console.log(`\nClient library archive available in: ${libPath}`);
    } catch (error) {
      console.error(error);
      cli.exit(-1);
    }
  }

  private async getConfig(clientType: string) {
    console.log('Configure client library configuration options:')
    for (const opt of this.baseConfigOptions) {
      this.genConfig[opt] = await booleanPrompt(opt);
    }
    if (clientType === 'react-apollo') {
      for (const opt of this.reactApolloConfigOptions) {
        this.genConfig[opt] = await cli.prompt(opt);
      }
    }
  }

  private configurePlugins(pluginName: string) {
    this.processConfig();
    switch (pluginName) {
      case 'typescript':
        this.fileNameSuffix = `${this.fileNameSuffix}.ts`;
        return ['typescript', 'typescript-operations'];
      case 'react':
        this.fileNameSuffix = `types.react-query.${this.fileNameSuffix}.ts`;
        return ['typescript', 'typescript-operations', 'typescript-react-query'];
      case 'react-apollo':
        this.fileNameSuffix = `types.reactApollo.${this.fileNameSuffix}.tsx`;
        return ['typescript', 'typescript-operations', 'typescript-react-apollo'];
      case 'angular':
        this.fileNameSuffix = `types.apolloAngular.${this.fileNameSuffix}.ts`;
        return ['typescript', 'typescript-operations', 'typescript-apollo-angular'];
      case 'vue-urql':
        this.fileNameSuffix = `types.vue-urql.${this.fileNameSuffix}.ts`;
        return ['typescript', 'typescript-operations', 'typescript-vue-urql'];
      case 'vue-apollo':
        this.fileNameSuffix = `types.vueApollo.${this.fileNameSuffix}.ts`;
        return ['typescript', 'typescript-operations', 'typescript-vue-urql'];
      case 'svelte':
        this.fileNameSuffix = `types.svelte-apollo.${this.fileNameSuffix}.ts`;
        return ['typescript', 'typescript-operations', 'graphql-codegen-svelte-apollo'];
      default:
        console.error( 'Invalid Plugin');
        cli.exit(-1);
    }
  }

  private processConfig() {
    const configOptions = Object.keys(this.genConfig);
    if (isEmpty(configOptions)) return '';
    const validOptions = configOptions.filter(opt => this.genConfig[opt] === true);
    this.fileNameSuffix = `.${validOptions.join('.')}`;
  };
}
