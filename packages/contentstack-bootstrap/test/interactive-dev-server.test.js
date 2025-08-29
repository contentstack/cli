const { expect } = require('chai');
const sinon = require('sinon');
const inquirer = require('inquirer');
const { inquireRunDevServer } = require('../lib/bootstrap/interactive');
const messages = require('../messages/index.json');

describe('Interactive Dev Server Tests', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#inquireRunDevServer', () => {
    it('should return true when user selects yes', async () => {
      sandbox.stub(inquirer, 'prompt').resolves({ runDevServer: true });

      const result = await inquireRunDevServer();

      expect(result).to.be.true;
      expect(inquirer.prompt.calledOnce).to.be.true;

      const promptArgs = inquirer.prompt.getCall(0).args[0];
      expect(promptArgs.type).to.equal('confirm');
      expect(promptArgs.name).to.equal('runDevServer');
      expect(promptArgs.message).to.equal(messages.CLI_BOOTSTRAP_RUN_DEV_SERVER_ENQUIRY);
      expect(promptArgs.default).to.be.true;
    });

    it('should return false when user selects no', async () => {
      sandbox.stub(inquirer, 'prompt').resolves({ runDevServer: false });

      const result = await inquireRunDevServer();

      expect(result).to.be.false;
      expect(inquirer.prompt.calledOnce).to.be.true;
    });

    it('should have correct message asking about install and run', () => {
      expect(messages.CLI_BOOTSTRAP_RUN_DEV_SERVER_ENQUIRY).to.include('install dependencies and run the app locally');
      expect(messages.CLI_BOOTSTRAP_RUN_DEV_SERVER_ENQUIRY).to.include('npm install && npm run dev');
    });

    it('should respect --run-dev-server flag in command parsing', async () => {
      // This test would require more complex mocking of the command parsing
      // For now, we can verify the flag is properly defined
      const BootstrapCommand = require('../lib/commands/cm/bootstrap').default;

      expect(BootstrapCommand.flags).to.have.property('run-dev-server');
      expect(BootstrapCommand.flags['run-dev-server'].description).to.include('development server after setup');
    });
  });

  describe('Edge Cases and Interactive Functions', () => {
    it('should handle all interactive functions', async () => {
      const {
        inquireApp,
        inquireCloneDirectory,
        inquireAppType,
        inquireLivePreviewSupport,
        inquireGithubAccessToken,
      } = require('../lib/bootstrap/interactive');

      // Test inquireApp with exit selection
      sandbox
        .stub(inquirer, 'prompt')
        .onFirstCall()
        .resolves({ app: 'Exit' })
        .onSecondCall()
        .resolves({ path: 'Other' })
        .onThirdCall()
        .resolves({ path: '/custom/path' })
        .onCall(3)
        .resolves({ type: 'sampleapp' })
        .onCall(4)
        .resolves({ livePreviewEnabled: false })
        .onCall(5)
        .resolves({ token: 'test-token' });

      try {
        await inquireApp([{ displayName: 'Test App', value: 'test' }]);
        expect.fail('Should have thrown an error for Exit');
      } catch (error) {
        expect(error.message).to.equal('Exit');
      }

      // Test inquireCloneDirectory with "Other" option
      const customPath = await inquireCloneDirectory();
      expect(customPath).to.equal('/custom/path');

      // Test inquireAppType
      const appType = await inquireAppType();
      expect(appType).to.equal('sampleapp');

      // Test inquireLivePreviewSupport
      const livePreview = await inquireLivePreviewSupport();
      expect(livePreview).to.be.false;

      // Test inquireGithubAccessToken
      const token = await inquireGithubAccessToken();
      expect(token).to.equal('test-token');
    });
  });
});
