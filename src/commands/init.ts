import { Command, flags } from '@oclif/command';
import cli from 'cli-ux';
import { Requests } from '../http/http';
import { recoverApiConfig, storeConfiguration } from '../utils/requestUtils';

export default class Init extends Command {
  static description = 'Initialize the CLI to communicate with Conduit';

  static examples = [
    `$ conduit init
...
Attempting login
Login Successful!
`,
  ];

  static flags = {
    help: flags.help({ char: 'h' }),
    relogin: flags.boolean({ char: 'r', description: 'Reuses url and master key from existing configuration' }),
  };

  async run() {
    const { flags } = this.parse(Init);
    let url, masterKey;
    if (flags.relogin) {
      const obj = await recoverApiConfig(this);
      url = obj.url;
      masterKey = obj.masterKey;
    }
    let requestInstance: Requests | undefined;
    while (true) {
      if (!url) {
        url = await cli.prompt('Specify the API url of your Conduit installation');
      }
      if (!masterKey) {
        masterKey = await cli.prompt('Add the master key of your Conduit installation');
      }
      requestInstance = new Requests(url, masterKey);
      const pingSuccessful = await requestInstance.httpHealthCheck();
      if (pingSuccessful) break;
      console.log(`Could not ping Conduit's HTTP server at ${url}`);
      url = undefined;
    }
    let admin: string;
    let password: string;
    while (true) {
      admin = await cli.prompt('Specify the admin username');
      password = await cli.prompt('Specify the admin password');
      cli.action.start('Attempting login');
      try {
        await requestInstance.loginRequest(admin, password);
        cli.action.stop('Login Successful!');
        break;
      } catch (e) {
        cli.action.stop('Login failed!\n\n');
      }
    }
    await storeConfiguration(this, { url, masterKey }, { admin, password });
  }
}
