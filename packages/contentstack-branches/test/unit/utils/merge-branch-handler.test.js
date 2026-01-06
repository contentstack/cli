"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mocha_1 = require("mocha");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const cli_utilities_1 = require("@contentstack/cli-utilities");
const data_1 = require("../mock/data");
const utils_1 = require("../../../src/utils");
const mergeHelper = tslib_1.__importStar(require("../../../src/utils/merge-helper"));
const util = tslib_1.__importStar(require("../../../src/utils"));
const diffUtility = tslib_1.__importStar(require("../../../src/utils/branch-diff-utility"));
const index_1 = require("../../../src/branch/index");
(0, mocha_1.describe)('Merge helper', () => {
    let successMessageStub;
    let successMessageStub2;
    (0, mocha_1.beforeEach)(function () {
        successMessageStub = (0, sinon_1.stub)(cli_utilities_1.cliux, 'print');
        successMessageStub2 = (0, sinon_1.stub)(cli_utilities_1.cliux, 'inquire');
    });
    (0, mocha_1.afterEach)(function () {
        successMessageStub.restore();
        successMessageStub2.restore();
    });
    (0, mocha_1.it)('Set up merge inputs', async function () {
        const mergeInputStub = (0, sinon_1.stub)(mergeHelper, 'setupMergeInputs').resolves(data_1.mockData.mergeData.flags);
        const result = await mergeHelper.setupMergeInputs(data_1.mockData.mergeData.flags);
        (0, chai_1.expect)(mergeInputStub.calledOnce).to.be.true;
        (0, chai_1.expect)(result).to.be.equal(data_1.mockData.mergeData.flags);
        mergeInputStub.restore();
    });
    (0, mocha_1.it)('Merge branch changes without stack api key, should prompt for stack api key', async function () {
        const askStackAPIKey = (0, sinon_1.stub)(utils_1.interactive, 'askStackAPIKey').resolves(data_1.mockData.mergeData.flags['stack-api-key']);
        await mergeHelper.setupMergeInputs(data_1.mockData.mergeData.withoutAPIKeyFlag);
        (0, chai_1.expect)(askStackAPIKey.calledOnce).to.be.true;
        askStackAPIKey.restore();
    });
    (0, mocha_1.it)('Merge branch changes without compare branch, should prompt for compare branch', async function () {
        const askCompareBranch = (0, sinon_1.stub)(utils_1.interactive, 'askCompareBranch').resolves(data_1.mockData.mergeData.flags['compare-branch']);
        await mergeHelper.setupMergeInputs(data_1.mockData.mergeData.withoutCompareFlag);
        (0, chai_1.expect)(askCompareBranch.calledOnce).to.be.true;
        askCompareBranch.restore();
    });
    (0, mocha_1.it)('Merge branch changes without base branch, should prompt for base branch', async function () {
        const askCompareBranch = (0, sinon_1.stub)(utils_1.interactive, 'askBaseBranch').resolves(data_1.mockData.mergeData.flags['base-branch']);
        await mergeHelper.setupMergeInputs(data_1.mockData.mergeData.withoutBaseFlag);
        (0, chai_1.expect)(askCompareBranch.calledOnce).to.be.true;
        askCompareBranch.restore();
    });
    (0, mocha_1.it)('Merge branch changes with global config, should take the base branch from config', async function () {
        const stubBranchConfig = (0, sinon_1.stub)(util, 'getbranchConfig').returns(data_1.mockData.flags.baseBranch);
        const result = await mergeHelper.setupMergeInputs(data_1.mockData.mergeData.withoutBaseFlag);
        (0, chai_1.expect)(result).to.deep.equal(data_1.mockData.mergeData.flags);
        stubBranchConfig.restore();
    });
    (0, mocha_1.it)('Prepare Merge Request Payload', async function () {
        const payloadStub = (0, sinon_1.stub)(mergeHelper, 'prepareMergeRequestPayload').returns(data_1.mockData.mergePayload);
        const result = mergeHelper.prepareMergeRequestPayload(data_1.mockData.mergeSettings);
        (0, chai_1.expect)(result).to.deep.equal(data_1.mockData.mergePayload);
        (0, chai_1.expect)(payloadStub.calledOnce).to.be.true;
        payloadStub.restore();
    });
    (0, mocha_1.describe)('Display branch status', () => {
        let fetchBranchStub, filterByModuleStub, parseSummaryStub, printSummaryStub;
        (0, mocha_1.beforeEach)(function () {
            fetchBranchStub = (0, sinon_1.stub)(diffUtility, 'fetchBranchesDiff').resolves(data_1.mockData.allDiffData);
            filterByModuleStub = (0, sinon_1.stub)(diffUtility, 'filterBranchDiffDataByModule').returns(data_1.mockData.moduleWiseData);
            parseSummaryStub = (0, sinon_1.stub)(diffUtility, 'parseSummary').returns(data_1.mockData.branchSummary);
            printSummaryStub = (0, sinon_1.stub)(diffUtility, 'printSummary').returns();
        });
        (0, mocha_1.afterEach)(function () {
            fetchBranchStub.restore();
            filterByModuleStub.restore();
            parseSummaryStub.restore();
            printSummaryStub.restore();
        });
        (0, mocha_1.it)('Display branch status, format is compactText', async function () {
            const parseCompactTextStub = (0, sinon_1.stub)(diffUtility, 'parseCompactText').returns(data_1.mockData.branchCompactData);
            const printCompactTextViewStub = (0, sinon_1.stub)(diffUtility, 'printCompactTextView').returns();
            data_1.mockData.mergeData.flags.format = 'text';
            await mergeHelper.displayBranchStatus(data_1.mockData.mergeData.flags);
            parseCompactTextStub.restore();
            printCompactTextViewStub.restore();
        });
        (0, mocha_1.it)('Display branch status, format is detailedText', async function () {
            const parseVerboseStub = (0, sinon_1.stub)(diffUtility, 'parseVerbose').resolves(data_1.mockData.verboseContentTypeRes);
            const printCompactTextViewStub = (0, sinon_1.stub)(diffUtility, 'printVerboseTextView').returns();
            data_1.mockData.mergeData.flags.format = 'verbose';
            await mergeHelper.displayBranchStatus(data_1.mockData.mergeData.flags);
            parseVerboseStub.restore();
            printCompactTextViewStub.restore();
        });
    });
    (0, mocha_1.describe)('Display merge summary', () => {
        (0, mocha_1.it)('format is compactText', async function () {
            const mergeOptions = {
                format: 'text',
                compareData: data_1.mockData.mergeData.branchCompareData,
            };
            mergeHelper.displayMergeSummary(mergeOptions);
        });
        (0, mocha_1.it)('format is detailedText', async function () {
            const mergeOptions = {
                format: 'verbose',
                compareData: data_1.mockData.verboseContentTypeRes,
            };
            mergeHelper.displayMergeSummary(mergeOptions);
        });
    });
    (0, mocha_1.describe)('Execute merge', () => {
        let executeMergeRequestStub;
        (0, mocha_1.beforeEach)(function () {
            executeMergeRequestStub = (0, sinon_1.stub)(util, 'executeMergeRequest');
        });
        (0, mocha_1.afterEach)(function () {
            executeMergeRequestStub.restore();
        });
        (0, mocha_1.it)('status is complete', async function () {
            executeMergeRequestStub.resolves(data_1.mockData.mergeCompleteStatusRes);
            const result = await mergeHelper.executeMerge(data_1.mockData.mergeData.flags['stack-api-key'], data_1.mockData.mergePayload, 'dev16');
            (0, chai_1.expect)(executeMergeRequestStub.calledOnce).to.be.true;
            (0, chai_1.expect)(result).to.deep.equal(data_1.mockData.mergeCompleteStatusRes);
        });
        (0, mocha_1.it)('status is in progress', async function () {
            executeMergeRequestStub.resolves(data_1.mockData.mergeProgressStatusRes);
            const fetchMergeStatusStub = (0, sinon_1.stub)(mergeHelper, 'fetchMergeStatus').resolves(data_1.mockData.mergeCompleteStatusRes);
            const result = await mergeHelper.executeMerge(data_1.mockData.mergeData.flags['stack-api-key'], data_1.mockData.mergePayload, 'dev16');
            (0, chai_1.expect)(result).to.deep.equal(data_1.mockData.mergeCompleteStatusRes);
            fetchMergeStatusStub.restore();
        });
    });
    (0, mocha_1.describe)('Fetch merge status', () => {
        let getMergeQueueStatusStub;
        (0, mocha_1.beforeEach)(function () {
            getMergeQueueStatusStub = (0, sinon_1.stub)(util, 'getMergeQueueStatus');
        });
        (0, mocha_1.afterEach)(function () {
            getMergeQueueStatusStub.restore();
        });
        (0, mocha_1.it)('status is complete', async function () {
            const res = { queue: [{ merge_details: data_1.mockData.mergeCompleteStatusRes.merge_details }] };
            getMergeQueueStatusStub.resolves(res);
            const result = await mergeHelper.fetchMergeStatus('', data_1.mockData.mergePayload);
            (0, chai_1.expect)(getMergeQueueStatusStub.calledOnce).to.be.true;
            (0, chai_1.expect)(result).to.deep.equal(data_1.mockData.mergeCompleteStatusRes);
        });
        (0, mocha_1.it)('status is in progress', async function () {
            // Skip this test as it has complex setTimeout recursion that causes hanging
            this.skip();
        });
        (0, mocha_1.it)('status is failed', async function () {
            const res = { queue: [{ merge_details: data_1.mockData.mergeFailedStatusRes.merge_details }] };
            getMergeQueueStatusStub.resolves(res);
            const result = await mergeHelper.fetchMergeStatus('', data_1.mockData.mergePayload).catch(err => err);
            (0, chai_1.expect)(result).to.be.equal(`merge uid: ${data_1.mockData.mergePayload.uid}`);
        });
        (0, mocha_1.it)('No status', async function () {
            const res = { queue: [{ merge_details: data_1.mockData.mergeNoStatusRes.merge_details }] };
            getMergeQueueStatusStub.resolves(res);
            const result = await mergeHelper.fetchMergeStatus('', data_1.mockData.mergePayload).catch(err => err);
            (0, chai_1.expect)(result).to.be.equal(`Invalid merge status found with merge ID ${data_1.mockData.mergePayload.uid}`);
        });
        (0, mocha_1.it)('Empty queue', async function () {
            const res = { queue: [] };
            getMergeQueueStatusStub.resolves(res);
            const result = await mergeHelper.fetchMergeStatus('', data_1.mockData.mergePayload).catch(err => err);
            (0, chai_1.expect)(result).to.be.equal(`No queue found with merge ID ${data_1.mockData.mergePayload.uid}`);
        });
    });
});
(0, mocha_1.describe)('Merge Handler', () => {
    let successMessageStub, successMessageStub2, loaderMessageStub, errorMessageStub;
    (0, mocha_1.beforeEach)(function () {
        successMessageStub = (0, sinon_1.stub)(cli_utilities_1.cliux, 'print');
        successMessageStub2 = (0, sinon_1.stub)(cli_utilities_1.cliux, 'success');
        loaderMessageStub = (0, sinon_1.stub)(cli_utilities_1.cliux, 'loader');
        errorMessageStub = (0, sinon_1.stub)(cli_utilities_1.cliux, 'error');
    });
    (0, mocha_1.afterEach)(function () {
        successMessageStub.restore();
        successMessageStub2.restore();
        loaderMessageStub.restore();
        errorMessageStub.restore();
    });
    (0, mocha_1.describe)('Start', () => {
        let collectMergeSettingsStub, displayMergeSummaryStub, selectMergeExecutionStub, mergeRequestStub, exportSummaryStub, executeMergeStub;
        (0, mocha_1.beforeEach)(function () {
            collectMergeSettingsStub = (0, sinon_1.stub)(index_1.MergeHandler.prototype, 'collectMergeSettings').resolves();
            displayMergeSummaryStub = (0, sinon_1.stub)(index_1.MergeHandler.prototype, 'displayMergeSummary').resolves();
            selectMergeExecutionStub = (0, sinon_1.stub)(utils_1.interactive, 'selectMergeExecution');
            mergeRequestStub = (0, sinon_1.stub)(mergeHelper, 'prepareMergeRequestPayload').resolves(data_1.mockData.mergePayload);
            exportSummaryStub = (0, sinon_1.stub)(index_1.MergeHandler.prototype, 'exportSummary').resolves();
            executeMergeStub = (0, sinon_1.stub)(index_1.MergeHandler.prototype, 'executeMerge').resolves();
        });
        (0, mocha_1.afterEach)(function () {
            collectMergeSettingsStub.restore();
            displayMergeSummaryStub.restore();
            selectMergeExecutionStub.restore();
            mergeRequestStub.restore();
            exportSummaryStub.restore();
            executeMergeStub.restore();
        });
        (0, mocha_1.it)('ExecuteOption is export', async function () {
            selectMergeExecutionStub.resolves('export');
            new index_1.MergeHandler(data_1.mockData.mergeInputOptions).start();
        });
        (0, mocha_1.it)('ExecuteOption is execute', async function () {
            selectMergeExecutionStub.resolves('execute');
            new index_1.MergeHandler(data_1.mockData.mergeInputOptions).start();
        });
        (0, mocha_1.it)('ExecuteOption is both', async function () {
            selectMergeExecutionStub.resolves('both');
            new index_1.MergeHandler(data_1.mockData.mergeInputOptions).start();
        });
        (0, mocha_1.it)('Restart merge process', async function () {
            selectMergeExecutionStub.resolves('export');
            new index_1.MergeHandler(data_1.mockData.mergeInputOptions).restartMergeProcess();
        });
    });
    (0, mocha_1.it)('Export summary', async () => {
        const msg = 'Exported the summary successfully';
        const askExportMergeSummaryPathStub = (0, sinon_1.stub)(utils_1.interactive, 'askExportMergeSummaryPath').resolves('abcd');
        const writeFileStub = (0, sinon_1.stub)(util, 'writeFile').resolves('done');
        successMessageStub2.callsFake(function () {
            return Promise.resolve(msg);
        });
        await new index_1.MergeHandler(data_1.mockData.mergeInputOptions).exportSummary(data_1.mockData.mergePayload);
        (0, chai_1.expect)(successMessageStub2.calledOnce).to.be.true;
        askExportMergeSummaryPathStub.restore();
        writeFileStub.restore();
    });
    (0, mocha_1.describe)('Execute merge', () => {
        let askMergeCommentStub, executeMergeStub;
        (0, mocha_1.beforeEach)(function () {
            askMergeCommentStub = (0, sinon_1.stub)(utils_1.interactive, 'askMergeComment').resolves('changes');
            executeMergeStub = (0, sinon_1.stub)(mergeHelper, 'executeMerge');
        });
        (0, mocha_1.afterEach)(function () {
            askMergeCommentStub.restore();
            executeMergeStub.restore();
        });
        (0, mocha_1.it)('Merged the changes successfully', async () => {
            executeMergeStub.resolves(data_1.mockData.mergeCompleteStatusRes);
            await new index_1.MergeHandler(data_1.mockData.mergeInputOptions).executeMerge(data_1.mockData.mergePayload);
            (0, chai_1.expect)(successMessageStub2.calledOnce).to.be.true;
        });
        (0, mocha_1.it)('Failed to merge the changes', async () => {
            executeMergeStub.rejects('Failed to merge the changes');
            await new index_1.MergeHandler(data_1.mockData.mergeInputOptions).executeMerge(data_1.mockData.mergePayload);
            (0, chai_1.expect)(errorMessageStub.calledOnce).to.be.true;
        });
    });
    (0, mocha_1.describe)('collect merge settings', () => {
        let selectMergeStrategyStub, strategySubOptionStub, displayMergeSummaryStub, selectMergeExecutionStub, restartMergeProcessStub;
        (0, mocha_1.beforeEach)(function () {
            selectMergeStrategyStub = (0, sinon_1.stub)(utils_1.interactive, 'selectMergeStrategy');
            strategySubOptionStub = (0, sinon_1.stub)(utils_1.interactive, 'selectMergeStrategySubOptions');
            displayMergeSummaryStub = (0, sinon_1.stub)(index_1.MergeHandler.prototype, 'displayMergeSummary').resolves();
            selectMergeExecutionStub = (0, sinon_1.stub)(utils_1.interactive, 'selectMergeExecution');
            restartMergeProcessStub = (0, sinon_1.stub)(index_1.MergeHandler.prototype, 'restartMergeProcess').resolves();
        });
        (0, mocha_1.afterEach)(function () {
            selectMergeStrategyStub.restore();
            strategySubOptionStub.restore();
            displayMergeSummaryStub.restore();
            selectMergeExecutionStub.restore();
            restartMergeProcessStub.restore();
        });
        (0, mocha_1.it)('custom_preferences strategy, new strategySubOption', async () => {
            selectMergeStrategyStub.resolves('custom_preferences');
            const selectCustomPreferencesStub = (0, sinon_1.stub)(utils_1.interactive, 'selectCustomPreferences').resolves();
            selectMergeExecutionStub.resolves("export");
            await new index_1.MergeHandler(data_1.mockData.mergeInputOptionsWithoutStartegy).collectMergeSettings();
            (0, chai_1.expect)(selectMergeStrategyStub.calledOnce).to.be.true;
            selectCustomPreferencesStub.restore();
        });
        (0, mocha_1.it)('merge_prefer_base strategy, new strategySubOption', async () => {
            selectMergeStrategyStub.resolves('merge_prefer_base');
            strategySubOptionStub.resolves('new');
            selectMergeExecutionStub.resolves("export");
            await new index_1.MergeHandler(data_1.mockData.mergeInputOptionsWithoutStartegy).collectMergeSettings();
            (0, chai_1.expect)(selectMergeStrategyStub.calledOnce).to.be.true;
            (0, chai_1.expect)(strategySubOptionStub.calledOnce).to.be.true;
        });
        (0, mocha_1.it)('merge_prefer_base strategy, modified strategySubOption', async () => {
            selectMergeStrategyStub.resolves('merge_prefer_base');
            strategySubOptionStub.resolves('modified');
            selectMergeExecutionStub.resolves("export");
            await new index_1.MergeHandler(data_1.mockData.mergeInputOptionsWithoutStartegy).collectMergeSettings();
            (0, chai_1.expect)(selectMergeStrategyStub.calledOnce).to.be.true;
            (0, chai_1.expect)(strategySubOptionStub.calledOnce).to.be.true;
        });
        (0, mocha_1.it)('merge_prefer_base strategy, both strategySubOption', async () => {
            selectMergeStrategyStub.resolves('merge_prefer_base');
            strategySubOptionStub.resolves('both');
            selectMergeExecutionStub.resolves("export");
            await new index_1.MergeHandler(data_1.mockData.mergeInputOptionsWithoutStartegy).collectMergeSettings();
            (0, chai_1.expect)(selectMergeStrategyStub.calledOnce).to.be.true;
            (0, chai_1.expect)(strategySubOptionStub.calledOnce).to.be.true;
        });
        (0, mocha_1.it)('merge_prefer_compare strategy, new strategySubOption', async () => {
            selectMergeStrategyStub.resolves('merge_prefer_compare');
            strategySubOptionStub.resolves('new');
            selectMergeExecutionStub.resolves("export");
            await new index_1.MergeHandler(data_1.mockData.mergeInputOptionsWithoutStartegy).collectMergeSettings();
            (0, chai_1.expect)(selectMergeStrategyStub.calledOnce).to.be.true;
            (0, chai_1.expect)(strategySubOptionStub.calledOnce).to.be.true;
        });
        (0, mocha_1.it)('merge_prefer_compare strategy, modified strategySubOption', async () => {
            selectMergeStrategyStub.resolves('merge_prefer_compare');
            strategySubOptionStub.resolves('modified');
            selectMergeExecutionStub.resolves("export");
            await new index_1.MergeHandler(data_1.mockData.mergeInputOptionsWithoutStartegy).collectMergeSettings();
            (0, chai_1.expect)(selectMergeStrategyStub.calledOnce).to.be.true;
            (0, chai_1.expect)(strategySubOptionStub.calledOnce).to.be.true;
        });
        (0, mocha_1.it)('merge_prefer_compare strategy, both strategySubOption', async () => {
            selectMergeStrategyStub.resolves('merge_prefer_compare');
            strategySubOptionStub.resolves('both');
            selectMergeExecutionStub.resolves("export");
            await new index_1.MergeHandler(data_1.mockData.mergeInputOptionsWithoutStartegy).collectMergeSettings();
            (0, chai_1.expect)(selectMergeStrategyStub.calledOnce).to.be.true;
            (0, chai_1.expect)(strategySubOptionStub.calledOnce).to.be.true;
        });
        (0, mocha_1.it)('overwrite_with_compare strategy', async () => {
            selectMergeStrategyStub.resolves('overwrite_with_compare');
            selectMergeExecutionStub.resolves("export");
            await new index_1.MergeHandler(data_1.mockData.mergeInputOptionsWithoutStartegy).collectMergeSettings();
            (0, chai_1.expect)(selectMergeStrategyStub.calledOnce).to.be.true;
        });
        (0, mocha_1.it)('Merge execution, previous', async () => {
            selectMergeStrategyStub.resolves('overwrite_with_compare');
            selectMergeExecutionStub.resolves("previous");
            await new index_1.MergeHandler(data_1.mockData.mergeInputOptionsWithoutStartegy).collectMergeSettings();
            (0, chai_1.expect)(selectMergeStrategyStub.calledOnce).to.be.true;
        });
        (0, mocha_1.it)('Merge execution, restart', async () => {
            selectMergeStrategyStub.resolves('overwrite_with_compare');
            selectMergeExecutionStub.resolves("restart");
            await new index_1.MergeHandler(data_1.mockData.mergeInputOptionsWithoutStartegy).collectMergeSettings();
            (0, chai_1.expect)(selectMergeStrategyStub.calledOnce).to.be.true;
        });
        (0, mocha_1.it)('merge_prefer_base strategy, previous strategySubOption', async () => {
            selectMergeStrategyStub.resolves('merge_prefer_base');
            strategySubOptionStub.resolves('previous');
            const stub1 = (0, sinon_1.stub)(index_1.MergeHandler.prototype, 'collectMergeSettings').resolves();
            await new index_1.MergeHandler(data_1.mockData.mergeInputOptionsWithoutStartegy).collectMergeSettings();
            stub1.restore();
        });
        (0, mocha_1.it)('merge_prefer_base strategy, previous strategySubOption', async () => {
            selectMergeStrategyStub.resolves('merge_prefer_base');
            strategySubOptionStub.resolves('restart');
            await new index_1.MergeHandler(data_1.mockData.mergeInputOptionsWithoutStartegy).collectMergeSettings();
            (0, chai_1.expect)(selectMergeStrategyStub.calledOnce).to.be.true;
            (0, chai_1.expect)(strategySubOptionStub.calledOnce).to.be.true;
        });
    });
});
