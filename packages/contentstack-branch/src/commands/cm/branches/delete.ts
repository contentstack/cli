import { Command } from '@contentstack/cli-command';
import { cliux, messageHandler, printFlagDeprecation, managementSDKClient, flags } from '@contentstack/cli-utilities';
import { omit } from 'lodash';

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
  };

  static aliases: string[] = []; // Note: alternative usage if any

  async run(): Promise<any> {
    try {
      const managementAPIClient = await managementSDKClient({ host: this.cmaHost });
      const { flags: branchDeleteFlags } = await this.parse(BranchDeleteCommand);
      let apiKey = branchDeleteFlags['stack-api-key'];
      if (!apiKey) {
        apiKey = await cliux.inquire({ type: 'input', message: 'ENTER_API_KEY', name: 'stack-api-key' });
      }
      if (!branchDeleteFlags.uid) {
        branchDeleteFlags.uid = await cliux.inquire({
          type: 'input',
          message: 'ENTER_BRANCH_UID',
          name: 'uid',
        });
      }
      const deleteBranchResponse = await managementAPIClient
        .stack({ api_key: apiKey })
        .branch(branchDeleteFlags.uid)
        .delete();
      cliux.print(JSON.stringify(deleteBranchResponse));
    } catch (error) {
      console.log(error);
    }
  }
}
