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
    (0, mocha_1.it)('List branches with all flags, should be successful', async function () {
        const stub1 = (0, sinon_1.stub)(index_1.default.prototype, 'run').resolves(data_1.branchMockData.flags);
        const args = ['--stack-api-key', data_1.branchMockData.flags.apiKey];
        await index_1.default.run(args);
        (0, chai_1.expect)(stub1.calledOnce).to.be.true;
        stub1.restore();
    });
    (0, mocha_1.it)('Should prompt when api key is not passed', async () => {
        const askStackAPIKey = (0, sinon_1.stub)(utils_1.interactive, 'askStackAPIKey').resolves(data_1.branchMockData.flags.apiKey);
        await index_1.default.run([]);
        (0, chai_1.expect)(askStackAPIKey.calledOnce).to.be.true;
        askStackAPIKey.restore();
    });
    (0, mocha_1.it)('branches with verbose flag, should list branches in table', async () => {
        const branchStub = (0, sinon_1.stub)(cli_utilities_1.cliux, 'table').callsFake((branches) => {
            (0, chai_1.expect)(branches).to.have.length.greaterThan(0);
        });
        await index_1.default.run(['-k', data_1.branchMockData.flags.apiKey, '--verbose']);
        branchStub.restore();
    });
    (0, mocha_1.it)('Branch diff when format type is verbose, should display verbose view', async function () {
        await index_1.default.run(['-k', data_1.branchMockData.flags.apiKey, '--verbose']);
    });
});
