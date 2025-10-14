import { expect } from 'chai';
import { fancy } from 'fancy-test';
import sinon from 'sinon';
import { ImportConfig } from '../../../src/types';

// We'll use proxyquire to mock the dependencies
const proxyquire = require('proxyquire');

describe('Setup Branch Utility', () => {
  let mockStackAPIClient: any;
  let mockConfig: ImportConfig;
  let validateBranchStub: sinon.SinonStub;
  let getBranchFromAliasStub: sinon.SinonStub;
  let logInfoStub: sinon.SinonStub;
  let logDebugStub: sinon.SinonStub;
  let setupBranchConfig: any;

  beforeEach(() => {
    // Create mock stack API client
    mockStackAPIClient = {
      branch: sinon.stub().returns({
        query: sinon.stub().returns({
          find: sinon.stub()
        }),
        fetch: sinon.stub()
      })
    };

    // Create mock config
    mockConfig = {
      branchName: undefined,
      branchAlias: undefined,
      apiKey: 'test',
      contentDir: '/test/content'
    } as ImportConfig;

    // Create stubs
    validateBranchStub = sinon.stub();
    getBranchFromAliasStub = sinon.stub();
    logInfoStub = sinon.stub();
    logDebugStub = sinon.stub();

    // Use proxyquire to mock the dependencies
    setupBranchConfig = proxyquire('../../../src/utils/setup-branch', {
      '@contentstack/cli-utilities': {
        getBranchFromAlias: getBranchFromAliasStub,
        log: {
          info: logInfoStub,
          debug: logDebugStub
        }
      },
      './common-helper': {
        validateBranch: validateBranchStub
      }
    }).setupBranchConfig;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('setupBranchConfig', () => {
    it('should call validateBranch when branchName is provided', async () => {
      // Arrange
      mockConfig.branchName = 'feature-branch';
      validateBranchStub.resolves({ uid: 'feature-branch' });

      // Act
      await setupBranchConfig(mockConfig, mockStackAPIClient);

      // Assert
      expect(validateBranchStub.calledOnce).to.be.true;
      expect(validateBranchStub.calledWith(mockStackAPIClient, mockConfig, 'feature-branch')).to.be.true;
      expect(getBranchFromAliasStub.called).to.be.false;
    });

    it('should handle validateBranch rejection when branchName is provided', async () => {
      // Arrange
      mockConfig.branchName = 'invalid-branch';
      const error = new Error('Branch not found');
      validateBranchStub.rejects(error);

      // Act & Assert
      try {
        await setupBranchConfig(mockConfig, mockStackAPIClient);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
        expect(validateBranchStub.calledOnce).to.be.true;
      }
    });

    it('should call getBranchFromAlias when branchAlias is provided', async () => {
      // Arrange
      mockConfig.branchAlias = 'production';
      getBranchFromAliasStub.resolves('main');

      // Act
      await setupBranchConfig(mockConfig, mockStackAPIClient);

      // Assert
      expect(getBranchFromAliasStub.calledOnce).to.be.true;
      expect(getBranchFromAliasStub.calledWith(mockStackAPIClient, 'production')).to.be.true;
      expect(mockConfig.branchName).to.equal('main');
      expect(validateBranchStub.called).to.be.false;
    });

    it('should handle getBranchFromAlias rejection when branchAlias is provided', async () => {
      // Arrange
      mockConfig.branchAlias = 'invalid-alias';
      const error = new Error('Alias not found');
      getBranchFromAliasStub.rejects(error);

      // Act & Assert
      try {
        await setupBranchConfig(mockConfig, mockStackAPIClient);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
        expect(getBranchFromAliasStub.calledOnce).to.be.true;
      }
    });

    it('should set main branch as default when branches exist and no branch config provided', async () => {
      // Arrange
      const mockBranches = [
        { uid: 'main', name: 'Main Branch' },
        { uid: 'develop', name: 'Development Branch' }
      ];
      
      mockStackAPIClient.branch().query().find.resolves({ items: mockBranches });

      // Act
      await setupBranchConfig(mockConfig, mockStackAPIClient);

      // Assert
      expect(mockConfig.branchName).to.equal('main');
      expect(logInfoStub.calledWith('The stack is branch-enabled, and branches exist. By default, content will be imported into the main branch.')).to.be.true;
      expect(logDebugStub.calledWith('Setting default target branch to \'main\'')).to.be.true;
    });

    it('should not set branch when no branches exist', async () => {
      // Arrange
      mockStackAPIClient.branch().query().find.resolves({ items: [] });

      // Act
      await setupBranchConfig(mockConfig, mockStackAPIClient);

      // Assert
      expect(mockConfig.branchName).to.be.undefined;
      expect(logInfoStub.called).to.be.false;
    });

    it('should handle API error gracefully when fetching branches', async () => {
      // Arrange
      const error = new Error('API Error');
      mockStackAPIClient.branch().query().find.rejects(error);

      // Act
      await setupBranchConfig(mockConfig, mockStackAPIClient);

      // Assert
      expect(mockConfig.branchName).to.be.undefined;
      expect(logDebugStub.calledWith('Failed to fetch branches', { error })).to.be.true;
    });

    it('should prioritize branchName over branchAlias when both are provided', async () => {
      // Arrange
      mockConfig.branchName = 'feature-branch';
      mockConfig.branchAlias = 'production';
      validateBranchStub.resolves({ uid: 'feature-branch' });

      // Act
      await setupBranchConfig(mockConfig, mockStackAPIClient);

      // Assert
      expect(validateBranchStub.calledOnce).to.be.true;
      expect(validateBranchStub.calledWith(mockStackAPIClient, mockConfig, 'feature-branch')).to.be.true;
      expect(getBranchFromAliasStub.called).to.be.false;
    });

    it('should handle empty branch items array', async () => {
      // Arrange
      mockStackAPIClient.branch().query().find.resolves({ items: null });

      // Act
      await setupBranchConfig(mockConfig, mockStackAPIClient);

      // Assert
      expect(mockConfig.branchName).to.be.undefined;
      expect(logInfoStub.called).to.be.false;
    });

    it('should handle undefined branch items', async () => {
      // Arrange
      mockStackAPIClient.branch().query().find.resolves({ items: undefined });

      // Act
      await setupBranchConfig(mockConfig, mockStackAPIClient);

      // Assert
      expect(mockConfig.branchName).to.be.undefined;
      expect(logInfoStub.called).to.be.false;
    });

    it('should handle malformed API response', async () => {
      // Arrange
      mockStackAPIClient.branch().query().find.resolves({});

      // Act
      await setupBranchConfig(mockConfig, mockStackAPIClient);

      // Assert
      expect(mockConfig.branchName).to.be.undefined;
      expect(logInfoStub.called).to.be.false;
    });

    it('should handle network timeout error', async () => {
      // Arrange
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      mockStackAPIClient.branch().query().find.rejects(timeoutError);

      // Act
      await setupBranchConfig(mockConfig, mockStackAPIClient);

      // Assert
      expect(mockConfig.branchName).to.be.undefined;
      expect(logDebugStub.calledWith('Failed to fetch branches', { error: timeoutError })).to.be.true;
    });

    it('should handle single branch in array', async () => {
      // Arrange
      const mockBranches = [{ uid: 'main', name: 'Main Branch' }];
      mockStackAPIClient.branch().query().find.resolves({ items: mockBranches });

      // Act
      await setupBranchConfig(mockConfig, mockStackAPIClient);

      // Assert
      expect(mockConfig.branchName).to.equal('main');
      expect(logInfoStub.calledOnce).to.be.true;
      expect(logDebugStub.calledWith('Setting default target branch to \'main\'')).to.be.true;
    });

    it('should handle multiple branches and still set main as default', async () => {
      // Arrange
      const mockBranches = [
        { uid: 'main', name: 'Main Branch' },
        { uid: 'develop', name: 'Development Branch' },
        { uid: 'feature-1', name: 'Feature 1' },
        { uid: 'feature-2', name: 'Feature 2' }
      ];
      mockStackAPIClient.branch().query().find.resolves({ items: mockBranches });

      // Act
      await setupBranchConfig(mockConfig, mockStackAPIClient);

      // Assert
      expect(mockConfig.branchName).to.equal('main');
      expect(logInfoStub.calledOnce).to.be.true;
      expect(logDebugStub.calledWith('Setting default target branch to \'main\'')).to.be.true;
    });
  });
});
