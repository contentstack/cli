import { describe, it } from 'mocha';
import { expect } from 'chai';
import { stub } from 'sinon';
import RemoveBranchConfigCommand from '../../../src/commands/config/remove/base-branch';
import { interactive } from '../../../src/utils';
import { removeConfigMockData } from '../mock';
import { cliux, configHandler } from '@contentstack/cli-utilities';

describe('Delete config', () => {
  it('Delete config with all flags, should be successful', async function () {
    const stub1 = stub(RemoveBranchConfigCommand.prototype, 'run');
    await RemoveBranchConfigCommand.run(['--stack-api-key', removeConfigMockData.flags.apiKey, '-y']);
    expect(stub1.calledOnce).to.be.true;
    stub1.restore();
  });
  it('Should prompt when api key is not passed', async () => {
    const askStackAPIKey = stub(interactive, 'askStackAPIKey').resolves(removeConfigMockData.flags.apiKey);
    await RemoveBranchConfigCommand.run(['-y']);
    expect(askStackAPIKey.calledOnce).to.be.true;
    askStackAPIKey.restore();
  });
  it('Should throw an error if config doesnt exist', async () => {
    const config = configHandler;
    const getConfig = config.get(`baseBranch.${removeConfigMockData.flags.apiKey}`);

    const throwError = stub(cliux, 'error');
    await RemoveBranchConfigCommand.run(['--stack-api-key', removeConfigMockData.flags.apiKey]);
    if (getConfig === undefined) expect(throwError.calledOnce).to.be.true;
    throwError.restore();
  });
  it('Should ask for confirmation to remove config if the config exists', async () => {
    const config = configHandler;
    const getConfig = config.get(`baseBranch.${removeConfigMockData.flags.apiKey}`);

    const askConfirmation = stub(interactive, 'askConfirmation');
    await RemoveBranchConfigCommand.run(['--stack-api-key', removeConfigMockData.flags.apiKey]);
    if (getConfig) expect(askConfirmation.calledOnce).to.be.true;
    askConfirmation.restore();
  });
  it('Should show success message on deletion of config', async () => {
    const config = configHandler;
    const getConfig = config.get(`baseBranch.${removeConfigMockData.flags.apiKey}`);

    const askConfirmation = stub(interactive, 'askConfirmation');
    const showSuccess = stub(cliux, 'success');
    await RemoveBranchConfigCommand.run(['--stack-api-key', removeConfigMockData.flags.apiKey]);
    if (getConfig && askConfirmation.calledOnce) expect(showSuccess.calledOnce).to.be.true;
    askConfirmation.restore();
  });
});
