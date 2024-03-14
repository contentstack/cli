//@ts-nocheck
import { describe, it } from 'mocha';
import { expect } from 'chai';
import { stub, createSandbox } from 'sinon';
import { cliux } from '@contentstack/cli-utilities';
import Logs from '../../../src/commands/launch/logs';
import * as commonUtils from '../../../src/util/common-utility';
import { logsMockData } from '../mock/index';

describe('Log', () => {
  describe('run', () => {
    it('Log command with all flags, should be successful', async function () {
      const logPollingAndInitConfigStub = stub(Logs.prototype, 'logPollingAndInitConfig').resolves();
      const stub1 = stub(Logs.prototype, 'run');
      const args = [
        '--config',
        './',
        '--type',
        'd',
        '--environment',
        logsMockData.flags.environment,
        '--deployment',
        logsMockData.flags.deployment,
      ];

      await Logs.run(args);
      expect(stub1.calledOnce).to.be.true;
      stub1.restore();
      logPollingAndInitConfigStub.restore();
    });
  });

  describe('checkAndSetProjectDetails', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should select org, prepare API clients, select project, validate and select environment, and fetch latest deployment if currentConfig uid is not set and flags.deployment is not provided', async () => {
      const selectOrgStub = sandbox.stub().resolves();

      const prepareApiClientsStub = sandbox.stub().resolves();
      const selectProjectStub = sandbox.stub().resolves();
      const validateAndSelectEnvironmentStub = sandbox.stub().resolves();
      const fetchLatestDeploymentStub = sandbox.stub().resolves();
      const sharedConfig = {
        currentConfig: {
          uid: null,
        },
      };
      const flags = {
        deployment: undefined,
      };
      const githubInstance = new Logs();

      sandbox.stub(githubInstance, 'log');
      sandbox.stub(commonUtils, 'selectOrg').callsFake(selectOrgStub);
      sandbox.stub(githubInstance, 'prepareApiClients').callsFake(prepareApiClientsStub);
      sandbox.stub(commonUtils, 'selectProject').callsFake(selectProjectStub);
      sandbox.stub(githubInstance, 'validateAndSelectEnvironment').callsFake(validateAndSelectEnvironmentStub);
      sandbox.stub(githubInstance, 'fetchLatestDeployment').callsFake(fetchLatestDeploymentStub);

      githubInstance.sharedConfig = sharedConfig;
      githubInstance.flags = flags;

      await githubInstance.checkAndSetProjectDetails();

      expect(selectOrgStub.calledOnce).to.be.true;
    });
  });

  describe('selectEnvironment', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should select an environment and update the sharedConfig', async () => {
      let inquireStub = stub(cliux, 'inquire');
      inquireStub.callsFake(function () {
        return Promise.resolve('Environment 1');
      });
      const findStub = sandbox.stub().returns({ uid: 'Environment UID' });
      const logStub = sandbox.stub();
      const ux = {
        inquire: inquireStub,
      };
      const environments = [
        {
          __typename: 'EnvironmentEdge',
          node: {
            __typename: 'Environment',
            name: 'Environment 1',
            value: 'Environment 1',
            uid: 'UID 1',
            deployments: [],
          },
        },
      ];
      const sharedConfig = {
        currentConfig: {
          environments,
        },
        environment: '',
      };

      const logInstance = new Logs();

      sandbox.stub(logInstance, 'log').callsFake(logStub);
      sandbox.stub(Array.prototype, 'find').callsFake(findStub);

      logInstance.sharedConfig = sharedConfig;
      logInstance.ux = ux;

      await logInstance.selectEnvironment();

      inquireStub.restore();
    });
  });

  describe('validateAndSelectEnvironment', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should set the sharedConfig environment and deployments if a matching environment is found', async () => {
      const queryStub = sandbox.stub().resolves({
        data: {
          Environments: {
            edges: [
              {
                node: {
                  uid: 'Environment UID',
                  name: 'Environment Name',
                  deployments: {
                    edges: [],
                  },
                },
              },
            ],
          },
        },
      });
      const logStub = sandbox.stub();
      const findStub = sandbox.stub().returns({
        node: {
          uid: 'Environment UID',
          deployments: {
            edges: [],
          },
        },
      });
      const apolloClient = {
        query: queryStub,
      };
      const sharedConfig = {
        environment: '',
        currentConfig: {
          deployments: [],
        },
      };
      const flags = {
        environment: 'Environment Name',
      };
      const logInstance = new Logs();

      sandbox.stub(logInstance, 'log').callsFake(logStub);
      sandbox.stub(Array.prototype, 'find').callsFake(findStub);

      logInstance.apolloClient = apolloClient;
      logInstance.sharedConfig = sharedConfig;
      logInstance.flags = flags;

      await logInstance.validateAndSelectEnvironment();

      expect(queryStub.calledOnce).to.be.true;
    });
  });

  describe('validateDeployment', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should set the sharedConfig deployment if a matching deployment is found', async () => {
      const findStub = sandbox.stub().returns({
        node: {
          uid: 'Deployment UID',
        },
      });
      const logStub = sandbox.stub();
      const sharedConfig = {
        currentConfig: {
          deployments: [
            {
              node: {
                uid: 'Deployment UID',
                deploymentNumber: 1,
              },
            },
          ],
        },
      };
      const flags = {
        deployment: 'Deployment UID',
      };
      const logInstance = new Logs();

      sandbox.stub(logInstance, 'log').callsFake(logStub);
      sandbox.stub(Array.prototype, 'find').callsFake(findStub);

      logInstance.sharedConfig = sharedConfig;
      logInstance.flags = flags;

      await logInstance.validateDeployment();
    });
  });

  describe('showLogs', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should log formatted logs for info messages', () => {
      const logStub = sandbox.stub();
      const event = {
        message: [
          {
            timestamp: '2023-05-26T10:15:30Z',
            message: 'Log message 1',
          },
          {
            timestamp: '2023-05-26T10:20:30Z',
            message: 'Log message 2',
          },
        ],
        msgType: 'info',
      };
      const logInstance = new Logs();

      sandbox.stub(logInstance, 'log').callsFake(logStub);

      logInstance.showLogs(event);

      expect(logStub.calledTwice).to.be.true;
    });

    it('should log "No server logs to display" and exit the process for error messages with NoServerlessRoutesError', () => {
      const isArrayStub = sandbox.stub().returns(true);
      const includesStub = sandbox.stub().returns(true);
      const mapStub = sandbox.stub().returns(['NoServerlessRoutesError']);
      const logStub = sandbox.stub();
      const event = {
        message: ['Error message'],
        msgType: 'error',
      };
      const logInstance = new Logs();

      sandbox.stub(logInstance, 'log').callsFake(logStub);
      sandbox.stub(Array, 'isArray').callsFake(isArrayStub);
      sandbox.stub(Array.prototype, 'includes').callsFake(includesStub);
      sandbox.stub(Array.prototype, 'map').callsFake(mapStub);

      logInstance.showLogs(event);
    });
  });

  describe('fetchLatestDeployment', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should set the sharedConfig deployment if deployments exist and the first deployment has a UID', async () => {
      const logStub = sandbox.stub();
      const sharedConfig = {
        currentConfig: {
          deployments: [
            {
              node: {
                uid: 'Deployment UID',
              },
            },
            {
              node: {
                uid: 'Other Deployment UID',
              },
            },
          ],
        },
      };
      const logInstance = new Logs();

      sandbox.stub(logInstance, 'log').callsFake(logStub);
      logInstance.sharedConfig = sharedConfig;

      await logInstance.fetchLatestDeployment();

      expect(logInstance.sharedConfig.deployment).to.equal('Deployment UID');
    });
  });
});
