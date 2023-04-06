import { Command } from '@contentstack/cli-command';
import { cliux, messageHandler, printFlagDeprecation, managementSDKClient, flags } from '@contentstack/cli-utilities';

export default class BranchMergeCommand extends Command {
  static description: string = messageHandler.parse('Merge changes from a branch'); // Note: Update the description

  static examples: string[] = [
    'csdx cm:branches:merge --compare-branch feature-branch --module=content-types',
    'csdx cm:branches:merge --compare-branch feature-branch --module=global-fields',
    'csdx cm:branches:merge --compare-branch feature-branch',
  ];

  static usage: string = 'cm:branches:merge [--compare-branch <value>] [--module <value>]'; // Note: Add and modify the usage

  static flags = {
    module: flags.string({
      description: '[optional] specific module name',
    }),
    'compare-branch': flags.string({
      description: 'Compare branch name',
      required: true,
    }),
  };

  static aliases: string[] = []; // Note: alternative usage if any

  async run(): Promise<any> {
    try {
      // get config
      //  Display summary - displaySummary
      //  Collect the mergeSettings
      //  Show Merge summary
      //  Execute/export summary ( request payload )
    } catch (error) {}
  }
}
