import { describe, it } from 'mocha';
import { expect } from 'chai';
import { stub, assert } from 'sinon';
import DiffCommand from '../../../../../src/commands/cm/branches/diff';
import { BranchDiffHandler } from '../../../../../src/branch';
import { mockData } from '../../../mock/data';


describe('Diff Command', () => {
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
    stub1.restore();
  });

  it('Branch diff when format type is verbose, should display verbose view', async function () {
    const stub1 = stub(DiffCommand.prototype, 'run').resolves(mockData.verboseContentTypeRes);
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
      'verbose'
    ]);
    stub1.restore();
  }).timeout(10000);

  it('Branch summary when module is of both type(content_types & global fields)', async function () {
    const stub1 = stub(DiffCommand.prototype, 'run').resolves(mockData.data);
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
    stub1.restore();
  });
});
