"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBranch = void 0;
const cli_utilities_1 = require("@contentstack/cli-utilities");
async function createBranch(host, apiKey, branch) {
    const managementAPIClient = await (0, cli_utilities_1.managementSDKClient)({ host });
    managementAPIClient
        .stack({ api_key: apiKey })
        .branch()
        .create({ branch })
        .then(() => cli_utilities_1.cliux.success('Branch creation in progress. Once ready, it will show in the results of the branch list command `csdx cm:branches`'))
        .catch((err) => {
        var _a, _b;
        if (err.errorCode === 910)
            cli_utilities_1.cliux.error(`error : Branch with UID '${branch.uid}' already exists, please enter a unique branch UID`);
        else if (err.errorCode === 903) {
            if ((_a = err.errors) === null || _a === void 0 ? void 0 : _a.uid) {
                cli_utilities_1.cliux.error(`error : Branch UID must be 15 character(s) or less, please enter a valid branch UID`);
            }
            else {
                cli_utilities_1.cliux.error(`error : Source Branch with UID '${branch.source}' does not exist, please enter correct source branch UID`);
            }
        }
        else {
            let errorMsg;
            if ((_b = err.errors) === null || _b === void 0 ? void 0 : _b.branches) {
                const errorOutput = err.errors.branches[0];
                errorMsg = `${err.errorMessage} ${errorOutput}`;
            }
            else {
                errorMsg = err.errorMessage;
            }
            cli_utilities_1.cliux.error(`error: ${errorMsg}`);
        }
    });
}
exports.createBranch = createBranch;
