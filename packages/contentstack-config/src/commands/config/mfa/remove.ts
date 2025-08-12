import { cliux } from '@contentstack/cli-utilities';
import { BaseCommand } from '../../../base-command';
import { MFAService } from '../../../services/mfa/mfa.service';
import { MFAError } from '../../../services/mfa/mfa.types';
import { Flags } from '@oclif/core';

export default class RemoveMFACommand extends BaseCommand<typeof RemoveMFACommand> {
  static readonly description = 'Remove stored secret';

  static readonly examples = [
    '$ csdx config:mfa:remove',
    '$ csdx config:mfa:remove -y',
  ];

  static readonly flags = {
    yes: Flags.boolean({
      char: 'y',
      description: 'Skip confirmation prompt',
      default: false,
    }),
  };

  private readonly mfaService: MFAService;

  constructor(argv: string[], config: any) {
    super(argv, config);
    this.mfaService = new MFAService();
  }

  async run(): Promise<void> {
    try {
      const { flags } = await this.parse(RemoveMFACommand);

      let config;
      try {
        config = this.mfaService.getStoredConfig();
        if (!config?.secret) {
          throw new MFAError('Failed to remove secret configuration');
        }
      } catch (error) {
        if (error instanceof MFAError) {
          throw error;
        }
        throw new MFAError('Failed to remove secret configuration');
      }

      // Verify the configuration is valid
      let isCorrupted = false;
      try {
        this.mfaService.decryptSecret(config.secret);
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
        this.mfaService.removeConfig();
        cliux.success('Secret has been removed successfully');
      } catch (error) {
        this.logger.error('Failed to remove secret configuration', { error });
        throw new MFAError('Failed to remove secret configuration');
      }
    } catch (error) {
      if (error instanceof MFAError) {
        cliux.error(error.message);
      } else {
        cliux.error('Failed to remove secret configuration');
      }
      throw error;
    }
  }
}