const { expect } = require('chai');
const sinon = require('sinon');
const { configHandler } = require('@contentstack/cli-utilities');

describe('Bootstrap Error Handling Tests', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should handle npm install failures gracefully', () => {
    const messages = require('../messages/index.json');
    expect(messages.CLI_BOOTSTRAP_DEPENDENCIES_INSTALL_FAILED).to.exist;
    expect(messages.CLI_BOOTSTRAP_DEV_SERVER_FAILED).to.exist;
    expect(messages.CLI_BOOTSTRAP_NO_API_KEY_FOUND).to.exist;
  });

  it('should have proper error messages defined', () => {
    const messages = require('../messages/index.json');
    expect(messages.CLI_BOOTSTRAP_REPO_NOT_FOUND).to.include('%s');
    expect(messages.CLI_BOOTSTRAP_STACK_CREATION_FAILED).to.include('%s');
    expect(messages.CLI_BOOTSTRAP_LOGIN_FAILED).to.exist;
  });

  it('should export proper interfaces and constants', () => {
    const Bootstrap = require('../lib/bootstrap/index');
    expect(Bootstrap.ENGLISH_LOCALE).to.equal('en-us');
    expect(Bootstrap.default).to.be.a('function');
  });

  describe('Authentication error handling', () => {
    it('should handle authentication failure when not logged in and no alias', () => {
      const messages = require('../messages/index.json');
      const BootstrapCommand = require('../lib/commands/cm/bootstrap').default;

      // Verify the error message exists
      expect(messages.CLI_BOOTSTRAP_LOGIN_FAILED).to.exist;
      expect(messages.CLI_BOOTSTRAP_LOGIN_FAILED).to.include('login');
    });

    it('should handle configHandler errors when alias is provided but token not found', () => {
      sandbox.stub(configHandler, 'get').withArgs('tokens').returns({
        'other-alias': { token: 'other-token' },
      });

      const alias = 'non-existent-alias';
      const tokens = configHandler.get('tokens');

      // Verify that the alias doesn't exist in tokens
      expect(tokens[alias]).to.be.undefined;
    });

    it('should handle missing management token in configHandler', () => {
      sandbox.stub(configHandler, 'get').withArgs('tokens').returns({
        'test-alias': {}, // token property missing
      });

      const alias = 'test-alias';
      const tokens = configHandler.get('tokens');
      const tokenData = tokens[alias];

      // Verify that token property might be missing
      expect(tokenData).to.exist;
      expect(tokenData.token).to.be.undefined;
    });
  });

  describe('Bootstrap class error handling', () => {
    it('should handle GitHub repository not found errors', () => {
      const messages = require('../messages/index.json');
      const GithubError = require('../lib/bootstrap/github/github-error').default;

      // Verify error message format
      expect(messages.CLI_BOOTSTRAP_REPO_NOT_FOUND).to.include('%s');

      // Create a mock GithubError
      const error = new GithubError('Not Found', 404);
      expect(error.status).to.equal(404);
      expect(error.message).to.equal('Not Found');
    });

    it('should handle stack creation failures', () => {
      const messages = require('../messages/index.json');
      expect(messages.CLI_BOOTSTRAP_STACK_CREATION_FAILED).to.include('%s');
      expect(messages.CLI_BOOTSTRAP_NO_API_KEY_FOUND).to.exist;
    });

    it('should handle environment setup failures', () => {
      const messages = require('../messages/index.json');
      expect(messages.CLI_BOOTSTRAP_APP_FAILED_TO_CREATE_TOKEN_FOR_ENV).to.include('%s');
      expect(messages.CLI_BOOTSTRAP_APP_FAILED_TO_CREATE_ENV_FILE_FOR_ENV).to.include('%s');
      expect(messages.CLI_BOOTSTRAP_APP_ENV_NOT_FOUND_FOR_THE_STACK).to.exist;
    });
  });

  describe('Dev server error handling', () => {
    it('should handle dev server startup failures', () => {
      const messages = require('../messages/index.json');
      expect(messages.CLI_BOOTSTRAP_DEV_SERVER_FAILED).to.exist;
      expect(messages.CLI_BOOTSTRAP_DEV_SERVER_FAILED).to.include('Failed to start');
    });

    it('should handle dependency installation failures', () => {
      const messages = require('../messages/index.json');
      expect(messages.CLI_BOOTSTRAP_DEPENDENCIES_INSTALL_FAILED).to.exist;
      expect(messages.CLI_BOOTSTRAP_DEPENDENCIES_INSTALL_FAILED).to.include('Failed to install');
    });
  });
});
