"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mocha_1 = require("mocha");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const diff_1 = tslib_1.__importDefault(require("../../../../../src/commands/cm/branches/diff"));
const branch_1 = require("../../../../../src/branch");
const data_1 = require("../../../mock/data");
(0, mocha_1.describe)('Diff Command', () => {
    (0, mocha_1.it)('Branch diff with all flags, should be successful', async function () {
        const stub1 = (0, sinon_1.stub)(branch_1.BranchDiffHandler.prototype, 'run').resolves(data_1.mockData.data);
        await diff_1.default.run([
            '--compare-branch',
            data_1.mockData.flags.compareBranch,
            '--module',
            data_1.mockData.flags.module,
            '-k',
            data_1.mockData.flags.stackAPIKey,
            '--base-branch',
            data_1.mockData.flags.baseBranch,
        ]);
        (0, chai_1.expect)(stub1.calledOnce).to.be.true;
        stub1.restore();
    });
    (0, mocha_1.it)('Branch diff when format type is verbose, should display verbose view', async function () {
        const stub1 = (0, sinon_1.stub)(diff_1.default.prototype, 'run').resolves(data_1.mockData.verboseContentTypeRes);
        await diff_1.default.run([
            '--compare-branch',
            data_1.mockData.flags.compareBranch,
            '--base-branch',
            data_1.mockData.flags.baseBranch,
            '--module',
            data_1.mockData.flags.module,
            '-k',
            data_1.mockData.flags.stackAPIKey,
            '--format',
            'verbose'
        ]);
        stub1.restore();
    }).timeout(10000);
    (0, mocha_1.it)('Branch summary when module is of both type(content_types & global fields)', async function () {
        const stub1 = (0, sinon_1.stub)(diff_1.default.prototype, 'run').resolves(data_1.mockData.data);
        await diff_1.default.run([
            '--compare-branch',
            data_1.mockData.flags.compareBranch,
            '--base-branch',
            data_1.mockData.flags.baseBranch,
            '--module',
            'all',
            '-k',
            data_1.mockData.flags.stackAPIKey
        ]);
        stub1.restore();
    });
});
