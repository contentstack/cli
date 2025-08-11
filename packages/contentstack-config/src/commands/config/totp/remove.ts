import { cliux } from '@contentstack/cli-utilities';
import { BaseCommand } from '../../../base-command';
import { TOTPService } from '../../../services/totp/totp.service';
import { TOTPError } from '../../../services/totp/types';
import { Flags } from '@oclif/core';

export default class RemoveTOTPCommand extends BaseCommand<typeof RemoveTOTPCommand> {
  static readonly description = 'Remove stored secret';

  static readonly examples = [
    '$ csdx config:totp:remove',
    '$ csdx config:totp:remove -y',
  ];

  static readonly flags = {
    yes: Flags.boolean({
      char: 'y',
      description: 'Skip confirmation prompt',
      default: false,
    }),
  };

  private readonly totpService: TOTPService;

  constructor(argv: string[], config: any) {
    super(argv, config);
    this.totpService = new TOTPService();
  }

  async run(): Promise<void> {
    try {
      const { flags } = await this.parse(RemoveTOTPCommand);

      let config;
      try {
        config = this.totpService.getStoredConfig();
        if (!config?.secret) {
          throw new TOTPError('Failed to remove configuration');
        }
      } catch (error) {
        if (error instanceof TOTPError) {
          throw error;
        }
        throw new TOTPError('Failed to remove configuration');
      }

      // Verify the configuration is valid
      let isCorrupted = false;
      try {
        this.totpService.decryptSecret(config.secret);
      } catch (error) {
        this.logger.debug('Failed to decrypt secret', { error });
        isCorrupted = true;
      }

      // Confirm removal unless -y flag is used
      if (!flags.yes) {
        let message = 'Are you sure you want to remove the stored secret?';
        if (isCorrupted) {
          message = 'Configuration appears corrupted. Do you want to remove it anyway?';
        }

        const confirm = await cliux.inquire({
          type: 'confirm',
          name: 'confirm',
          message,
        });

        if (!confirm) {
          cliux.print('Operation cancelled');
          return;
        }
      }

      try {
        this.totpService.removeConfig();
        cliux.success('Secret has been removed successfully');
      } catch (error) {
        this.logger.error('Failed to remove secret configuration', { error });
        throw new TOTPError('Failed to remove configuration');
      }
    } catch (error) {
      if (error instanceof TOTPError) {
        cliux.error(error.message);
      } else {
        cliux.error('Failed to remove configuration');
      }
      throw error;
    }
  }
}