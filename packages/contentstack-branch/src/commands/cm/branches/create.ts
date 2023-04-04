import { Command } from '@contentstack/cli-command';
import { cliux, messageHandler, printFlagDeprecation, managementSDKClient, flags } from '@contentstack/cli-utilities';

export default class BranchCreateCommand extends Command {
  static description: string = messageHandler.parse('Create a new branch'); // Note: Update the description

  static examples: string[] = ['csdx cm:branches:create --base-branch main --stack-api-key bltxxxxxxxx']; // Note: Add and modify the examples

  static usage: string = 'cm:branches:create [--base-branch <value>] [--stack-api-key <value>]'; // Note: Add and modify the usage

  static flags = {};

  static aliases: string[] = []; // Note: alternative usage if any

  async run(): Promise<any> {
    try {
      const managementAPIClient = await managementSDKClient({ host: this.cmaHost });
      const { flags: branchCreateFlags } = await this.parse(BranchCreateCommand);
      /**
       * Implementation
       */
    } catch (error) {}
  }
}
