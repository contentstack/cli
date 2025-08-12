import { cliux } from '@contentstack/cli-utilities';
import { Flags } from '@oclif/core';
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

  static readonly flags = {
    secret: Flags.string({
      description: 'MFA secret for 2FA authentication',
      required: false,
    }),
  };

  async run(): Promise<void> {
    try {
      const { flags } = await this.parse(AddMFACommand);
      let secret = flags.secret;

      if (!secret) {
        secret = await cliux.inquire({
          type: 'password',
          name: 'secret',
          message: 'Enter your secret:',
          validate: (input: string) => {
            if (!input) return 'Secret is required';
            if (!this.mfaService.validateSecret(input)) return 'Invalid secret format';
            return true;
          },
        });
      }

      // Validate secret if provided via flag
      if (!secret || !this.mfaService.validateSecret(secret)) {
        throw new MFAError('Invalid secret format');
      }

      // Check if MFA configuration already exists
      const existingConfig = this.mfaService.getStoredConfig();
      if (existingConfig) {
        const confirm = await cliux.inquire({
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