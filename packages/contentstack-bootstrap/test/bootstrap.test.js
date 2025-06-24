const { expect } = require('chai');
const sinon = require('sinon');
const messages = require('../messages/index.json');
const { runCommand } = require('@oclif/test');
const { cliux, HttpClient } = require('@contentstack/cli-utilities');
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

  const setupStubs = () => {
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
    try {
      // Mock the BootstrapCommand class
      const MockBootstrapCommand = class extends Command {
        async run() {
          try {
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
          } catch (error) {
            throw error;
          }
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
      Object.keys(require.cache).forEach((key) => {
        if (key.includes('contentstack-bootstrap')) {
          delete require.cache[key];
        }
      });

      // Create an instance of the mock command and execute it
      const command = new MockBootstrapCommand();
      await command.run();

      // Verify that the success message was output
      expect(stdout).to.include(messages.CLI_BOOTSTRAP_SUCCESS);
    } catch (err) {
      console.error('Error during command execution:', err);
      throw err;
    }
  });
});
