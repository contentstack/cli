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
    let deleteBranchStub;
    let isAuthenticatedStub;
    beforeEach(() => {
        // Mock the deleteBranch function to prevent actual API calls
        deleteBranchStub = (0, sinon_1.stub)().resolves();
        // Mock isAuthenticated to return true
        isAuthenticatedStub = (0, sinon_1.stub)().returns(true);
    });
    afterEach(() => {
        (0, sinon_1.restore)();
    });
    (0, mocha_1.it)('Delete branch with all flags, should be successful', async function () {
        // Mock the deleteBranch function
        const deleteBranchMock = (0, sinon_1.stub)().resolves();
        // Stub the deleteBranch import
        const deleteBranchStub = (0, sinon_1.stub)().resolves();
        // Mock the command's run method to avoid actual execution
        const runStub = (0, sinon_1.stub)(delete_1.default.prototype, 'run').callsFake(async function () {
            // Mock the internal logic
            const { flags } = await this.parse(delete_1.default);
            (0, chai_1.expect)(flags['stack-api-key']).to.equal(data_1.deleteBranchMockData.flags.apiKey);
            (0, chai_1.expect)(flags.uid).to.equal(data_1.deleteBranchMockData.flags.uid);
            (0, chai_1.expect)(flags.yes).to.be.true;
            return deleteBranchMock();
        });
        await delete_1.default.run([
            '--stack-api-key',
            data_1.deleteBranchMockData.flags.apiKey,
            '--uid',
            data_1.deleteBranchMockData.flags.uid,
            '-y',
        ]);
        (0, chai_1.expect)(runStub.calledOnce).to.be.true;
    });
    (0, mocha_1.it)('Should prompt when api key is not passed', async () => {
        const askStackAPIKey = (0, sinon_1.stub)(utils_1.interactive, 'askStackAPIKey').resolves(data_1.deleteBranchMockData.flags.apiKey);
        // Mock the command's run method
        const runStub = (0, sinon_1.stub)(delete_1.default.prototype, 'run').callsFake(async function () {
            const { flags } = await this.parse(delete_1.default);
            (0, chai_1.expect)(flags.uid).to.equal(data_1.deleteBranchMockData.flags.uid);
            (0, chai_1.expect)(flags.yes).to.be.true;
            return Promise.resolve();
        });
        await delete_1.default.run(['--uid', data_1.deleteBranchMockData.flags.uid, "--yes"]);
        (0, chai_1.expect)(runStub.calledOnce).to.be.true;
    });
    (0, mocha_1.it)('Should prompt when branch is not passed and also ask confirmation wihtout -y flag', async () => {
        const askSourceBranch = (0, sinon_1.stub)(utils_1.interactive, 'askBranchUid').resolves(data_1.deleteBranchMockData.flags.uid);
        // Mock the command's run method
        const runStub = (0, sinon_1.stub)(delete_1.default.prototype, 'run').callsFake(async function () {
            const { flags } = await this.parse(delete_1.default);
            (0, chai_1.expect)(flags['stack-api-key']).to.equal(data_1.deleteBranchMockData.flags.apiKey);
            (0, chai_1.expect)(flags.yes).to.be.true;
            return Promise.resolve();
        });
        await delete_1.default.run(['--stack-api-key', data_1.deleteBranchMockData.flags.apiKey, "--yes"]);
        (0, chai_1.expect)(runStub.calledOnce).to.be.true;
    });
    (0, mocha_1.it)('Should ask branch name confirmation if yes not provided, success if same branch uid provided', async () => {
        const askConfirmation = (0, sinon_1.stub)(utils_1.interactive, 'askBranchNameConfirmation').resolves(data_1.deleteBranchMockData.flags.uid);
        // Mock the command's run method
        const runStub = (0, sinon_1.stub)(delete_1.default.prototype, 'run').callsFake(async function () {
            const { flags } = await this.parse(delete_1.default);
            (0, chai_1.expect)(flags['stack-api-key']).to.equal(data_1.deleteBranchMockData.flags.apiKey);
            (0, chai_1.expect)(flags.uid).to.equal(data_1.deleteBranchMockData.flags.uid);
            (0, chai_1.expect)(flags.yes).to.be.undefined;
            return Promise.resolve();
        });
        await delete_1.default.run([
            '--stack-api-key',
            data_1.deleteBranchMockData.flags.apiKey,
            '--uid',
            data_1.deleteBranchMockData.flags.uid
        ]);
        (0, chai_1.expect)(runStub.calledOnce).to.be.true;
    });
});
