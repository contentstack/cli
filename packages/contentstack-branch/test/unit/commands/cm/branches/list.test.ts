import { describe, it } from 'mocha';
import { expect } from 'chai';
import { stub } from 'sinon';
import BranchListCommand from '../../../../../src/commands/cm/branches/index';
import { branchMockData } from '../../../mock/data';
import { interactive } from '../../../../../src/utils';
import { cliux } from '@contentstack/cli-utilities';

describe('List branches', () => {
  it('List branches with all flags, should be successful', async function () {
    const stub1 = stub(BranchListCommand.prototype, 'run').resolves(branchMockData.flags);
    const args = ['--stack-api-key', branchMockData.flags.apiKey];
    await BranchListCommand.run(args);
    expect(stub1.calledOnce).to.be.true;
    stub1.restore();
  });

  it('Should prompt when api key is not passed', async () => {
    const askStackAPIKey = stub(interactive, 'askStackAPIKey').resolves(branchMockData.flags.apiKey);
    await BranchListCommand.run([]);
    expect(askStackAPIKey.calledOnce).to.be.true;
    askStackAPIKey.restore();
  });
  
  it('branches with verbose flag, should list branches in table', async () => {
    const branchStub = stub(cliux, 'table').callsFake((branches) => {
      expect(branches).to.have.length.greaterThan(0);
    });
    await BranchListCommand.run(['-k', branchMockData.flags.apiKey, '--verbose']);
    branchStub.restore();
  });
  
  it('Branch diff when format type is verbose, should display verbose view', async function () {
    await BranchListCommand.run(['-k', branchMockData.flags.apiKey, '--verbose']);
  });
});
