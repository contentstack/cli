import { Command } from '@contentstack/cli-command';
import { cliux, flags, configHandler } from '@contentstack/cli-utilities';
import { interactive } from '../../../utils';
import { removeConfig } from '../../../config/remove-config';

export default class RemoveBranchConfigCommand extends Command {
  static description = 'Remove branch config for CLI';
  static flags = {
    'stack-api-key': flags.string({ char: 'k', description: 'Stack API Key' }),
    yes: flags.boolean({ char: 'y', description: 'Force Remove' }),
  };
  static examples = ['$ csdx config:remove:base-branch', '$ csdx config:remove:base-branch --stack-api-key <value>'];

  async run() {
    try {
      const { flags: configRemoveFlags } = await this.parse(RemoveBranchConfigCommand);
      if (!configRemoveFlags['stack-api-key']) {
        configRemoveFlags['stack-api-key'] = await interactive.askStackAPIKey();
      }
      if (configRemoveFlags.yes) {
        removeConfig(configRemoveFlags['stack-api-key']);
      } else {
        const confirmation = await interactive.askConfirmation();
        if (!confirmation) {
          return;
        } else {
          removeConfig(configRemoveFlags['stack-api-key']);
        }
      }
    } catch (error) {
      cliux.error('error', error);
    }
  }
}
