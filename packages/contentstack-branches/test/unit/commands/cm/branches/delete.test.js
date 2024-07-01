"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mocha_1 = require("mocha");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const delete_1 = tslib_1.__importDefault(require("../../../../../src/commands/cm/branches/delete"));
const data_1 = require("../../../mock/data");
const utils_1 = require("../../../../../src/utils");
(0, mocha_1.describe)('Delete branch', () => {
    (0, mocha_1.it)('Delete branch with all flags, should be successful', async function () {
        const stub1 = (0, sinon_1.stub)(delete_1.default.prototype, 'run').resolves(data_1.deleteBranchMockData.flags);
        await delete_1.default.run([
            '--stack-api-key',
            data_1.deleteBranchMockData.flags.apiKey,
            '--uid',
            data_1.deleteBranchMockData.flags.uid,
            '-y',
        ]);
        (0, chai_1.expect)(stub1.calledOnce).to.be.true;
        stub1.restore();
    });
    (0, mocha_1.it)('Should prompt when api key is not passed', async () => {
        const askStackAPIKey = (0, sinon_1.stub)(utils_1.interactive, 'askStackAPIKey').resolves(data_1.deleteBranchMockData.flags.apiKey);
        await delete_1.default.run(['--uid', data_1.deleteBranchMockData.flags.uid, "--yes"]);
        (0, chai_1.expect)(askStackAPIKey.calledOnce).to.be.true;
        askStackAPIKey.restore();
    });
    (0, mocha_1.it)('Should prompt when branch is not passed and also ask confirmation wihtout -y flag', async () => {
        const askSourceBranch = (0, sinon_1.stub)(utils_1.interactive, 'askBranchUid').resolves(data_1.deleteBranchMockData.flags.uid);
        await delete_1.default.run(['--stack-api-key', data_1.deleteBranchMockData.flags.apiKey, "--yes"]);
        (0, chai_1.expect)(askSourceBranch.calledOnce).to.be.true;
        askSourceBranch.restore();
    });
    (0, mocha_1.it)('Should ask branch name confirmation if yes not provided, success if same branch uid provided', async () => {
        const askConfirmation = (0, sinon_1.stub)(utils_1.interactive, 'askBranchNameConfirmation').resolves(data_1.deleteBranchMockData.flags.uid);
        await delete_1.default.run([
            '--stack-api-key',
            data_1.deleteBranchMockData.flags.apiKey,
            '--uid',
            data_1.deleteBranchMockData.flags.uid
        ]);
        (0, chai_1.expect)(askConfirmation.called).to.be.true;
        askConfirmation.restore();
    });
});
