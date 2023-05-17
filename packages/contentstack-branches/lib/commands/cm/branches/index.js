"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const cli_command_1 = require("@contentstack/cli-command");
const cli_utilities_1 = require("@contentstack/cli-utilities");
const index_1 = require("../../../utils/index");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
class BranchListCommand extends cli_command_1.Command {
    async run() {
        var _a;
        try {
            const managementAPIClient = await (0, cli_utilities_1.managementSDKClient)({ host: this.cmaHost });
            const { flags: branchListFlags } = await this.parse(BranchListCommand);
            let stackApiKey = branchListFlags['stack-api-key'];
            let verbose = branchListFlags['verbose'];
            if (!stackApiKey) {
                stackApiKey = await index_1.interactive.askStackAPIKey();
            }
            const baseBranch = (0, index_1.getbranchConfig)(stackApiKey) || 'main';
            const listOfBranch = await managementAPIClient
                .stack({ api_key: stackApiKey })
                .branch()
                .query()
                .find()
                .then(({ items }) => items)
                .catch((err) => {
                (0, index_1.handleErrorMsg)(err);
            });
            if (listOfBranch && listOfBranch.length > 0) {
                let { currentBranch, otherBranches, branches } = (0, index_1.getbranchesList)(listOfBranch, baseBranch);
                if (!verbose) {
                    ((_a = currentBranch[0]) === null || _a === void 0 ? void 0 : _a.Source)
                        ? cli_utilities_1.cliux.print(`* ${chalk_1.default.bold(currentBranch[0].Branch)} (source: ${currentBranch[0].Source})`, {
                            color: 'blue',
                        })
                        : cli_utilities_1.cliux.print(`* ${chalk_1.default.bold(currentBranch[0].Branch)}`, {
                            color: 'blue',
                        });
                    otherBranches.map(({ Branch, Source }) => {
                        Source
                            ? cli_utilities_1.cliux.print(`${Branch} (source: ${Source})`, { color: 'blue' })
                            : cli_utilities_1.cliux.print(Branch, { color: 'blue' });
                    });
                }
                else {
                    cli_utilities_1.cliux.table(branches, {
                        Branch: {
                            minWidth: 8,
                        },
                        Source: {
                            minWidth: 8,
                        },
                        Aliases: {
                            minWidth: 8,
                        },
                        Created: {
                            minWidth: 8,
                        },
                        Updated: {
                            minWidth: 8,
                        },
                    }, {
                        printLine: cli_utilities_1.cliux.print,
                    });
                }
            }
        }
        catch (error) {
            cli_utilities_1.cliux.error('error', error);
        }
    }
}
exports.default = BranchListCommand;
BranchListCommand.description = cli_utilities_1.messageHandler.parse('List the branches'); // Note: Update the description
BranchListCommand.examples = ['csdx cm:branches', 'csdx cm:branches --verbose', 'csdx cm:branches -k <stack api key>']; // Note: Add and modify the examples
BranchListCommand.usage = 'cm:branches'; // Note: Add and modify the usage
BranchListCommand.flags = {
    'stack-api-key': cli_utilities_1.flags.string({ char: 'k', description: 'Stack API Key' }),
    verbose: cli_utilities_1.flags.boolean({ description: 'Verbose' }),
};
BranchListCommand.aliases = []; // Note: alternative usage if any
