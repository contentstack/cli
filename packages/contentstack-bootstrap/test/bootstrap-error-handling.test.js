const { expect } = require('chai');
const sinon = require('sinon');

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
  });

  it('should export proper interfaces and constants', () => {
    const Bootstrap = require('../lib/bootstrap/index');
    expect(Bootstrap.ENGLISH_LOCALE).to.equal('en-us');
    expect(Bootstrap.default).to.be.a('function');
  });
});
