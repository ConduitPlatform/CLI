import { Command, Flags, CliUx } from '@oclif/core';
import { CliUpdate } from './cli/update';
import { Requests } from '../http/http';
import { recoverApiConfig, storeConfiguration } from '../utils/requestUtils';
import { booleanPrompt } from '../utils/cli';

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
      description: 'Reuses API urls and master key from existing configuration',
    }),
  };

  async run() {
    await CliUpdate.displayUpdateHint(this);
    const { flags } = await this.parse(Init);
    let adminUrl, appUrl, _masterKey;
    if (flags.relogin) {
      const obj = await recoverApiConfig(this);
      adminUrl = obj.adminUrl;
      appUrl = obj.appUrl;
      _masterKey = obj.masterKey;
    }
    let requestInstance: Requests | undefined;
    while (true) {
      if (!adminUrl) {
        adminUrl = await CliUx.ux.prompt(
          'Specify the Administrative API url of your Conduit installation',
        );
      }
      requestInstance = new Requests(this, adminUrl);
      const pingSuccessful = await requestInstance.httpHealthCheck('admin');
      if (pingSuccessful) break;
      CliUx.ux.log(
        `Could not ping Conduit's Administrative HTTP server at ${adminUrl}\n`,
      );
      adminUrl = undefined;
    }
    if (!flags.relogin && !appUrl) {
      const usesRouter = await booleanPrompt(
        'Does your deployment utilize Conduit Router?',
      );
      if (usesRouter)
        while (true) {
          appUrl = await CliUx.ux.prompt(
            'Specify the Application API url of your Conduit installation',
          );
          requestInstance = new Requests(this, adminUrl, appUrl);
          const pingSuccessful = await requestInstance.httpHealthCheck('app');
          if (pingSuccessful) break;
          CliUx.ux.log(`Could not ping Conduit's Application HTTP server at ${appUrl}\n`);
          appUrl = undefined;
        }
    }
    let admin: string;
    let password: string;
    let masterKey: string;
    while (true) {
      if (!_masterKey) {
        masterKey = await CliUx.ux.prompt(
          'Add the master key of your Conduit installation',
        );
      } else {
        masterKey = _masterKey;
      }
      admin = await CliUx.ux.prompt('Specify the admin username');
      password = await CliUx.ux.prompt('Specify the admin password');
      CliUx.ux.action.start('Attempting login');
      try {
        await requestInstance.initialize(admin, password, masterKey, !!appUrl);
        CliUx.ux.action.stop('Login Successful!');
        break;
      } catch {
        CliUx.ux.action.stop('Login failed!\n');
      }
    }
    await storeConfiguration(this, { adminUrl, appUrl, masterKey }, { admin, password });
  }
}
