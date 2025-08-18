import { cliux, handleAndLogError, log } from '@contentstack/cli-utilities';
import { BaseCommand } from '../../../base-command';
import { MFAService } from '../../../utils/mfa-handler';
import { confirmMFARemoval } from '../../../utils/interactive';
import { Flags } from '@oclif/core';

export default class MFARemoveCommand extends BaseCommand<typeof MFARemoveCommand> {
  static readonly description = 'Remove stored secret';

  static readonly examples = ['$ csdx config:mfa:remove', '$ csdx config:mfa:remove -y'];

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
    log.debug('MFARemoveCommand initialized', { ...this.contextDetails, argv }); // Debug: Log command initialization
  }

  async run(): Promise<void> {
    try {
      log.debug('MFARemoveCommand run method started', this.contextDetails); // Debug: Log start of run

      log.debug('Parsing command flags', this.contextDetails); // Debug: Log before parsing flags
      const { flags } = await this.parse(MFARemoveCommand);
      log.debug('Command flags parsed', { ...this.contextDetails, flags }); // Debug: Log parsed flags

      log.debug('Checking for stored MFA configuration', this.contextDetails); // Debug: Log before config check
      let config;
      config = this.mfaService.getStoredConfig();
      log.debug('Stored MFA configuration check', { ...this.contextDetails, hasSecret: !!config?.secret }); // Debug: Log config check result
      if (!config?.secret) {
        cliux.error('No MFA configuration found');
        process.exit(1);
      }

      if (!flags.yes) {
        log.debug('Prompting for MFA removal confirmation', this.contextDetails); // Debug: Log before confirmation prompt
        const confirm = await confirmMFARemoval();
        log.debug('MFA removal confirmation result', { ...this.contextDetails, confirm }); // Debug: Log confirmation result
        if (!confirm) {
          cliux.print('Operation cancelled');
          return;
        }
      }

      log.debug('Removing MFA configuration', this.contextDetails); // Debug: Log before config removal
      this.mfaService.removeConfig();
      cliux.success('Secret has been removed successfully');
      log.debug('MFA configuration removed successfully', this.contextDetails); // Debug: Log successful removal
    } catch (error) {
      log.debug('Error occurred during MFA removal', { ...this.contextDetails, error: error.message }); // Debug: Log error details
      handleAndLogError(error, { module: 'config:mfa:remove' });
      process.exit(1);
    }
  }
}