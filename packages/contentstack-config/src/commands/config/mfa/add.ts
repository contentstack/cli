import { cliux, handleAndLogError, log, messageHandler } from '@contentstack/cli-utilities';
import { BaseCommand } from '../../../base-command';
import { MFAService } from '../../../utils/mfa-handler';
import { getMFASecretInput, confirmOverwriteMFASecret } from '../../../utils/interactive';

export default class AddMFACommand extends BaseCommand<typeof AddMFACommand> {
  static readonly description = 'Add MFA Secret for Two-Factor Authentication';

  static readonly examples = ['$ csdx config:mfa:add'];

  private readonly mfaService: MFAService;

  constructor(argv: string[], config: any) {
    super(argv, config);
    this.mfaService = new MFAService();
  }

  static readonly flags = {};

  async run(): Promise<void> {
    try {
      log.debug('MFA:Add Command run method started', this.contextDetails);

      log.debug('Checking for Contentstack MFA secret in Environment Variable', {
        ...this.contextDetails,
        hasEnvSecret: !!process.env.CONTENTSTACK_MFA_SECRET,
      });
      const envSecret = process.env.CONTENTSTACK_MFA_SECRET;

      if (envSecret && !this.mfaService.validateSecret(envSecret)) {
        log.debug('MFA secret Found in ENV but not Valid', {
          ...this.contextDetails,
          hasEnvSecret: !!process.env.CONTENTSTACK_MFA_SECRET,
        });
        cliux.error('Invalid secret format');
        cliux.print(
          'For more information about MFA, visit: https://www.contentstack.com/docs/developers/security/multi-factor-authentication',
          { color: 'yellow' },
        );
        process.exit(1);
      } else if (envSecret) {
        log.debug('MFA secret found in env and is Valid', {
          ...this.contextDetails,
          hasEnvSecret: !!process.env.CONTENTSTACK_MFA_SECRET,
        });
        cliux.print('Using MFA secret from environment variable');
      } else {
        log.debug('MFA secret Not Found in env going for user input', {
          ...this.contextDetails,
          hasEnvSecret: !!process.env.CONTENTSTACK_MFA_SECRET,
        });
      }

      const secret = envSecret || (await getMFASecretInput());

      if (!secret || !this.mfaService.validateSecret(secret)) {
        log.debug('MFA secret input is empty or the secret validation fails exiting!', {
          ...this.contextDetails,
          hasSecret: !!secret,
        });
        cliux.error('Invalid secret format or No input');
        cliux.print(
          'For more information about MFA, visit: https://www.contentstack.com/docs/developers/security/multi-factor-authentication',
          { color: 'yellow' },
        );
        process.exit(1);
      }

      log.debug('Getting the stored Config Data as MFA secret input is valid. ', {
        ...this.contextDetails,
        hasSecret: !!secret,
      });
      const existingConfig = this.mfaService.getStoredConfig();
      if (existingConfig) {
        log.debug('MFA config exist prompting for user to override the stored mfa config', {
          ...this.contextDetails,
          hasExistingConfig: true,
        });
        const confirm = await confirmOverwriteMFASecret();
        if (!confirm) {
          log.debug('User cancelled the override operation', {
            ...this.contextDetails,
            hasConfirmed: confirm,
          });
          cliux.print('Operation cancelled');
          return;
        }
      }
      log.debug('Storing the mfa secret in config', {
        ...this.contextDetails,
      });

      this.mfaService.storeConfig({ secret });
      cliux.success('Secret has been stored successfully');
    } catch (error) {
      log.debug('Storing the mfa secret in config failed', {
        ...this.contextDetails,
      });
      cliux.print('', { color: 'red' });
      handleAndLogError(error, { module: 'config:mfa:add' });
    }
  }
}
