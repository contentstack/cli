import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import { stub, assert } from 'sinon';
import BranchDiffUtility from '../../../src/utils/branch-diff-utility';
import { cliux } from '@contentstack/cli-utilities';
import { mockData } from '../mock/data';

let baseUrl = 'http://dev16-branches.csnonprod.com/api/compare';

describe('Branch Diff Utility Class Testcases', () => {
  let utilityClient, cliuxErrorStub;
  before(function () {
    utilityClient = new BranchDiffUtility(mockData.flags);
    cliuxErrorStub = stub(cliux, 'error')
  });
  after(function () {
    utilityClient = null;
    cliuxErrorStub.restore();
  });

  it('api request, should be successful', async function () {
    const stub1 = stub(BranchDiffUtility.prototype, 'apiRequest').resolves(mockData.branchDiff);
    const result = await utilityClient.apiRequest(`${baseUrl}/${mockData.flags.module}`);
    expect(stub1.calledOnce).to.be.true;
    expect(result).to.be.equal(mockData.branchDiff);
    stub1.restore();
  });

  it('api request, should be failed', async function () {
    const stub1 = stub(BranchDiffUtility.prototype, 'apiRequest').rejects("CLI_BRANCH_API_FAILED");
    const result = await utilityClient.apiRequest(`${baseUrl}`).catch(err => err);
    expect(stub1.calledOnce).to.be.true;
    stub1.restore();
  });

  it('fetch branch differences', async function () {
    const stub1 = stub(BranchDiffUtility.prototype, 'fetchBranchesDiff').resolves();
    await utilityClient.fetchBranchesDiff();
    expect(stub1.calledOnce).to.be.true;
    stub1.restore();
  });

  it('get branch diff summary', async function () {
    const stub1 = stub(BranchDiffUtility.prototype, 'getBranchesSummary').returns(mockData.branchSummary);
    const result = utilityClient.getBranchesSummary();
    expect(stub1.calledOnce).to.be.true;
    expect(result).to.be.equal(mockData.branchSummary);
    stub1.restore();
  });

  it('get branch compact data', async function () {
    const stub1 = stub(BranchDiffUtility.prototype, 'getBrancheCompactData').returns(mockData.branchCompactData);
    const result = utilityClient.getBrancheCompactData();
    expect(stub1.calledOnce).to.be.true;
    expect(result).to.be.equal(mockData.branchCompactData);
    stub1.restore();
  });

  //handle filter flag ,& verbose view --> 2 pending
});

// branch/diff -> testcases