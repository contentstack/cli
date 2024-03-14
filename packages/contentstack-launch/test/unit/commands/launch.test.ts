//@ts-nocheck
import { describe, it } from 'mocha';
import { expect } from 'chai';
import { stub } from 'sinon';
import Launch from '../../../src/commands/launch/index';
import { GitHub, FileUpload } from '../../../src/adapters';
import { launchMockData } from '../mock/index';

describe('Launch', () => {
  describe('run', () => {
    it('Launch command github flow', async function () {
      const preCheckAndInitConfigStub = stub(Launch.prototype, 'preCheckAndInitConfig').resolves();
      const stub1 = stub(GitHub.prototype, 'run').resolves();
      const args = [
        '--config',
        './',
        '--type',
        'GitHub',
        '--name',
        launchMockData.flags.name,
        '--environment',
        launchMockData.flags.environment,
        '--branch',
        launchMockData.flags.branch,
        '--build-command',
        launchMockData.flags['build-command'],
        '--framework',
        launchMockData.flags.framework,
        '--org',
        launchMockData.flags.org,
        '--out-dir',
        launchMockData.flags['out-dir'],
        '--init',
      ];
      await Launch.run(args);
      expect(stub1.calledOnce).to.be.true;
      stub1.restore();
      preCheckAndInitConfigStub.restore();
    });

    it('Launch command file upload flow', async function () {
      const preCheckAndInitConfigStub = stub(Launch.prototype, 'preCheckAndInitConfig').resolves();
      const stub1 = stub(FileUpload.prototype, 'run').resolves();
      const args = [
        '--config',
        './',
        '--type',
        'FileUpload',
        '--name',
        launchMockData.flags.name,
        '--environment',
        launchMockData.flags.environment,
        '--branch',
        launchMockData.flags.branch,
        '--build-command',
        launchMockData.flags['build-command'],
        '--framework',
        launchMockData.flags.framework,
        '--org',
        launchMockData.flags.org,
        '--out-dir',
        launchMockData.flags['out-dir'],
        '--init',
      ];
      await Launch.run(args);
      expect(stub1.calledOnce).to.be.true;
      stub1.restore();
      preCheckAndInitConfigStub.restore();
    });
  });
});
