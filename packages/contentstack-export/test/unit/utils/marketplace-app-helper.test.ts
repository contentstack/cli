import { expect } from 'chai';
import sinon from 'sinon';
import * as utilities from '@contentstack/cli-utilities';
import { getDeveloperHubUrl, getOrgUid, createNodeCryptoInstance } from '../../../src/utils/marketplace-app-helper';
import { ExportConfig } from '../../../src/types';

describe('Marketplace App Helper Utils', () => {
  let sandbox: sinon.SinonSandbox;
  let mockExportConfig: ExportConfig;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    mockExportConfig = {
      versioning: false,
      host: 'https://api.contentstack.io',
      developerHubUrls: {},
      apiKey: 'test-api-key',
      exportDir: '/test/export',
      data: '/test/data',
      branchName: '',
      source_stack: 'test-stack-uid',
      context: {
        command: 'cm:stacks:export',
        module: 'marketplace-apps',
        userId: 'user-123',
        email: 'test@example.com',
        sessionId: 'session-123',
        apiKey: 'test-api-key',
        orgId: 'org-123',
        authenticationMethod: 'Basic Auth',
      },
      cliLogsPath: '/test/logs',
      forceStopMarketplaceAppsPrompt: false,
      master_locale: { code: 'en-us' },
      region: {
        name: 'us',
        cma: 'https://api.contentstack.io',
        cda: 'https://cdn.contentstack.io',
        uiHost: 'https://app.contentstack.com',
      },
      skipStackSettings: false,
      skipDependencies: false,
      languagesCode: ['en'],
      apis: {},
      preserveStackVersion: false,
      personalizationEnabled: false,
      fetchConcurrency: 5,
      writeConcurrency: 5,
      developerHubBaseUrl: '',
      marketplaceAppEncryptionKey: 'test-encryption-key',
      modules: {
        types: ['marketplace-apps'],
        marketplace_apps: {
          dirName: 'marketplace-apps',
          fileName: 'marketplace-apps.json',
        },
      },
    } as any;
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('getDeveloperHubUrl', () => {
    it('should return developer hub URL by calling createDeveloperHubUrl', async () => {
      // Since createDeveloperHubUrl is non-configurable, we test the actual behavior
      // The function is a simple wrapper, so we verify it returns a value
      const result = await getDeveloperHubUrl(mockExportConfig);

      // Should return a URL (actual implementation behavior)
      expect(result).to.be.a('string');
      expect(result).to.include('developer');
    });

    it('should handle different host URLs', async () => {
      mockExportConfig.host = 'https://eu-api.contentstack.com';

      const result = await getDeveloperHubUrl(mockExportConfig);

      // Should return a URL based on the host
      expect(result).to.be.a('string');
      expect(result.length).to.be.greaterThan(0);
    });

    it('should return a valid URL string', async () => {
      const result = await getDeveloperHubUrl(mockExportConfig);

      expect(result).to.be.a('string');
      expect(result.length).to.be.greaterThan(0);
    });
  });

  describe('getOrgUid', () => {
    it('should fetch and return org_uid from stack data', async () => {
      const mockStackData = {
        org_uid: 'test-org-uid-123',
        name: 'Test Stack',
        uid: 'stack-uid',
      };

      const mockFetch = sandbox.stub().resolves(mockStackData);
      const mockStack = sandbox.stub().returns({ fetch: mockFetch });
      const mockAPIClient = {
        stack: mockStack,
      };

      // Use replaceGetter since managementSDKClient is a getter
      const managementSDKClientSpy = sandbox.spy(async (config: any) => {
        expect(config).to.deep.equal({ host: 'https://api.contentstack.io' });
        return mockAPIClient;
      });
      sandbox.replaceGetter(utilities, 'managementSDKClient', () => managementSDKClientSpy);

      const result = await getOrgUid(mockExportConfig);

      expect(managementSDKClientSpy.calledOnce).to.be.true;
      expect(mockStack.calledOnce).to.be.true;
      expect(mockStack.firstCall.args[0]).to.deep.equal({ api_key: 'test-stack-uid' });
      expect(mockFetch.calledOnce).to.be.true;
      expect(result).to.equal('test-org-uid-123');
    });

    it('should use source_stack from config as api_key', async () => {
      mockExportConfig.source_stack = 'custom-stack-key';
      const mockStackData = { org_uid: 'org-123' };

      const mockFetch = sandbox.stub().resolves(mockStackData);
      const mockStack = sandbox.stub().returns({ fetch: mockFetch });
      const mockAPIClient = { stack: mockStack };

      sandbox.replaceGetter(utilities, 'managementSDKClient', () => async () => mockAPIClient);

      await getOrgUid(mockExportConfig);

      expect(mockStack.firstCall.args[0]).to.deep.equal({ api_key: 'custom-stack-key' });
    });

    it('should handle API errors gracefully', async () => {
      const mockError = new Error('API Error');
      const handleAndLogErrorSpy = sandbox.spy();
      sandbox.replaceGetter(utilities, 'handleAndLogError', () => handleAndLogErrorSpy);

      const mockFetch = sandbox.stub().rejects(mockError);
      const mockStack = sandbox.stub().returns({ fetch: mockFetch });
      const mockAPIClient = { stack: mockStack };

      const managementSDKClientSpy = sandbox.spy(async () => mockAPIClient);
      sandbox.replaceGetter(utilities, 'managementSDKClient', () => managementSDKClientSpy);

      const result = await getOrgUid(mockExportConfig);

      expect(handleAndLogErrorSpy.calledOnce).to.be.true;
      expect(handleAndLogErrorSpy.getCall(0).args[0]).to.equal(mockError);
      expect(handleAndLogErrorSpy.getCall(0).args[1]).to.deep.equal(mockExportConfig.context);
      expect(result).to.be.undefined;
    });

    it('should return undefined when stack data is null', async () => {
      const mockFetch = sandbox.stub().resolves(null);
      const mockStack = sandbox.stub().returns({ fetch: mockFetch });
      const mockAPIClient = { stack: mockStack };

      sandbox.replaceGetter(utilities, 'managementSDKClient', () => async () => mockAPIClient);

      const result = await getOrgUid(mockExportConfig);

      expect(result).to.be.undefined;
    });

    it('should return undefined when stack data has no org_uid', async () => {
      const mockStackData = {
        name: 'Test Stack',
        uid: 'stack-uid',
        // No org_uid property
      };

      const mockFetch = sandbox.stub().resolves(mockStackData);
      const mockStack = sandbox.stub().returns({ fetch: mockFetch });
      const mockAPIClient = { stack: mockStack };

      sandbox.replaceGetter(utilities, 'managementSDKClient', () => async () => mockAPIClient);

      const result = await getOrgUid(mockExportConfig);

      expect(result).to.be.undefined;
    });

    it('should use the correct host from config', async () => {
      mockExportConfig.host = 'https://eu-api.contentstack.com';
      const mockStackData = { org_uid: 'org-123' };

      const mockFetch = sandbox.stub().resolves(mockStackData);
      const mockStack = sandbox.stub().returns({ fetch: mockFetch });
      const mockAPIClient = { stack: mockStack };

      const managementSDKClientSpy = sandbox.spy(async (config: any) => {
        expect(config).to.deep.equal({ host: 'https://eu-api.contentstack.com' });
        return mockAPIClient;
      });
      sandbox.replaceGetter(utilities, 'managementSDKClient', () => managementSDKClientSpy);

      await getOrgUid(mockExportConfig);

      expect(managementSDKClientSpy.calledOnce).to.be.true;
    });
  });

  describe('createNodeCryptoInstance', () => {
    it('should use marketplaceAppEncryptionKey when forceStopMarketplaceAppsPrompt is true', async () => {
      mockExportConfig.forceStopMarketplaceAppsPrompt = true;
      mockExportConfig.marketplaceAppEncryptionKey = 'test-key-123';

      const mockNodeCrypto = { encrypt: sandbox.stub() };
      const nodeCryptoConstructorSpy = sandbox.spy((args: any) => {
        expect(args.encryptionKey).to.equal('test-key-123');
        return mockNodeCrypto;
      });
      sandbox.replaceGetter(utilities, 'NodeCrypto', () => nodeCryptoConstructorSpy as any);

      const result = await createNodeCryptoInstance(mockExportConfig);

      expect(nodeCryptoConstructorSpy.calledOnce).to.be.true;
      expect(nodeCryptoConstructorSpy.getCall(0).args[0].encryptionKey).to.equal('test-key-123');
      expect(result).to.exist;
    });

    it('should prompt user for encryption key when forceStopMarketplaceAppsPrompt is false', async () => {
      mockExportConfig.forceStopMarketplaceAppsPrompt = false;
      mockExportConfig.marketplaceAppEncryptionKey = 'default-key';

      const mockInquireResponse = 'user-entered-key';
      const inquireStub = sandbox.stub(utilities.cliux, 'inquire').resolves(mockInquireResponse);

      const mockNodeCrypto = { encrypt: sandbox.stub() };
      const nodeCryptoConstructorSpy = sandbox.spy((args: any) => {
        expect(args.encryptionKey).to.equal(mockInquireResponse);
        return mockNodeCrypto;
      });
      sandbox.replaceGetter(utilities, 'NodeCrypto', () => nodeCryptoConstructorSpy as any);

      const result = await createNodeCryptoInstance(mockExportConfig);

      expect(inquireStub.calledOnce).to.be.true;
      const inquireArgs = inquireStub.getCall(0).args[0] as any;
      expect(inquireArgs.type).to.equal('input');
      expect(inquireArgs.name).to.equal('name');
      expect(inquireArgs.default).to.equal('default-key');
      expect(inquireArgs.message).to.equal('Enter Marketplace app configurations encryption key');
      expect(inquireArgs.validate).to.be.a('function');

      // Test validation function
      expect(inquireArgs.validate('')).to.equal("Encryption key can't be empty.");
      expect(inquireArgs.validate('valid-key')).to.equal(true);

      expect(nodeCryptoConstructorSpy.calledOnce).to.be.true;
      expect(nodeCryptoConstructorSpy.getCall(0).args[0].encryptionKey).to.equal(mockInquireResponse);
      expect(result).to.exist;
    });

    it('should use default encryption key from config when prompting', async () => {
      mockExportConfig.forceStopMarketplaceAppsPrompt = false;
      mockExportConfig.marketplaceAppEncryptionKey = 'my-default-key';

      const inquireStub = sandbox.stub(utilities.cliux, 'inquire').resolves('user-key');

      sandbox.replaceGetter(
        utilities,
        'NodeCrypto',
        () => sandbox.fake.returns({ encrypt: sandbox.stub() } as any) as any,
      );

      await createNodeCryptoInstance(mockExportConfig);

      const inquireArgs = inquireStub.firstCall.args[0] as any;
      expect(inquireArgs.default).to.equal('my-default-key');
    });

    it('should validate that encryption key is not empty', async () => {
      mockExportConfig.forceStopMarketplaceAppsPrompt = false;

      const inquireStub = sandbox.stub(utilities.cliux, 'inquire').callsFake(async (options: any) => {
        // Test validation
        const opts = Array.isArray(options) ? options[0] : options;
        // Empty string should return error message
        expect(opts.validate('')).to.equal("Encryption key can't be empty.");
        // Non-empty strings should return true (validation doesn't trim)
        expect(opts.validate('valid-key')).to.equal(true);
        expect(opts.validate('another-valid-key-123')).to.equal(true);

        return 'valid-key';
      });

      sandbox.replaceGetter(
        utilities,
        'NodeCrypto',
        () => sandbox.fake.returns({ encrypt: sandbox.stub() } as any) as any,
      );

      await createNodeCryptoInstance(mockExportConfig);

      expect(inquireStub.calledOnce).to.be.true;
    });

    it('should create NodeCrypto instance with correct arguments', async () => {
      mockExportConfig.forceStopMarketplaceAppsPrompt = true;
      mockExportConfig.marketplaceAppEncryptionKey = 'test-encryption-key';

      let capturedArgs: any;
      const nodeCryptoConstructorSpy = sandbox.spy((args: any) => {
        capturedArgs = args;
        return { encrypt: sandbox.stub() } as any;
      });
      sandbox.replaceGetter(utilities, 'NodeCrypto', () => nodeCryptoConstructorSpy as any);

      await createNodeCryptoInstance(mockExportConfig);

      expect(nodeCryptoConstructorSpy.calledOnce).to.be.true;
      expect(capturedArgs).to.deep.equal({ encryptionKey: 'test-encryption-key' });
    });

    it('should handle empty marketplaceAppEncryptionKey in config', async () => {
      mockExportConfig.forceStopMarketplaceAppsPrompt = true;
      mockExportConfig.marketplaceAppEncryptionKey = '';

      const nodeCryptoConstructorSpy = sandbox.spy((args: any) => {
        expect(args.encryptionKey).to.equal('');
        return { encrypt: sandbox.stub() } as any;
      });
      sandbox.replaceGetter(utilities, 'NodeCrypto', () => nodeCryptoConstructorSpy as any);

      await createNodeCryptoInstance(mockExportConfig);

      expect(nodeCryptoConstructorSpy.getCall(0).args[0].encryptionKey).to.equal('');
    });

    it('should handle undefined marketplaceAppEncryptionKey in config when prompting', async () => {
      mockExportConfig.forceStopMarketplaceAppsPrompt = false;
      mockExportConfig.marketplaceAppEncryptionKey = undefined as any;

      const inquireStub = sandbox.stub(utilities.cliux, 'inquire').resolves('prompted-key');

      sandbox.replaceGetter(
        utilities,
        'NodeCrypto',
        () => sandbox.fake.returns({ encrypt: sandbox.stub() } as any) as any,
      );

      await createNodeCryptoInstance(mockExportConfig);

      const inquireArgs = inquireStub.firstCall.args[0] as any;
      expect(inquireArgs.default).to.be.undefined;
    });

    it('should return NodeCrypto instance', async () => {
      mockExportConfig.forceStopMarketplaceAppsPrompt = true;
      mockExportConfig.marketplaceAppEncryptionKey = 'test-key';

      const mockNodeCrypto = {
        encrypt: sandbox.stub().returns('encrypted-data'),
      };

      sandbox.replaceGetter(utilities, 'NodeCrypto', () => sandbox.fake.returns(mockNodeCrypto) as any);

      const result = await createNodeCryptoInstance(mockExportConfig);

      expect(result).to.equal(mockNodeCrypto);
      expect(result.encrypt).to.be.a('function');
    });

    it('should not prompt when forceStopMarketplaceAppsPrompt is true even if key is empty', async () => {
      mockExportConfig.forceStopMarketplaceAppsPrompt = true;
      mockExportConfig.marketplaceAppEncryptionKey = '';

      const inquireStub = sandbox.stub(utilities.cliux, 'inquire');

      sandbox.replaceGetter(
        utilities,
        'NodeCrypto',
        () => sandbox.fake.returns({ encrypt: sandbox.stub() } as any) as any,
      );

      await createNodeCryptoInstance(mockExportConfig);

      expect(inquireStub.called).to.be.false;
    });
  });
});
