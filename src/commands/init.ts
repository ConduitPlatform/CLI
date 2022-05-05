import { Command, flags } from '@oclif/command';
import cli from 'cli-ux';
import { Requests } from '../http/http';
import { recoverUrl, storeCredentials } from '../utils/requestUtils';

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
    relogin: flags.string({ char: 'r', description: 'Reuses url and master key' }),
  };

  async run() {
    const { flags } = this.parse(Init);
    let url, masterKey;
    if (flags.relogin) {
      const obj = await recoverUrl(this);
      url = obj.url;
      masterKey = obj.masterKey;
    } else {
      url = await cli.prompt('Specify the API url of your Conduit installation');
      masterKey = await cli.prompt('Add the master key of your conduit installation');
    }
    const adminUsername = await cli.prompt('Specify the admin username');
    const adminPassword = await cli.prompt('Specify the admin password');
    const requestInstance = new Requests(url, masterKey);
    cli.action.start('Attempting login');
    try {
      const usr = await requestInstance.loginRequest(adminUsername, adminPassword);
      await storeCredentials(this, { url, masterKey }, usr!);
      cli.action.stop('Login Successful!');
    } catch (e) {
      this.log(e);
      cli.action.stop('Login failed!');
    }
  }
}
