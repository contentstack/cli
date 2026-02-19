import { expect } from 'chai';
import { stub, restore } from 'sinon'; // Import restore for cleaning up
import { cliux, configHandler } from '@contentstack/cli-utilities';
import SetRateLimitCommand from '../../../src/commands/config/set/rate-limit';
import GetRateLimitCommand from '../../../src/commands/config/get/rate-limit';
import RemoveRateLimitCommand from '../../../src/commands/config/remove/rate-limit';
import { askOrgID } from '../../../src/utils/interactive';
import { RateLimitHandler } from '../../../src/utils/rate-limit-handler';
import { defaultRalteLimitConfig } from '../../../src/utils/common-utilities';

describe('Rate Limit Commands', () => {
  let originalCliuxError: typeof cliux.error;
  let originalCliuxPrint: typeof cliux.print;
  let errorMessage: any;
  let printMessage: any;
  let rateLimitHandler: RateLimitHandler;
  let mockClient: any;

  beforeEach(() => {
    restore();
    originalCliuxError = cliux.error;
    originalCliuxPrint = cliux.print;
    errorMessage = undefined;
    printMessage = undefined;

    cliux.error = (message: string) => {
      errorMessage = message;
    };
    cliux.print = (message: string) => {
      printMessage = message;
    };
    rateLimitHandler = new RateLimitHandler();
    mockClient = {
      organization: stub().returns({
        fetch: stub().resolves({ plan: { features: [{ uid: 'getLimit' }, { uid: 'bulkLimit' }] } }),
      }),
    };
    rateLimitHandler.setClient(mockClient);
  });

  afterEach(() => {
    cliux.error = originalCliuxError;
    cliux.print = originalCliuxPrint;
  });

  describe('Set Rate Limit Command', () => {
    it('Set Rate Limit: with all flags, should be successful', async () => {
      const stub1 = stub(SetRateLimitCommand.prototype, 'run').resolves();
      const args = ['--org', 'test-org-id', '--utilize', '70,80', '--limit-name', 'getLimit,bulkLimit'];
      await SetRateLimitCommand.run(args);
      expect(stub1.calledOnce).to.be.true;
    });

    it('Set Rate Limit: should handle invalid utilization percentages', async () => {
      const exitStub = stub(SetRateLimitCommand.prototype, 'exit').callsFake((code?: number) => {
        throw new Error(`EXIT:${code}`);
      });

      const args = ['--org', 'test-org-id', '--utilize', '150', '--limit-name', 'getLimit'];
      let thrown: Error | undefined;
      try {
        await SetRateLimitCommand.run(args);
      } catch (e) {
        thrown = e as Error;
      }

      expect(thrown?.message).to.equal('EXIT:1');
      expect(exitStub.calledWith(1)).to.be.true;
      // Command calls cliux.error('Utilization percentages must be numbers between 0 and 100.') before exit(1)

      exitStub.restore();
    });

    it('Set Rate Limit: should handle mismatch between utilize percentages and limit names', async () => {
      const exitStub = stub(SetRateLimitCommand.prototype, 'exit').callsFake((code?: number) => {
        throw new Error(`EXIT:${code}`);
      });

      const args = ['--org', 'test-org-id', '--utilize', '70', '--limit-name', 'getLimit,postLimit'];
      let thrown: Error | undefined;
      try {
        await SetRateLimitCommand.run(args);
      } catch (e) {
        thrown = e as Error;
      }

      expect(thrown?.message).to.equal('EXIT:1');
      expect(exitStub.calledWith(1)).to.be.true;
      // Command calls cliux.error('The number of utilization percentages must match...') before exit(1)

      exitStub.restore();
    });

    it('Set Rate Limit: should handle invalid number of limit names', async () => {
      const exitStub = stub(SetRateLimitCommand.prototype, 'exit').callsFake((code?: number) => {
        throw new Error(`EXIT:${code}`);
      });

      const args = ['--org', 'test-org-id', '--utilize', '70,80', '--limit-name', 'getLimit'];
      let thrown: Error | undefined;
      try {
        await SetRateLimitCommand.run(args);
      } catch (e) {
        thrown = e as Error;
      }

      expect(thrown?.message).to.equal('EXIT:1');
      expect(exitStub.calledWith(1)).to.be.true;
      // Command calls cliux.error('The number of utilization percentages must match...') before exit(1)

      exitStub.restore();
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
      } catch (error: unknown) {
        expect(error).to.be.an('error');
        expect((error as Error).message).to.equal('Error: Client Error');
      }
    });

    it.skip('Set Rate Limit: should handle unauthenticated user', async () => {
      // Skipped: isAuthenticated from @contentstack/cli-utilities is non-configurable and cannot be
      // stubbed by Sinon. The unauthenticated path is exercised in integration or when not logged in.
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
      } catch (error: unknown) {
        expect(error).to.exist;
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
      configHandler.set('rateLimit', rateLimit);
      await RemoveRateLimitCommand.run(['--org', 'test-org-id']);
      const updatedRateLimit = configHandler.get('rateLimit');
      expect(updatedRateLimit['test-org-id']).to.be.undefined;
      expect(printMessage).to.equal('Rate limit entry for organization UID test-org-id has been removed.');
    });

    it('Remove Rate Limit: should throw an error if the organization is not found', async () => {
      configHandler.set('rateLimit', {});
      try {
        await RemoveRateLimitCommand.run(['--org', 'non-existent-org']);
      } catch (error: unknown) {
        expect(error).to.exist;
        expect(errorMessage).to.equal('Error: Organization not found');
      }
    });
  });
});
