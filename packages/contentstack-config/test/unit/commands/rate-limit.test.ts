import { expect } from 'chai';
import { stub } from 'sinon';
import { cliux, configHandler } from '@contentstack/cli-utilities';
import SetRateLimitCommand from '../../../src/commands/config/set/rate-limit';
import GetRateLimitCommand from '../../../src/commands/config/get/rate-limit';
import RemoveRateLimitCommand from '../../../src/commands/config/remove/rate-limit';
import { askOrgID } from '../../../src/utils/interactive';

let config = configHandler;

describe('Rate Limit Commands', () => {
  let originalCliuxError: typeof cliux.error;
  let originalCliuxPrint: typeof cliux.print;
  let originalCliuxInquire: typeof cliux.inquire;
  let errorMessage: any;
  let printMessage: any;

  beforeEach(() => {
    originalCliuxError = cliux.error;
    originalCliuxPrint = cliux.print;
    originalCliuxInquire = cliux.inquire;
    cliux.error = (message: string) => {
      errorMessage = message;
    };
    cliux.print = (message: string) => {
      printMessage = message;
    };
  });

  afterEach(() => {
    cliux.error = originalCliuxError;
    cliux.print = originalCliuxPrint;
  });

  describe('Set Rate Limit Command', () => {
    it('Set Rate Limit: with all flags, should be successful', async () => {
      const stub1 = stub(SetRateLimitCommand.prototype, 'run');
      const args = ['--org', 'test-org-id', '--utilize', '70,80', '--limit-name', 'getLimit,bulkLimit'];
      await SetRateLimitCommand.run(args);
      expect(stub1.calledOnce).to.be.true;
      stub1.restore();
    });

    it('Set Rate Limit: should handle invalid utilization percentages', async () => {
      const args = ['--org', 'test-org-id', '--utilize', '150', '--limit-name', 'getLimit'];
      await SetRateLimitCommand.run(args);
      expect(errorMessage).to.equal('Utilize percentages must be numbers between 0 and 100.');
    });

    it('Set Rate Limit: should handle mismatch between utilize percentages and limit names', async () => {
      const args = ['--org', 'test-org-id', '--utilize', '70', '--limit-name', 'getLimit,postLimit'];
      await SetRateLimitCommand.run(args);
      expect(errorMessage).to.equal(
        'The number of utilization percentages must match the number of limit names provided.',
      );
    });

    it('Set Rate Limit: should handle invalid number of limit names', async () => {
      const args = ['--org', 'test-org-id', '--utilize', '70,80', '--limit-name', 'getLimit'];
      await SetRateLimitCommand.run(args);
      expect(errorMessage).to.equal(
        'The number of utilization percentages must match the number of limit names provided.',
      );
    });

    it('Set Rate Limit: should prompt for the organization UID', async () => {
      const inquireStub = stub(cliux, 'inquire').resolves('test-org-id');
      const orgID = await askOrgID();
      expect(orgID).to.equal('test-org-id');
      inquireStub.restore();
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
      config.set('rateLimit', rateLimit);
      await GetRateLimitCommand.run(['--org', 'test-org-id']);
      expect(printMessage).to.include(' test-org-id 10(70%)             0                   1(80%)              ');
    });

    it('Get Rate Limit: should throw an error if the organization is not found', async () => {
      config.set('rateLimit', {});
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
      config.set('rateLimit', rateLimit);
      await RemoveRateLimitCommand.run(['--org', 'test-org-id']);
      const updatedRateLimit = config.get('rateLimit');
      expect(updatedRateLimit['test-org-id']).to.be.undefined;
      expect(printMessage).to.equal('Rate limit entry for organization UID test-org-id has been removed.');
    });

    it('Remove Rate Limit: should throw an error if the organization is not found', async () => {
      config.set('rateLimit', {});
      try {
        await RemoveRateLimitCommand.run(['--org', 'non-existent-org']);
      } catch (error) {
        expect(errorMessage).to.equal('Error: Organization not found');
      }
    });
  });
});
