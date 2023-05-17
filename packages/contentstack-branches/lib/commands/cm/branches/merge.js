"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cli_command_1 = require("@contentstack/cli-command");
const cli_utilities_1 = require("@contentstack/cli-utilities");
const utils_1 = require("../../../utils");
const branch_1 = require("../../../branch");
class BranchMergeCommand extends cli_command_1.Command {
    async run() {
        try {
            let { flags: branchMergeFlags } = await this.parse(BranchMergeCommand);
            branchMergeFlags = await (0, utils_1.setupMergeInputs)(branchMergeFlags);
            // display branch status
            const branchCompareData = await (0, utils_1.displayBranchStatus)({
                stackAPIKey: branchMergeFlags['stack-api-key'],
                baseBranch: branchMergeFlags['base-branch'],
                compareBranch: branchMergeFlags['compare-branch'],
                host: this.cmaHost,
                format: 'compact-text',
            });
            await new branch_1.MergeHandler({
                stackAPIKey: branchMergeFlags['stack-api-key'],
                compareBranch: branchMergeFlags['compare-branch'],
                strategy: branchMergeFlags.strategy,
                strategySubOption: branchMergeFlags['strategy-sub-options'],
                baseBranch: branchMergeFlags['base-branch'],
                branchCompareData: branchCompareData,
                mergeComment: branchMergeFlags.comment,
                executeOption: branchMergeFlags['merge-action'],
                noRevert: branchMergeFlags['no-revert'],
                format: 'compact-text',
                exportSummaryPath: branchMergeFlags['export-summary-path'],
                useMergeSummary: branchMergeFlags['use-merge-summary'],
                host: this.cmaHost,
                enableEntryExp: true,
            }).start();
        }
        catch (error) {
            console.log('Error in Merge operations', error);
        }
    }
}
exports.default = BranchMergeCommand;
BranchMergeCommand.description = 'Merge changes from a branch'; //TBD update the description
BranchMergeCommand.examples = [
    'csdx cm:branches:merge --stack-api-key bltxxxxxxxx --compare-branch feature-branch',
    'csdx cm:branches:merge --stack-api-key bltxxxxxxxx --comment "merge comment"',
    'csdx cm:branches:merge -k bltxxxxxxxx --base-branch base-branch',
    'csdx cm:branches:merge --export-summary-path file/path',
    'csdx cm:branches:merge --use-merge-summary file-path',
    'csdx cm:branches:merge -k bltxxxxxxxx --no-revert',
    'csdx cm:branches:merge -k bltxxxxxxxx --compare-branch feature-branch --no-revert',
];
BranchMergeCommand.usage = 'cm:branches:merge [-k <value>][--compare-branch <value>] [--no-revert] [--export-summary-path <value>] [--use-merge-summary <value>] [--comment <value>] [--base-branch <value>]';
// TBD improve flag descriptions
BranchMergeCommand.flags = {
    'compare-branch': cli_utilities_1.flags.string({
        description: 'Compare branch name',
    }),
    'base-branch': cli_utilities_1.flags.string({
        description: 'Base branch',
    }),
    comment: cli_utilities_1.flags.string({
        description: 'Merge comment',
    }),
    'stack-api-key': cli_utilities_1.flags.string({
        char: 'k',
        description: 'Provide Stack API key to show difference between branches',
    }),
    'export-summary-path': cli_utilities_1.flags.string({
        description: 'Export summary file path',
    }),
    'use-merge-summary': cli_utilities_1.flags.string({
        description: 'Path of merge summary file',
    }),
    'no-revert': cli_utilities_1.flags.boolean({
        description: 'If passed, will not create the new revert branch',
    }),
    strategy: cli_utilities_1.flags.string({
        description: 'Merge strategy',
        options: ['merge_prefer_base', 'merge_prefer_compare', 'overwrite_with_compare', 'custom_preferences'],
        hidden: true,
    }),
    'strategy-sub-options': cli_utilities_1.flags.string({
        description: 'Merge strategy sub options',
        options: ['new', 'modified', 'both'],
        hidden: true,
    }),
    'merge-action': cli_utilities_1.flags.string({
        description: 'Merge strategy',
        options: ['export', 'execute', 'both'],
        hidden: true,
    }),
};
BranchMergeCommand.aliases = []; // Note: alternative usage if any
