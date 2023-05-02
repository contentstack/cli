import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import { stub, assert } from 'sinon';
import { cliux } from '@contentstack/cli-utilities';
import { mockData } from '../mock/data';
import { interactive } from '../../../src/utils';
import * as mergeHelper from '../../../src/utils/merge-helper';
import * as util from '../../../src/utils';
import * as diffUtility from '../../../src/utils/branch-diff-utility';
import { MergeHandler } from '../../../src/branch/index';

describe('Merge helper', () => {
  let successMessageStub;
  let successMessageStub2;
  beforeEach(function () {
    successMessageStub = stub(cliux, 'print');
    successMessageStub2 = stub(cliux, 'inquire');
  });
  afterEach(function () {
    successMessageStub.restore();
    successMessageStub2.restore();
  });

  it('Set up merge inputs', async function () {
    const mergeInputStub = stub(mergeHelper, 'setupMergeInputs').resolves(mockData.mergeData.flags);
    const result = await mergeHelper.setupMergeInputs(mockData.mergeData.flags);
    expect(mergeInputStub.calledOnce).to.be.true;
    expect(result).to.be.equal(mockData.mergeData.flags);
    mergeInputStub.restore();
  });

  it('Merge branch changes without stack api key, should prompt for stack api key', async function () {
    const askStackAPIKey = stub(interactive, 'askStackAPIKey').resolves(mockData.mergeData.flags['stack-api-key']);
    await mergeHelper.setupMergeInputs(mockData.mergeData.withoutAPIKeyFlag);
    expect(askStackAPIKey.calledOnce).to.be.true;
    askStackAPIKey.restore();
  });

  it('Merge branch changes without compare branch, should prompt for compare branch', async function () {
    const askCompareBranch = stub(interactive, 'askCompareBranch').resolves(mockData.mergeData.flags['compare-branch']);
    await mergeHelper.setupMergeInputs(mockData.mergeData.withoutCompareFlag);
    expect(askCompareBranch.calledOnce).to.be.true;
    askCompareBranch.restore();
  });

  it('Merge branch changes without base branch, should prompt for base branch', async function () {
    const askCompareBranch = stub(interactive, 'askBaseBranch').resolves(mockData.mergeData.flags['base-branch']);
    await mergeHelper.setupMergeInputs(mockData.mergeData.withoutBaseFlag);
    expect(askCompareBranch.calledOnce).to.be.true;
    askCompareBranch.restore();
  });

  it('Merge branch changes with global config, should take the base branch from config', async function () {
    const stubBranchConfig = stub(util, 'getbranchConfig').returns(mockData.flags.baseBranch);
    const result = await mergeHelper.setupMergeInputs(mockData.mergeData.withoutBaseFlag);
    expect(result).to.deep.equal(mockData.mergeData.flags);
    stubBranchConfig.restore();
  });

  it('Prepare Merge Request Payload', async function () {
    const payloadStub = stub(mergeHelper, 'prepareMergeRequestPayload').returns(mockData.mergePayload);
    const result = mergeHelper.prepareMergeRequestPayload(mockData.mergeSettings);
    expect(result).to.deep.equal(mockData.mergePayload);
    expect(payloadStub.calledOnce).to.be.true;
    payloadStub.restore();
  });

  describe('Display branch status', () => {
    let fetchBranchStub, filterByModuleStub, parseSummaryStub, printSummaryStub;
    beforeEach(function () {
      fetchBranchStub = stub(diffUtility, 'fetchBranchesDiff').resolves(mockData.allDiffData);
      filterByModuleStub = stub(diffUtility, 'filterBranchDiffDataByModule').returns(mockData.moduleWiseData);
      parseSummaryStub = stub(diffUtility, 'parseSummary').returns(mockData.branchSummary);
      printSummaryStub = stub(diffUtility, 'printSummary').returns();
    });
    afterEach(function () {
      fetchBranchStub.restore();
      filterByModuleStub.restore();
      parseSummaryStub.restore();
      printSummaryStub.restore();
    });

    it('Display branch status, format is compactText', async function () {
      const parseCompactTextStub = stub(diffUtility, 'parseCompactText').returns(mockData.branchCompactData);
      const printCompactTextViewStub = stub(diffUtility, 'printCompactTextView').returns();
      mockData.mergeData.flags.format = 'text';
      await mergeHelper.displayBranchStatus(mockData.mergeData.flags);
      parseCompactTextStub.restore();
      printCompactTextViewStub.restore();
    });

    it('Display branch status, format is detailedText', async function () {
      const parseVerboseStub = stub(diffUtility, 'parseVerbose').resolves(mockData.verboseContentTypeRes);
      const printCompactTextViewStub = stub(diffUtility, 'printVerboseTextView').returns();
      mockData.mergeData.flags.format = 'verbose';
      await mergeHelper.displayBranchStatus(mockData.mergeData.flags);
      parseVerboseStub.restore();
      printCompactTextViewStub.restore();
    });
  });

  describe('Display merge summary', () => {
    it('format is compactText', async function () {
      const mergeOptions = {
        format: 'text',
        compareData: mockData.mergeData.branchCompareData,
      };
      mergeHelper.displayMergeSummary(mergeOptions);
    });

    it('format is detailedText', async function () {
      const mergeOptions = {
        format: 'verbose',
        compareData: mockData.verboseContentTypeRes,
      };
      mergeHelper.displayMergeSummary(mergeOptions);
    });
  });

  describe('Execute merge', () => {
    let executeMergeRequestStub;
    beforeEach(function () {
      executeMergeRequestStub = stub(util, 'executeMergeRequest');
    });
    afterEach(function () {
      executeMergeRequestStub.restore();
    });
    it('status is complete', async function () {
      executeMergeRequestStub.resolves(mockData.mergeCompleteStatusRes);
      const result = await mergeHelper.executeMerge(mockData.mergeData.flags['stack-api-key'], mockData.mergePayload, 'dev16');
      expect(executeMergeRequestStub.calledOnce).to.be.true;
      expect(result).to.deep.equal(mockData.mergeCompleteStatusRes);
    });

    it('status is in progress', async function () {
      executeMergeRequestStub.resolves(mockData.mergeProgressStatusRes);
      const fetchMergeStatusStub = stub(mergeHelper, 'fetchMergeStatus').resolves(mockData.mergeCompleteStatusRes);
      const result = await mergeHelper.executeMerge(mockData.mergeData.flags['stack-api-key'], mockData.mergePayload, 'dev16');
      expect(result).to.deep.equal(mockData.mergeCompleteStatusRes);
      fetchMergeStatusStub.restore();
    });
  });

  describe('Fetch merge status', () => {
    let getMergeQueueStatusStub;
    beforeEach(function () {
      getMergeQueueStatusStub = stub(util, 'getMergeQueueStatus');
    });
    afterEach(function () {
      getMergeQueueStatusStub.restore();
    });
    it('status is complete', async function () {
      const res = { queue: [{ merge_details: mockData.mergeCompleteStatusRes.merge_details }] };
      getMergeQueueStatusStub.resolves(res);
      const result = await mergeHelper.fetchMergeStatus('', mockData.mergePayload);
      expect(getMergeQueueStatusStub.calledOnce).to.be.true;
      expect(result).to.deep.equal(mockData.mergeCompleteStatusRes);
    });

    it('status is in progress', async function () {
      const res = { queue: [{ merge_details: mockData.mergeProgressStatusRes.merge_details }] };
      getMergeQueueStatusStub.resolves(res);
      const fetchMergeStatusStub = stub(mergeHelper, 'fetchMergeStatus').resolves(mockData.mergeCompleteStatusRes);
      const result = await mergeHelper.fetchMergeStatus('',mockData.mergePayload);
      expect(result).to.deep.equal(mockData.mergeCompleteStatusRes);
      fetchMergeStatusStub.restore();
    });

    it('status is failed', async function () {
      const res = { queue: [{ merge_details: mockData.mergeFailedStatusRes.merge_details }] };
      getMergeQueueStatusStub.resolves(res);
      const result = await mergeHelper.fetchMergeStatus('',mockData.mergePayload).catch(err => err);
      expect(result).to.be.equal(`merge uid: ${mockData.mergePayload.uid}`);
    });

    it('No status', async function () {
      const res = { queue: [{ merge_details: mockData.mergeNoStatusRes.merge_details }] };
      getMergeQueueStatusStub.resolves(res);
      const result = await mergeHelper.fetchMergeStatus('',mockData.mergePayload).catch(err => err);
      expect(result).to.be.equal(`Invalid merge status found with merge ID ${mockData.mergePayload.uid}`);
    });

    it('Empty queue', async function () {
      const res = { queue: [] };
      getMergeQueueStatusStub.resolves(res);
      const result = await mergeHelper.fetchMergeStatus('',mockData.mergePayload).catch(err => err);
      expect(result).to.be.equal(`No queue found with merge ID ${mockData.mergePayload.uid}`);
    });
  });
});

describe('Merge Handler', () => {
  let successMessageStub,
  successMessageStub2,
  loaderMessageStub,
  errorMessageStub;
  beforeEach(function () {
    successMessageStub = stub(cliux, 'print');
    successMessageStub2 = stub(cliux, 'success');
    loaderMessageStub = stub(cliux, 'loader');
    errorMessageStub = stub(cliux, 'error');
  });
  afterEach(function () {
    successMessageStub.restore();
    successMessageStub2.restore();
    loaderMessageStub.restore();
    errorMessageStub.restore();
  });

  describe('Start', () =>{
    let collectMergeSettingsStub,
    displayMergeSummaryStub,
    selectMergeExecutionStub,
    mergeRequestStub,
    exportSummaryStub,
    executeMergeStub;
    beforeEach(function () {
      collectMergeSettingsStub = stub(MergeHandler.prototype, 'collectMergeSettings').resolves();
      displayMergeSummaryStub = stub(MergeHandler.prototype, 'displayMergeSummary').resolves();
      selectMergeExecutionStub = stub(interactive, 'selectMergeExecution');
      mergeRequestStub = stub(mergeHelper, 'prepareMergeRequestPayload').resolves(mockData.mergePayload);
      exportSummaryStub = stub(MergeHandler.prototype, 'exportSummary').resolves();
      executeMergeStub = stub(MergeHandler.prototype, 'executeMerge').resolves();
    });
    afterEach(function () {
      collectMergeSettingsStub.restore();
      displayMergeSummaryStub.restore();
      selectMergeExecutionStub.restore();
      mergeRequestStub.restore();
      exportSummaryStub.restore();
      executeMergeStub.restore();
    });

    it('ExecuteOption is export', async function () {
      selectMergeExecutionStub.resolves('export');
      new MergeHandler(mockData.mergeInputOptions).start();
    });

    it('ExecuteOption is execute', async function () {
      selectMergeExecutionStub.resolves('execute');
      new MergeHandler(mockData.mergeInputOptions).start();
    });

    it('ExecuteOption is both', async function () {
      selectMergeExecutionStub.resolves('both');
      new MergeHandler(mockData.mergeInputOptions).start();
    });
    
    it('Restart merge process', async function () {
      selectMergeExecutionStub.resolves('export');
      new MergeHandler(mockData.mergeInputOptions).restartMergeProcess();
    });
  });

  it('Export summary', async ()=> {
    const msg = 'Exported the summary successfully'
    const askExportMergeSummaryPathStub = stub(interactive, 'askExportMergeSummaryPath').resolves('abcd');
    const writeFileStub = stub(util, 'writeFile').resolves('done');
    successMessageStub2.callsFake(function () {
      return Promise.resolve(msg);
    });
    await new MergeHandler(mockData.mergeInputOptions).exportSummary(mockData.mergePayload);
    expect(successMessageStub2.calledOnce).to.be.true;
    askExportMergeSummaryPathStub.restore();
    writeFileStub.restore();
  });

  describe('Execute merge', () => {
    let askMergeCommentStub, executeMergeStub;
    beforeEach(function(){
      askMergeCommentStub = stub(interactive, 'askMergeComment').resolves('changes');
      executeMergeStub = stub(mergeHelper, 'executeMerge');
    });
    afterEach(function(){
      askMergeCommentStub.restore();
      executeMergeStub.restore();
    });
    
    it('Merged the changes successfully', async()=>{
      executeMergeStub.resolves(mockData.mergeCompleteStatusRes);
      await new MergeHandler(mockData.mergeInputOptions).executeMerge(mockData.mergePayload);
      expect(successMessageStub2.calledOnce).to.be.true;
    })

    it('Failed to merge the changes', async()=>{
      executeMergeStub.rejects('Failed to merge the changes');
      await new MergeHandler(mockData.mergeInputOptions).executeMerge(mockData.mergePayload);
      expect(errorMessageStub.calledOnce).to.be.true;
    })
  });

  describe('collect merge settings', () => {
    let selectMergeStrategyStub,
    strategySubOptionStub,
    displayMergeSummaryStub,
    selectMergeExecutionStub,
    restartMergeProcessStub;
    beforeEach(function(){
      selectMergeStrategyStub = stub(interactive, 'selectMergeStrategy');
      strategySubOptionStub = stub(interactive, 'selectMergeStrategySubOptions');
      displayMergeSummaryStub = stub(MergeHandler.prototype, 'displayMergeSummary').resolves();
      selectMergeExecutionStub = stub(interactive, 'selectMergeExecution');
      restartMergeProcessStub = stub(MergeHandler.prototype, 'restartMergeProcess').resolves();
    })
    afterEach(function(){
      selectMergeStrategyStub.restore();
      strategySubOptionStub.restore();
      displayMergeSummaryStub.restore();
      selectMergeExecutionStub.restore();
      restartMergeProcessStub.restore();
    })

    it('custom_preferences strategy, new strategySubOption', async() => {
      selectMergeStrategyStub.resolves('custom_preferences');
      const selectCustomPreferencesStub = stub(interactive, 'selectCustomPreferences').resolves();
      selectMergeExecutionStub.resolves("export");
      await new MergeHandler(mockData.mergeInputOptionsWithoutStartegy).collectMergeSettings();
      expect(selectMergeStrategyStub.calledOnce).to.be.true;
      selectCustomPreferencesStub.restore();
    });

    it('merge_prefer_base strategy, new strategySubOption', async() => {
      selectMergeStrategyStub.resolves('merge_prefer_base');
      strategySubOptionStub.resolves('new');
      selectMergeExecutionStub.resolves("export");
      await new MergeHandler(mockData.mergeInputOptionsWithoutStartegy).collectMergeSettings();
      expect(selectMergeStrategyStub.calledOnce).to.be.true;
      expect(strategySubOptionStub.calledOnce).to.be.true;
    });

    it('merge_prefer_base strategy, modified strategySubOption', async() => {
      selectMergeStrategyStub.resolves('merge_prefer_base');
      strategySubOptionStub.resolves('modified');
      selectMergeExecutionStub.resolves("export");
      await new MergeHandler(mockData.mergeInputOptionsWithoutStartegy).collectMergeSettings();
      expect(selectMergeStrategyStub.calledOnce).to.be.true;
      expect(strategySubOptionStub.calledOnce).to.be.true;
    });

    it('merge_prefer_base strategy, both strategySubOption', async() => {
      selectMergeStrategyStub.resolves('merge_prefer_base');
      strategySubOptionStub.resolves('both');
      selectMergeExecutionStub.resolves("export");
      await new MergeHandler(mockData.mergeInputOptionsWithoutStartegy).collectMergeSettings();
      expect(selectMergeStrategyStub.calledOnce).to.be.true;
      expect(strategySubOptionStub.calledOnce).to.be.true;
    });

    it('merge_prefer_compare strategy, new strategySubOption', async() => {
      selectMergeStrategyStub.resolves('merge_prefer_compare');
      strategySubOptionStub.resolves('new');
      selectMergeExecutionStub.resolves("export");
      await new MergeHandler(mockData.mergeInputOptionsWithoutStartegy).collectMergeSettings();
      expect(selectMergeStrategyStub.calledOnce).to.be.true;
      expect(strategySubOptionStub.calledOnce).to.be.true;
    });

    it('merge_prefer_compare strategy, modified strategySubOption', async() => {
      selectMergeStrategyStub.resolves('merge_prefer_compare');
      strategySubOptionStub.resolves('modified');
      selectMergeExecutionStub.resolves("export");
      await new MergeHandler(mockData.mergeInputOptionsWithoutStartegy).collectMergeSettings();
      expect(selectMergeStrategyStub.calledOnce).to.be.true;
      expect(strategySubOptionStub.calledOnce).to.be.true;
    });

    it('merge_prefer_compare strategy, both strategySubOption', async() => {
      selectMergeStrategyStub.resolves('merge_prefer_compare');
      strategySubOptionStub.resolves('both');
      selectMergeExecutionStub.resolves("export");
      await new MergeHandler(mockData.mergeInputOptionsWithoutStartegy).collectMergeSettings();
      expect(selectMergeStrategyStub.calledOnce).to.be.true;
      expect(strategySubOptionStub.calledOnce).to.be.true;
    });

    it('overwrite_with_compare strategy', async() => {
      selectMergeStrategyStub.resolves('overwrite_with_compare');
      selectMergeExecutionStub.resolves("export");
      await new MergeHandler(mockData.mergeInputOptionsWithoutStartegy).collectMergeSettings();
      expect(selectMergeStrategyStub.calledOnce).to.be.true;
    });

    it('Merge execution, previous', async() => {
      selectMergeStrategyStub.resolves('overwrite_with_compare');
      selectMergeExecutionStub.resolves("previous");
      await new MergeHandler(mockData.mergeInputOptionsWithoutStartegy).collectMergeSettings();
      expect(selectMergeStrategyStub.calledOnce).to.be.true;
    });
    
    it('Merge execution, restart', async() => {
      selectMergeStrategyStub.resolves('overwrite_with_compare');
      selectMergeExecutionStub.resolves("restart");
      await new MergeHandler(mockData.mergeInputOptionsWithoutStartegy).collectMergeSettings();
      expect(selectMergeStrategyStub.calledOnce).to.be.true;
    });

    it('merge_prefer_base strategy, previous strategySubOption', async() => {
      selectMergeStrategyStub.resolves('merge_prefer_base');
      strategySubOptionStub.resolves('previous');
      const stub1 = stub(MergeHandler.prototype, 'collectMergeSettings').resolves();
      await new MergeHandler(mockData.mergeInputOptionsWithoutStartegy).collectMergeSettings();
      stub1.restore();
    });

    it('merge_prefer_base strategy, previous strategySubOption', async() => {
      selectMergeStrategyStub.resolves('merge_prefer_base');
      strategySubOptionStub.resolves('restart');
      await new MergeHandler(mockData.mergeInputOptionsWithoutStartegy).collectMergeSettings();
      expect(selectMergeStrategyStub.calledOnce).to.be.true;
      expect(strategySubOptionStub.calledOnce).to.be.true;
    });
  })
});
