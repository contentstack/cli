import { expect } from 'chai';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { stub, assert } from 'sinon';
import { cliux, messageHandler } from '@contentstack/cli-utilities';
import { interactive } from '../../../src/utils';
import {mockData} from '../mock/data'

describe('Interactive', () => {
  let inquireStub;
  beforeEach(function (){
    inquireStub = stub(cliux, 'inquire');
  })
  afterEach(function(){
    inquireStub.restore();
  })

  it('select module', async function () {
    const module = 'content_types';
    inquireStub.callsFake(function () {
      return Promise.resolve(module);
    });
    const result = await interactive.selectModule();
    const isValid = interactive.inquireRequireFieldValidation(result);
    expect(result).to.be.equal(module);
    expect(isValid).to.be.equal(true);
  });

  it('ask compare branch', async function () {
    const compareBranch = 'dev';
    inquireStub.callsFake(function () {
      return Promise.resolve(compareBranch);
    });
    const result = await interactive.askCompareBranch();
    expect(result).to.be.equal(compareBranch);
  });

  it('ask stack api key', async function () {
    const stackAPIKey = 'abcd';
    inquireStub.callsFake(function () {
      return Promise.resolve(stackAPIKey);
    });
    const result = await interactive.askStackAPIKey();
    expect(result).to.be.equal(stackAPIKey);
  });

  it('ask base branch', async function () {
    const baseBranch = 'main';
    inquireStub.callsFake(function () {
      return Promise.resolve(baseBranch);
    });
    const result = await interactive.askBaseBranch();
    expect(result).to.be.equal(baseBranch);
  });

  it('ask source branch', async function () {
    const sourceBranch = 'dev';
    inquireStub.callsFake(function () {
      return Promise.resolve(sourceBranch);
    });
    const result = await interactive.askSourceBranch();
    expect(result).to.be.equal(sourceBranch);
  });

  it('ask branch uid', async function () {
    const branchUid = 'new_branch';
    inquireStub.callsFake(function () {
      return Promise.resolve(branchUid);
    });
    const result = await interactive.askBranchUid();
    expect(result).to.be.equal(branchUid);
  });

  it('confirm delete branch', async function () {
    inquireStub.callsFake(function () {
      return Promise.resolve(true);
    });
    const result = await interactive.askConfirmation();
    expect(result).to.be.equal(true);
  });

  it('Without input value, should be failed', async function () {
    const msg = 'CLI_BRANCH_REQUIRED_FIELD';
    const result = interactive.inquireRequireFieldValidation('');
    expect(result).to.be.equal(msg);
  });

  it('With input value, should be success', async function () {
    const result = interactive.inquireRequireFieldValidation('main');
    expect(result).to.be.equal(true);
  });

  it('select merge strategy, should be successful', async function () {
    const strategy = 'merge_prefer_base';
    inquireStub.callsFake(function () {
      return Promise.resolve(strategy);
    });
    const result = await interactive.selectMergeStrategy();
    expect(result).to.be.equal(strategy);
  });

  it('select merge strategy sub options, should be successful', async function () {
    const strategy = 'new';
    inquireStub.callsFake(function () {
      return Promise.resolve(strategy);
    });
    const result = await interactive.selectMergeStrategySubOptions();
    expect(result).to.be.equal(strategy);
  });

  it('select merge executions, should be successful', async function () {
    const strategy = 'export';
    inquireStub.callsFake(function () {
      return Promise.resolve(strategy);
    });
    const result = await interactive.selectMergeExecution();
    expect(result).to.be.equal(strategy);
  });

  it('ask export merge summary path', async function () {
    const filePath = '***REMOVED***';
    inquireStub.callsFake(function () {
      return Promise.resolve(filePath);
    });
    const result = await interactive.askExportMergeSummaryPath();
    expect(result).to.be.equal(filePath);
  });

  it('ask merge comment', async function () {
    const comment = 'changes';
    inquireStub.callsFake(function () {
      return Promise.resolve(comment);
    });
    const result = await interactive.askMergeComment();
    expect(result).to.be.equal(comment);
  });
});
