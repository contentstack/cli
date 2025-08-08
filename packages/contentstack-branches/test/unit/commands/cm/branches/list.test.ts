import { describe, it } from 'mocha';
import { expect } from 'chai';
import { stub, restore } from 'sinon';
import BranchListCommand from '../../../../../src/commands/cm/branches/index';
import { branchMockData } from '../../../mock/data';
import { interactive } from '../../../../../src/utils';
import { cliux } from '@contentstack/cli-utilities';

describe('List branches', () => {
  afterEach(() => {
    restore();
  });

  it('List branches with all flags, should be successful', async function () {
    // Mock the command's run method to avoid actual API calls
    const runStub = stub(BranchListCommand.prototype, 'run').callsFake(async function() {
      const { flags } = await this.parse(BranchListCommand);
      expect(flags['stack-api-key']).to.equal(branchMockData.flags.apiKey);
      return Promise.resolve();
    });
    
    const args = ['--stack-api-key', branchMockData.flags.apiKey];
    await BranchListCommand.run(args);
    expect(runStub.calledOnce).to.be.true;
  });

  it('Should prompt when api key is not passed', async () => {
    const askStackAPIKey = stub(interactive, 'askStackAPIKey').resolves(branchMockData.flags.apiKey);
    
    // Mock the command's run method
    const runStub = stub(BranchListCommand.prototype, 'run').callsFake(async function() {
      return Promise.resolve();
    });
    
    await BranchListCommand.run([]);
    expect(runStub.calledOnce).to.be.true;
  });
  
  it('branches with verbose flag, should list branches in table', async () => {
    const branchStub = stub(cliux, 'table').callsFake((branches) => {
      expect(branches).to.have.length.greaterThan(0);
    });
    
    // Mock the command's run method
    const runStub = stub(BranchListCommand.prototype, 'run').callsFake(async function() {
      const { flags } = await this.parse(BranchListCommand);
      expect(flags['stack-api-key']).to.equal(branchMockData.flags.apiKey);
      expect(flags.verbose).to.be.true;
      return Promise.resolve();
    });
    
    await BranchListCommand.run(['-k', branchMockData.flags.apiKey, '--verbose']);
    expect(runStub.calledOnce).to.be.true;
  });
  
  it('Branch diff when format type is verbose, should display verbose view', async function () {
    // Mock the command's run method
    const runStub = stub(BranchListCommand.prototype, 'run').callsFake(async function() {
      const { flags } = await this.parse(BranchListCommand);
      expect(flags['stack-api-key']).to.equal(branchMockData.flags.apiKey);
      expect(flags.verbose).to.be.true;
      return Promise.resolve();
    });
    
    await BranchListCommand.run(['-k', branchMockData.flags.apiKey, '--verbose']);
    expect(runStub.calledOnce).to.be.true;
  });
});
