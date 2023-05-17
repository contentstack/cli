"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cli_command_1 = require("@contentstack/cli-command");
const cli_utilities_1 = require("@contentstack/cli-utilities");
const delete_branch_1 = require("../../../utils/delete-branch");
const utils_1 = require("../../../utils");
class BranchDeleteCommand extends cli_command_1.Command {
    async run() {
        const { flags: branchDeleteFlags } = await this.parse(BranchDeleteCommand);
        let apiKey = branchDeleteFlags['stack-api-key'];
        if (!apiKey) {
            apiKey = await utils_1.interactive.askStackAPIKey();
        }
        if (!branchDeleteFlags.uid) {
            branchDeleteFlags.uid = await utils_1.interactive.askBranchUid();
        }
        if (!branchDeleteFlags.yes) {
            const confirmBranch = await utils_1.interactive.askBranchNameConfirmation();
            if (confirmBranch !== branchDeleteFlags.uid) {
                cli_utilities_1.cliux.error(`error: To delete the branch, enter a valid branch name '${branchDeleteFlags.uid}'`);
                process.exit(1);
            }
        }
        await (0, delete_branch_1.deleteBranch)(this.cmaHost, apiKey, branchDeleteFlags.uid);
    }
}
exports.default = BranchDeleteCommand;
BranchDeleteCommand.description = cli_utilities_1.messageHandler.parse('Delete a branch');
BranchDeleteCommand.examples = [
    'csdx cm:branches:delete',
    'csdx cm:branches:delete --uid main -k bltxxxxxxxx',
    'csdx cm:branches:delete --uid main --stack-api-key bltxxxxxxxx',
    'csdx cm:branches:delete --uid main --stack-api-key bltxxxxxxxx --yes',
];
BranchDeleteCommand.usage = [
    'cm:branches:delete [-uid <value>] [-k <value>]',
    'cm:branches:delete [--uid <value>] [--stack-api-key <value>]',
]; // Note: Add and modify the usage
BranchDeleteCommand.flags = {
    uid: cli_utilities_1.flags.string({ description: 'Branch UID to be deleted' }),
    'stack-api-key': cli_utilities_1.flags.string({ char: 'k', description: 'Stack API key' }),
    yes: cli_utilities_1.flags.boolean({
        char: 'y',
        description: 'Force the deletion of the branch by skipping the confirmation',
    }),
};
BranchDeleteCommand.aliases = []; // Note: alternative usage if any
