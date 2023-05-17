"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cli_command_1 = require("@contentstack/cli-command");
const cli_utilities_1 = require("@contentstack/cli-utilities");
const branch_1 = require("../../../branch");
class BranchDiffCommand extends cli_command_1.Command {
    async run() {
        try {
            const { flags: branchDiffFlags } = await this.parse(BranchDiffCommand);
            let options = {
                baseBranch: branchDiffFlags['base-branch'],
                stackAPIKey: branchDiffFlags['stack-api-key'],
                compareBranch: branchDiffFlags['compare-branch'],
                module: branchDiffFlags.module,
                format: branchDiffFlags.format,
                host: this.cmaHost
            };
            const diffHandler = new branch_1.BranchDiffHandler(options);
            await diffHandler.run();
        }
        catch (error) {
            this.error(error, { exit: 1, suggestions: error.suggestions });
        }
    }
}
exports.default = BranchDiffCommand;
BranchDiffCommand.description = cli_utilities_1.messageHandler.parse('Differences between two branches');
BranchDiffCommand.examples = [
    'csdx cm:branches:diff',
    'csdx cm:branches:diff --stack-api-key "bltxxxxxxxx"',
    'csdx cm:branches:diff --compare-branch "develop"',
    'csdx cm:branches:diff --compare-branch "develop" --stack-api-key "bltxxxxxxxx"',
    'csdx cm:branches:diff --compare-branch "develop" --module "content-types"',
    'csdx cm:branches:diff --module "content-types" --format "detailed-text"',
    'csdx cm:branches:diff --compare-branch "develop" --format "detailed-text"',
    'csdx cm:branches:diff --stack-api-key "bltxxxxxxxx" --base-branch "main"',
    'csdx cm:branches:diff --stack-api-key "bltxxxxxxxx" --base-branch "main" --compare-branch "develop"',
    'csdx cm:branches:diff --stack-api-key "bltxxxxxxxx" --base-branch "main" --module "content-types"',
    'csdx cm:branches:diff --stack-api-key "bltxxxxxxxx" --base-branch "main" --compare-branch "develop" --module "content-types"',
    'csdx cm:branches:diff --stack-api-key "bltxxxxxxxx" --base-branch "main" --compare-branch "develop" --module "content-types" --format "detailed-text"',
];
BranchDiffCommand.usage = 'cm:branches:diff [--base-branch <value>] [--compare-branch <value>] [-k <value>][--module <value>]';
BranchDiffCommand.flags = {
    'base-branch': cli_utilities_1.flags.string({
        description: 'Base branch',
    }),
    'compare-branch': cli_utilities_1.flags.string({
        description: 'Compare branch',
    }),
    module: cli_utilities_1.flags.string({
        description: 'Module',
        options: ['content-types', 'global-fields', 'all'],
    }),
    'stack-api-key': cli_utilities_1.flags.string({
        char: 'k',
        description: 'Provide Stack API key to show difference between branches',
    }),
    format: cli_utilities_1.flags.string({
        default: 'compact-text',
        multiple: false,
        options: ['compact-text', 'detailed-text'],
        description: '[Optional] Type of flags to show branches differences',
    }),
};
BranchDiffCommand.aliases = []; // Note: alternative usage if any
