const { expect } = require('chai');

describe('Bootstrap Integration Tests', () => {
  it('should have proper module structure', () => {
    const Bootstrap = require('../lib/bootstrap/index');
    const interactive = require('../lib/bootstrap/interactive');
    const utils = require('../lib/bootstrap/utils');

    expect(Bootstrap.default).to.be.a('function');
    expect(interactive.inquireApp).to.be.a('function');
    expect(interactive.inquireRunDevServer).to.be.a('function');
    expect(utils.setupEnvironments).to.be.a('function');
  });

  it('should validate command flag structure', () => {
    const BootstrapCommand = require('../lib/commands/cm/bootstrap').default;

    expect(BootstrapCommand.flags).to.have.property('run-dev-server');
    expect(BootstrapCommand.flags).to.have.property('app-name');
    expect(BootstrapCommand.flags).to.have.property('project-dir');
    expect(BootstrapCommand.flags).to.have.property('stack-api-key');
    expect(BootstrapCommand.flags).to.have.property('org');
    expect(BootstrapCommand.flags).to.have.property('stack-name');
    expect(BootstrapCommand.flags).to.have.property('yes');
  });

  it('should validate GitHub client exports', () => {
    const GitHubClient = require('../lib/bootstrap/github/client').default;
    const GithubError = require('../lib/bootstrap/github/github-error').default;

    expect(GitHubClient).to.be.a('function');
    expect(GitHubClient.parsePath).to.be.a('function');
    expect(GithubError).to.be.a('function');
  });

  it('should validate configuration structure', () => {
    const config = require('../lib/config');

    expect(config.getAppLevelConfigByName).to.be.a('function');
    expect(config.default).to.have.property('starterApps');
    expect(config.default).to.have.property('sampleApps');
  });
});
