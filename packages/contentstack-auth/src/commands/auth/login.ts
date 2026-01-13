import {
  cliux,
  CLIError,
  authHandler as oauthHandler,
  flags,
  managementSDKClient,
  FlagInput,
  log,
  handleAndLogError,
  messageHandler,
} from '@contentstack/cli-utilities';
import { User } from '../../interfaces';
import { authHandler, interactive, mfaHandler } from '../../utils';
import { BaseCommand } from '../../base-command';

export default class LoginCommand extends BaseCommand<typeof LoginCommand> {
  static run; // to fix the test issue
  static description = 'User sessions login';

  static examples = [
    '$ csdx auth:login',
    '$ csdx auth:login -u <username>',
    '$ csdx auth:login -u <username> -p <password>',
    '$ csdx auth:login --username <username>',
    '$ csdx auth:login --username <username> --password <password>',
  ];

  static flags: FlagInput = {
    username: flags.string({
      char: 'u',
      description: 'Email address of your Contentstack account.',
      multiple: false,
      required: false,
      exclusive: ['oauth'],
    }),
    password: flags.string({
      char: 'p',
      description: 'Password of your Contentstack app.',
      multiple: false,
      required: false,
      exclusive: ['oauth'],
    }),

    oauth: flags.boolean({
      description: 'Enables single sign-on (SSO) in Contentstack CLI.',
      required: false,
      default: false,
      exclusive: ['username', 'password'],
    }),
  };

  static aliases = ['login'];

  async run(): Promise<any> {
    log.debug('LoginCommand run method started', this.contextDetails);

    try {
      log.debug('Initializing the Management API client.', this.contextDetails);
      const managementAPIClient = await managementSDKClient({ host: this.cmaHost, skipTokenValidity: true });
      log.debug('Management API client initialized successfully.', this.contextDetails);

      const { flags: loginFlags } = await this.parse(LoginCommand);
      log.debug('Token add flags parsed.', { ...this.contextDetails, flags: loginFlags });

      authHandler.client = managementAPIClient;
      log.debug('Auth handler client set', this.contextDetails);

      const oauth = loginFlags?.oauth;
      log.debug(`Authentication method: ${oauth ? 'OAuth' : 'Basic'}`, this.contextDetails);

      if (oauth === true) {
        log.debug('Starting OAuth authentication flow', this.contextDetails);
        oauthHandler.host = this.cmaHost;
        await oauthHandler.oauth();
        log.debug('OAuth authentication completed', this.contextDetails);
      } else {
        log.debug('Starting basic authentication flow', this.contextDetails);
        const username = loginFlags?.username || (await interactive.askUsername());
        const password = loginFlags?.password || (await interactive.askPassword());
        log.debug('Credentials obtained', {
          ...this.contextDetails,
          hasUsername: !!username,
          hasPassword: !!password,
        });

        await this.login(username, password);
      }
    } catch (error) {
      log.debug('Login failed.', {
        ...this.contextDetails,
        error,
      });
      if ((error?.message && error?.message.includes('2FA')) || error?.message.includes('MFA')) {
        error.message = `${error.message}\nFor more information about MFA, visit: https://www.contentstack.com/docs/developers/security/multi-factor-authentication`;
      }
      handleAndLogError(error, { ...this.contextDetails });
      process.exit();
    }
  }

  async login(username: string, password: string): Promise<void> {
    log.debug('Starting login process', { ...this.contextDetails, username });

    try {
      log.debug('Calling auth handler login', this.contextDetails);
      let tfaToken: string | undefined;

      try {
        tfaToken = await mfaHandler.getMFACode();
        if (tfaToken) {
          log.debug('MFA token generated from stored configuration', this.contextDetails);
        }
      } catch (error) {
        log.debug('Failed to generate MFA token from config', { ...this.contextDetails, error });
        tfaToken = undefined;
      }

      const user: User = await authHandler.login(username, password, tfaToken);
      log.debug('Auth handler login completed.', {
        ...this.contextDetails,
        hasUser: !!user,
        hasAuthToken: !!user?.authtoken,
        userEmail: user?.email,
      });

      if (typeof user !== 'object' || !user.authtoken || !user.email) {
        log.debug('Login failed: Invalid user response', { ...this.contextDetails, user });
        throw new CLIError('Login failed: Invalid response.');
      }

      log.debug('Setting configuration data for basic authentication.', this.contextDetails);
      await oauthHandler.setConfigData('basicAuth', user);
      log.debug('Configuration data set successfully.', this.contextDetails);

      log.success(messageHandler.parse('CLI_AUTH_LOGIN_SUCCESS'), this.contextDetails);
      log.debug('Login completed successfully.', this.contextDetails);
    } catch (error) {
      log.debug('Login failed.', { ...this.contextDetails, error });
      throw error;
    }
  }
}
