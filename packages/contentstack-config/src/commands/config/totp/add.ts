import { cliux } from '@contentstack/cli-utilities';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../../../base-command';
import { TOTPService } from '../../../services/totp/totp.service';
import { TOTPError } from '../../../services/totp/types';

export default class AddTOTPCommand extends BaseCommand<typeof AddTOTPCommand> {
  static readonly description = 'Add TOTP secret for 2FA authentication';

  static readonly examples = [
    '$ csdx config:totp:add',
  ];

  private readonly totpService: TOTPService;

  constructor(argv: string[], config: any) {
    super(argv, config);
    this.totpService = new TOTPService();
  }

  static readonly flags = {
    secret: Flags.string({
      description: 'TOTP secret for 2FA authentication',
      required: false,
    }),
  };

  async run(): Promise<void> {
    try {
      const { flags } = await this.parse(AddTOTPCommand);
      let secret = flags.secret;

      if (!secret) {
        secret = await cliux.inquire({
          type: 'password',
          name: 'secret',
          message: 'Enter your secret:',
          validate: (input: string) => {
            if (!input) return 'Secret is required';
            if (!this.totpService.validateSecret(input)) return 'Invalid TOTP secret format';
            return true;
          },
        });
      }

      // Validate secret if provided via flag
      if (!secret || !this.totpService.validateSecret(secret)) {
        throw new TOTPError('Invalid TOTP secret format');
      }

      // Check if TOTP configuration already exists
      const existingConfig = this.totpService.getStoredConfig();
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
        const encryptedSecret = this.totpService.encryptSecret(secret);
        this.totpService.storeConfig({ secret: encryptedSecret });
        cliux.success('Secret has been stored successfully');
      } catch (error) {
        if (error instanceof TOTPError) {
          throw error;
        }
        throw new TOTPError('Failed to store configuration');
      }
    } catch (error) {
      if (error instanceof TOTPError) {
        cliux.error(error.message);
      } else {
        cliux.error('Failed to store configuration');
      }
      throw error;
    }
  }
}