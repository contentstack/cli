import { cliux, handleAndLogError } from '@contentstack/cli-utilities';
import { BaseCommand } from '../../../base-command';
import { MFAService } from '../../../services/mfa/mfa.service';
import { promptForMFASecret, confirmMFAOverwrite } from '../../../utils/interactive';

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
    const envSecret = process.env.CONTENTSTACK_MFA_SECRET;
    if (envSecret && !this.mfaService.validateSecret(envSecret)) {
      cliux.error('Invalid secret format');
      cliux.print(
        'For more information about MFA, visit: https://www.contentstack.com/docs/developers/security/multi-factor-authentication',
        { color: 'yellow' },
      );
      process.exit(1);
    } else if (envSecret) {
      cliux.print('Using MFA secret from environment variable');
      return;
    }

    // If no environment variable, prompt for manual input
    const secret = await promptForMFASecret(this.mfaService.validateSecret.bind(this.mfaService));

    if (!secret || !this.mfaService.validateSecret(secret)) {
      cliux.error('Invalid secret format.');
      cliux.print(
        'For more information about MFA, visit: https://www.contentstack.com/docs/developers/security/multi-factor-authentication',
        { color: 'yellow' },
      );
      process.exit(1);
    }

    // Check if MFA configuration already exists
    const existingConfig = this.mfaService.getStoredConfig();
    if (existingConfig) {
      const confirm = await confirmMFAOverwrite();
      if (!confirm) {
        cliux.print('Operation cancelled');
        return;
      }
    }

    // Encrypt and store the secret
    try {
      const encryptedSecret = this.mfaService.encryptSecret(secret);
      this.mfaService.storeConfig({ secret: encryptedSecret });
      cliux.success('Secret has been stored successfully');
    } catch (error) {
      handleAndLogError(error, { module: 'config:mfa:add' });
      process.exit(1);
    }
  }
}
