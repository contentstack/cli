import { Command } from '@contentstack/cli-command';
import { messageHandler, flags } from '@contentstack/cli-utilities';
import { deleteBranch } from '../../../utils/delete-branch';
import { refreshbranchConfig } from '../../../utils';
import { interactive } from '../../../utils';

export default class BranchDeleteCommand extends Command {
  static description: string = messageHandler.parse('Delete a branch'); // Note: Update the description

  static examples: string[] = [
    'csdx cm:branches:delete',
    'csdx cm:branches:delete -u main -k bltxxxxxxxx',
    'csdx cm:branches:delete --uid main --stack-api-key bltxxxxxxxx',
  ]; // Note: Add and modify the examples

  static usage: string[] = [
    'cm:branches:delete [-u <value>] [-k <value>]',
    'cm:branches:delete [--uid <value>] [--stack-api-key <value>]',
  ]; // Note: Add and modify the usage

  static flags = {
    force: flags.boolean({ char: 'f' }),
    uid: flags.string({ char: 'u', description: 'UID of the branch to be deleted' }),
    'stack-api-key': flags.string({ char: 'k', description: 'Stack API key' }),
    confirm: flags.boolean({ char: 'y', description: 'Are you sure you want to delete', required: false }),
  };

  static aliases: string[] = []; // Note: alternative usage if any

  async run(): Promise<any> {
    const { flags: branchDeleteFlags } = await this.parse(BranchDeleteCommand);
    let apiKey = branchDeleteFlags['stack-api-key'];

    if (!apiKey) {
      apiKey = await interactive.askStackAPIKey();
    }

    if (!branchDeleteFlags.uid) {
      branchDeleteFlags.uid = await interactive.askBranchUid();
    }

    if (!branchDeleteFlags.confirm) {
      branchDeleteFlags.confirm = await interactive.askConfirmation();
    }

    if (!branchDeleteFlags.confirm) {
      return;
    }
    deleteBranch(this.cmaHost, apiKey, branchDeleteFlags.uid);
  }
}
