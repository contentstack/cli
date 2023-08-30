import { Command } from '@contentstack/cli-command';
import { messageHandler, flags, cliux, isAuthenticated } from '@contentstack/cli-utilities';
import { deleteBranch } from '../../../utils/delete-branch';
import { interactive, handleErrorMsg } from '../../../utils';

export default class BranchDeleteCommand extends Command {
  static description: string = messageHandler.parse('Delete a branch');

  static examples: string[] = [
    'csdx cm:branches:delete',
    'csdx cm:branches:delete --uid main -k bltxxxxxxxx',
    'csdx cm:branches:delete --uid main --stack-api-key bltxxxxxxxx',
    'csdx cm:branches:delete --uid main --stack-api-key bltxxxxxxxx --yes',
  ];

  static usage: string[] = [
    'cm:branches:delete [-uid <value>] [-k <value>]',
    'cm:branches:delete [--uid <value>] [--stack-api-key <value>]',
  ]; // Note: Add and modify the usage

  static flags = {
    uid: flags.string({ description: 'Branch UID to be deleted' }),
    'stack-api-key': flags.string({ char: 'k', description: 'Stack API key' }),
    yes: flags.boolean({
      char: 'y',
      description: 'Force the deletion of the branch by skipping the confirmation',
    }),
  };

  static aliases: string[] = []; // Note: alternative usage if any

  async run(): Promise<any> {
    const { flags: branchDeleteFlags } = await this.parse(BranchDeleteCommand);
    let apiKey = branchDeleteFlags['stack-api-key'];
    if (!isAuthenticated()) {
      const err = { errorMessage: 'You are not logged in. Please login with command $ csdx auth:login' };
      handleErrorMsg(err);
    }
    if (!apiKey) {
      apiKey = await interactive.askStackAPIKey();
    }

    if (!branchDeleteFlags.uid) {
      branchDeleteFlags.uid = await interactive.askBranchUid();
    }

    if (!branchDeleteFlags.yes) {
      const confirmBranch = await interactive.askBranchNameConfirmation();
      if (confirmBranch !== branchDeleteFlags.uid) {
        cliux.error(`error: To delete the branch, enter a valid branch name '${branchDeleteFlags.uid}'`);
        process.exit(1);
      }
    }

    await deleteBranch(this.cmaHost, apiKey, branchDeleteFlags.uid);
  }
}
