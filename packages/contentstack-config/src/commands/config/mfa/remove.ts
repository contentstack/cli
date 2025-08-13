import { cliux, handleAndLogError } from '@contentstack/cli-utilities';
import { BaseCommand } from '../../../base-command';
import { MFAService } from '../../../services/mfa/mfa.service';
import { confirmMFARemoval } from '../../../utils/interactive';
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
      config = this.mfaService.getStoredConfig();
      if (!config?.secret) {
        cliux.error('No MFA configuration found');
        process.exit(1);
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
        const confirm = await confirmMFARemoval(isCorrupted);
        if (!confirm) {
          cliux.print('Operation cancelled');
          return;
        }
      }

      try {
        this.mfaService.removeConfig();
        cliux.success('Secret has been removed successfully');
      } catch (error) {
        handleAndLogError(error, { module: 'config:mfa:remove' });
        process.exit(1);
      }
    } catch (error) {
      handleAndLogError(error, { module: 'config:mfa:remove' });
      process.exit(1);
    }
  }
}