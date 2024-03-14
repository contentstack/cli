import { Command } from '@contentstack/cli-command';
import { cliux, flags, configHandler, FlagInput } from '@contentstack/cli-utilities';
import { interactive } from '../../../utils';

export default class RemoveBranchConfigCommand extends Command {
  static description = 'Remove branch config for CLI';
  static flags: FlagInput = {
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
      if (configHandler.get(`baseBranch.${configRemoveFlags['stack-api-key']}`) === undefined) {
        cliux.error(`No config set for stack-api-key : ${configRemoveFlags['stack-api-key']}`);
        return;
      } else {
        function deleteConfig() {
          configHandler.delete(`baseBranch.${configRemoveFlags['stack-api-key']}`);
          cliux.success(
            `Base branch configuration for stack-api-key: ${configRemoveFlags['stack-api-key']} removed successfully`,
          );
        }
        cliux.success(`base branch : ${await configHandler.get(`baseBranch.${configRemoveFlags['stack-api-key']}`)}`);
        cliux.success(`stack-api-key: ${configRemoveFlags['stack-api-key']}`);
        if (configRemoveFlags.yes) {
          deleteConfig();
        } else {
          const confirmation = await interactive.askConfirmation();
          if (!confirmation) {
            return;
          } else {
            deleteConfig();
          }
        }
      }
    } catch (error) {
      cliux.error('error', error);
    }
  }
}
