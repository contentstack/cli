import { Command } from '@contentstack/cli-command';
import { cliux, messageHandler, printFlagDeprecation, managementSDKClient, flags } from '@contentstack/cli-utilities';

export default class BranchDiffCommand extends Command {
  static description: string = messageHandler.parse('Check the difference between the branches'); // Note: Update the description

  static examples: string[] = ['csdx cm:branches:diff --base-branch main --stack-api-key bltxxxxxxxx']; // Note: Add and modify the examples

  static usage: string = 'cm:branches:diff [--base-branch <value>] [--stack-api-key <value>]'; // Note: Add and modify the usage

  static flags = {};

  static aliases: string[] = []; // Note: alternative usage if any

  async run(): Promise<any> {
    try {
      const managementAPIClient = await managementSDKClient({ host: this.cmaHost });
      const { flags: branchDiffFlags } = await this.parse(BranchDiffCommand);
      /**
       * Implementation
       */
    } catch (error) {}
  }
}
