import { expect } from 'chai';
import { stub, restore, SinonStub, match } from 'sinon';
import { cliux } from '@contentstack/cli-utilities';
import { askAPIKey } from '../../src/utils/interactive';
import { validateBranch } from '../../src/utils/common-helper';
import { ImportConfig } from '../../src/types';
import * as utils from '../../src/utils';

describe('Common Helper Utilities', () => {
  let cliuxInquireStub: SinonStub;
  let mockStackApiClient: any;
  let mockFetchStub: SinonStub;
  let logStub: SinonStub;

  // Base mock config that satisfies ImportConfig type
  const baseConfig: Partial<ImportConfig> = {
    contentDir: '/content/path',
    data: '/content/path',
    apiKey: 'test-api-key',
    forceStopMarketplaceAppsPrompt: false,
    master_locale: { code: 'en-us' },
    masterLocale: { code: 'en-us' },
    branchName: '',
    selectedModules: ['entries'],
    backupDir: '',
    region: 'us',
  };

  beforeEach(() => {
    restore();
    logStub = stub(utils, 'log');
  });

  afterEach(() => {
    restore();
  });

  describe('askAPIKey', () => {
    it('should prompt user for API key and return the response', async () => {
      const mockApiKey = 'test-api-key-12345';

      cliuxInquireStub = stub(cliux, 'inquire').resolves(mockApiKey);

      const result = await askAPIKey();

      expect(result).to.equal(mockApiKey);
      expect(cliuxInquireStub.calledOnce).to.be.true;

      const callArgs = cliuxInquireStub.firstCall.args[0];
      expect(callArgs.type).to.equal('input');
      expect(callArgs.message).to.equal('Enter the stack api key');
      expect(callArgs.name).to.equal('apiKey');
    });

    it('should handle empty API key input', async () => {
      const emptyApiKey = '';

      cliuxInquireStub = stub(cliux, 'inquire').resolves(emptyApiKey);

      const result = await askAPIKey();

      expect(result).to.equal(emptyApiKey);
      expect(cliuxInquireStub.calledOnce).to.be.true;
    });

    it('should handle inquire errors', async () => {
      const error = new Error('Inquire failed');

      cliuxInquireStub = stub(cliux, 'inquire').rejects(error);

      try {
        await askAPIKey();
        expect.fail('Expected an error to be thrown');
      } catch (err) {
        expect((err as Error).message).to.equal('Inquire failed');
      }
    });

    it('should validate the inquire call structure', async () => {
      const mockApiKey = 'valid-api-key';

      cliuxInquireStub = stub(cliux, 'inquire').resolves(mockApiKey);

      await askAPIKey();

      expect(cliuxInquireStub.calledOnce).to.be.true;

      const inquireOptions = cliuxInquireStub.firstCall.args[0];
      expect(inquireOptions).to.have.property('type', 'input');
      expect(inquireOptions).to.have.property('message', 'Enter the stack api key');
      expect(inquireOptions).to.have.property('name', 'apiKey');
    });
  });

  describe('validateBranch', () => {
    beforeEach(() => {
      mockFetchStub = stub();
      mockStackApiClient = {
        branch: stub().returns({
          fetch: mockFetchStub,
        }),
      };
    });

    it('should resolve with branch data when branch exists', async () => {
      const branchName = 'development';
      const mockBranchData = { uid: 'branch-123', name: 'development' };

      mockFetchStub.resolves(mockBranchData);

      const result = await validateBranch(mockStackApiClient, baseConfig as ImportConfig, branchName);

      expect(result).to.equal(mockBranchData);
      expect(mockStackApiClient.branch.calledWith(branchName)).to.be.true;
      expect(mockFetchStub.calledOnce).to.be.true;
    });

    it('should reject when branch has error_message', async () => {
      const branchName = 'non-existent';
      const errorMessage = 'Branch not found';
      const mockErrorResponse = {
        error_message: errorMessage,
      };

      mockFetchStub.resolves(mockErrorResponse);

      try {
        await validateBranch(mockStackApiClient, baseConfig as ImportConfig, branchName);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('No branch found with the name');
        expect(error.error).to.equal(errorMessage);
      }
    });

    it('should reject when API call throws error', async () => {
      const branchName = 'error-branch';
      const mockError = new Error('API error');

      mockFetchStub.rejects(mockError);

      try {
        await validateBranch(mockStackApiClient, baseConfig as ImportConfig, branchName);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('No branch found with the name');
        expect(error.error).to.equal(mockError);
      }
    });

    it('should reject when response is not an object', async () => {
      const branchName = 'invalid-response';

      mockFetchStub.resolves('not-an-object');

      try {
        await validateBranch(mockStackApiClient, baseConfig as ImportConfig, branchName);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('No branch found with the name');
        expect(logStub.called).to.be.false;
      }
    });
  });
});
