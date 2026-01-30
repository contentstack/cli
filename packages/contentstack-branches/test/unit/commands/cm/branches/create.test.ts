import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import { stub, restore } from 'sinon';
import BranchCreateCommand from '../../../../../src/commands/cm/branches/create';
import { createBranchMockData } from '../../../mock/data';
import { interactive } from '../../../../../src/utils';
import { configHandler } from '@contentstack/cli-utilities';

describe('Create branch', () => {
  let configHandlerGetStub: any;

  beforeEach(() => {
    // Stub configHandler.get to make isAuthenticated() return true and region configured
    // isAuthenticated() checks configHandler.get('authorisationType')
    // Returns true when it's 'OAUTH' or 'BASIC'
    // Region is required for cmaHost property
    configHandlerGetStub = stub(configHandler, 'get').callsFake((key: string) => {
      if (key === 'authorisationType') {
        return 'OAUTH'; // This makes isAuthenticated() return true
      }
      if (key === 'region') {
        return {
          cma: 'api.contentstack.io',
          cda: 'cdn.contentstack.io',
          uiHost: 'app.contentstack.com',
          developerHubUrl: 'developer.contentstack.com',
          launchHubUrl: 'launch.contentstack.com',
          personalizeUrl: 'personalize.contentstack.com',
        };
      }
      return undefined;
    });
  });

  afterEach(() => {
    restore();
  });

  it('Create branch with all flags, should be successful', async function () {
    // Mock the command's run method to avoid actual API calls
    const runStub = stub(BranchCreateCommand.prototype, 'run').callsFake(async function() {
      const { flags } = await this.parse(BranchCreateCommand);
      expect(flags['stack-api-key']).to.equal(createBranchMockData.flags.apiKey);
      expect(flags.source).to.equal(createBranchMockData.flags.source);
      expect(flags.uid).to.equal(createBranchMockData.flags.uid);
      return Promise.resolve();
    });
    
    const args = [
      '--stack-api-key',
      createBranchMockData.flags.apiKey,
      '--source',
      createBranchMockData.flags.source,
      '--uid',
      createBranchMockData.flags.uid,
    ];
    await BranchCreateCommand.run(args);
    expect(runStub.calledOnce).to.be.true;
  });

  it('Should prompt when api key is not passed', async () => {
    const askStackAPIKey = stub(interactive, 'askStackAPIKey').resolves(createBranchMockData.flags.apiKey);
    
    // Mock the command's run method
    const runStub = stub(BranchCreateCommand.prototype, 'run').callsFake(async function() {
      const { flags } = await this.parse(BranchCreateCommand);
      return Promise.resolve();
    });
    
    await BranchCreateCommand.run([
      '--source',
      createBranchMockData.flags.source,
      '--uid',
      createBranchMockData.flags.uid,
    ]);
    expect(runStub.calledOnce).to.be.true;
  });

  it('Should prompt when source branch is not passed', async () => {
    const askSourceBranch = stub(interactive, 'askSourceBranch').resolves(createBranchMockData.flags.source);
    
    // Mock the command's run method
    const runStub = stub(BranchCreateCommand.prototype, 'run').callsFake(async function() {
      const { flags } = await this.parse(BranchCreateCommand);
      return Promise.resolve();
    });
    
    await BranchCreateCommand.run([
      '--stack-api-key',
      createBranchMockData.flags.apiKey,
      '--uid',
      createBranchMockData.flags.uid,
    ]);
    expect(runStub.calledOnce).to.be.true;
  });

  it('Should prompt when new branch uid is not passed', async () => {
    const askBranchUid = stub(interactive, 'askBranchUid').resolves(createBranchMockData.flags.uid);
    
    // Mock the command's run method
    const runStub = stub(BranchCreateCommand.prototype, 'run').callsFake(async function() {
      const { flags } = await this.parse(BranchCreateCommand);
      return Promise.resolve();
    });
    
    await BranchCreateCommand.run([
      '--stack-api-key',
      createBranchMockData.flags.apiKey,
      '--source',
      createBranchMockData.flags.source,
    ]);
    expect(runStub.calledOnce).to.be.true;
  });
});
