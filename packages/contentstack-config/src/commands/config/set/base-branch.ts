import { Command } from '@contentstack/cli-command';
import { cliux, flags, configHandler, FlagInput } from '@contentstack/cli-utilities';
import { interactive } from '../../../utils';

export default class BranchSetCommand extends Command {
  static description = 'Set branch for CLI';
  static flags: FlagInput = {
    'stack-api-key': flags.string({ char: 'k', description: 'Stack API Key' }),
    'base-branch': flags.string({ description: 'Base Branch' }),
  };
  static examples = [
    '$ csdx config:set:base-branch',
    '$ csdx config:set:base-branch --stack-api-key <value> --base-branch <value>',
  ];

  async run() {
    try {
      const { flags: branchSetFlags } = await this.parse(BranchSetCommand);
      let apiKey = branchSetFlags['stack-api-key'];
      let baseBranch = branchSetFlags['base-branch'];

      if (!apiKey) {
        apiKey = await interactive.askStackAPIKey();
      }

      if (!baseBranch) {
        baseBranch = await interactive.askBaseBranch();
      }

      configHandler.set(`baseBranch.${apiKey}`, baseBranch);

      cliux.success(`base branch : ${baseBranch}`);
      cliux.success(`stack-api-key: ${apiKey}`);
      cliux.success(
        `Base branch configuration for stack-api-key: ${apiKey} and branch: ${baseBranch} set successfully`,
      );
    } catch (error) {
      cliux.error('error', error);
    }
  }
}
