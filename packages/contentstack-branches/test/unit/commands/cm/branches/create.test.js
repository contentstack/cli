"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mocha_1 = require("mocha");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const create_1 = tslib_1.__importDefault(require("../../../../../src/commands/cm/branches/create"));
const data_1 = require("../../../mock/data");
const utils_1 = require("../../../../../src/utils");
(0, mocha_1.describe)('Create branch', () => {
    (0, mocha_1.it)('Create branch with all flags, should be successful', async function () {
        const stub1 = (0, sinon_1.stub)(create_1.default.prototype, 'run').resolves(data_1.createBranchMockData.flags);
        const args = [
            '--stack-api-key',
            data_1.createBranchMockData.flags.apiKey,
            '--source',
            data_1.createBranchMockData.flags.source,
            '--uid',
            data_1.createBranchMockData.flags.uid,
        ];
        await create_1.default.run(args);
        (0, chai_1.expect)(stub1.calledOnce).to.be.true;
        stub1.restore();
    });
    (0, mocha_1.it)('Should prompt when api key is not passed', async () => {
        const askStackAPIKey = (0, sinon_1.stub)(utils_1.interactive, 'askStackAPIKey').resolves(data_1.createBranchMockData.flags.apiKey);
        await create_1.default.run([
            '--source',
            data_1.createBranchMockData.flags.source,
            '--uid',
            data_1.createBranchMockData.flags.uid,
        ]);
        (0, chai_1.expect)(askStackAPIKey.calledOnce).to.be.true;
        askStackAPIKey.restore();
    });
    (0, mocha_1.it)('Should prompt when source branch is not passed', async () => {
        const askSourceBranch = (0, sinon_1.stub)(utils_1.interactive, 'askSourceBranch').resolves(data_1.createBranchMockData.flags.source);
        await create_1.default.run([
            '--stack-api-key',
            data_1.createBranchMockData.flags.apiKey,
            '--uid',
            data_1.createBranchMockData.flags.uid,
        ]);
        (0, chai_1.expect)(askSourceBranch.calledOnce).to.be.true;
        askSourceBranch.restore();
    });
    (0, mocha_1.it)('Should prompt when new branch uid is not passed', async () => {
        const askBranchUid = (0, sinon_1.stub)(utils_1.interactive, 'askBranchUid').resolves(data_1.createBranchMockData.flags.uid);
        await create_1.default.run([
            '--stack-api-key',
            data_1.createBranchMockData.flags.apiKey,
            '--source',
            data_1.createBranchMockData.flags.source,
        ]);
        (0, chai_1.expect)(askBranchUid.calledOnce).to.be.true;
        askBranchUid.restore();
    });
});
