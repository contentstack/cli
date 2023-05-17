"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cli_command_1 = require("@contentstack/cli-command");
const cli_utilities_1 = require("@contentstack/cli-utilities");
const create_branch_1 = require("../../../utils/create-branch");
const utils_1 = require("../../../utils");
class BranchCreateCommand extends cli_command_1.Command {
    async run() {
        const { flags: branchCreateFlags } = await this.parse(BranchCreateCommand);
        let apiKey = branchCreateFlags['stack-api-key'];
        let branch = {
            uid: branchCreateFlags.uid,
            source: branchCreateFlags.source,
        };
        if (!apiKey) {
            apiKey = await utils_1.interactive.askStackAPIKey();
        }
        if (!branchCreateFlags.source) {
            branch.source = await utils_1.interactive.askSourceBranch();
        }
        if (!branchCreateFlags.uid) {
            branch.uid = await utils_1.interactive.askBranchUid();
        }
        await (0, create_branch_1.createBranch)(this.cmaHost, apiKey, branch);
    }
}
exports.default = BranchCreateCommand;
BranchCreateCommand.description = cli_utilities_1.messageHandler.parse('Create a new branch'); // Note: Update the description
BranchCreateCommand.examples = [
    'csdx cm:branches:create',
    'csdx cm:branches:create --source main -uid new_branch -k bltxxxxxxxx',
    'csdx cm:branches:create --source main --uid new_branch --stack-api-key bltxxxxxxxx',
]; // Note: Add and modify the examples
BranchCreateCommand.usage = [
    'cm:branches:create',
    'cm:branches:create [--source <value>] [--uid <value>] [-k <value>]',
    'cm:branches:create [--source <value>] [--uid <value>] [--stack-api-key <value>]',
]; // Note: Add and modify the usage
BranchCreateCommand.flags = {
    uid: cli_utilities_1.flags.string({ description: 'Branch UID to be created' }),
    source: cli_utilities_1.flags.string({ description: 'Source branch from which new branch to be created' }),
    'stack-api-key': cli_utilities_1.flags.string({ char: 'k', description: 'Stack API key' }),
};
BranchCreateCommand.aliases = []; // Note: alternative usage if any
