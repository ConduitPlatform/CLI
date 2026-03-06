import { Command, Flags, CliUx } from '@oclif/core';
import { CliUpdate } from './cli/update';
import { Requests } from '../http/http';
import { recoverApiConfig, storeConfiguration } from '../utils/requestUtils';
import { booleanPrompt } from '../utils/cli';

export class Init extends Command {
  static description =
    'Initialize the CLI to communicate with Conduit (using an API token)';

  static examples = [
    `$ conduit init
...
Verifying connection
Connected successfully!
`,
    `$ conduit init --admin-url https://admin.example.com --token cdt_xxxx
`,
  ];

  static flags = {
    'admin-url': Flags.string({
      description: 'Administrative API URL of your Conduit installation',
      env: 'CONDUIT_ADMIN_URL',
    }),
    token: Flags.string({
      description: 'API token (cdt_...) from Conduit admin panel (Settings > API Tokens)',
      env: 'CONDUIT_API_TOKEN',
    }),
    'app-url': Flags.string({
      description: 'Application API URL (optional, for Conduit Router)',
      env: 'CONDUIT_APP_URL',
    }),
    relogin: Flags.boolean({
      char: 'r',
      description: 'Reuse admin URL (and optionally app URL) from existing configuration',
    }),
  };

  async run() {
    await CliUpdate.displayUpdateHint(this);
    const { flags } = await this.parse(Init);
    let adminUrl: string | undefined = flags['admin-url'];
    let token: string | undefined = flags.token;
    let appUrl: string | undefined = flags['app-url'];

    if (flags.relogin) {
      try {
        const existing = await recoverApiConfig(this);
        adminUrl = adminUrl ?? existing.adminUrl;
        appUrl = appUrl ?? existing.appUrl;
      } catch {
        // no existing config
      }
    }

    // Prompt for admin URL if not provided
    while (!adminUrl) {
      adminUrl = await CliUx.ux.prompt(
        'Specify the Administrative API URL of your Conduit installation',
      );
    }

    // Prompt for token if not provided
    while (!token) {
      token = await CliUx.ux.prompt(
        'Paste your API token (create one in Conduit admin: Settings > API Tokens)',
        { type: 'hide' },
      );
      if (!token?.trim()) {
        CliUx.ux.log('Token cannot be empty.\n');
        token = undefined;
      }
    }
    token = token.trim();

    CliUx.ux.action.start('Verifying connection');
    const requestInstance = new Requests(this, adminUrl, token, appUrl);
    const ok = await requestInstance.verifyConnection();
    CliUx.ux.action.stop(ok ? 'Connected successfully!' : 'Connection failed');

    if (!ok) {
      CliUx.ux.log(
        `Could not connect to Conduit at ${adminUrl}. Check the URL and that your API token is valid.\n`,
      );
      process.exit(1);
    }

    // Optionally prompt for app URL if not in non-interactive mode and not set
    if (!flags.token && !appUrl) {
      const useRouter = await booleanPrompt(
        'Does your deployment use Conduit Router? (optional)',
        'no',
      );
      if (useRouter) {
        while (true) {
          appUrl = await CliUx.ux.prompt(
            'Specify the Application API URL of your Conduit installation',
          );
          if (appUrl) break;
        }
      }
    }

    await storeConfiguration(this, { adminUrl, token, appUrl });
  }
}
