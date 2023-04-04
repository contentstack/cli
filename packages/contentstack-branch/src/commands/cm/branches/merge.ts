import { Command } from '@contentstack/cli-command';
import { cliux, messageHandler, printFlagDeprecation, managementSDKClient, flags } from '@contentstack/cli-utilities';

export default class BranchMergeCommand extends Command {
  static description: string = messageHandler.parse('Merge a branch'); // Note: Update the description

  static examples: string[] = ['csdx cm:branches:merge --base-branch main --stack-api-key bltxxxxxxxx']; // Note: Add and modify the examples

  static usage: string = 'cm:branches:merge [--base-branch <value>] [--stack-api-key <value>]'; // Note: Add and modify the usage

  static flags = {};

  static aliases: string[] = []; // Note: alternative usage if any

  async run(): Promise<any> {
    try {
      const managementAPIClient = await managementSDKClient({ host: this.cmaHost });
      const { flags: branchMergeFlags } = await this.parse(BranchMergeCommand);
      await cliux.inquire({ type: 'input', message: 'ENTER_API_KEY', name: 'stack-api-key' });
      cliux.print('Running merge command');
      /**
       * Implementation
       */
    } catch (error) {}
  }
}
