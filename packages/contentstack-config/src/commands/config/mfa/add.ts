import { cliux } from '@contentstack/cli-utilities';
import { BaseCommand } from '../../../base-command';
import { MFAService } from '../../../services/mfa/mfa.service';
import { MFAError } from '../../../services/mfa/mfa.types';

export default class AddMFACommand extends BaseCommand<typeof AddMFACommand> {
  static readonly description = 'Add MFA secret for 2FA authentication';

  static readonly examples = [
    '$ csdx config:mfa:add',
  ];

  private readonly mfaService: MFAService;

  constructor(argv: string[], config: any) {
    super(argv, config);
    this.mfaService = new MFAService();
  }

  static readonly flags = {};

  async run(): Promise<void> {
    try {
      // Check for environment variable first
      const envSecret = process.env.CONTENTSTACK_MFA_SECRET;
      if (envSecret) {
        if (!this.mfaService.validateSecret(envSecret)) {
          throw new MFAError('Invalid secret format in environment variable');
        }
        cliux.print('Using MFA secret from environment variable');
        return;
      }

      // If no environment variable, prompt for manual input
      const secret = await cliux.inquire<string>({
        type: 'password',
        name: 'secret',
        message: 'Enter your secret (or set CONTENTSTACK_MFA_SECRET environment variable):',
        validate: (input: string) => {
          if (!input) {
            cliux.error('Secret is required');
            process.exit(1);
          }
          if (!this.mfaService.validateSecret(input)) {
            cliux.error('Invalid secret format');
            process.exit(1);
          }
          return true;
        },
      });

      if (!secret || !this.mfaService.validateSecret(secret)) {
        throw new MFAError('Invalid secret format');
      }

      // Check if MFA configuration already exists
      const existingConfig = this.mfaService.getStoredConfig();
      if (existingConfig) {
        const confirm = await cliux.inquire<boolean>({
          type: 'confirm',
          name: 'confirm',
          message: 'Secret configuration already exists. Do you want to overwrite it?',
        });

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
        if (error instanceof MFAError) {
          throw error;
        }
        throw new MFAError('Failed to store secret');
      }
    } catch (error) {
      if (error instanceof MFAError) {
        cliux.error(error.message);
      } else {
        cliux.error('Failed to store secret');
      }
      throw error;
    }
  }
}