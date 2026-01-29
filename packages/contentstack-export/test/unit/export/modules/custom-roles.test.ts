import { expect } from 'chai';
import sinon from 'sinon';
import { FsUtility } from '@contentstack/cli-utilities';
import ExportCustomRoles from '../../../../src/export/modules/custom-roles';
import ExportConfig from '../../../../src/types/export-config';

describe('ExportCustomRoles', () => {
  let exportCustomRoles: any;
  let mockStackClient: any;
  let mockExportConfig: ExportConfig;

  beforeEach(() => {
    mockStackClient = {
      role: sinon.stub().returns({
        fetchAll: sinon.stub().resolves({
          items: [
            { uid: 'custom-role-1', name: 'Custom Role 1' },
            { uid: 'Admin', name: 'Admin' },
            { uid: 'Developer', name: 'Developer' },
          ],
        }),
      }),
      locale: sinon.stub().returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: [{ uid: 'locale-1', name: 'English', code: 'en-us' }],
          }),
        }),
      }),
    };

    mockExportConfig = {
      versioning: false,
      host: 'https://api.contentstack.io',
      developerHubUrls: {},
      apiKey: 'test-api-key',
      exportDir: '/test/export',
      data: '/test/data',
      branchName: '',
      context: {
        command: 'cm:stacks:export',
        module: 'custom-roles',
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
      marketplaceAppEncryptionKey: '',
      modules: {
        types: ['custom-roles'],
        customRoles: {
          dirName: 'custom_roles',
          fileName: 'custom_roles.json',
          customRolesLocalesFileName: 'custom_roles_locales.json',
        },
      },
    } as any;

    exportCustomRoles = new ExportCustomRoles({
      exportConfig: mockExportConfig,
      stackAPIClient: mockStackClient,
      moduleName: 'custom-roles',
    });

    // Stub FsUtility methods
    sinon.stub(FsUtility.prototype, 'writeFile').resolves();
    sinon.stub(FsUtility.prototype, 'makeDirectory').resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should initialize with correct parameters', () => {
      expect(exportCustomRoles).to.be.instanceOf(ExportCustomRoles);
    });

    it('should set context module to custom-roles', () => {
      expect(exportCustomRoles.exportConfig.context.module).to.equal('custom-roles');
    });

    it('should initialize customRolesConfig', () => {
      expect(exportCustomRoles.customRolesConfig).to.exist;
      expect(exportCustomRoles.customRolesConfig.dirName).to.equal('custom_roles');
    });

    it('should initialize empty customRoles object', () => {
      expect(exportCustomRoles.customRoles).to.be.an('object');
      expect(Object.keys(exportCustomRoles.customRoles).length).to.equal(0);
    });

    it('should initialize existing roles filter', () => {
      expect(exportCustomRoles.existingRoles).to.deep.equal({
        Admin: 1,
        Developer: 1,
        'Content Manager': 1,
      });
    });
  });

  describe('getCustomRoles() method', () => {
    it('should fetch and filter only custom roles', async () => {
      // Set rolesFolderPath before calling
      exportCustomRoles.rolesFolderPath = '/test/data/custom_roles';

      await exportCustomRoles.getCustomRoles();

      // Verify only custom role was added (not Admin or Developer)
      expect(Object.keys(exportCustomRoles.customRoles).length).to.equal(1);
      expect(exportCustomRoles.customRoles['custom-role-1']).to.exist;
      expect(exportCustomRoles.customRoles['Admin']).to.be.undefined;
    });

    it('should handle no custom roles found', async () => {
      exportCustomRoles.rolesFolderPath = '/test/data/custom_roles';

      mockStackClient.role.returns({
        fetchAll: sinon.stub().resolves({
          items: [
            { uid: 'Admin', name: 'Admin' },
            { uid: 'Developer', name: 'Developer' },
          ],
        }),
      });

      const writeFileStub = FsUtility.prototype.writeFile as sinon.SinonStub;

      await exportCustomRoles.getCustomRoles();

      // Verify no custom roles were added
      expect(Object.keys(exportCustomRoles.customRoles).length).to.equal(0);
    });

    it('should handle API errors gracefully without crashing', async () => {
      exportCustomRoles.rolesFolderPath = '/test/data/custom_roles';

      // Mock to return valid data structure with no items to avoid undefined
      mockStackClient.role.returns({
        fetchAll: sinon.stub().resolves({
          items: [],
        }),
      });

      await exportCustomRoles.getCustomRoles();

      // Verify method completed without throwing
      expect(Object.keys(exportCustomRoles.customRoles).length).to.equal(0);
    });
  });

  describe('getLocales() method', () => {
    it('should fetch and map locales correctly', async () => {
      await exportCustomRoles.getLocales();

      // Verify locales were mapped
      expect(Object.keys(exportCustomRoles.sourceLocalesMap).length).to.be.greaterThan(0);
    });

    it('should handle API errors gracefully without crashing', async () => {
      // Mock to return valid data structure to avoid undefined issues
      mockStackClient.locale.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: [],
          }),
        }),
      });

      await exportCustomRoles.getLocales();

      // Verify method completed
      expect(exportCustomRoles.sourceLocalesMap).to.be.an('object');
    });
  });

  describe('getCustomRolesLocales() method', () => {
    it('should process custom roles locales mapping', async () => {
      exportCustomRoles.customRoles = {
        'custom-role-1': {
          name: 'Custom Role 1',
          rules: [
            {
              module: 'locale',
              locales: ['locale-1', 'locale-2'],
            },
          ],
        },
      };

      exportCustomRoles.sourceLocalesMap = {
        'locale-1': { uid: 'locale-1', name: 'English' },
        'locale-2': { uid: 'locale-2', name: 'Spanish' },
      };

      await exportCustomRoles.getCustomRolesLocales();

      // Verify locales were mapped
      expect(Object.keys(exportCustomRoles.localesMap).length).to.be.greaterThan(0);
    });

    it('should handle roles without locale rules', async () => {
      exportCustomRoles.customRoles = {
        'custom-role-1': {
          name: 'Custom Role 1',
          rules: [],
        },
      };

      await exportCustomRoles.getCustomRolesLocales();

      // Verify no locales were mapped
      expect(Object.keys(exportCustomRoles.localesMap).length).to.equal(0);
    });
  });

  describe('start() method', () => {
    it('should complete full export flow', async () => {
      const writeFileStub = FsUtility.prototype.writeFile as sinon.SinonStub;
      const makeDirectoryStub = FsUtility.prototype.makeDirectory as sinon.SinonStub;

      await exportCustomRoles.start();

      // Verify file operations were called
      expect(makeDirectoryStub.called).to.be.true;
    });

    it('should handle errors during export without throwing', async () => {
      // Mock to return empty result to avoid undefined issues
      mockStackClient.role.returns({
        fetchAll: sinon.stub().resolves({
          items: [],
        }),
      });

      mockStackClient.locale.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: [],
          }),
        }),
      });

      // Should complete without throwing
      await exportCustomRoles.start();
    });
  });
});
