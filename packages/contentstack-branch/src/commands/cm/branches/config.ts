import { Command } from '@contentstack/cli-command';
import { cliux, messageHandler, printFlagDeprecation, managementSDKClient, flags } from '@contentstack/cli-utilities';

export default class BranchConfigCommand extends Command {
  static description: string = messageHandler.parse('Set the branch'); // Note: improve the description

  static examples: string[] = ['csdx cm:branches:config --base-branch main --stack-api-key bltxxxxxxxx']; // Note: add more examples

  static usage: string = 'cm:branches:config [--base-branch <value>] [--stack-api-key <value>]'; // Note: add all flags

  static flags = {};

  static aliases: string[] = []; // Note: alternative usage if any

  async run(): Promise<any> {
    try {
      const managementAPIClient = await managementSDKClient({ host: this.cmaHost });
      const { flags: branchConfigFlags } = await this.parse(BranchConfigCommand);
      /**
       * Implementation
       */
    } catch (error) {}
  }
}
