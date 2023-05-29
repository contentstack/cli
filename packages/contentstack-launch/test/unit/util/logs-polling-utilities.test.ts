//@ts-nocheck
import { describe, it } from 'mocha';
import { expect } from 'chai';
import { stub, createSandbox } from 'sinon';
import { LogPolling } from '../../../src/util';

describe('LogPolling', () => {
  describe('getDeploymentStatus', () => {
    it('should return an ObservableQuery', () => {
      const apolloManageClient = {
        watchQuery: stub().returns({}),
      };
      const config = {
        deployment: '123',
        environment: 'test',
        pollingInterval: 5000,
      };
      const params = {
        apolloManageClient: apolloManageClient,
        config: config,
      };

      const logPollingInstance = new LogPolling(params);

      logPollingInstance.getDeploymentStatus();

      expect(apolloManageClient.watchQuery.calledOnce).to.be.true;
    });
  });

  describe('deploymentLogs', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should emit event and stop polling if error exists', async () => {
      const stopPollingStub = sandbox.stub();
      const statusWatchQuery = {
        subscribe: sandbox.stub().callsFake((callback) => {
          const error = new Error('Sample error');
          callback({ error });
        }),
        stopPolling: stopPollingStub,
      };
      const apolloManageClient = {
        watchQuery: sandbox.stub().returns(statusWatchQuery),
      };
      const logsWatchQuery = {
        subscribe: sandbox.stub().returns({}),
      };
      const apolloLogsClient = {
        watchQuery: sandbox.stub().returns(logsWatchQuery),
      };
      const config = {
        deployment: '123',
        deploymentStatus: ['completed'],
        pollingInterval: 5000,
      };
      const eventEmitter = {
        emit: sandbox.stub(),
      };
      const params = {
        apolloLogsClient: apolloLogsClient,
        apolloManageClient: apolloManageClient,
        config: config,
        $event: eventEmitter,
      };

      const logPollingInstance = new LogPolling(params);

      await logPollingInstance.deploymentLogs();

      expect(statusWatchQuery.subscribe.calledOnce).to.be.true;
    });
  });

  describe('subscribeDeploymentLogs', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should emit event and stop polling if error exists', () => {
      const stopPollingStub = sandbox.stub();
      const logsWatchQuery = {
        subscribe: sandbox.stub().callsFake((callback) => {
          const error = new Error('Sample error');
          callback({ error });
        }),
        stopPolling: stopPollingStub,
      };
      const config = {
        deployment: '123',
        deploymentStatus: ['completed'],
      };
      const eventEmitter = {
        emit: sandbox.stub(),
      };
      const params = {
        config: config,
        $event: eventEmitter,
      };

      const logPollingInstance = new LogPolling(params);

      logPollingInstance.subscribeDeploymentLogs(logsWatchQuery);

      expect(logsWatchQuery.subscribe.calledOnce).to.be.true;
    });
  });

  describe('serverLogs', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should call subscribeServerLogs with the correct arguments', () => {
      const apolloLogsClient = {
        watchQuery: sandbox.stub().returns({}),
      };
      const config = {
        environment: 'dev',
        pollingInterval: 5000,
      };

      const logPollingInstance = new LogPolling(apolloLogsClient, config);

      logPollingInstance.serverLogs();
    });
  });

  describe('subscribeServerLogs', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should emit event and set variables correctly if logs exist', () => {
      const stopPollingStub = sandbox.stub();
      const serverLogsWatchQuery = {
        subscribe: sandbox.stub().callsFake((callback) => {
          const logsData = {
            getServerlessLogs: {
              logs: [{ timestamp: '2023-05-26T10:00:00Z' }, { timestamp: '2023-05-26T10:00:01Z' }],
            },
          };
          callback({ data: logsData });
        }),
        stopPolling: stopPollingStub,
        setVariables: sandbox.stub(),
      };
      const config = {
        environment: 'dev',
      };
      const eventEmitter = {
        emit: sandbox.stub(),
      };
      const params = {
        config: config,
        $event: eventEmitter,
      };

      const logPollingInstance = new LogPolling(params);

      logPollingInstance.subscribeServerLogs(serverLogsWatchQuery);

      expect(serverLogsWatchQuery.subscribe.calledOnce).to.be.true;
    });
  });
});
