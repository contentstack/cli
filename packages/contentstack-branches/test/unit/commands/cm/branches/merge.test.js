"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mocha_1 = require("mocha");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const merge_1 = tslib_1.__importDefault(require("../../../../../src/commands/cm/branches/merge"));
const cli_utilities_1 = require("@contentstack/cli-utilities");
const data_1 = require("../../../mock/data");
const mergeHelper = tslib_1.__importStar(require("../../../../../src/utils/merge-helper"));
const index_1 = require("../../../../../src/branch/index");
(0, mocha_1.describe)('Merge Command', () => {
    let successMessageStub;
    (0, mocha_1.beforeEach)(function () {
        successMessageStub = (0, sinon_1.stub)(cli_utilities_1.cliux, 'print');
    });
    (0, mocha_1.afterEach)(function () {
        successMessageStub.restore();
    });
    (0, mocha_1.it)('Merge branch changes with all flags, should be successful', async function () {
        const mergeInputStub = (0, sinon_1.stub)(mergeHelper, 'setupMergeInputs').resolves(data_1.mockData.mergeData.flags);
        const displayBranchStatusStub = (0, sinon_1.stub)(mergeHelper, 'displayBranchStatus').resolves(data_1.mockData.mergeData.branchCompareData);
        const mergeHandlerStub = (0, sinon_1.stub)(index_1.MergeHandler.prototype, 'start').resolves();
        await merge_1.default.run([
            '--compare-branch',
            data_1.mockData.flags.compareBranch,
            '-k',
            data_1.mockData.flags.stackAPIKey,
            '--base-branch',
            data_1.mockData.flags.baseBranch,
        ]);
        (0, chai_1.expect)(mergeHandlerStub.calledOnce).to.be.true;
        mergeInputStub.restore();
        displayBranchStatusStub.restore();
        mergeHandlerStub.restore();
    });
});
// commands
