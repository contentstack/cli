import { describe, it } from 'mocha';
import { expect } from 'chai';
import { stub } from 'sinon';
import BranchDeleteCommand from '../../../../../src/commands/cm/branches/delete';
import { deleteBranchMockData } from '../../../mock/data';
import { interactive } from '../../../../../src/utils';

describe('Delete branch', () => {
  it('Delete branch with all flags, should be successful', async function () {
    const stub1 = stub(BranchDeleteCommand.prototype, 'run').resolves(deleteBranchMockData.flags);
    await BranchDeleteCommand.run([
      '--stack-api-key',
      deleteBranchMockData.flags.apiKey,
      '--uid',
      deleteBranchMockData.flags.uid,
      '-y',
    ]);
    expect(stub1.calledOnce).to.be.true;

    stub1.restore();
  });

  it('Should prompt when api key is not passed', async () => {
    const askStackAPIKey = stub(interactive, 'askStackAPIKey').resolves(deleteBranchMockData.flags.apiKey);
    await BranchDeleteCommand.run(['--uid', deleteBranchMockData.flags.uid, "--yes"]);
    expect(askStackAPIKey.calledOnce).to.be.true;
    askStackAPIKey.restore();
  });

  it('Should prompt when branch is not passed and also ask confirmation wihtout -y flag', async () => {
    const askSourceBranch = stub(interactive, 'askBranchUid').resolves(deleteBranchMockData.flags.uid);
    await BranchDeleteCommand.run(['--stack-api-key', deleteBranchMockData.flags.apiKey, "--yes"]);
    expect(askSourceBranch.calledOnce).to.be.true;
    askSourceBranch.restore();
  });

  it('Should ask branch name confirmation if yes not provided, success if same branch uid provided', async () => {
    const askConfirmation = stub(interactive, 'askBranchNameConfirmation').resolves(deleteBranchMockData.flags.uid);
    await BranchDeleteCommand.run([
      '--stack-api-key',
      deleteBranchMockData.flags.apiKey,
      '--uid',
      deleteBranchMockData.flags.uid
    ]);
    expect(askConfirmation.called).to.be.true;
    askConfirmation.restore();
  });
});
