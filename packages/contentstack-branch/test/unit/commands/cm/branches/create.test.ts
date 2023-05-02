import { describe, it } from 'mocha';
import { expect } from 'chai';
import { stub } from 'sinon';
import BranchCreateCommand from '../../../../../src/commands/cm/branches/create';
import { createBranchMockData } from '../../../mock/data';
import { interactive } from '../../../../../src/utils';

describe('Create branch', () => {
  it('Create branch with all flags, should be successful', async function () {
    const stub1 = stub(BranchCreateCommand.prototype, 'run').resolves(createBranchMockData.flags);
    const args = [
      '--stack-api-key',
      createBranchMockData.flags.apiKey,
      '--source',
      createBranchMockData.flags.source,
      '--uid',
      createBranchMockData.flags.uid,
    ];
    await BranchCreateCommand.run(args);
    expect(stub1.calledOnce).to.be.true;
    stub1.restore();
  });

  it('Should prompt when api key is not passed', async () => {
    const askStackAPIKey = stub(interactive, 'askStackAPIKey').resolves(createBranchMockData.flags.apiKey);
    await BranchCreateCommand.run([
      '--source',
      createBranchMockData.flags.source,
      '--uid',
      createBranchMockData.flags.uid,
    ]);
    expect(askStackAPIKey.calledOnce).to.be.true;
    askStackAPIKey.restore();
  });

  it('Should prompt when source branch is not passed', async () => {
    const askSourceBranch = stub(interactive, 'askSourceBranch').resolves(createBranchMockData.flags.source);
    await BranchCreateCommand.run([
      '--stack-api-key',
      createBranchMockData.flags.apiKey,
      '--uid',
      createBranchMockData.flags.uid,
    ]);
    expect(askSourceBranch.calledOnce).to.be.true;
    askSourceBranch.restore();
  });

  it('Should prompt when new branch uid is not passed', async () => {
    const askBranchUid = stub(interactive, 'askBranchUid').resolves(createBranchMockData.flags.uid);
    await BranchCreateCommand.run([
      '--stack-api-key',
      createBranchMockData.flags.apiKey,
      '--source',
      createBranchMockData.flags.source,
    ]);
    expect(askBranchUid.calledOnce).to.be.true;
    askBranchUid.restore();
  });
});
