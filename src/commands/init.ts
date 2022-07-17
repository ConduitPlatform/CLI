import { Command, Flags, CliUx } from '@oclif/core';
import { Requests } from '../http/http';
import { recoverApiConfig, storeConfiguration } from '../utils/requestUtils';

export class Init extends Command {
  static description = 'Initialize the CLI to communicate with Conduit';

  static examples = [
    `$ conduit init
...
Attempting login
Login Successful!
`,
  ];

  static flags = {
    relogin: Flags.boolean({
      char: 'r',
      description: 'Reuses url and master key from existing configuration',
    }),
  };

  async run() {
    const { flags } = await this.parse(Init);
    let url, masterKey;
    if (flags.relogin) {
      const obj = await recoverApiConfig(this);
      url = obj.url;
      masterKey = obj.masterKey;
    }
    let requestInstance: Requests | undefined;
    while (true) {
      if (!url) {
        url = await CliUx.ux.prompt('Specify the API url of your Conduit installation');
      }
      if (!masterKey) {
        masterKey = await CliUx.ux.prompt(
          'Add the master key of your Conduit installation',
        );
      }
      requestInstance = new Requests(this, url, masterKey);
      const pingSuccessful = await requestInstance.httpHealthCheck();
      if (pingSuccessful) break;
      console.log(`Could not ping Conduit's HTTP server at ${url}`);
      url = undefined;
    }
    let admin: string;
    let password: string;
    while (true) {
      admin = await CliUx.ux.prompt('Specify the admin username');
      password = await CliUx.ux.prompt('Specify the admin password');
      CliUx.ux.action.start('Attempting login');
      try {
        await requestInstance.loginRequest(admin, password);
        CliUx.ux.action.stop('Login Successful!');
        break;
      } catch (e) {
        CliUx.ux.action.stop('Login failed!\n\n');
      }
    }
    await requestInstance.initialize(admin, password); // handle additional configuration
    await storeConfiguration(this, { url, masterKey }, { admin, password });
  }
}
