//@ts-nocheck
import { expect } from 'chai';
import { stub, createSandbox } from 'sinon';
import { cliux } from '@contentstack/cli-utilities';
import { githubAdapterMockData } from '../mock/index';
import { GitHub, BaseClass } from '../../../src/adapters';
import { BaseCommand } from '../../../src/commands/launch/base-command';

describe('GitHub', () => {
  let inquireStub, prepareApiClientsStub, prepareConfigStub, getConfigStub;
  let adapterConstructorInputs;

  beforeEach(() => {
    inquireStub = stub(cliux, 'inquire');
    prepareConfigStub = stub(BaseCommand.prototype, 'prepareConfig').resolves();
    prepareApiClientsStub = stub(BaseCommand.prototype, 'prepareApiClients').resolves();
    getConfigStub = stub(BaseCommand.prototype, 'getConfig').resolves();

    adapterConstructorInputs = {
      config: getConfigStub,
      apolloClient: prepareApiClientsStub,
      analyticsInfo: 'this.context.analyticsInfo',
    };
  });

  afterEach(() => {
    inquireStub.restore();
    prepareConfigStub.restore();
    getConfigStub.restore();
    prepareApiClientsStub.restore();
  });

  describe('Run', () => {
    let initApolloClientStub,
      createNewDeploymentStub,
      checkGitHubConnectedStub,
      checkGitRemoteAvailableAndValidStub,
      checkUserGitHubAccessStub,
      prepareForNewProjectCreationStub,
      createNewProjectStub,
      prepareLaunchConfigStub,
      showLogsStub,
      showDeploymentUrlStub,
      showSuggestionStub;

    beforeEach(() => {
      initApolloClientStub = stub(BaseClass.prototype, 'initApolloClient').resolves();
      createNewDeploymentStub = stub(GitHub.prototype, 'createNewDeployment').resolves();
      checkGitHubConnectedStub = stub(GitHub.prototype, 'checkGitHubConnected').resolves(
        githubAdapterMockData.userconnection,
      );
      checkGitRemoteAvailableAndValidStub = stub(GitHub.prototype, 'checkGitRemoteAvailableAndValid').resolves();
      checkUserGitHubAccessStub = stub(GitHub.prototype, 'checkUserGitHubAccess').resolves(true);
      prepareForNewProjectCreationStub = stub(GitHub.prototype, 'prepareForNewProjectCreation').resolves();
      createNewProjectStub = stub(GitHub.prototype, 'createNewProject').resolves();

      prepareLaunchConfigStub = stub(BaseClass.prototype, 'prepareLaunchConfig').resolves();
      showLogsStub = stub(BaseClass.prototype, 'showLogs').resolves();
      showDeploymentUrlStub = stub(BaseClass.prototype, 'showDeploymentUrl').resolves();
      showSuggestionStub = stub(BaseClass.prototype, 'showSuggestion').resolves();
    });

    afterEach(() => {
      initApolloClientStub.restore();
      createNewDeploymentStub.restore();
      checkGitHubConnectedStub.restore();
      checkGitRemoteAvailableAndValidStub.restore();
      checkUserGitHubAccessStub.restore();
      prepareForNewProjectCreationStub.restore();
      createNewProjectStub.restore();
      prepareLaunchConfigStub.restore();
      showLogsStub.restore();
      showDeploymentUrlStub.restore();
      showSuggestionStub.restore();
    });

    it('should run github flow', async () => {
      new GitHub(adapterConstructorInputs).run();
    });
  });

  describe('createNewProject', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should log "New project created successfully" and update the currentConfig if the mutation succeeds', async () => {
      let adapterConstructorOptions = {
        config: {
          branch: 'main',
          provider: 'GitHub',
          framework: 'React',
          repository: {
            fullName: 'username/repo',
            url: 'https://github.com/username/repo',
          },
          projectName: 'New Project',
          buildCommand: 'npm run build',
          selectedStack: {
            api_key: 'api_key',
          },
          outputDirectory: 'dist',
          environmentName: 'Production',
          currentConfig: null,
        },
      };

      const logStub = sandbox.stub(console, 'log');

      const apolloClientMutateStub = sandbox.stub().resolves({
        data: {
          project: {
            environments: [
              {
                deployments: {
                  edges: [
                    {
                      node: {
                        id: 'deployment1',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      });

      const apolloClient = {
        mutate: apolloClientMutateStub,
      };

      const githubInstance = new GitHub(adapterConstructorOptions);
      githubInstance.apolloClient = apolloClient;

      await githubInstance.createNewProject();

      expect(logStub.calledOnceWithExactly('New project created successfully', 'info')).to.be.true;
    });
  });

  describe('prepareForNewProjectCreation', () => {
    let selectOrgStub, selectBranchStub, detectFrameworkStub, handleEnvImportFlowStub;
    let adapterConstructorOptions = {
      config: {
        flags: {
          name: 'Test project',
          framework: 'Gatsby',
          environment: 'dev',
          'build-command': 'npm run build',
          'output-directory': './',
        },
        listOfFrameWorks: [
          { name: 'Gatsby', value: 'GATSBY' },
          { name: 'NextJs', value: 'NEXTJS' },
          { name: 'Other', value: 'OTHER' },
        ],
        repository: { fullName: 'Gatsby Starter' },
      },
    };
    beforeEach(function () {
      selectOrgStub = stub(BaseClass.prototype, 'selectOrg').resolves();
      selectBranchStub = stub(BaseClass.prototype, 'selectBranch').resolves();
      detectFrameworkStub = stub(BaseClass.prototype, 'detectFramework').resolves();
      handleEnvImportFlowStub = stub(BaseClass.prototype, 'handleEnvImportFlow').resolves();
    });
    afterEach(function () {
      selectOrgStub.restore();
      selectBranchStub.restore();
      detectFrameworkStub.restore();
      handleEnvImportFlowStub.restore();
    });

    it('prepare for new project', async function () {
      await new GitHub(adapterConstructorOptions).prepareForNewProjectCreation();
    });
  });

  describe('checkGitHubConnected', () => {
    let sandbox;
    let adapterConstructorOptions = {
      config: {
        provider: 'GitHub',
        userConnection: null,
      },
    };

    beforeEach(() => {
      sandbox = createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should log "GitHub connection identified!" and return the userConnection object if found', async () => {
      const apolloClientQueryStub = sandbox.stub().resolves({
        data: {
          userConnections: [
            {
              provider: 'GitHub',
              userUid: '123',
            },
          ],
        },
      });

      const apolloClient = {
        query: apolloClientQueryStub,
      };
      const githubInstance = new GitHub(adapterConstructorOptions);
      githubInstance.apolloClient = apolloClient;

      const result = await githubInstance.checkGitHubConnected();

      expect(result).to.deep.equal({
        userUid: '123',
        provider: 'GitHub',
      });
    });

    it('should log "GitHub connection not found!" and call connectToAdapterOnUi if no userConnection is found', async () => {
      const apolloClientQueryStub = sandbox.stub().resolves({
        data: {
          userConnections: [
            {
              provider: 'Other',
              userUid: '232',
            },
          ],
        },
      });

      const apolloClient = {
        query: apolloClientQueryStub,
      };
      const githubInstance = new GitHub(adapterConstructorOptions);
      githubInstance.apolloClient = apolloClient;

      const connectToAdapterOnUiStub = sandbox.stub(GitHub.prototype, 'connectToAdapterOnUi').resolves();

      await githubInstance.checkGitHubConnected();

      expect(connectToAdapterOnUiStub.calledOnce).to.be.true;
    });
  });
});
