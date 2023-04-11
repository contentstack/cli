import { Command } from '@contentstack/cli-command';
import { cliux, flags } from '@contentstack/cli-utilities';
import { setupMergeInputs } from '../../../utils';
import { MergeHandler } from '../../../branch';
export default class BranchMergeCommand extends Command {
  static description: string = 'Merge changes from a branch'; //TBD update the description

  static examples: string[] = [
    'csdx cm:branches:merge --stack-api-key bltxxxxxxxx --compare-branch feature-branch',
    'csdx cm:branches:merge --stack-api-key bltxxxxxxxx --comment "merge comment"',
    'csdx cm:branches:merge -k bltxxxxxxxx --base-branch base-branch',
    'csdx cm:branches:merge --export-summary-path file/path',
    'csdx cm:branches:merge --use-merge-summary file-path',
    'csdx cm:branches:merge -k bltxxxxxxxx --no-revert',
    'csdx cm:branches:merge -k bltxxxxxxxx --compare-branch feature-branch --no-revert',
  ];

  static usage: string =
    'cm:branches:merge [-k <value>][--compare-branch <value>] [--no-revert] [--export-summary-path <value>] [--use-merge-summary <value>] [--comment <value>] [--base-branch <value>]';

  // TBD improve flag descriptions
  static flags = {
    'compare-branch': flags.string({
      description: 'Compare branch name',
    }),
    'base-branch': flags.string({
      description: 'Base branch',
    }),
    comment: flags.string({
      description: 'Merge comment',
    }),
    'stack-api-key': flags.string({
      char: 'k',
      description: 'Provide stack api key to show diff between branches',
    }),
    'export-summary-path': flags.string({
      description: 'Export summary file path',
    }),
    'use-merge-summary': flags.string({
      description: 'Path of merge summary file',
    }),
    'no-revert': flags.boolean({
      description: 'If passed, will not create the new revert branch',
    }),
    format: flags.string({
      default: 'text',
      multiple: false,
      options: ['text', 'verbose'],
      description: '[Optional] Type of flags to show branches status view',
    }),
    strategy: flags.string({
      description: 'Merge strategy',
      options: ['merge_prefer_base', 'merge_prefer_compare', 'overwrite_with_compare', 'custom_preferences'],
      hidden: true,
    }),
    'strategy-sub-options': flags.string({
      description: 'Merge strategy sub options',
      options: ['merge_new_only', 'merge_modified_only_prefer_base', 'both'],
      hidden: true,
    }),
    'merge-action': flags.string({
      description: 'Merge strategy',
      options: ['export', 'execute', 'both'],
      hidden: true,
    }),
  };

  static aliases: string[] = []; // Note: alternative usage if any

  async run(): Promise<any> {
    try {
      const { flags: branchMergeFlags } = await this.parse(BranchMergeCommand);
      const mergeInputs = await setupMergeInputs(branchMergeFlags);
      // display summary
      // const mergeHandler = new MergeHandler({
      //   compareBranch: mergeInputs['compare-branch'],
      //   strategy: mergeInputs.strategy,
      //   strategySubOption: mergeInputs['strategy-sub-options'],
      //   baseBranch: mergeInputs['base-branch'],
      //   branchCompareData: any;
      //   mergeComment?: string;
      //   executeOption?: string;
      //   noRevert?: boolean;
      //  });
      //  get config
      //  validate config
      //  Display summary - displaySummary
      //  validate and get compare branch
      //  initiate merge handler
    } catch (error) {
      console.log('Error in Merge operations', error);
    }
  }
}
