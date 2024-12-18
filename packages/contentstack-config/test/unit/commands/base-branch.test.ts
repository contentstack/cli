import { expect } from 'chai';
import { stub } from 'sinon';
import { configHandler } from '@contentstack/cli-utilities';
import BranchGetCommand from '../../../src/commands/config/get/base-branch';
import BranchSetCommand from '../../../src/commands/config/set/base-branch';
import { cliux } from '@contentstack/cli-utilities';
import { setConfigMockData } from '../mock/index';
import { interactive } from '../../../src/utils/index';
import { askBaseBranch, askConfirmation, askStackAPIKey } from '../../../src/utils/interactive';
import * as sinon from 'sinon';

const config = configHandler;
describe('base-branch command', function () {
  it('Set base-branch: with all flags, should be successful', async function () {
    const stub1 = stub(BranchSetCommand.prototype, 'run');
    const args = [
      '--stack-api-key',
      setConfigMockData.flags.apiKey,
      '--base-branch',
      setConfigMockData.flags.baseBranch,
    ];
    await BranchSetCommand.run(args);
    expect(stub1.calledOnce).to.be.true;
    stub1.restore();
  });

  it('Set base-branch: should prompt when api key is not passed', async () => {
    const askStackAPIKey = stub(interactive, 'askStackAPIKey').resolves(setConfigMockData.flags.apiKey);
    await BranchSetCommand.run(['--base-branch', setConfigMockData.flags.baseBranch]);
    expect(askStackAPIKey.calledOnce).to.be.true;
    askStackAPIKey.restore();
  });

  it('Set base-branch: should prompt when base-branch is not passed', async () => {
    const askBaseBranch = stub(interactive, 'askBaseBranch').resolves(setConfigMockData.flags.baseBranch);
    await BranchSetCommand.run(['--stack-api-key', setConfigMockData.flags.apiKey]);
    expect(askBaseBranch.calledOnce).to.be.true;
    askBaseBranch.restore();
  });

  it('Set base-branch: should check if config value is set properly', async function () {
    await BranchSetCommand.run([
      '--stack-api-key',
      setConfigMockData.flags.apiKey,
      '--base-branch',
      setConfigMockData.flags.baseBranch,
    ]);
    config.set(`baseBranch.${setConfigMockData.flags.apiKey}`, setConfigMockData.flags.baseBranch);
    expect(config.get(`baseBranch.${setConfigMockData.flags.apiKey}`)).to.be.equal('test');
  });

  it('Get base-branch: should print base-branch', async function () {
    const branchStub = stub(cliux, 'table').callsFake(() => {});
    await BranchGetCommand.run([]);
    expect(branchStub.calledOnce).to.be.true;
    branchStub.restore();
  });
});

describe('Base Branch Handler', function () {
  let inquireStub;
  beforeEach(function () {
    inquireStub = sinon.stub(cliux, 'inquire');
  });
  afterEach(function () {
    inquireStub.restore();
  });

  it('askStackAPIKey should return API key', async function () {
    inquireStub.returns(Promise.resolve('dummy-api-key'));
    const result = await askStackAPIKey();
    expect(result).to.equal('dummy-api-key');
  });

  it('askBaseBranch should return base branch', async function () {
    inquireStub.returns(Promise.resolve('main'));
    const result = await askBaseBranch();
    expect(result).to.equal('main');
  });
  it('should return true when confirmed', async function () {
    inquireStub.returns(Promise.resolve(true));
    const result = await askConfirmation();
    expect(result).to.be.true;
  });

  it('should return false when not confirmed', async function () {
    inquireStub.returns(Promise.resolve(false));
    const result = await askConfirmation();
    expect(result).to.be.false;
  });
});
