import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import { stub, restore } from 'sinon';
import RemoveBranchConfigCommand from '../../../src/commands/config/remove/base-branch';
import { interactive } from '../../../src/utils';
import { removeConfigMockData } from '../mock';
import { cliux, configHandler } from '@contentstack/cli-utilities';

describe('Delete config', () => {
  const testApiKey = removeConfigMockData.flags.apiKey;
  const testBaseBranch = 'test-branch';

  beforeEach(() => {
    // Set up test config before each test
    configHandler.set(`baseBranch.${testApiKey}`, testBaseBranch);
  });

  afterEach(() => {
    // Clean up test config after each test
    try {
      configHandler.delete(`baseBranch.${testApiKey}`);
    } catch (error) {
      // Ignore if config doesn't exist
    }
    restore();
  });

  it('Delete config with all flags, should be successful', async function () {
    const successStub = stub(cliux, 'success');
    await RemoveBranchConfigCommand.run(['--stack-api-key', testApiKey, '-y']);

    // Verify that base branch and stack-api-key are displayed before deletion
    expect(successStub.called).to.be.true;
    const successCalls = successStub.getCalls();
    const messages = successCalls.map(call => call.args[0]);

    // Should show base branch and stack-api-key before deletion
    expect(messages.some(msg => msg.includes(`base branch : ${testBaseBranch}`))).to.be.true;
    expect(messages.some(msg => msg.includes(`stack-api-key: ${testApiKey}`))).to.be.true;
    // Should show success message after deletion
    expect(messages.some(msg => msg.includes('removed successfully'))).to.be.true;
  });

  it('Should prompt when api key is not passed', async () => {
    const askStackAPIKey = stub(interactive, 'askStackAPIKey').resolves(testApiKey);
    await RemoveBranchConfigCommand.run(['-y']);
    expect(askStackAPIKey.calledOnce).to.be.true;
  });

  it('Should throw an error if config doesnt exist', async () => {
    // Remove the config first
    configHandler.delete(`baseBranch.${testApiKey}`);

    const errorStub = stub(cliux, 'error');
    await RemoveBranchConfigCommand.run(['--stack-api-key', testApiKey]);

    expect(errorStub.calledOnce).to.be.true;
    expect(errorStub.getCalls()[0].args[0]).to.include(`No configuration found for stack API key: ${testApiKey}`);
  });

  it('Should ask for confirmation to remove config if the config exists', async () => {
    const askConfirmation = stub(interactive, 'askConfirmation').resolves(true);
    await RemoveBranchConfigCommand.run(['--stack-api-key', testApiKey]);

    expect(askConfirmation.calledOnce).to.be.true;
  });

  it('Should show base branch and stack-api-key before deletion', async () => {
    const successStub = stub(cliux, 'success');
    const askConfirmation = stub(interactive, 'askConfirmation').resolves(true);

    await RemoveBranchConfigCommand.run(['--stack-api-key', testApiKey]);

    const successCalls = successStub.getCalls();
    const messages = successCalls.map(call => call.args[0]);

    // Verify that base branch and stack-api-key are displayed
    expect(messages.some(msg => msg.includes(`base branch : ${testBaseBranch}`))).to.be.true;
    expect(messages.some(msg => msg.includes(`stack-api-key: ${testApiKey}`))).to.be.true;
  });

  it('Should show success message on deletion of config', async () => {
    const successStub = stub(cliux, 'success');
    const askConfirmation = stub(interactive, 'askConfirmation').resolves(true);

    await RemoveBranchConfigCommand.run(['--stack-api-key', testApiKey]);

    expect(askConfirmation.calledOnce).to.be.true;

    const successCalls = successStub.getCalls();
    const messages = successCalls.map(call => call.args[0]);

    // Should show success message after deletion
    expect(messages.some(msg => msg.includes('removed successfully'))).to.be.true;
  });

  it('Should not delete config if confirmation is rejected', async () => {
    const askConfirmation = stub(interactive, 'askConfirmation').resolves(false);
    const deleteStub = stub(configHandler, 'delete');

    await RemoveBranchConfigCommand.run(['--stack-api-key', testApiKey]);

    expect(askConfirmation.calledOnce).to.be.true;
    // delete should not be called if confirmation is rejected
    expect(deleteStub.called).to.be.false;

    deleteStub.restore();
  });
});
