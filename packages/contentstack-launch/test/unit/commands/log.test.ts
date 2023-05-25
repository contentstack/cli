import { describe, it } from 'mocha';
import { expect } from 'chai';
import { stub } from 'sinon';
import Logs from '../../../src/commands/launch/logs';
import { logsMockData } from '../mock/index';

describe('Log command, github flow', () => {
  it('Log command with all flags, should be successful', async function () {
    const logPollingAndInitConfigStub = stub(Logs.prototype, 'logPollingAndInitConfig').resolves();
    const stub1 = stub(Logs.prototype, 'run');
    const args = [
      '--config',
      './',
      '--type',
      'd',
      '--environment',
      logsMockData.flags.environment,
      '--deployment',
      logsMockData.flags.deployment,
    ];

    await Logs.run(args);
    expect(stub1.calledOnce).to.be.true;
    stub1.restore();
    logPollingAndInitConfigStub.restore();
  });
});
