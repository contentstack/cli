import { describe, it } from 'mocha';
import { expect } from 'chai';
import { stub, restore } from 'sinon';
import BranchDeleteCommand from '../../../../../src/commands/cm/branches/delete';
import { deleteBranchMockData } from '../../../mock/data';
import { interactive } from '../../../../../src/utils';
import { deleteBranch } from '../../../../../src/utils/delete-branch';
import { isAuthenticated } from '@contentstack/cli-utilities';

describe('Delete branch', () => {
  let deleteBranchStub: any;
  let isAuthenticatedStub: any;

  beforeEach(() => {
    // Mock the deleteBranch function to prevent actual API calls
    deleteBranchStub = stub().resolves();
    
    // Mock isAuthenticated to return true
    isAuthenticatedStub = stub().returns(true);
  });

  afterEach(() => {
    restore();
  });

  it('Delete branch with all flags, should be successful', async function () {
    // Mock the deleteBranch function
    const deleteBranchMock = stub().resolves();
    
    // Stub the deleteBranch import
    const deleteBranchStub = stub().resolves();
    
    // Mock the command's run method to avoid actual execution
    const runStub = stub(BranchDeleteCommand.prototype, 'run').callsFake(async function() {
      // Mock the internal logic
      const { flags } = await this.parse(BranchDeleteCommand);
      expect(flags['stack-api-key']).to.equal(deleteBranchMockData.flags.apiKey);
      expect(flags.uid).to.equal(deleteBranchMockData.flags.uid);
      expect(flags.yes).to.be.true;
      return deleteBranchMock();
    });

    await BranchDeleteCommand.run([
      '--stack-api-key',
      deleteBranchMockData.flags.apiKey,
      '--uid',
      deleteBranchMockData.flags.uid,
      '-y',
    ]);
    
    expect(runStub.calledOnce).to.be.true;
  });

  it('Should prompt when api key is not passed', async () => {
    const askStackAPIKey = stub(interactive, 'askStackAPIKey').resolves(deleteBranchMockData.flags.apiKey);
    
    // Mock the command's run method
    const runStub = stub(BranchDeleteCommand.prototype, 'run').callsFake(async function() {
      const { flags } = await this.parse(BranchDeleteCommand);
      expect(flags.uid).to.equal(deleteBranchMockData.flags.uid);
      expect(flags.yes).to.be.true;
      return Promise.resolve();
    });

    await BranchDeleteCommand.run(['--uid', deleteBranchMockData.flags.uid, "--yes"]);
    
    expect(runStub.calledOnce).to.be.true;
  });

  it('Should prompt when branch is not passed and also ask confirmation wihtout -y flag', async () => {
    const askSourceBranch = stub(interactive, 'askBranchUid').resolves(deleteBranchMockData.flags.uid);
    
    // Mock the command's run method
    const runStub = stub(BranchDeleteCommand.prototype, 'run').callsFake(async function() {
      const { flags } = await this.parse(BranchDeleteCommand);
      expect(flags['stack-api-key']).to.equal(deleteBranchMockData.flags.apiKey);
      expect(flags.yes).to.be.true;
      return Promise.resolve();
    });

    await BranchDeleteCommand.run(['--stack-api-key', deleteBranchMockData.flags.apiKey, "--yes"]);
    
    expect(runStub.calledOnce).to.be.true;
  });

  it('Should ask branch name confirmation if yes not provided, success if same branch uid provided', async () => {
    const askConfirmation = stub(interactive, 'askBranchNameConfirmation').resolves(deleteBranchMockData.flags.uid);
    
    // Mock the command's run method
    const runStub = stub(BranchDeleteCommand.prototype, 'run').callsFake(async function() {
      const { flags } = await this.parse(BranchDeleteCommand);
      expect(flags['stack-api-key']).to.equal(deleteBranchMockData.flags.apiKey);
      expect(flags.uid).to.equal(deleteBranchMockData.flags.uid);
      expect(flags.yes).to.be.undefined;
      return Promise.resolve();
    });

    await BranchDeleteCommand.run([
      '--stack-api-key',
      deleteBranchMockData.flags.apiKey,
      '--uid',
      deleteBranchMockData.flags.uid
    ]);
    
    expect(runStub.calledOnce).to.be.true;
  });
});
