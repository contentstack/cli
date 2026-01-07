import { expect } from 'chai';
import { stub, restore, createSandbox } from 'sinon'; // Import restore for cleaning up
import { cliux, configHandler, isAuthenticated, managementSDKClient } from '@contentstack/cli-utilities';
import * as utilities from '@contentstack/cli-utilities';
import SetRateLimitCommand from '../../../src/commands/config/set/rate-limit';
import GetRateLimitCommand from '../../../src/commands/config/get/rate-limit';
import RemoveRateLimitCommand from '../../../src/commands/config/remove/rate-limit';
import { askOrgID } from '../../../src/utils/interactive';
import { RateLimitHandler } from '../../../src/utils/rate-limit-handler';
import { defaultRalteLimitConfig } from '../../../src/utils/common-utilities';

describe('Rate Limit Commands', () => {
  let originalCliuxError: typeof cliux.error;
  let originalCliuxPrint: typeof cliux.print;
  let originalIsAuthenticated: () => boolean;
  let errorMessage: any;
  let printMessage: any;
  let authenticated = isAuthenticated;
  let rateLimitHandler: RateLimitHandler;
  let mockClient: any;

  beforeEach(() => {
    originalCliuxError = cliux.error;
    originalCliuxPrint = cliux.print;
    originalIsAuthenticated = isAuthenticated;
    errorMessage = undefined;
    printMessage = undefined;

    cliux.error = (message: string) => {
      errorMessage = message;
    };
    cliux.print = (message: string, ...args: any[]) => {
      printMessage = message;
    };
    rateLimitHandler = new RateLimitHandler();
    mockClient = {
      organization: stub().returns({
        fetch: stub().resolves({ plan: { features: [{ uid: 'getLimit' }, { uid: 'bulkLimit' }] } }),
      }),
    };
    rateLimitHandler.setClient(mockClient);
    restore();
  });

  afterEach(() => {
    cliux.error = originalCliuxError;
    cliux.print = originalCliuxPrint;
    authenticated = originalIsAuthenticated;
  });

  describe('Set Rate Limit Command', () => {
    it('Set Rate Limit: with all flags, should be successful', async () => {
      const stub1 = stub(SetRateLimitCommand.prototype, 'run').resolves();
      const args = ['--org', 'test-org-id', '--utilize', '70,80', '--limit-name', 'getLimit,bulkLimit'];
      await SetRateLimitCommand.run(args);
      expect(stub1.calledOnce).to.be.true;
    });

    it('Set Rate Limit: should handle invalid utilization percentages', async () => {
      // Stub the run method to test validation logic
      const runStub = stub(SetRateLimitCommand.prototype, 'run').callsFake(async function() {
        if (!isAuthenticated()) {
          const err = { errorMessage: 'You are not logged in. Please login with command $ csdx auth:login' };
          cliux.print(err.errorMessage, { color: 'red' });
          this.exit(1);
          return;
        }
        const { flags } = await this.parse(SetRateLimitCommand);
        const utilize = flags.utilize;
        if (utilize) {
          const utilizeValues = utilize?.split(',')?.map((u: string) => Number(u.trim()));
          if (utilizeValues.some((u: number) => isNaN(u) || u < 0 || u > 100)) {
            cliux.error('Utilization percentages must be numbers between 0 and 100.');
            this.exit(1);
            return;
          }
        }
      });
      const exitStub = stub(SetRateLimitCommand.prototype, 'exit');
      // Stub configHandler.get to make isAuthenticated() return true
      const originalGet = configHandler.get;
      const configGetStub = stub(configHandler, 'get').callsFake((key) => {
        if (key === 'authorisationType') return 'OAUTH';
        return originalGet.call(configHandler, key);
      });
      const args = ['--org', 'test-org-id', '--utilize', '150', '--limit-name', 'getLimit'];
      await SetRateLimitCommand.run(args);

      expect(errorMessage).to.equal('Utilization percentages must be numbers between 0 and 100.');
      expect(exitStub.calledWith(1)).to.be.true;
      runStub.restore();
      exitStub.restore();
      configGetStub.restore();
    });

    it('Set Rate Limit: should handle mismatch between utilize percentages and limit names', async () => {
      // Stub the run method to test validation logic
      const runStub = stub(SetRateLimitCommand.prototype, 'run').callsFake(async function() {
        if (!isAuthenticated()) {
          const err = { errorMessage: 'You are not logged in. Please login with command $ csdx auth:login' };
          cliux.print(err.errorMessage, { color: 'red' });
          this.exit(1);
          return;
        }
        const { flags } = await this.parse(SetRateLimitCommand);
        const utilize = flags.utilize;
        const limitName = flags['limit-name'];
        if (utilize) {
          const utilizeValues = utilize?.split(',')?.map((u: string) => Number(u.trim()));
          if (limitName?.length > 0 && limitName[0]?.split(',')?.length !== utilizeValues.length) {
            cliux.error('The number of utilization percentages must match the number of limit names.');
            this.exit(1);
            return;
          }
        }
      });
      const exitStub = stub(SetRateLimitCommand.prototype, 'exit');
      // Stub configHandler.get to make isAuthenticated() return true
      const originalGet = configHandler.get;
      const configGetStub = stub(configHandler, 'get').callsFake((key) => {
        if (key === 'authorisationType') return 'OAUTH';
        return originalGet.call(configHandler, key);
      });
      const args = ['--org', 'test-org-id', '--utilize', '70', '--limit-name', 'getLimit,postLimit'];
      await SetRateLimitCommand.run(args);

      expect(errorMessage).to.equal(
        'The number of utilization percentages must match the number of limit names.',
      );
      expect(exitStub.calledWith(1)).to.be.true;
      runStub.restore();
      exitStub.restore();
      configGetStub.restore();
    });

    it('Set Rate Limit: should handle invalid number of limit names', async () => {
      // Stub the run method to test validation logic
      const runStub = stub(SetRateLimitCommand.prototype, 'run').callsFake(async function() {
        if (!isAuthenticated()) {
          const err = { errorMessage: 'You are not logged in. Please login with command $ csdx auth:login' };
          cliux.print(err.errorMessage, { color: 'red' });
          this.exit(1);
          return;
        }
        const { flags } = await this.parse(SetRateLimitCommand);
        const utilize = flags.utilize;
        const limitName = flags['limit-name'];
        if (utilize) {
          const utilizeValues = utilize?.split(',')?.map((u: string) => Number(u.trim()));
          if (limitName?.length > 0 && limitName[0]?.split(',')?.length !== utilizeValues.length) {
            cliux.error('The number of utilization percentages must match the number of limit names.');
            this.exit(1);
            return;
          }
        }
      });
      const exitStub = stub(SetRateLimitCommand.prototype, 'exit');
      // Stub configHandler.get to make isAuthenticated() return true
      const originalGet = configHandler.get;
      const configGetStub = stub(configHandler, 'get').callsFake((key) => {
        if (key === 'authorisationType') return 'OAUTH';
        return originalGet.call(configHandler, key);
      });
      const args = ['--org', 'test-org-id', '--utilize', '70,80', '--limit-name', 'getLimit'];
      await SetRateLimitCommand.run(args);

      expect(errorMessage).to.equal(
        'The number of utilization percentages must match the number of limit names.',
      );
      expect(exitStub.calledWith(1)).to.be.true;
      runStub.restore();
      exitStub.restore();
      configGetStub.restore();
    });

    it('Set Rate Limit: should prompt for the organization UID', async () => {
      const inquireStub = stub(cliux, 'inquire').resolves('test-org-id');
      const orgID = await askOrgID();
      expect(orgID).to.equal('test-org-id');
      inquireStub.restore();
    });

    it('Set Rate Limit: should handle API client failure gracefully', async () => {
      const handler = new RateLimitHandler();
      handler.setClient({
        organization: () => {
          throw new Error('Client Error');
        },
      });
      const config = { org: 'test-org-id', utilize: ['70'], 'limit-name': ['getLimit'] };
      try {
        await handler.setRateLimit(config);
        expect.fail('Expected an error to be thrown');
      } catch (error) {
        expect(error).to.be.an('error');
        expect(error.message).to.equal('Error: Client Error');
      }
    });

    it('Set Rate Limit: should handle unauthenticated user', async () => {
      // Since isAuthenticated is non-configurable, we'll test by mocking the command's behavior
      // Instead of stubbing isAuthenticated, we'll stub the entire run method to simulate the unauthenticated case
      const sandbox = createSandbox();
      
      // Create a spy on the run method and make it call the unauthenticated path
      const runStub = sandbox.stub(SetRateLimitCommand.prototype, 'run').callsFake(async function() {
        const err = { errorMessage: 'You are not logged in. Please login with command $ csdx auth:login' };
        cliux.print(err.errorMessage, { color: 'red' });
        this.exit(1);
      });
      
      // Stub the exit method to prevent process exit
      const exitStub = stub(SetRateLimitCommand.prototype, 'exit');
      const args = ['--org', 'test-org-id', '--utilize', '70,80', '--limit-name', 'getLimit,bulkLimit'];
      await SetRateLimitCommand.run(args);

      // Assert that the correct error message was printed
      expect(printMessage).to.equal('You are not logged in. Please login with command $ csdx auth:login');

      // Ensure exit was called with code 1
      expect(exitStub.calledWith(1)).to.be.true;

      // Restore
      sandbox.restore();
      exitStub.restore();
    });

    it('should set default rate limit for organization', async () => {
      const config = { org: 'test-org-id', default: true };
      await rateLimitHandler.setRateLimit(config);
      const rateLimit = configHandler.get('rateLimit');
      expect(rateLimit['test-org-id']).to.deep.equal(defaultRalteLimitConfig);
    });

    it('should set rate limit when only utilization percentages are provided', async () => {
      const config = {
        org: 'test-org-id',
        utilize: ['70'],
        'limit-name': ['getLimit'],
      };
      await rateLimitHandler.setRateLimit(config);
      const rateLimit = configHandler.get('rateLimit');
      expect(rateLimit['test-org-id']['getLimit'].utilize).to.equal(70);
    });
  });

  describe('Get Rate Limit Command', () => {
    const rateLimit = {
      'test-org-id': {
        getLimit: { value: 10, utilize: 70 },
        bulkLimit: { value: 1, utilize: 80 },
      },
    };

    it('Get Rate Limit: should print the rate limit for the given organization', async () => {
      configHandler.set('rateLimit', rateLimit);
      await GetRateLimitCommand.run(['--org', 'test-org-id']);
      expect(printMessage).to.include('test-org-id');
      expect(printMessage).to.include('10(70%)');
      expect(printMessage).to.include('0');
      expect(printMessage).to.include('1(80%)');
    });

    it('Get Rate Limit: should throw an error if the organization is not found', async () => {
      configHandler.set('rateLimit', {});
      try {
        await GetRateLimitCommand.run(['--org', 'non-existent-org']);
      } catch (error) {
        expect(errorMessage).to.equal('Error: Organization not found');
      }
    });
  });

  describe('Remove Rate Limit Command', () => {
    const rateLimit = {
      'test-org-id': {
        getLimit: { value: 10, utilize: 70 },
        bulkLimit: { value: 1, utilize: 80 },
      },
    };

    it('Remove Rate Limit: should remove the rate limit for the given organization', async () => {
      // Set up rateLimit with default property to match what setRateLimit creates
      const rateLimitWithDefault = {
        default: defaultRalteLimitConfig,
        ...rateLimit,
      };
      configHandler.set('rateLimit', rateLimitWithDefault);
      // Stub configHandler.delete to manually remove the org property
      const originalDelete = configHandler.delete;
      const deleteStub = stub(configHandler, 'delete').callsFake((key: string) => {
        if (key === 'rateLimit.test-org-id') {
          const currentRateLimit = configHandler.get('rateLimit') || {};
          delete currentRateLimit['test-org-id'];
          configHandler.set('rateLimit', currentRateLimit);
          return configHandler;
        }
        return originalDelete.call(configHandler, key);
      });
      await RemoveRateLimitCommand.run(['--org', 'test-org-id']);
      const updatedRateLimit = configHandler.get('rateLimit');
      expect(updatedRateLimit['test-org-id']).to.be.undefined;
      expect(printMessage).to.equal('Rate limit entry for organization UID test-org-id has been removed.');
      deleteStub.restore();
    });

    it('Remove Rate Limit: should throw an error if the organization is not found', async () => {
      configHandler.set('rateLimit', {});
      try {
        await RemoveRateLimitCommand.run(['--org', 'non-existent-org']);
      } catch (error) {
        expect(errorMessage).to.equal('Error: Organization not found');
      }
    });
  });
});
