"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchMergeStatus = exports.executeMerge = exports.displayMergeSummary = exports.displayBranchStatus = exports.setupMergeInputs = exports.prepareMergeRequestPayload = void 0;
const tslib_1 = require("tslib");
const startCase_1 = tslib_1.__importDefault(require("lodash/startCase"));
const camelCase_1 = tslib_1.__importDefault(require("lodash/camelCase"));
const path_1 = tslib_1.__importDefault(require("path"));
const cli_utilities_1 = require("@contentstack/cli-utilities");
const _1 = require("./");
const prepareMergeRequestPayload = (options) => {
    return {
        base_branch: options.baseBranch,
        compare_branch: options.compareBranch,
        default_merge_strategy: options.strategy,
        item_merge_strategies: options.itemMergeStrategies,
        merge_comment: options.mergeComment,
        no_revert: options.noRevert,
    };
};
exports.prepareMergeRequestPayload = prepareMergeRequestPayload;
const setupMergeInputs = async (mergeFlags) => {
    if (!mergeFlags['stack-api-key']) {
        mergeFlags['stack-api-key'] = await (0, _1.askStackAPIKey)();
    }
    if (!mergeFlags['compare-branch']) {
        mergeFlags['compare-branch'] = await (0, _1.askCompareBranch)();
    }
    if (!mergeFlags['base-branch']) {
        mergeFlags['base-branch'] = (0, _1.getbranchConfig)(mergeFlags['stack-api-key']);
        if (!mergeFlags['base-branch']) {
            mergeFlags['base-branch'] = await (0, _1.askBaseBranch)();
        }
        else {
            cli_utilities_1.cliux.print(`\nBase branch: ${mergeFlags['base-branch']}\n`, { color: 'grey' });
        }
    }
    return mergeFlags;
};
exports.setupMergeInputs = setupMergeInputs;
const displayBranchStatus = async (options) => {
    const spinner = cli_utilities_1.cliux.loaderV2('Loading branch differences...');
    let payload = {
        module: '',
        apiKey: options.stackAPIKey,
        baseBranch: options.baseBranch,
        compareBranch: options.compareBranch,
        host: options.host,
    };
    payload.spinner = spinner;
    const branchDiffData = await _1.branchDiffUtility.fetchBranchesDiff(payload);
    const diffData = _1.branchDiffUtility.filterBranchDiffDataByModule(branchDiffData);
    cli_utilities_1.cliux.loaderV2('', spinner);
    let parsedResponse = {};
    for (let module in diffData) {
        const branchModuleData = diffData[module];
        payload.module = module;
        cli_utilities_1.cliux.print(' ');
        cli_utilities_1.cliux.print(`${(0, startCase_1.default)((0, camelCase_1.default)(module))} Summary:`, { color: 'yellow' });
        const diffSummary = _1.branchDiffUtility.parseSummary(branchModuleData, options.baseBranch, options.compareBranch);
        _1.branchDiffUtility.printSummary(diffSummary);
        const spinner1 = cli_utilities_1.cliux.loaderV2('Loading branch differences...');
        if (options.format === 'compact-text') {
            const branchTextRes = _1.branchDiffUtility.parseCompactText(branchModuleData);
            cli_utilities_1.cliux.loaderV2('', spinner1);
            _1.branchDiffUtility.printCompactTextView(branchTextRes);
            parsedResponse[module] = branchTextRes;
        }
        else if (options.format === 'detailed-text') {
            const verboseRes = await _1.branchDiffUtility.parseVerbose(branchModuleData, payload);
            cli_utilities_1.cliux.loaderV2('', spinner1);
            _1.branchDiffUtility.printVerboseTextView(verboseRes);
            parsedResponse[module] = verboseRes;
        }
    }
    return parsedResponse;
};
exports.displayBranchStatus = displayBranchStatus;
const displayMergeSummary = (options) => {
    cli_utilities_1.cliux.print(' ');
    cli_utilities_1.cliux.print(`Merge Summary:`, { color: 'yellow' });
    for (let module in options.compareData) {
        if (options.format === 'compact-text') {
            _1.branchDiffUtility.printCompactTextView(options.compareData[module]);
        }
        else if (options.format === 'detailed-text') {
            _1.branchDiffUtility.printVerboseTextView(options.compareData[module]);
        }
    }
    cli_utilities_1.cliux.print(' ');
};
exports.displayMergeSummary = displayMergeSummary;
const executeMerge = async (apiKey, mergePayload, host) => {
    var _a, _b;
    const stackAPIClient = await (await (0, cli_utilities_1.managementSDKClient)({ host })).stack({ api_key: apiKey });
    const mergeResponse = await (0, _1.executeMergeRequest)(stackAPIClient, { params: mergePayload });
    if (((_a = mergeResponse.merge_details) === null || _a === void 0 ? void 0 : _a.status) === 'in_progress') {
        // TBD call the queue with the id
        return await (0, exports.fetchMergeStatus)(stackAPIClient, { uid: mergeResponse.uid });
    }
    else if (((_b = mergeResponse.merge_details) === null || _b === void 0 ? void 0 : _b.status) === 'complete') {
        // return the merge id success
        return mergeResponse;
    }
};
exports.executeMerge = executeMerge;
const fetchMergeStatus = async (stackAPIClient, mergePayload) => {
    return new Promise(async (resolve, reject) => {
        var _a, _b, _c;
        const mergeStatusResponse = await (0, _1.getMergeQueueStatus)(stackAPIClient, { uid: mergePayload.uid });
        if (((_a = mergeStatusResponse === null || mergeStatusResponse === void 0 ? void 0 : mergeStatusResponse.queue) === null || _a === void 0 ? void 0 : _a.length) >= 1) {
            const mergeRequestStatusResponse = mergeStatusResponse.queue[0];
            const mergeStatus = (_b = mergeRequestStatusResponse.merge_details) === null || _b === void 0 ? void 0 : _b.status;
            if (mergeStatus === 'complete') {
                resolve(mergeRequestStatusResponse);
            }
            else if (mergeStatus === 'in-progress' || mergeStatus === 'in_progress') {
                setTimeout(async () => {
                    await (0, exports.fetchMergeStatus)(stackAPIClient, mergePayload).then(resolve).catch(reject);
                }, 5000);
            }
            else if (mergeStatus === 'failed') {
                if (((_c = mergeRequestStatusResponse === null || mergeRequestStatusResponse === void 0 ? void 0 : mergeRequestStatusResponse.errors) === null || _c === void 0 ? void 0 : _c.length) > 0) {
                    const errorPath = path_1.default.join(process.cwd(), 'merge-error.log');
                    await (0, _1.writeFile)(errorPath, mergeRequestStatusResponse.errors);
                    cli_utilities_1.cliux.print(`\nComplete error log can be found in ${path_1.default.resolve(errorPath)}`, { color: 'grey' });
                }
                return reject(`merge uid: ${mergePayload.uid}`);
            }
            else {
                return reject(`Invalid merge status found with merge ID ${mergePayload.uid}`);
            }
        }
        else {
            return reject(`No queue found with merge ID ${mergePayload.uid}`);
        }
    });
};
exports.fetchMergeStatus = fetchMergeStatus;
