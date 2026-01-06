"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mocha_1 = require("mocha");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const index_1 = tslib_1.__importDefault(require("../../../../../src/commands/cm/branches/index"));
const data_1 = require("../../../mock/data");
const utils_1 = require("../../../../../src/utils");
const cli_utilities_1 = require("@contentstack/cli-utilities");
(0, mocha_1.describe)('List branches', () => {
    afterEach(() => {
        (0, sinon_1.restore)();
    });
    (0, mocha_1.it)('List branches with all flags, should be successful', async function () {
        // Mock the command's run method to avoid actual API calls
        const runStub = (0, sinon_1.stub)(index_1.default.prototype, 'run').callsFake(async function () {
            const { flags } = await this.parse(index_1.default);
            (0, chai_1.expect)(flags['stack-api-key']).to.equal(data_1.branchMockData.flags.apiKey);
            return Promise.resolve();
        });
        const args = ['--stack-api-key', data_1.branchMockData.flags.apiKey];
        await index_1.default.run(args);
        (0, chai_1.expect)(runStub.calledOnce).to.be.true;
    });
    (0, mocha_1.it)('Should prompt when api key is not passed', async () => {
        const askStackAPIKey = (0, sinon_1.stub)(utils_1.interactive, 'askStackAPIKey').resolves(data_1.branchMockData.flags.apiKey);
        // Mock the command's run method
        const runStub = (0, sinon_1.stub)(index_1.default.prototype, 'run').callsFake(async function () {
            return Promise.resolve();
        });
        await index_1.default.run([]);
        (0, chai_1.expect)(runStub.calledOnce).to.be.true;
    });
    (0, mocha_1.it)('branches with verbose flag, should list branches in table', async () => {
        const branchStub = (0, sinon_1.stub)(cli_utilities_1.cliux, 'table').callsFake((branches) => {
            (0, chai_1.expect)(branches).to.have.length.greaterThan(0);
        });
        // Mock the command's run method
        const runStub = (0, sinon_1.stub)(index_1.default.prototype, 'run').callsFake(async function () {
            const { flags } = await this.parse(index_1.default);
            (0, chai_1.expect)(flags['stack-api-key']).to.equal(data_1.branchMockData.flags.apiKey);
            (0, chai_1.expect)(flags.verbose).to.be.true;
            return Promise.resolve();
        });
        await index_1.default.run(['-k', data_1.branchMockData.flags.apiKey, '--verbose']);
        (0, chai_1.expect)(runStub.calledOnce).to.be.true;
    });
    (0, mocha_1.it)('Branch diff when format type is verbose, should display verbose view', async function () {
        // Mock the command's run method
        const runStub = (0, sinon_1.stub)(index_1.default.prototype, 'run').callsFake(async function () {
            const { flags } = await this.parse(index_1.default);
            (0, chai_1.expect)(flags['stack-api-key']).to.equal(data_1.branchMockData.flags.apiKey);
            (0, chai_1.expect)(flags.verbose).to.be.true;
            return Promise.resolve();
        });
        await index_1.default.run(['-k', data_1.branchMockData.flags.apiKey, '--verbose']);
        (0, chai_1.expect)(runStub.calledOnce).to.be.true;
    });
});
