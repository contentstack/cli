import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import { stub, assert } from 'sinon';
import MergeCommand from '../../../../../src/commands/cm/branches/merge';
import { cliux } from '@contentstack/cli-utilities';
import { mockData } from '../../../mock/data';
import * as mergeHelper from '../../../../../src/utils/merge-helper';
import { MergeHandler } from '../../../../../src/branch/index';

describe('Merge Command', () => {
  let successMessageStub;
  beforeEach(function () {
    successMessageStub = stub(cliux, 'print');
  });
  afterEach(function () {
    successMessageStub.restore();
  });

  it('Merge branch changes with all flags, should be successful', async function () {
    const mergeInputStub = stub(mergeHelper, 'setupMergeInputs').resolves(mockData.mergeData.flags);
    const displayBranchStatusStub = stub(mergeHelper, 'displayBranchStatus').resolves(
      mockData.mergeData.branchCompareData,
    );
    const mergeHandlerStub = stub(MergeHandler.prototype, 'start').resolves();
    await MergeCommand.run([
      '--compare-branch',
      mockData.flags.compareBranch,
      '-k',
      mockData.flags.stackAPIKey,
      '--base-branch',
      mockData.flags.baseBranch,
    ]);
    expect(mergeHandlerStub.calledOnce).to.be.true;
    mergeInputStub.restore();
    displayBranchStatusStub.restore();
    mergeHandlerStub.restore();
  });
});

// commands
