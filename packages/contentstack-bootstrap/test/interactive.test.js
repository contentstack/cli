const { expect } = require('chai');
const sinon = require('sinon');
import inquirer from 'inquirer';
const {
  inquireApp,
  inquireCloneDirectory,
  inquireAppType,
  inquireLivePreviewSupport,
  inquireRunDevServer,
  inquireGithubAccessToken,
  continueBootstrapCommand,
} = require('../lib/bootstrap/interactive');
const messages = require('../messages/index.json');

describe('Interactive Functions Tests', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#inquireApp', () => {
    it('should return selected app when user selects an app', async () => {
      const mockApps = [
        { displayName: 'React.js Starter', configKey: 'reactjs-starter' },
        { displayName: 'Next.js Starter', configKey: 'nextjs-starter' },
      ];
      const selectedApp = mockApps[0];

      sandbox.stub(inquirer, 'prompt').resolves({ app: selectedApp });

      const result = await inquireApp(mockApps);

      expect(result).to.equal(selectedApp);
      expect(inquirer.prompt.calledOnce).to.be.true;

      const promptArgs = inquirer.prompt.getCall(0).args[0];
      expect(promptArgs[0].type).to.equal('list');
      expect(promptArgs[0].name).to.equal('app');
      expect(promptArgs[0].message).to.equal(messages.CLI_BOOTSTRAP_APP_SELECTION_ENQUIRY);
      expect(promptArgs[0].choices).to.include('Exit');
      expect(promptArgs[0].choices.length).to.equal(mockApps.length + 1);
    });

    it('should throw error when user selects Exit', async () => {
      const mockApps = [
        { displayName: 'React.js Starter', configKey: 'reactjs-starter' },
      ];

      sandbox.stub(inquirer, 'prompt').resolves({ app: 'Exit' });
      sandbox.stub(require('@contentstack/cli-utilities').cliux, 'print');

      try {
        await inquireApp(mockApps);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Exit');
      }
    });

    it('should format apps correctly for display', async () => {
      const mockApps = [
        { displayName: 'App 1', configKey: 'app1' },
        { displayName: 'App 2', configKey: 'app2' },
      ];

      sandbox.stub(inquirer, 'prompt').resolves({ app: mockApps[0] });

      await inquireApp(mockApps);

      const promptArgs = inquirer.prompt.getCall(0).args[0];
      const choices = promptArgs[0].choices;

      // Verify that apps are formatted correctly
      expect(choices[0]).to.have.property('name', 'App 1');
      expect(choices[0]).to.have.property('value', mockApps[0]);
      expect(choices[1]).to.have.property('name', 'App 2');
      expect(choices[1]).to.have.property('value', mockApps[1]);
    });
  });

  describe('#inquireCloneDirectory', () => {
    it('should return current working directory when Current Folder is selected', async () => {
      sandbox.stub(inquirer, 'prompt').resolves({ path: 'Current Folder' });

      const result = await inquireCloneDirectory();

      expect(result).to.equal(process.cwd());
      expect(inquirer.prompt.calledOnce).to.be.true;
    });

    it('should prompt for custom path when Other is selected', async () => {
      const customPath = '/custom/path/to/project';
      sandbox
        .stub(inquirer, 'prompt')
        .onFirstCall()
        .resolves({ path: 'Other' })
        .onSecondCall()
        .resolves({ path: customPath });
      const pathValidatorStub = sandbox.stub(require('@contentstack/cli-utilities'), 'pathValidator').returns(customPath);

      const result = await inquireCloneDirectory();

      expect(result).to.equal(customPath);
      expect(inquirer.prompt.calledTwice).to.be.true;
      expect(pathValidatorStub.calledOnce).to.be.true;
    });

    it('should validate custom path using pathValidator', async () => {
      const rawPath = '/some/path';
      const validatedPath = '/validated/path';
      sandbox
        .stub(inquirer, 'prompt')
        .onFirstCall()
        .resolves({ path: 'Other' })
        .onSecondCall()
        .resolves({ path: rawPath });
      const pathValidatorStub = sandbox.stub(require('@contentstack/cli-utilities'), 'pathValidator').returns(validatedPath);

      const result = await inquireCloneDirectory();

      expect(pathValidatorStub.calledWith(rawPath)).to.be.true;
      expect(result).to.equal(validatedPath);
    });
  });

  describe('#inquireAppType', () => {
    it('should return sampleapp when Sample App is selected', async () => {
      sandbox.stub(inquirer, 'prompt').resolves({ type: 'sampleapp' });

      const result = await inquireAppType();

      expect(result).to.equal('sampleapp');
      expect(inquirer.prompt.calledOnce).to.be.true;

      const promptArgs = inquirer.prompt.getCall(0).args[0];
      expect(promptArgs[0].type).to.equal('list');
      expect(promptArgs[0].name).to.equal('type');
      expect(promptArgs[0].message).to.equal(messages.CLI_BOOTSTRAP_TYPE_OF_APP_ENQUIRY);
      expect(promptArgs[0].choices).to.have.length(2);
      expect(promptArgs[0].choices[0].value).to.equal('sampleapp');
      expect(promptArgs[0].choices[1].value).to.equal('starterapp');
    });

    it('should return starterapp when Starter App is selected', async () => {
      sandbox.stub(inquirer, 'prompt').resolves({ type: 'starterapp' });

      const result = await inquireAppType();

      expect(result).to.equal('starterapp');
    });
  });

  describe('#inquireLivePreviewSupport', () => {
    it('should return true when user confirms live preview', async () => {
      sandbox.stub(inquirer, 'prompt').resolves({ livePreviewEnabled: true });

      const result = await inquireLivePreviewSupport();

      expect(result).to.be.true;
      expect(inquirer.prompt.calledOnce).to.be.true;

      const promptArgs = inquirer.prompt.getCall(0).args[0];
      expect(promptArgs.type).to.equal('confirm');
      expect(promptArgs.name).to.equal('livePreviewEnabled');
      expect(promptArgs.message).to.equal('Enable live preview?');
    });

    it('should return false when user denies live preview', async () => {
      sandbox.stub(inquirer, 'prompt').resolves({ livePreviewEnabled: false });

      const result = await inquireLivePreviewSupport();

      expect(result).to.be.false;
    });
  });

  describe('#inquireRunDevServer', () => {
    it('should return true when user confirms running dev server', async () => {
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

    it('should return false when user denies running dev server', async () => {
      sandbox.stub(inquirer, 'prompt').resolves({ runDevServer: false });

      const result = await inquireRunDevServer();

      expect(result).to.be.false;
    });

    it('should have default value of true', async () => {
      sandbox.stub(inquirer, 'prompt').resolves({ runDevServer: true });

      await inquireRunDevServer();

      const promptArgs = inquirer.prompt.getCall(0).args[0];
      expect(promptArgs.default).to.be.true;
    });
  });

  describe('#inquireGithubAccessToken', () => {
    it('should return the provided GitHub access token', async () => {
      const testToken = 'ghp_test123456789';
      sandbox.stub(inquirer, 'prompt').resolves({ token: testToken });

      const result = await inquireGithubAccessToken();

      expect(result).to.equal(testToken);
      expect(inquirer.prompt.calledOnce).to.be.true;

      const promptArgs = inquirer.prompt.getCall(0).args[0];
      expect(promptArgs[0].type).to.equal('string');
      expect(promptArgs[0].name).to.equal('token');
      expect(promptArgs[0].message).to.equal(messages.CLI_BOOTSTRAP_NO_ACCESS_TOKEN_CREATED);
    });

    it('should handle empty token input', async () => {
      sandbox.stub(inquirer, 'prompt').resolves({ token: '' });

      const result = await inquireGithubAccessToken();

      expect(result).to.equal('');
    });
  });

  describe('#continueBootstrapCommand', () => {
    it('should return yes when user selects yes', async () => {
      sandbox.stub(inquirer, 'prompt').resolves({ shouldContinue: 'yes' });

      const result = await continueBootstrapCommand();

      expect(result).to.equal('yes');
      expect(inquirer.prompt.calledOnce).to.be.true;

      const promptArgs = inquirer.prompt.getCall(0).args[0];
      expect(promptArgs.type).to.equal('list');
      expect(promptArgs.name).to.equal('shouldContinue');
      expect(promptArgs.choices).to.include('yes');
      expect(promptArgs.choices).to.include('no');
      expect(promptArgs.loop).to.be.false;
    });

    it('should return no when user selects no', async () => {
      sandbox.stub(inquirer, 'prompt').resolves({ shouldContinue: 'no' });

      const result = await continueBootstrapCommand();

      expect(result).to.equal('no');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle inquirer errors gracefully', async () => {
      const error = new Error('Inquirer error');
      sandbox.stub(inquirer, 'prompt').rejects(error);

      try {
        await inquireApp([{ displayName: 'Test', configKey: 'test' }]);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });

    it('should handle empty apps array in inquireApp', async () => {
      const selectedApp = { displayName: 'Test', configKey: 'test' };
      sandbox.stub(inquirer, 'prompt').resolves({ app: selectedApp });

      const result = await inquireApp([]);

      expect(result).to.equal(selectedApp);
      const promptArgs = inquirer.prompt.getCall(0).args[0];
      // Should still have Exit option
      expect(promptArgs[0].choices).to.include('Exit');
      expect(promptArgs[0].choices.length).to.equal(1);
    });
  });
});
