"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBranch = void 0;
const cli_utilities_1 = require("@contentstack/cli-utilities");
const _1 = require(".");
async function deleteBranch(host, apiKey, uid) {
    const managementAPIClient = await (0, cli_utilities_1.managementSDKClient)({ host });
    return managementAPIClient
        .stack({ api_key: apiKey })
        .branch(uid)
        .delete()
        .then(() => cli_utilities_1.cliux.success(`Branch with UID '${uid}' has been deleted`))
        .then(() => (0, _1.refreshbranchConfig)(apiKey, uid))
        .catch((err) => {
        var _a;
        if (err.errorCode === 905) {
            cli_utilities_1.cliux.error(`error: Branch with UID ${uid} does not exist`);
        }
        else if (err.errorCode === 909) {
            let errorMsg;
            if ((_a = err.errors) === null || _a === void 0 ? void 0 : _a.branch) {
                const errorOutput = err.errors.branch[0];
                errorMsg = `${err.errorMessage} ${errorOutput}`;
            }
            else {
                errorMsg = err.errorMessage;
            }
            cli_utilities_1.cliux.error(`error: ${errorMsg}`);
        }
        else {
            cli_utilities_1.cliux.error(`error: ${err.errorMessage}`);
        }
    });
}
exports.deleteBranch = deleteBranch;
