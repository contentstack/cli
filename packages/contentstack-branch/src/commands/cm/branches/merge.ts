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
    'compare-branch': flags.string({
      description: 'Compare branch name',
      required: true,
    }),
    'merge-comment': flags.string({
      description: 'Merge comment',
    }),
    strategy: flags.string({
      description: 'Merge strategy',
      options: ['merge_prefer_base', 'merge_prefer_compare', 'overwrite_with_compare', 'custom_preferences'],
      hidden: true,
    }),
    'export-summary-path': flags.string({
      description: 'Export file path',
      hidden: true,
    }),
    'use-merge-summary': flags.string({
      description: 'Path of merge summary file',
      hidden: true,
    }),
    'execute-merge': flags.boolean({
      description: 'Path of merge summary file',
      hidden: true,
    }),
    'export-summary': flags.boolean({
      description: 'Path of merge summary file',
      hidden: true,
    }),
    'export-and-execute': flags.boolean({
      description: 'Path of merge summary file',
      hidden: true,
    }),
    'strategy-sub-options': flags.string({
      description: 'Merge strategy sub options',
      options: ['merge_new_only', 'merge_modified_only_prefer_base', 'both'],
      hidden: true,
    }),
  };

  static aliases: string[] = []; // Note: alternative usage if any

  async run(): Promise<any> {
    try {
      //  get config
      //  validate config
      // if summary path is given execute it directly
      //  Display summary - displaySummary
      //  validate and get compare branch
      //  initiate merge handler
    } catch (error) {}
  }
}
