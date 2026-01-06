"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mocha_1 = require("mocha");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const utils_1 = require("../../../src/utils");
const data_1 = require("../mock/data");
const branch_1 = require("../../../src/branch");
const util = tslib_1.__importStar(require("../../../src/utils"));
const cli_utilities_1 = require("@contentstack/cli-utilities");
(0, mocha_1.describe)('Branch Diff Utility Testcases', () => {
    let apiRequestStub, fetchBranchesDiffStub, loaderV2Stub;
    (0, mocha_1.beforeEach)(function () {
        apiRequestStub = (0, sinon_1.stub)(utils_1.branchDiffUtility, 'branchCompareSDK').callsFake(function (param, skip, limit) {
            if (param.baseBranch === 'xyz') {
                return Promise.resolve('Base branch is invalid');
            }
            else {
                return Promise.resolve(data_1.mockData.branchDiff);
            }
        });
        fetchBranchesDiffStub = (0, sinon_1.stub)(utils_1.branchDiffUtility, 'fetchBranchesDiff').callsFake(function (param) {
            if (param) {
                const result = apiRequestStub(param);
                return Promise.resolve(result);
            }
        });
        loaderV2Stub = (0, sinon_1.stub)(cli_utilities_1.cliux, 'loaderV2');
    });
    (0, mocha_1.afterEach)(function () {
        apiRequestStub.restore();
        fetchBranchesDiffStub.restore();
        loaderV2Stub.restore();
    });
    (0, mocha_1.it)('fetch branch differences', async function () {
        const result = await fetchBranchesDiffStub(data_1.mockData.branchDiffPayload);
        (0, chai_1.expect)(fetchBranchesDiffStub.calledOnce).to.be.true;
        (0, chai_1.expect)(result).to.be.equal(data_1.mockData.branchDiff);
    });
    (0, mocha_1.it)('API request, should be failed', async function () {
        data_1.mockData.branchDiffPayload.baseBranch = 'xyz';
        const result = await fetchBranchesDiffStub(data_1.mockData.branchDiffPayload);
        (0, chai_1.expect)(fetchBranchesDiffStub.calledOnce).to.be.true;
        (0, chai_1.expect)(result).to.be.equal('Base branch is invalid');
    });
    (0, mocha_1.it)('parse branch summary', async function () {
        const result = utils_1.branchDiffUtility.parseSummary(data_1.mockData.contentTypesDiff, 'main', 'dev');
        (0, chai_1.expect)(result).to.deep.equal(data_1.mockData.branchSummary);
    });
    (0, mocha_1.it)('print branch summary', async function () {
        utils_1.branchDiffUtility.printSummary(data_1.mockData.branchSummary);
    });
    (0, mocha_1.it)('parse compact text', async function () {
        const result = utils_1.branchDiffUtility.parseCompactText(data_1.mockData.contentTypesDiff);
        (0, chai_1.expect)(result).to.deep.equal(data_1.mockData.branchTextData);
    });
    (0, mocha_1.it)('print compact text', async function () {
        utils_1.branchDiffUtility.printCompactTextView(data_1.mockData.branchCompactData);
    });
    (0, mocha_1.it)('print compact text view, nothing to display', async function () {
        utils_1.branchDiffUtility.printCompactTextView(data_1.mockData.noModifiedData);
    });
    (0, mocha_1.it)('parse detailedText', async function () {
        const parseCompactStub = (0, sinon_1.stub)(utils_1.branchDiffUtility, 'parseCompactText');
        parseCompactStub.withArgs(data_1.mockData.contentTypesDiff);
        const parseVerboseStub = (0, sinon_1.stub)(utils_1.branchDiffUtility, 'parseVerbose');
        parseVerboseStub
            .withArgs(data_1.mockData.contentTypesDiff, data_1.mockData.branchDiffPayload)
            .resolves(data_1.mockData.verboseContentTypeRes);
        const result = await utils_1.branchDiffUtility.parseVerbose(data_1.mockData.contentTypesDiff, data_1.mockData.branchDiffPayload);
        (0, chai_1.expect)(parseVerboseStub.calledOnce).to.be.true;
        (0, chai_1.expect)(result).to.be.equal(data_1.mockData.verboseContentTypeRes);
        parseCompactStub.restore();
        parseVerboseStub.restore();
    });
    (0, mocha_1.it)('prepare branch detailedText response', async function () {
        const result = await utils_1.branchDiffUtility.prepareBranchVerboseRes(data_1.mockData.globalFieldDetailDiff);
        (0, chai_1.expect)(result).deep.be.equal(data_1.mockData.verboseRes);
    });
    (0, mocha_1.it)('print detailedText text view', async function () {
        utils_1.branchDiffUtility.printVerboseTextView(data_1.mockData.verboseContentTypeRes);
    });
    (0, mocha_1.it)('print detailedText text view, nothing to display', async function () {
        utils_1.branchDiffUtility.printVerboseTextView(data_1.mockData.noModifiedData);
    });
    (0, mocha_1.it)('filter out branch differences on basis of module like content_types, global_fields', async function () {
        const result = utils_1.branchDiffUtility.filterBranchDiffDataByModule(data_1.mockData.contentTypesDiff);
        (0, chai_1.expect)(result).to.deep.equal(data_1.mockData.contentTypesDiffData);
    });
    (0, mocha_1.it)('base and compare branch having schema, differences', async function () {
        const result = await utils_1.branchDiffUtility.deepDiff(data_1.baseBranchDiff, data_1.compareBranchDiff);
        (0, chai_1.expect)(result).to.deep.equal(data_1.baseAndCompareChanges.baseAndCompareHavingSchema);
    });
    (0, mocha_1.it)('base branch having only schema, differences', async function () {
        const result = await utils_1.branchDiffUtility.deepDiff(data_1.baseBranchDiff, data_1.compareBranchNoSchema);
        (0, chai_1.expect)(result).to.deep.equal(data_1.baseAndCompareChanges.baseHavingSchema);
    });
    (0, mocha_1.it)('compare branch having only schema, differences', async function () {
        const result = await utils_1.branchDiffUtility.deepDiff(data_1.baseBranchNoSchema, data_1.compareBranchDiff);
        (0, chai_1.expect)(result).to.deep.equal(data_1.baseAndCompareChanges.compareHavingSchema);
    });
    (0, mocha_1.it)('prepare base and compare branch modified differences', async function () {
        const deepDiffStub = (0, sinon_1.stub)(utils_1.branchDiffUtility, 'deepDiff').resolves(data_1.baseAndCompareChanges.baseAndCompareHavingSchema);
        await utils_1.branchDiffUtility.prepareModifiedDiff({
            baseBranchFieldExists: data_1.baseBranchDiff,
            compareBranchFieldExists: data_1.compareBranchDiff,
            listOfModifiedFields: data_1.mockData.verboseRes.listOfModifiedFields,
            listOfAddedFields: data_1.mockData.verboseRes.listOfAddedFields,
            listOfDeletedFields: data_1.mockData.verboseRes.listOfDeletedFields,
        });
        deepDiffStub.restore();
    });
});
(0, mocha_1.describe)('Branch Diff handler Testcases', () => {
    let fetchBranchDiffStub, filterBranchDiffDataByModuleStub, displaySummaryStub, loaderV2Stub;
    (0, mocha_1.beforeEach)(function () {
        fetchBranchDiffStub = (0, sinon_1.stub)(utils_1.branchDiffUtility, 'fetchBranchesDiff');
        filterBranchDiffDataByModuleStub = (0, sinon_1.stub)(utils_1.branchDiffUtility, 'filterBranchDiffDataByModule');
        displaySummaryStub = (0, sinon_1.stub)(branch_1.BranchDiffHandler.prototype, 'displaySummary');
        loaderV2Stub = (0, sinon_1.stub)(cli_utilities_1.cliux, 'loaderV2');
    });
    (0, mocha_1.afterEach)(function () {
        fetchBranchDiffStub.restore();
        filterBranchDiffDataByModuleStub.restore();
        displaySummaryStub.restore();
        loaderV2Stub.restore();
    });
    (0, mocha_1.it)('Branch diff without compare branch flag, should prompt for compare branch', async function () {
        const askCompareBranch = (0, sinon_1.stub)(utils_1.interactive, 'askCompareBranch').resolves(data_1.mockData.flags.compareBranch);
        new branch_1.BranchDiffHandler(data_1.mockData.withoutCompareFlag).validateMandatoryFlags();
        (0, chai_1.expect)(askCompareBranch.calledOnce).to.be.true;
        askCompareBranch.restore();
    });
    (0, mocha_1.it)('Branch diff without base branch flag, should prompt for base branch', async function () {
        const askBaseBranch = (0, sinon_1.stub)(utils_1.interactive, 'askBaseBranch').resolves(data_1.mockData.flags.baseBranch);
        new branch_1.BranchDiffHandler(data_1.mockData.withoutBaseFlag).validateMandatoryFlags();
        (0, chai_1.expect)(askBaseBranch.calledOnce).to.be.true;
        askBaseBranch.restore();
    });
    (0, mocha_1.it)('Branch diff without stack api flag, should prompt for stack api key', async function () {
        const askStackAPIKey = (0, sinon_1.stub)(utils_1.interactive, 'askStackAPIKey').resolves(data_1.mockData.flags.stackAPIKey);
        new branch_1.BranchDiffHandler(data_1.mockData.withoutAPIKeyFlag).validateMandatoryFlags();
        (0, chai_1.expect)(askStackAPIKey.calledOnce).to.be.true;
        askStackAPIKey.restore();
    });
    (0, mocha_1.it)('Branch diff without module flag, should prompt for module', async function () {
        const askModule = (0, sinon_1.stub)(utils_1.interactive, 'selectModule').resolves(data_1.mockData.flags.module);
        new branch_1.BranchDiffHandler(data_1.mockData.withoutModuleFlag).validateMandatoryFlags();
        (0, chai_1.expect)(askModule.calledOnce).to.be.true;
        askModule.restore();
    });
    (0, mocha_1.it)('Branch diff with global config, should take the base branch from config', async function () {
        const stubBranchConfig = (0, sinon_1.stub)(util, 'getbranchConfig').resolves(data_1.mockData.flags.baseBranch);
        delete data_1.mockData.flags.baseBranch;
        new branch_1.BranchDiffHandler(data_1.mockData.flags).validateMandatoryFlags();
        (0, chai_1.expect)(stubBranchConfig.calledOnce).to.be.true;
        stubBranchConfig.restore();
    });
    (0, mocha_1.it)('display content types summary', async function () {
        const parseSummaryStub = (0, sinon_1.stub)(utils_1.branchDiffUtility, 'parseSummary');
        parseSummaryStub.withArgs(data_1.mockData.contentTypesDiff, 'main', 'dev').returns(data_1.mockData.branchSummary);
        const printSummaryStub = (0, sinon_1.stub)(utils_1.branchDiffUtility, 'printSummary');
        printSummaryStub.withArgs(data_1.mockData.branchSummary).returns();
        new branch_1.BranchDiffHandler(data_1.mockData.flags).displaySummary(data_1.mockData.contentTypesDiff, data_1.mockData.flags.module);
        parseSummaryStub.restore();
        printSummaryStub.restore();
    });
    (0, mocha_1.it)('display global fields summary', async function () {
        const parseSummaryStub = (0, sinon_1.stub)(utils_1.branchDiffUtility, 'parseSummary');
        parseSummaryStub.withArgs(data_1.mockData.globalFieldDiff, 'main', 'dev').returns(data_1.mockData.branchSummary);
        const printSummaryStub = (0, sinon_1.stub)(utils_1.branchDiffUtility, 'printSummary');
        printSummaryStub.withArgs(data_1.mockData.branchSummary).returns();
        data_1.mockData.flags.module = 'global_fields';
        new branch_1.BranchDiffHandler(data_1.mockData.flags).displaySummary(data_1.mockData.globalFieldDiff, data_1.mockData.flags.module);
        parseSummaryStub.restore();
        printSummaryStub.restore();
    });
    (0, mocha_1.it)('display branch diff, compact text view', async function () {
        const parseCompactTextStub = (0, sinon_1.stub)(utils_1.branchDiffUtility, 'parseCompactText');
        parseCompactTextStub.withArgs(data_1.mockData.contentTypesDiff).returns(data_1.mockData.branchCompactData);
        const printCompactTextViewStub = (0, sinon_1.stub)(utils_1.branchDiffUtility, 'printCompactTextView');
        printCompactTextViewStub.withArgs(data_1.mockData.branchCompactData).returns();
        new branch_1.BranchDiffHandler(data_1.mockData.flags).displayBranchDiffTextAndVerbose(data_1.mockData.contentTypesDiff, data_1.mockData.branchDiffPayload);
        //expect(parseCompactTextStub.calledOnce).to.be.true;
        //expect(printCompactTextViewStub.calledOnce).to.be.true;
        parseCompactTextStub.restore();
        printCompactTextViewStub.restore();
    });
    (0, mocha_1.it)('display branch diff, detailedText view', async function () {
        const parseVerboseStub = (0, sinon_1.stub)(utils_1.branchDiffUtility, 'parseVerbose');
        parseVerboseStub
            .withArgs(data_1.mockData.contentTypesDiff, data_1.mockData.branchDiffPayload)
            .resolves(data_1.mockData.verboseContentTypeRes);
        const printVerboseTextViewStub = (0, sinon_1.stub)(utils_1.branchDiffUtility, 'printVerboseTextView');
        printVerboseTextViewStub.withArgs(data_1.mockData.verboseContentTypeRes).returns();
        data_1.mockData.flags.format = 'detailedText';
        new branch_1.BranchDiffHandler(data_1.mockData.flags).displayBranchDiffTextAndVerbose(data_1.mockData.contentTypesDiff, data_1.mockData.branchDiffPayload);
        parseVerboseStub.restore();
        printVerboseTextViewStub.restore();
    });
    (0, mocha_1.it)('BranchDiffHandler initBranchDiffUtility, content_types module', async function () {
        fetchBranchDiffStub.withArgs(data_1.mockData.branchDiffPayload).resolves(data_1.mockData.contentTypesDiff);
        filterBranchDiffDataByModuleStub.withArgs(data_1.mockData.contentTypesDiff).resolves(data_1.mockData.contentTypesDiffData);
        displaySummaryStub.withArgs(data_1.mockData.contentTypesDiff, data_1.mockData.flags.module).returns();
        const contentTypeVerbose = (0, sinon_1.stub)(branch_1.BranchDiffHandler.prototype, 'displayBranchDiffTextAndVerbose');
        contentTypeVerbose.withArgs(data_1.mockData.contentTypesDiff, data_1.mockData.branchDiffPayload);
        new branch_1.BranchDiffHandler(data_1.mockData.flags).initBranchDiffUtility();
        contentTypeVerbose.restore();
    });
    (0, mocha_1.it)('BranchDiffHandler initBranchDiffUtility, global_fields module', async function () {
        data_1.mockData.flags.module = 'global_fields';
        fetchBranchDiffStub.withArgs(data_1.mockData.branchDiffPayload).resolves(data_1.mockData.globalFieldDiff);
        filterBranchDiffDataByModuleStub.withArgs(data_1.mockData.globalFieldDiff).resolves(data_1.mockData.globalFieldsDiffData);
        displaySummaryStub.withArgs(data_1.mockData.globalFieldDiff, data_1.mockData.flags.module).returns();
        const globalFieldVerbose = (0, sinon_1.stub)(branch_1.BranchDiffHandler.prototype, 'displayBranchDiffTextAndVerbose');
        globalFieldVerbose.withArgs(data_1.mockData.globalFieldDiff, data_1.mockData.branchDiffPayload);
        data_1.mockData.flags.module = 'global_fields';
        new branch_1.BranchDiffHandler(data_1.mockData.flags).initBranchDiffUtility();
        globalFieldVerbose.restore();
    });
    (0, mocha_1.it)('execute BranchDiffHandler run method', async function () {
        const stub1 = (0, sinon_1.stub)(branch_1.BranchDiffHandler.prototype, 'initBranchDiffUtility');
        const stub2 = (0, sinon_1.stub)(branch_1.BranchDiffHandler.prototype, 'validateMandatoryFlags');
        new branch_1.BranchDiffHandler(data_1.mockData.flags).run();
        stub1.restore();
        stub2.restore();
    });
});
