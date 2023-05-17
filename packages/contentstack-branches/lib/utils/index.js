"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBranchUtility = exports.branchDiffUtility = exports.interactive = exports.handleErrorMsg = exports.executeMergeRequest = exports.getMergeQueueStatus = exports.writeFile = exports.refreshbranchConfig = exports.getbranchConfig = exports.getbranchesList = void 0;
const tslib_1 = require("tslib");
/**
 * Command specific utilities can be written here
 */
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
const cli_utilities_1 = require("@contentstack/cli-utilities");
const getbranchesList = (branchResult, baseBranch) => {
    const branches = [];
    branchResult.map((item) => {
        branches.push({
            Branch: item.uid,
            Source: item.source,
            Aliases: item.alias,
            Created: new Date(item.created_at).toLocaleDateString(),
            Updated: new Date(item.updated_at).toLocaleDateString(),
        });
    });
    const currentBranch = branches.filter((branch) => branch.Branch === baseBranch);
    const otherBranches = branches.filter((branch) => branch.Branch !== baseBranch);
    return { currentBranch, otherBranches, branches };
};
exports.getbranchesList = getbranchesList;
const getbranchConfig = (stackApiKey) => {
    return cli_utilities_1.configHandler.get(`baseBranch.${stackApiKey}`);
};
exports.getbranchConfig = getbranchConfig;
const refreshbranchConfig = async (apiKey, branchUid) => {
    const branchConfig = cli_utilities_1.configHandler.get(`baseBranch.${apiKey}`);
    if (branchConfig === branchUid) {
        await cli_utilities_1.configHandler.set(`baseBranch.${apiKey}`, 'main');
    }
};
exports.refreshbranchConfig = refreshbranchConfig;
const writeFile = (filePath, data) => {
    return new Promise((resolve, reject) => {
        data = typeof data === 'object' ? JSON.stringify(data, null, 2) : data || '{}';
        fs_1.default.writeFile(path_1.default.resolve(filePath), data, (error) => {
            if (error) {
                return reject(error);
            }
            resolve('done');
        });
    });
};
exports.writeFile = writeFile;
async function getMergeQueueStatus(stackAPIClient, payload) {
    const mergeJobUID = payload.uid;
    return await stackAPIClient
        .branch()
        .mergeQueue(mergeJobUID)
        .fetch()
        .then((data) => data)
        .catch((err) => handleErrorMsg(err));
}
exports.getMergeQueueStatus = getMergeQueueStatus;
async function executeMergeRequest(stackAPIClient, payload) {
    const { host, apiKey, params: { base_branch, compare_branch, default_merge_strategy, item_merge_strategies, merge_comment, no_revert }, } = payload;
    const queryParams = {
        base_branch,
        compare_branch,
        default_merge_strategy,
        merge_comment,
        no_revert,
    };
    const itemMergeStrategies = default_merge_strategy === 'ignore' ? { item_merge_strategies } : {};
    return await stackAPIClient
        .branch()
        .merge(itemMergeStrategies, queryParams)
        .then((data) => data)
        .catch((err) => handleErrorMsg(err));
}
exports.executeMergeRequest = executeMergeRequest;
function handleErrorMsg(err) {
    if (err === null || err === void 0 ? void 0 : err.errorMessage) {
        cli_utilities_1.cliux.print(`Error: ${err.errorMessage}`, { color: 'red' });
    }
    else if (err === null || err === void 0 ? void 0 : err.message) {
        cli_utilities_1.cliux.print(`Error: ${err.message}`, { color: 'red' });
    }
    else {
        console.log(err);
        cli_utilities_1.cliux.print(`Error: ${cli_utilities_1.messageHandler.parse('CLI_BRANCH_API_FAILED')}`, { color: 'red' });
    }
    process.exit(1);
}
exports.handleErrorMsg = handleErrorMsg;
tslib_1.__exportStar(require("./interactive"), exports);
tslib_1.__exportStar(require("./merge-helper"), exports);
tslib_1.__exportStar(require("./create-merge-scripts"), exports);
tslib_1.__exportStar(require("./entry-update-script"), exports);
tslib_1.__exportStar(require("./entry-create-script"), exports);
exports.interactive = tslib_1.__importStar(require("./interactive"));
exports.branchDiffUtility = tslib_1.__importStar(require("./branch-diff-utility"));
exports.deleteBranchUtility = tslib_1.__importStar(require("./delete-branch"));
