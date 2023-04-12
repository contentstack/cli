import { describe, it } from 'mocha';
import { expect } from 'chai';
import { stub, assert } from 'sinon';
import DiffCommand from '../../../../../src/commands/cm/branches/diff';
import { BranchDiff } from '../../../../../src/branch/index';
import { interactive } from '../../../../../src/utils/index';
import { mockData } from '../../../mock/data';
import * as util from '../../../../../src/utils/index';

describe('Diff Command', () => {
  it('Branch diff with all flags, should be successful', async function () {
    const stub1 = stub(BranchDiff.prototype, 'run').resolves(mockData.data);
    await DiffCommand.run([
      '-c',
      mockData.flags.compareBranch,
      '-m',
      mockData.flags.module,
      '-k',
      mockData.flags.stackAPIKey,
      '-b',
      mockData.flags.baseBranch,
    ]);
    expect(stub1.calledOnce).to.be.true;
    stub1.restore();
  });

  it('Branch diff without compare branch flag, should prompt for compare branch', async function () {
    const askCompareBranch = stub(interactive, 'askCompareBranch').resolves(mockData.flags.compareBranch);
    await DiffCommand.run([
      '-m',
      mockData.flags.module,
      '-k',
      mockData.flags.stackAPIKey,
      '-b',
      mockData.flags.baseBranch,
    ]);
    expect(askCompareBranch.calledOnce).to.be.true;
    askCompareBranch.restore();
  });

  it('Branch diff without module flag, should prompt for module', async function () {
    const askModule = stub(interactive, 'selectModule').resolves(mockData.flags.module);
    await DiffCommand.run([
      '-c',
      mockData.flags.compareBranch,
      '-k',
      mockData.flags.stackAPIKey,
      '-b',
      mockData.flags.baseBranch,
    ]);
    expect(askModule.calledOnce).to.be.true;
    askModule.restore();
  });

  it('Branch diff without stack api key flag, should prompt for stack api key', async function () {
    const askStackAPIKey = stub(interactive, 'askStackAPIKey').resolves(mockData.flags.stackAPIKey);
    await DiffCommand.run([
      '-c',
      mockData.flags.compareBranch,
      '-m',
      mockData.flags.module,
      '-b',
      mockData.flags.baseBranch,
    ]);
    expect(askStackAPIKey.calledOnce).to.be.true;
    askStackAPIKey.restore();
  });

  it('Branch diff without base branch flag and no global config, should prompt for base branch', async function () {
    const askBaseBranch = stub(interactive, 'askBaseBranch').resolves(mockData.flags.baseBranch);
    await DiffCommand.run([
      '-c',
      mockData.flags.compareBranch,
      '-m',
      mockData.flags.module,
      '-k',
      mockData.flags.stackAPIKey,
    ]);
    expect(askBaseBranch.calledOnce).to.be.true;
    askBaseBranch.restore();
  });

  it('Branch diff when format type is verbose, should display verbose view', async function () {
    await DiffCommand.run([
      '-c',
      mockData.flags.compareBranch,
      '-b',
      mockData.flags.baseBranch,
      '-m',
      mockData.flags.module,
      '-k',
      mockData.flags.stackAPIKey,
      '--format',
      'verbose'
    ]);
  }).timeout(10000);

  it('Branch summary when module is of both type(content_types & global fields)', async function () {
    await DiffCommand.run([
      '-c',
      mockData.flags.compareBranch,
      '-b',
      mockData.flags.baseBranch,
      '-m',
      'both',
      '-k',
      mockData.flags.stackAPIKey
    ]);
  });

  it('Branch diff with global config, should take the base branch from config', async function () {
    const stubBranchConfig = stub(util, 'getbranchConfig').resolves(mockData.flags.baseBranch);
    await DiffCommand.run([
      '-c',
      mockData.flags.compareBranch,
      '-m',
      mockData.flags.module,
      '-k',
      mockData.flags.stackAPIKey,
    ]);
    expect(stubBranchConfig.calledOnce).to.be.true;
    stubBranchConfig.restore();
  });

  it('Branch diff without any flags, should prompt for compare branch, module ', async function () {
    const askCompareBranch = stub(interactive, 'askCompareBranch').resolves(mockData.flags.compareBranch);
    const askStackAPIKey = stub(interactive, 'askStackAPIKey').resolves(mockData.flags.stackAPIKey);
    const askModule = stub(interactive, 'selectModule').resolves(mockData.flags.module);
    const askBaseBranch = stub(interactive, 'askBaseBranch').resolves(mockData.flags.baseBranch);
    await DiffCommand.run([]);
    expect(askModule.calledOnce).to.be.true;
    expect(askCompareBranch.calledOnce).to.be.true;
    expect(askStackAPIKey.calledOnce).to.be.true;
    expect(askBaseBranch.calledOnce).to.be.true;
    askModule.restore();
    askStackAPIKey.restore();
    askCompareBranch.restore();
    askBaseBranch.restore();
  });

  //testcases for error -> 1 pending
});
