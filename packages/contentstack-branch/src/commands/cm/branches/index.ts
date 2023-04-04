import { Command } from '@contentstack/cli-command';
import { cliux, messageHandler, printFlagDeprecation, managementSDKClient, flags } from '@contentstack/cli-utilities';

export default class BranchListCommand extends Command {
  static description: string = messageHandler.parse('List the branches to select'); // Note: Update the description

  static examples: string[] = ['csdx cm:branches --base-branch main --stack-api-key bltxxxxxxxx']; // Note: Add and modify the examples

  static usage: string = 'cm:branches [--base-branch <value>] [--stack-api-key <value>]'; // Note: Add and modify the usage

  static flags = {};

  static aliases: string[] = []; // Note: alternative usage if any

  async run(): Promise<any> {
    try {
      const managementAPIClient = await managementSDKClient({ host: this.cmaHost });
      const { flags: branchListFlags } = await this.parse(BranchListCommand);
      /**
       * Implementation
       */
    } catch (error) {}
  }
}
