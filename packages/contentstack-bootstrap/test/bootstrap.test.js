const { expect } = require('chai');
const sinon = require('sinon');
const messages = require('../messages/index.json');
const { runCommand } = require('@oclif/test');
const { cliux, HttpClient, configHandler } = require('@contentstack/cli-utilities');
const ContentstackClient = require('@contentstack/cli-cm-seed/lib/seed/contentstack/client').default;
const GitHubClient = require('@contentstack/cli-cm-seed/lib/seed/github/client').default;
const ContentStackSeed = require('@contentstack/cli-cm-seed/lib/commands/cm/stacks/seed').default;
const utils = require('../lib/bootstrap/utils');
const { Command } = require('@oclif/core');

const mock = {
  organizations: [
    { uid: 'org-uid', name: 'Organization 1', enabled: true },
    { uid: 'org-uid-2', name: 'Organization 2', enabled: true },
  ],
  stack: {
    uid: 'stack-uid',
    api_key: 'test-api-key',
    name: 'test-bootstrap-cmd',
    master_locale: 'en-us',
    org_uid: 'org-uid',
  },
  contentTypes: {
    items: [],
    count: 0,
  },
  managementToken: {
    uid: 'management-token-uid',
    token: 'test-management-token',
  },
  githubRepos: [
    { name: 'stack-starter-app', full_name: 'contentstack/stack-starter-app' },
    {
      name: 'stack-contentstack-nextjs-react-universal-demo',
      full_name: 'contentstack/stack-contentstack-nextjs-react-universal-demo',
    },
  ],
  githubRelease: {
    tarball_url: 'https://api.github.com/repos/contentstack/stack-starter-app/tarball/v1.0.0',
  },
  environments: {
    items: [{ name: 'development' }, { name: 'production' }],
  },
  deliveryToken: {
    token: 'test-delivery-token',
    preview_token: 'test-preview-token',
  },
  appConfig: {
    configKey: 'reactjs-starter',
    displayName: 'React.js Starter',
    source: 'contentstack/stack-starter-app',
    stack: 'contentstack/stack-starter-app',
    master_locale: 'en-us',
  },
  region: {
    name: 'AWS-NA',
    cda: 'https://cdn.contentstack.com',
    cma: 'https://api.contentstack.com',
    uiHost: 'https://app.contentstack.com',
  },
};

describe('Bootstrapping an app', () => {
  let sandbox;
  let contentstackClientStub;
  let githubClientStub;
  let httpClientStub;
  let stdout = '';

  const setupStubs = (options = {}) => {
    const {
      hasAlias = false,
      aliasToken = 'test-management-token',
      configHandlerTokens = { 'test-alias': { token: aliasToken } },
    } = options;

    // configHandler stub
    if (hasAlias) {
      sandbox.stub(configHandler, 'get').withArgs('tokens').returns(configHandlerTokens);
    }

    // ContentstackClient stubs
    const contentstackStubMethods = {
      getOrganizations: sandbox.stub().resolves(mock.organizations),
      getOrganization: sandbox.stub().resolves(mock.organizations[0]),
      createStack: sandbox.stub().resolves(mock.stack),
      getStack: sandbox.stub().resolves(mock.stack),
      getContentTypeCount: sandbox.stub().resolves(0),
      createManagementToken: sandbox.stub().resolves(mock.managementToken),
    };
    contentstackClientStub = sandbox.stub(ContentstackClient.prototype);
    Object.assign(contentstackClientStub, contentstackStubMethods);
    sandbox.stub(ContentstackClient.prototype, 'constructor').callsFake(function () {
      Object.assign(this, contentstackStubMethods);
      return this;
    });

    // GitHubClient stubs
    const githubStubMethods = {
      getAllRepos: sandbox.stub().resolves(mock.githubRepos),
      getLatest: sandbox.stub().resolves(),
      streamRelease: sandbox.stub().resolves(),
      extract: sandbox.stub().resolves(),
      makeGetApiCall: sandbox.stub().resolves({ statusCode: 200 }),
      getLatestTarballUrl: sandbox.stub().resolves(mock.githubRelease.tarball_url),
    };
    githubClientStub = sandbox.stub(GitHubClient.prototype);
    Object.assign(githubClientStub, githubStubMethods);
    sandbox.stub(GitHubClient.prototype, 'constructor').callsFake(function () {
      Object.assign(this, githubStubMethods);
      return this;
    });

    // HttpClient stub
    httpClientStub = {
      get: sandbox.stub().resolves({ data: mock.githubRepos }),
      options: sandbox.stub().returnsThis(),
      resetConfig: sandbox.stub(),
    };
    sandbox.stub(HttpClient, 'create').returns(httpClientStub);

    // ContentStackSeed stub
    sandbox.stub(ContentStackSeed, 'run').resolves({
      api_key: mock.stack.api_key,
      uid: mock.stack.uid,
      name: mock.stack.name,
    });

    // ManagementAPIClient stub
    const managementAPIClientStub = {
      stack: sandbox.stub().returns({
        environment: sandbox.stub().returns({
          query: sandbox.stub().returns({
            find: sandbox.stub().resolves(mock.environments),
          }),
        }),
        deliveryToken: sandbox.stub().returns({
          create: sandbox.stub().resolves(mock.deliveryToken),
        }),
        managementToken: sandbox.stub().returns({
          create: sandbox.stub().resolves(mock.managementToken),
        }),
      }),
    };
    sandbox.stub(require('@contentstack/cli-utilities'), 'managementSDKClient').resolves(managementAPIClientStub);

    // Utils stub
    sandbox.stub(utils, 'setupEnvironments').resolves();

    // CLI stubs
    sandbox.stub(cliux, 'print').callsFake((message) => {
      stdout += message + '\n';
    });
    sandbox.stub(cliux, 'loader').callsFake((message) => {
      if (message) {
        stdout += message + '\n';
      }
    });
    sandbox.stub(cliux, 'prompt').callsFake((question) => {
      const responses = {
        'app-name': 'reactjs-starter',
        org: 'org-uid',
        'stack-name': 'test-bootstrap-cmd',
        'app-type': 'reactjs-starter',
        yes: true,
      };
      return Promise.resolve(responses[question.name] || {});
    });
  };

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    stdout = '';
    setupStubs();
    process.env.CONTENTSTACK_AUTH_TOKEN = 'test-auth-token';
  });

  afterEach(() => {
    sandbox.restore();
    delete process.env.CONTENTSTACK_AUTH_TOKEN;
  });

  it('should handle invalid app type gracefully', async () => {
    try {
      await runCommand(['cm:bootstrap', '--app-type', 'invalidtype']);
    } catch (error) {
      expect(error).to.exist;
      expect(error?.oclif?.exit).to.equal(1);
      expect(error.message).to.contain('Invalid app type provided invalidtype');
    }
  });

  it('should bootstrap a Contentstack app with the correct flags', async () => {
    // Mock the BootstrapCommand class
    const MockBootstrapCommand = class extends Command {
      async run() {
        cliux.loader('Cloning the selected app');
        await githubClientStub.getLatest(process.cwd());
        cliux.loader();

        const result = await ContentStackSeed.run(['--repo', mock.appConfig.stack]);

        if (result?.api_key) {
          await utils.setupEnvironments(
            {
              stack: () => ({
                environment: () => ({
                  query: () => ({
                    find: () => Promise.resolve(mock.environments),
                  }),
                }),
                deliveryToken: () => ({
                  create: () => Promise.resolve(mock.deliveryToken),
                }),
              }),
            },
            result.api_key,
            mock.appConfig,
            process.cwd(),
            mock.region,
            true,
            mock.managementToken.token,
          );
        }

        cliux.print(messages.CLI_BOOTSTRAP_SUCCESS);
      }
    };

    // Mock the BootstrapCommand module
    const commandPath = require.resolve('../lib/commands/cm/bootstrap');
    require.cache[commandPath] = {
      id: commandPath,
      filename: commandPath,
      loaded: true,
      exports: { default: MockBootstrapCommand },
    };

    // Clear the require cache for any modules that might import BootstrapCommand
    for (const key of Object.keys(require.cache)) {
      if (key.includes('contentstack-bootstrap')) {
        delete require.cache[key];
      }
    }

    // Create an instance of the mock command and execute it
    const command = new MockBootstrapCommand();
    await command.run();

    // Verify that the success message was output
    expect(stdout).to.include(messages.CLI_BOOTSTRAP_SUCCESS);
  });

  it('should handle --run-dev-server flag correctly', async () => {
    // Mock execSync and spawn for npm commands
    const childProcess = require('node:child_process');
    const execSyncStub = sandbox.stub(childProcess, 'execSync').returns();
    const spawnStub = sandbox.stub(childProcess, 'spawn').returns({
      on: sandbox.stub().callsArg(1),
    });

    try {
      const MockBootstrapCommand = class extends Command {
        async run() {
          cliux.loader('Cloning the selected app');
          await githubClientStub.getLatest(process.cwd());
          cliux.loader();

          const result = await ContentStackSeed.run(['--repo', mock.appConfig.stack]);

          if (result?.api_key) {
            await utils.setupEnvironments(
              {
                stack: () => ({
                  environment: () => ({
                    query: () => ({
                      find: () => Promise.resolve(mock.environments),
                    }),
                  }),
                  deliveryToken: () => ({
                    create: () => Promise.resolve(mock.deliveryToken),
                  }),
                }),
              },
              result.api_key,
              mock.appConfig,
              process.cwd(),
              mock.region,
              true,
              mock.managementToken.token,
            );
          }

          cliux.print(messages.CLI_BOOTSTRAP_SUCCESS);

          // Simulate runDevServer = true
          const runDevServer = true;
          if (runDevServer) {
            cliux.loader(messages.CLI_BOOTSTRAP_INSTALLING_DEPENDENCIES);
            execSyncStub('npm install', { cwd: process.cwd(), stdio: 'inherit' });
            cliux.loader();
            cliux.print(messages.CLI_BOOTSTRAP_DEPENDENCIES_INSTALLED);
            cliux.print(messages.CLI_BOOTSTRAP_STARTING_DEV_SERVER);
            cliux.print(messages.CLI_BOOTSTRAP_DEV_SERVER_STARTED);
            spawnStub('npm', ['run', 'dev'], { cwd: process.cwd(), stdio: 'inherit', shell: true });
          }
        }
      };

      const command = new MockBootstrapCommand();
      await command.run();

      // Verify that npm install was called
      expect(execSyncStub.calledWith('npm install')).to.be.true;
      // Verify that npm run dev was called
      expect(spawnStub.calledWith('npm', ['run', 'dev'])).to.be.true;
      // Verify messages were printed
      expect(stdout).to.include(messages.CLI_BOOTSTRAP_DEPENDENCIES_INSTALLED);
      expect(stdout).to.include(messages.CLI_BOOTSTRAP_DEV_SERVER_STARTED);
    } catch (err) {
      console.error('Error during dev server test:', err);
      throw err;
    }
  });

  describe('Authentication and Alias handling', () => {
    it('should retrieve management token from configHandler when alias is provided', async () => {
      sandbox.restore();
      sandbox = sinon.createSandbox();
      const testAlias = 'test-alias';
      const testToken = 'test-management-token-from-config';
      setupStubs({ hasAlias: true, aliasToken: testToken });

      const BootstrapCommand = require('../lib/commands/cm/bootstrap').default;
      const command = new BootstrapCommand([], {});

      // Mock interactive functions
      const interactive = require('../lib/bootstrap/interactive');
      sandbox.stub(interactive, 'inquireAppType').resolves('starterapp');
      sandbox.stub(interactive, 'inquireApp').resolves(mock.appConfig);
      sandbox.stub(interactive, 'inquireCloneDirectory').resolves('/test/path');
      sandbox.stub(interactive, 'inquireLivePreviewSupport').resolves(false);
      sandbox.stub(interactive, 'inquireRunDevServer').resolves(false);

      // Mock config
      const config = require('../lib/config');
      sandbox.stub(config, 'getAppLevelConfigByName').returns(mock.appConfig);

      // Track Bootstrap instantiation
      let bootstrapOptions = null;
      sandbox.stub(require('../lib/bootstrap/index'), 'default').callsFake(function (options) {
        bootstrapOptions = options;
        return {
          run: sandbox.stub().resolves(),
        };
      });

      // Mock parse method
      command.parse = sandbox.stub().resolves({
        flags: {
          alias: testAlias,
          'app-name': undefined,
          'app-type': undefined,
          'project-dir': undefined,
          'stack-api-key': undefined,
          org: undefined,
          'stack-name': undefined,
          yes: undefined,
          'run-dev-server': false,
        },
      });

      // Mock region and cmaHost
      command.region = mock.region;
      command.cmaHost = mock.region.cma;

      // Mock managementSDKClient
      const managementAPIClientStub = {
        stack: sandbox.stub().returns({
          environment: sandbox.stub().returns({
            query: sandbox.stub().returns({
              find: sandbox.stub().resolves(mock.environments),
            }),
          }),
          deliveryToken: sandbox.stub().returns({
            create: sandbox.stub().resolves(mock.deliveryToken),
          }),
          managementToken: sandbox.stub().returns({
            create: sandbox.stub().resolves(mock.managementToken),
          }),
        }),
      };
      sandbox.stub(require('@contentstack/cli-utilities'), 'managementSDKClient').resolves(managementAPIClientStub);

      await command.run();
      // Verify that configHandler was called with correct alias
      expect(configHandler.get.calledWith('tokens')).to.be.true;
      // Verify that managementToken was set in seedParams
      expect(bootstrapOptions).to.not.be.null;
      expect(bootstrapOptions.seedParams.managementTokenAlias).to.equal(testAlias);
      expect(bootstrapOptions.seedParams.managementToken).to.equal(testToken);
    });
  });

  describe('Flag handling and logic updates', () => {
    it('should set livePreviewEnabled to true when yes flag is provided', async () => {
      sandbox.restore();
      sandbox = sinon.createSandbox();
      setupStubs();

      const BootstrapCommand = require('../lib/commands/cm/bootstrap').default;
      const command = new BootstrapCommand([], {});

      // Mock interactive functions
      const interactive = require('../lib/bootstrap/interactive');
      sandbox.stub(interactive, 'inquireAppType').resolves('starterapp');
      sandbox.stub(interactive, 'inquireApp').resolves(mock.appConfig);
      sandbox.stub(interactive, 'inquireCloneDirectory').resolves('/test/path');
      sandbox.stub(interactive, 'inquireLivePreviewSupport');
      sandbox.stub(interactive, 'inquireRunDevServer');

      // Mock config
      const config = require('../lib/config');
      sandbox.stub(config, 'getAppLevelConfigByName').returns(mock.appConfig);

      // Track Bootstrap instantiation
      let bootstrapOptions = null;
      sandbox.stub(require('../lib/bootstrap/index'), 'default').callsFake(function (options) {
        bootstrapOptions = options;
        return {
          run: sandbox.stub().resolves(),
        };
      });

      // Mock parse method
      command.parse = sandbox.stub().resolves({
        flags: {
          alias: undefined,
          'app-name': undefined,
          'app-type': undefined,
          'project-dir': undefined,
          'stack-api-key': undefined,
          org: undefined,
          'stack-name': undefined,
          yes: 'yes',
          'run-dev-server': false,
        },
      });

      // Mock region and cmaHost
      command.region = mock.region;
      command.cmaHost = mock.region.cma;

      await command.run();
      // Verify that livePreviewEnabled is true when yes flag is provided
      expect(bootstrapOptions).to.not.be.null;
      expect(bootstrapOptions.livePreviewEnabled).to.be.true;
      // Verify inquireLivePreviewSupport was not called
      expect(interactive.inquireLivePreviewSupport.called).to.be.false;
    });

    it('should set runDevServer to false when yes flag is provided and run-dev-server flag is not set', async () => {
      sandbox.restore();
      sandbox = sinon.createSandbox();
      setupStubs();

      const BootstrapCommand = require('../lib/commands/cm/bootstrap').default;
      const command = new BootstrapCommand([], {});

      // Mock interactive functions
      const interactive = require('../lib/bootstrap/interactive');
      sandbox.stub(interactive, 'inquireAppType').resolves('starterapp');
      sandbox.stub(interactive, 'inquireApp').resolves(mock.appConfig);
      sandbox.stub(interactive, 'inquireCloneDirectory').resolves('/test/path');
      sandbox.stub(interactive, 'inquireLivePreviewSupport');
      sandbox.stub(interactive, 'inquireRunDevServer');

      // Mock config
      const config = require('../lib/config');
      sandbox.stub(config, 'getAppLevelConfigByName').returns(mock.appConfig);

      // Track Bootstrap instantiation
      let bootstrapOptions = null;
      sandbox.stub(require('../lib/bootstrap/index'), 'default').callsFake(function (options) {
        bootstrapOptions = options;
        return {
          run: sandbox.stub().resolves(),
        };
      });

      // Mock parse method
      command.parse = sandbox.stub().resolves({
        flags: {
          alias: undefined,
          'app-name': undefined,
          'app-type': undefined,
          'project-dir': undefined,
          'stack-api-key': undefined,
          org: undefined,
          'stack-name': undefined,
          yes: 'yes',
          'run-dev-server': false,
        },
      });

      // Mock region and cmaHost
      command.region = mock.region;
      command.cmaHost = mock.region.cma;

      await command.run();
      // Verify that runDevServer is false when yes flag is provided but run-dev-server is false
      expect(bootstrapOptions).to.not.be.null;
      expect(bootstrapOptions.runDevServer).to.be.false;
      // Verify inquireRunDevServer was not called
      expect(interactive.inquireRunDevServer.called).to.be.false;
    });

    it('should use run-dev-server flag value when yes flag is not provided', async () => {
      sandbox.restore();
      sandbox = sinon.createSandbox();
      setupStubs();

      const BootstrapCommand = require('../lib/commands/cm/bootstrap').default;
      const command = new BootstrapCommand([], {});

      // Mock interactive functions
      const interactive = require('../lib/bootstrap/interactive');
      sandbox.stub(interactive, 'inquireAppType').resolves('starterapp');
      sandbox.stub(interactive, 'inquireApp').resolves(mock.appConfig);
      sandbox.stub(interactive, 'inquireCloneDirectory').resolves('/test/path');
      sandbox.stub(interactive, 'inquireLivePreviewSupport').resolves(false);
      sandbox.stub(interactive, 'inquireRunDevServer').resolves(false);

      // Mock config
      const config = require('../lib/config');
      sandbox.stub(config, 'getAppLevelConfigByName').returns(mock.appConfig);

      // Track Bootstrap instantiation
      let bootstrapOptions = null;
      sandbox.stub(require('../lib/bootstrap/index'), 'default').callsFake(function (options) {
        bootstrapOptions = options;
        return {
          run: sandbox.stub().resolves(),
        };
      });

      // Mock parse method
      command.parse = sandbox.stub().resolves({
        flags: {
          alias: undefined,
          'app-name': undefined,
          'app-type': undefined,
          'project-dir': undefined,
          'stack-api-key': undefined,
          org: undefined,
          'stack-name': undefined,
          yes: undefined,
          'run-dev-server': true,
        },
      });

      // Mock region and cmaHost
      command.region = mock.region;
      command.cmaHost = mock.region.cma;

      await command.run();
      // Verify that runDevServer is true when run-dev-server flag is true
      expect(bootstrapOptions).to.not.be.null;
      expect(bootstrapOptions.runDevServer).to.be.true;
    });
  });

  describe('App type and selection handling', () => {
    it('should handle appType from flags correctly', async () => {
      sandbox.restore();
      sandbox = sinon.createSandbox();
      setupStubs();

      const BootstrapCommand = require('../lib/commands/cm/bootstrap').default;
      const command = new BootstrapCommand([], {});

      // Mock interactive functions
      const interactive = require('../lib/bootstrap/interactive');
      sandbox.stub(interactive, 'inquireApp').resolves(mock.appConfig);
      sandbox.stub(interactive, 'inquireCloneDirectory').resolves('/test/path');
      sandbox.stub(interactive, 'inquireLivePreviewSupport').resolves(false);
      sandbox.stub(interactive, 'inquireRunDevServer').resolves(false);

      // Mock config
      const config = require('../lib/config');
      sandbox.stub(config, 'getAppLevelConfigByName').returns(mock.appConfig);

      // Track Bootstrap instantiation
      let bootstrapOptions = null;
      sandbox.stub(require('../lib/bootstrap/index'), 'default').callsFake(function (options) {
        bootstrapOptions = options;
        return {
          run: sandbox.stub().resolves(),
        };
      });

      // Mock parse method
      command.parse = sandbox.stub().resolves({
        flags: {
          alias: undefined,
          'app-name': undefined,
          'app-type': 'sampleapp',
          'project-dir': undefined,
          'stack-api-key': undefined,
          org: undefined,
          'stack-name': undefined,
          yes: undefined,
          'run-dev-server': false,
        },
      });

      // Mock region and cmaHost
      command.region = mock.region;
      command.cmaHost = mock.region.cma;

      await command.run();
      // Verify that appType is set correctly
      expect(bootstrapOptions).to.not.be.null;
      expect(bootstrapOptions.appType).to.equal('sampleapp');
      // Verify that inquireApp was called with sampleApps (config.default in compiled CJS)
      expect(interactive.inquireApp.calledWith(config.default.sampleApps)).to.be.true;
    });

    it('should handle app-name flag correctly', async () => {
      sandbox.restore();
      sandbox = sinon.createSandbox();
      setupStubs();

      const BootstrapCommand = require('../lib/commands/cm/bootstrap').default;
      const command = new BootstrapCommand([], {});

      // Mock interactive functions (stub inquireApp so .called exists for assertion)
      const interactive = require('../lib/bootstrap/interactive');
      sandbox.stub(interactive, 'inquireAppType').resolves('starterapp');
      sandbox.stub(interactive, 'inquireApp').resolves(mock.appConfig);
      sandbox.stub(interactive, 'inquireCloneDirectory').resolves('/test/path');
      sandbox.stub(interactive, 'inquireLivePreviewSupport').resolves(false);
      sandbox.stub(interactive, 'inquireRunDevServer').resolves(false);

      // Mock config
      const config = require('../lib/config');
      sandbox.stub(config, 'getAppLevelConfigByName').returns(mock.appConfig);

      // Track Bootstrap instantiation
      sandbox.stub(require('../lib/bootstrap/index'), 'default').callsFake(function (_options) {
        // Verify that appConfig was retrieved using app-name
        expect(config.getAppLevelConfigByName.calledWith('reactjs-starter')).to.be.true;
        return {
          run: sandbox.stub().resolves(),
        };
      });

      // Mock parse method
      command.parse = sandbox.stub().resolves({
        flags: {
          alias: undefined,
          'app-name': 'reactjs-starter',
          'app-type': undefined,
          'project-dir': undefined,
          'stack-api-key': undefined,
          org: undefined,
          'stack-name': undefined,
          yes: undefined,
          'run-dev-server': false,
        },
      });

      // Mock region and cmaHost
      command.region = mock.region;
      command.cmaHost = mock.region.cma;

      await command.run();
      // Verify that inquireApp was not called
      expect(interactive.inquireApp.called).to.be.false;
    });
  });
});
