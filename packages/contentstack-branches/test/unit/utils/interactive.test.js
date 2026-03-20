"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const mocha_1 = require("mocha");
const sinon_1 = require("sinon");
const cli_utilities_1 = require("@contentstack/cli-utilities");
const utils_1 = require("../../../src/utils");
(0, mocha_1.describe)('Interactive', () => {
    let inquireStub;
    (0, mocha_1.beforeEach)(function () {
        inquireStub = (0, sinon_1.stub)(cli_utilities_1.cliux, 'inquire');
    });
    (0, mocha_1.afterEach)(function () {
        inquireStub.restore();
    });
    (0, mocha_1.it)('select module', async function () {
        const module = 'content_types';
        inquireStub.callsFake(function () {
            return Promise.resolve(module);
        });
        const result = await utils_1.interactive.selectModule();
        const isValid = utils_1.interactive.inquireRequireFieldValidation(result);
        (0, chai_1.expect)(result).to.be.equal(module);
        (0, chai_1.expect)(isValid).to.be.equal(true);
    });
    (0, mocha_1.it)('ask compare branch', async function () {
        const compareBranch = 'dev';
        inquireStub.callsFake(function () {
            return Promise.resolve(compareBranch);
        });
        const result = await utils_1.interactive.askCompareBranch();
        (0, chai_1.expect)(result).to.be.equal(compareBranch);
    });
    (0, mocha_1.it)('ask stack api key', async function () {
        const stackAPIKey = 'abcd';
        inquireStub.callsFake(function () {
            return Promise.resolve(stackAPIKey);
        });
        const result = await utils_1.interactive.askStackAPIKey();
        (0, chai_1.expect)(result).to.be.equal(stackAPIKey);
    });
    (0, mocha_1.it)('ask base branch', async function () {
        const baseBranch = 'main';
        inquireStub.callsFake(function () {
            return Promise.resolve(baseBranch);
        });
        const result = await utils_1.interactive.askBaseBranch();
        (0, chai_1.expect)(result).to.be.equal(baseBranch);
    });
    (0, mocha_1.it)('ask source branch', async function () {
        const sourceBranch = 'dev';
        inquireStub.callsFake(function () {
            return Promise.resolve(sourceBranch);
        });
        const result = await utils_1.interactive.askSourceBranch();
        (0, chai_1.expect)(result).to.be.equal(sourceBranch);
    });
    (0, mocha_1.it)('ask branch uid', async function () {
        const branchUid = 'new_branch';
        inquireStub.callsFake(function () {
            return Promise.resolve(branchUid);
        });
        const result = await utils_1.interactive.askBranchUid();
        (0, chai_1.expect)(result).to.be.equal(branchUid);
    });
    (0, mocha_1.it)('confirm delete branch', async function () {
        inquireStub.callsFake(function () {
            return Promise.resolve(true);
        });
        const result = await utils_1.interactive.askConfirmation();
        (0, chai_1.expect)(result).to.be.equal(true);
    });
    (0, mocha_1.it)('Without input value, should be failed', async function () {
        const msg = 'CLI_BRANCH_REQUIRED_FIELD';
        const result = utils_1.interactive.inquireRequireFieldValidation('');
        (0, chai_1.expect)(result).to.be.equal(msg);
    });
    (0, mocha_1.it)('With input value, should be success', async function () {
        const result = utils_1.interactive.inquireRequireFieldValidation('main');
        (0, chai_1.expect)(result).to.be.equal(true);
    });
    (0, mocha_1.it)('select merge strategy, should be successful', async function () {
        const strategy = 'merge_prefer_base';
        inquireStub.callsFake(function () {
            return Promise.resolve(strategy);
        });
        const result = await utils_1.interactive.selectMergeStrategy();
        (0, chai_1.expect)(result).to.be.equal(strategy);
    });
    (0, mocha_1.it)('select merge strategy sub options, should be successful', async function () {
        const strategy = 'new';
        inquireStub.callsFake(function () {
            return Promise.resolve(strategy);
        });
        const result = await utils_1.interactive.selectMergeStrategySubOptions();
        (0, chai_1.expect)(result).to.be.equal(strategy);
    });
    (0, mocha_1.it)('select merge executions, should be successful', async function () {
        const strategy = 'export';
        inquireStub.callsFake(function () {
            return Promise.resolve(strategy);
        });
        const result = await utils_1.interactive.selectMergeExecution();
        (0, chai_1.expect)(result).to.be.equal(strategy);
    });
    (0, mocha_1.it)('ask export merge summary path', async function () {
        const filePath = '***REMOVED***';
        inquireStub.callsFake(function () {
            return Promise.resolve(filePath);
        });
        const result = await utils_1.interactive.askExportMergeSummaryPath();
        (0, chai_1.expect)(result).to.be.equal(filePath);
    });
    (0, mocha_1.it)('ask merge comment', async function () {
        const comment = 'changes';
        inquireStub.callsFake(function () {
            return Promise.resolve(comment);
        });
        const result = await utils_1.interactive.askMergeComment();
        (0, chai_1.expect)(result).to.be.equal(comment);
    });
});
