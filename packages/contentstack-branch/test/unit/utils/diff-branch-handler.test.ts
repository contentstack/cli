import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import { stub, assert } from 'sinon';
import { branchDiffUtility } from '../../../src/utils';
import { cliux } from '@contentstack/cli-utilities';
import { mockData } from '../mock/data';


describe('Branch Diff Utility Class Testcases', () => {
  let cliuxErrorStub, cliuxPrintStub;
  before(function () {
    cliuxErrorStub = stub(cliux, 'error');
    cliuxPrintStub = stub(cliux, 'print');
  });
  after(function () {
    cliuxErrorStub.restore();
    cliuxPrintStub.restore();
  });

  it('fetch branch differences', async function () {
    const stub1 = stub(branchDiffUtility, 'fetchBranchesDiff');
    stub1.withArgs(mockData.branchDiffPayload).resolves(mockData.branchDiffData);
    const result = await branchDiffUtility.fetchBranchesDiff(mockData.branchDiffPayload);
    expect(stub1.calledOnce).to.be.true;
    expect(result).to.be.equal(mockData.branchDiffData);
    stub1.restore();
  });

  it('parse branch summary', async function () {
    const stub1 = stub(branchDiffUtility, 'parseSummary');
    stub1.withArgs(mockData.branchDiffData, 'main', 'dev').returns(mockData.branchSummary);
    const result = branchDiffUtility.parseSummary(mockData.branchDiffData, 'main', 'dev');
    expect(stub1.calledOnce).to.be.true;
    expect(result).to.be.equal(mockData.branchSummary);
    stub1.restore();
  });

  it('print branch summary', async function () {
    const stub1 = stub(branchDiffUtility, 'printSummary')
    stub1.withArgs(mockData.branchSummary).returns();
    branchDiffUtility.printSummary(mockData.branchSummary);
    expect(stub1.calledOnce).to.be.true;
    stub1.restore();
  });

  it('parse compact text', async function () {
    const stub1 = stub(branchDiffUtility, 'parseCompactText');
    stub1.withArgs(mockData.branchDiffData).returns(mockData.branchCompactData);
    const result = branchDiffUtility.parseCompactText(mockData.branchDiffData);
    expect(stub1.calledOnce).to.be.true;
    expect(result).to.be.equal(mockData.branchCompactData);
    stub1.restore();
  });

  it('print compact text', async function () {
    const stub1 = stub(branchDiffUtility, 'printCompactTextView')
    stub1.withArgs(mockData.branchCompactData, "content_types").returns();
    branchDiffUtility.printCompactTextView(mockData.branchCompactData, "content_types");
    expect(stub1.calledOnce).to.be.true;
    stub1.restore();
  });
  
  it('parse verbose', async function () {
    const stub1 = stub(branchDiffUtility, 'parseVerbose');
    stub1.withArgs(mockData.branchDiffData, mockData.branchDiffPayload).resolves(mockData.verboseRes);
    const result = await branchDiffUtility.parseVerbose(mockData.branchDiffData, mockData.branchDiffPayload);
    expect(stub1.calledOnce).to.be.true;
    expect(result).to.be.equal(mockData.verboseRes);
    stub1.restore();
  });

  it('print verbose text view', async function () {
    const stub1 = stub(branchDiffUtility, 'printVerboseTextView')
    stub1.withArgs(mockData.verboseRes, "content_types").returns();
    branchDiffUtility.printVerboseTextView(mockData.verboseRes, "content_types");
    expect(stub1.calledOnce).to.be.true;
    stub1.restore();
  });

  it('print message verbose view, when nothing modified, deleted & added', async function () {
    const stub1 = stub(branchDiffUtility, 'printVerboseTextView')
    stub1.withArgs(mockData.emptyVerboseRes, "content_types").returns();
    branchDiffUtility.printVerboseTextView(mockData.emptyVerboseRes, "content_types");
    expect(stub1.calledOnce).to.be.true;
    stub1.restore();
  });
});
