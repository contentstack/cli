import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import { stub, restore } from 'sinon';
import DiffCommand from '../../../../../src/commands/cm/branches/diff';
import { BranchDiffHandler } from '../../../../../src/branch';
import { mockData } from '../../../mock/data';
import { configHandler } from '@contentstack/cli-utilities';

describe('Diff Command', () => {
  beforeEach(() => {
    // Stub configHandler.get to make isAuthenticated() return true and region configured
    // isAuthenticated() checks configHandler.get('authorisationType')
    // Returns true when it's 'OAUTH' or 'BASIC'
    // Region is required for cmaHost property
    stub(configHandler, 'get').callsFake((key: string) => {
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

  it('Branch diff with all flags, should be successful', async function () {
    const stub1 = stub(BranchDiffHandler.prototype, 'run').resolves(mockData.data);
    await DiffCommand.run([
      '--compare-branch',
      mockData.flags.compareBranch,
      '--module',
      mockData.flags.module,
      '-k',
      mockData.flags.stackAPIKey,
      '--base-branch',
      mockData.flags.baseBranch,
    ]);
    expect(stub1.calledOnce).to.be.true;
  });

  it('Branch diff when format type is verbose, should display verbose view', async function () {
    const stub1 = stub(DiffCommand.prototype, 'run').callsFake(async function() {
      const { flags } = await this.parse(DiffCommand);
      return Promise.resolve(mockData.verboseContentTypeRes);
    });
    await DiffCommand.run([
      '--compare-branch',
      mockData.flags.compareBranch,
      '--base-branch',
      mockData.flags.baseBranch,
      '--module',
      mockData.flags.module,
      '-k',
      mockData.flags.stackAPIKey,
      '--format',
      'detailed-text'
    ]);
    expect(stub1.calledOnce).to.be.true;
  }).timeout(10000);

  it('Branch summary when module is of both type(content_types & global fields)', async function () {
    const stub1 = stub(DiffCommand.prototype, 'run').callsFake(async function() {
      const { flags } = await this.parse(DiffCommand);
      return Promise.resolve(mockData.data);
    });
    await DiffCommand.run([
      '--compare-branch',
      mockData.flags.compareBranch,
      '--base-branch',
      mockData.flags.baseBranch,
      '--module',
      'all',
      '-k',
      mockData.flags.stackAPIKey
    ]);
    expect(stub1.calledOnce).to.be.true;
  });
});
