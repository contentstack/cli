import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import { stub, assert } from 'sinon';
import { branchDiffUtility, interactive } from '../../../src/utils';
import {
  baseBranchDiff,
  mockData,
  compareBranchDiff,
  baseAndCompareChanges,
  compareBranchNoSchema,
  baseBranchNoSchema,
} from '../mock/data';
import { BranchDiffHandler } from '../../../src/branch';
import * as util from '../../../src/utils';
import { cliux } from '@contentstack/cli-utilities';

describe('Branch Diff Utility Testcases', () => {
  let apiRequestStub, fetchBranchesDiffStub, loaderV2Stub;
  beforeEach(function () {
    apiRequestStub = stub(branchDiffUtility, 'branchCompareSDK').callsFake(function (param, skip, limit) {
      if (param.baseBranch === 'xyz') {
        return Promise.resolve('Base branch is invalid');
      } else {
        return Promise.resolve(mockData.branchDiff);
      }
    });
    fetchBranchesDiffStub = stub(branchDiffUtility, 'fetchBranchesDiff').callsFake(function (param) {
      if (param) {
        const result = apiRequestStub(param);
        return Promise.resolve(result);
      }
    });
    loaderV2Stub = stub(cliux, 'loaderV2');
  });
  afterEach(function () {
    apiRequestStub.restore();
    fetchBranchesDiffStub.restore();
    loaderV2Stub.restore();
  });

  it('fetch branch differences', async function () {
    const result = await fetchBranchesDiffStub(mockData.branchDiffPayload);
    expect(fetchBranchesDiffStub.calledOnce).to.be.true;
    expect(result).to.be.equal(mockData.branchDiff);
  });

  it('API request, should be failed', async function () {
    mockData.branchDiffPayload.baseBranch = 'xyz';
    const result = await fetchBranchesDiffStub(mockData.branchDiffPayload);
    expect(fetchBranchesDiffStub.calledOnce).to.be.true;
    expect(result).to.be.equal('Base branch is invalid');
  });

  it('parse branch summary', async function () {
    const result = branchDiffUtility.parseSummary(mockData.contentTypesDiff, 'main', 'dev');
    expect(result).to.deep.equal(mockData.branchSummary);
  });

  it('print branch summary', async function () {
    branchDiffUtility.printSummary(mockData.branchSummary);
  });

  it('parse compact text', async function () {
    const result = branchDiffUtility.parseCompactText(mockData.contentTypesDiff);
    expect(result).to.deep.equal(mockData.branchTextData);
  });

  it('print compact text', async function () {
    branchDiffUtility.printCompactTextView(mockData.branchCompactData);
  });

  it('print compact text view, nothing to display', async function () {
    branchDiffUtility.printCompactTextView(mockData.noModifiedData);
  });

  it('parse detailedText', async function () {
    const parseCompactStub = stub(branchDiffUtility, 'parseCompactText');
    parseCompactStub.withArgs(mockData.contentTypesDiff);
    const parseVerboseStub = stub(branchDiffUtility, 'parseVerbose');
    parseVerboseStub
      .withArgs(mockData.contentTypesDiff, mockData.branchDiffPayload)
      .resolves(mockData.verboseContentTypeRes);
    const result = await branchDiffUtility.parseVerbose(mockData.contentTypesDiff, mockData.branchDiffPayload);
    expect(parseVerboseStub.calledOnce).to.be.true;
    expect(result).to.be.equal(mockData.verboseContentTypeRes);
    parseCompactStub.restore();
    parseVerboseStub.restore();
  });

  it('prepare branch detailedText response', async function () {
    const result = await branchDiffUtility.prepareBranchVerboseRes(mockData.globalFieldDetailDiff);
    expect(result).deep.be.equal(mockData.verboseRes);
  });

  it('print detailedText text view', async function () {
    branchDiffUtility.printVerboseTextView(mockData.verboseContentTypeRes);
  });

  it('print detailedText text view, nothing to display', async function () {
    branchDiffUtility.printVerboseTextView(mockData.noModifiedData);
  });

  it('filter out branch differences on basis of module like content_types, global_fields', async function () {
    const result = branchDiffUtility.filterBranchDiffDataByModule(mockData.contentTypesDiff);
    expect(result).to.deep.equal(mockData.contentTypesDiffData);
  });

  it('base and compare branch having schema, differences', async function () {
    const result = await branchDiffUtility.deepDiff(baseBranchDiff, compareBranchDiff);
    expect(result).to.deep.equal(baseAndCompareChanges.baseAndCompareHavingSchema);
  });

  it('base branch having only schema, differences', async function () {
    const result = await branchDiffUtility.deepDiff(baseBranchDiff, compareBranchNoSchema);
    expect(result).to.deep.equal(baseAndCompareChanges.baseHavingSchema);
  });

  it('compare branch having only schema, differences', async function () {
    const result = await branchDiffUtility.deepDiff(baseBranchNoSchema, compareBranchDiff);
    expect(result).to.deep.equal(baseAndCompareChanges.compareHavingSchema);
  });

  it('prepare base and compare branch modified differences', async function () {
    const deepDiffStub = stub(branchDiffUtility, 'deepDiff').resolves(baseAndCompareChanges.baseAndCompareHavingSchema);
    await branchDiffUtility.prepareModifiedDiff({
      baseBranchFieldExists: baseBranchDiff,
      compareBranchFieldExists: compareBranchDiff,
      diffData: mockData.branchDiff,
      listOfModifiedFields: [],
      listOfAddedFields: [],
      listOfDeletedFields: [],
    });
    deepDiffStub.restore();
  });
});

describe('Branch Diff handler Testcases', () => {
  let fetchBranchDiffStub, filterBranchDiffDataByModuleStub, displaySummaryStub, loaderV2Stub;
  beforeEach(function () {
    fetchBranchDiffStub = stub(branchDiffUtility, 'fetchBranchesDiff');
    filterBranchDiffDataByModuleStub = stub(branchDiffUtility, 'filterBranchDiffDataByModule');
    displaySummaryStub = stub(BranchDiffHandler.prototype, 'displaySummary');
    loaderV2Stub = stub(cliux, 'loaderV2');
  });
  afterEach(function () {
    fetchBranchDiffStub.restore();
    filterBranchDiffDataByModuleStub.restore();
    displaySummaryStub.restore();
    loaderV2Stub.restore();
  });

  it('Branch diff without compare branch flag, should prompt for compare branch', async function () {
    const askCompareBranch = stub(interactive, 'askCompareBranch').resolves(mockData.flags.compareBranch);
    new BranchDiffHandler(mockData.withoutCompareFlag).validateMandatoryFlags();
    expect(askCompareBranch.calledOnce).to.be.true;
    askCompareBranch.restore();
  });

  it('Branch diff without base branch flag, should prompt for base branch', async function () {
    const askBaseBranch = stub(interactive, 'askBaseBranch').resolves(mockData.flags.baseBranch);
    new BranchDiffHandler(mockData.withoutBaseFlag).validateMandatoryFlags();
    expect(askBaseBranch.calledOnce).to.be.true;
    askBaseBranch.restore();
  });

  it('Branch diff without stack api flag, should prompt for stack api key', async function () {
    const askStackAPIKey = stub(interactive, 'askStackAPIKey').resolves(mockData.flags.stackAPIKey);
    new BranchDiffHandler(mockData.withoutAPIKeyFlag).validateMandatoryFlags();
    expect(askStackAPIKey.calledOnce).to.be.true;
    askStackAPIKey.restore();
  });

  it('Branch diff without module flag, should prompt for module', async function () {
    const askModule = stub(interactive, 'selectModule').resolves(mockData.flags.module);
    new BranchDiffHandler(mockData.withoutModuleFlag).validateMandatoryFlags();
    expect(askModule.calledOnce).to.be.true;
    askModule.restore();
  });

  it('Branch diff with global config, should take the base branch from config', async function () {
    const stubBranchConfig = stub(util, 'getbranchConfig').resolves(mockData.flags.baseBranch);
    delete mockData.flags.baseBranch;
    new BranchDiffHandler(mockData.flags).validateMandatoryFlags();
    expect(stubBranchConfig.calledOnce).to.be.true;
    stubBranchConfig.restore();
  });

  it('display content types summary', async function () {
    const parseSummaryStub = stub(branchDiffUtility, 'parseSummary');
    parseSummaryStub.withArgs(mockData.contentTypesDiff, 'main', 'dev').returns(mockData.branchSummary);
    const printSummaryStub = stub(branchDiffUtility, 'printSummary');
    printSummaryStub.withArgs(mockData.branchSummary).returns();
    new BranchDiffHandler(mockData.flags).displaySummary(mockData.contentTypesDiff, mockData.flags.module);
    parseSummaryStub.restore();
    printSummaryStub.restore();
  });

  it('display global fields summary', async function () {
    const parseSummaryStub = stub(branchDiffUtility, 'parseSummary');
    parseSummaryStub.withArgs(mockData.globalFieldDiff, 'main', 'dev').returns(mockData.branchSummary);
    const printSummaryStub = stub(branchDiffUtility, 'printSummary');
    printSummaryStub.withArgs(mockData.branchSummary).returns();
    mockData.flags.module = 'global_fields';
    new BranchDiffHandler(mockData.flags).displaySummary(mockData.globalFieldDiff, mockData.flags.module);
    parseSummaryStub.restore();
    printSummaryStub.restore();
  });

  it('display branch diff, compact text view', async function () {
    const parseCompactTextStub = stub(branchDiffUtility, 'parseCompactText');
    parseCompactTextStub.withArgs(mockData.contentTypesDiff).returns(mockData.branchCompactData);
    const printCompactTextViewStub = stub(branchDiffUtility, 'printCompactTextView');
    printCompactTextViewStub.withArgs(mockData.branchCompactData).returns();
    new BranchDiffHandler(mockData.flags).displayBranchDiffTextAndVerbose(
      mockData.contentTypesDiff,
      mockData.branchDiffPayload,
    );
    //expect(parseCompactTextStub.calledOnce).to.be.true;
    //expect(printCompactTextViewStub.calledOnce).to.be.true;
    parseCompactTextStub.restore();
    printCompactTextViewStub.restore();
  });

  it('display branch diff, detailedText view', async function () {
    const parseVerboseStub = stub(branchDiffUtility, 'parseVerbose');
    parseVerboseStub
      .withArgs(mockData.contentTypesDiff, mockData.branchDiffPayload)
      .resolves(mockData.verboseContentTypeRes);
    const printVerboseTextViewStub = stub(branchDiffUtility, 'printVerboseTextView');
    printVerboseTextViewStub.withArgs(mockData.verboseContentTypeRes).returns();
    mockData.flags.format = 'detailedText';
    new BranchDiffHandler(mockData.flags).displayBranchDiffTextAndVerbose(
      mockData.contentTypesDiff,
      mockData.branchDiffPayload,
    );
    parseVerboseStub.restore();
    printVerboseTextViewStub.restore();
  });

  it('BranchDiffHandler initBranchDiffUtility, content_types module', async function () {
    fetchBranchDiffStub.withArgs(mockData.branchDiffPayload).resolves(mockData.contentTypesDiff);
    filterBranchDiffDataByModuleStub.withArgs(mockData.contentTypesDiff).resolves(mockData.contentTypesDiffData);
    displaySummaryStub.withArgs(mockData.contentTypesDiff, mockData.flags.module).returns();
    const contentTypeVerbose = stub(BranchDiffHandler.prototype, 'displayBranchDiffTextAndVerbose');
    contentTypeVerbose.withArgs(mockData.contentTypesDiff, mockData.branchDiffPayload);
    new BranchDiffHandler(mockData.flags).initBranchDiffUtility();
    contentTypeVerbose.restore();
  });

  it('BranchDiffHandler initBranchDiffUtility, global_fields module', async function () {
    mockData.flags.module = 'global_fields';
    fetchBranchDiffStub.withArgs(mockData.branchDiffPayload).resolves(mockData.globalFieldDiff);
    filterBranchDiffDataByModuleStub.withArgs(mockData.globalFieldDiff).resolves(mockData.globalFieldsDiffData);
    displaySummaryStub.withArgs(mockData.globalFieldDiff, mockData.flags.module).returns();
    const globalFieldVerbose = stub(BranchDiffHandler.prototype, 'displayBranchDiffTextAndVerbose');
    globalFieldVerbose.withArgs(mockData.globalFieldDiff, mockData.branchDiffPayload);
    mockData.flags.module = 'global_fields';
    new BranchDiffHandler(mockData.flags).initBranchDiffUtility();
    globalFieldVerbose.restore();
  });

  it('execute BranchDiffHandler run method', async function () {
    const stub1 = stub(BranchDiffHandler.prototype, 'initBranchDiffUtility');
    const stub2 = stub(BranchDiffHandler.prototype, 'validateMandatoryFlags');
    new BranchDiffHandler(mockData.flags).run();
    stub1.restore();
    stub2.restore();
  });
});
