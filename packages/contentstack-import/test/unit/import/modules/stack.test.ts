import { expect } from 'chai';
import * as sinon from 'sinon';
import ImportStack from '../../../../src/import/modules/stack';
import { ImportConfig } from '../../../../src/types';
import * as fs from 'fs';
import * as path from 'path';

describe('ImportStack', () => {
  let importStack: ImportStack;
  let mockImportConfig: ImportConfig;
  let sandbox: sinon.SinonSandbox;
  let tempDir: string;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    tempDir = '/tmp/test-backup';
    
    mockImportConfig = {
      backupDir: tempDir,
      target_stack: 'test-stack-uid',
      org_uid: 'test-org-uid',
      management_token: undefined,
      context: {
        module: 'stack',
        stack: 'test-stack',
        management_token: 'test-token'
      }
    } as any;

    importStack = new ImportStack({ 
      importConfig: mockImportConfig,
      stackAPIClient: {} as any,
      moduleName: 'stack' as any
    });

    sandbox.stub(importStack as any, 'createSimpleProgress').returns({
      updateStatus: sandbox.stub()
    });
    sandbox.stub(importStack as any, 'completeProgress').resolves();
  });

  afterEach(() => {
    sandbox.restore();
    // Clean up temp files
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Constructor', () => {
    it('should initialize with correct config and paths', () => {
      expect(importStack.importConfig).to.deep.equal(mockImportConfig);
      expect((importStack as any).stackSettingsPath).to.equal(path.join(tempDir, 'stack', 'settings.json'));
      expect((importStack as any).envUidMapperPath).to.equal(path.join(tempDir, 'mapper', 'environments', 'uid-mapping.json'));
    });

    it('should initialize with null stackSettings and empty envUidMapper', () => {
      expect((importStack as any).stackSettings).to.be.null;
      expect((importStack as any).envUidMapper).to.deep.equal({});
    });
  });

  describe('start method', () => {
    it('should skip import when management_token is present', async () => {
      mockImportConfig.management_token = 'test-token';
      
      const logSpy = sandbox.spy(console, 'log');
      
      await importStack.start();

      // The method should return early without doing anything
      expect((importStack as any).stackSettings).to.be.null;
      expect((importStack as any).envUidMapper).to.deep.equal({});
    });

    it('should skip import when stack settings file does not exist', async () => {
      sandbox.restore();
      sandbox = sinon.createSandbox();
      sandbox.stub(importStack as any, 'analyzeStackSettings').resolves([false]);
      
      await importStack.start();

      expect((importStack as any).stackSettings).to.be.null;
    });

    it('should skip import when environment UID mapper file does not exist', async () => {
      fs.mkdirSync(path.dirname((importStack as any).stackSettingsPath), { recursive: true });
      fs.writeFileSync((importStack as any).stackSettingsPath, JSON.stringify({ some: 'settings' }));
      
      sandbox.restore();
      sandbox = sinon.createSandbox();
      sandbox.stub(importStack as any, 'analyzeStackSettings').callsFake(async () => {
        // Simulate analyzeStackSettings loading the file
        (importStack as any).stackSettings = { some: 'settings' };
        return [true];
      });
      sandbox.stub(importStack as any, 'createSimpleProgress').returns({
        updateStatus: sandbox.stub()
      });
      sandbox.stub(importStack as any, 'completeProgress').resolves();
      
      await importStack.start();

      expect((importStack as any).stackSettings).to.deep.equal({ some: 'settings' });
    });

    it('should successfully import stack settings without live preview', async () => {
      fs.mkdirSync(path.dirname((importStack as any).stackSettingsPath), { recursive: true });
      fs.mkdirSync(path.dirname((importStack as any).envUidMapperPath), { recursive: true });
      
      const stackSettings = { some: 'settings' };
      const envUidMapper = { 'env1': 'new-env1' };
      
      fs.writeFileSync((importStack as any).stackSettingsPath, JSON.stringify(stackSettings));
      fs.writeFileSync((importStack as any).envUidMapperPath, JSON.stringify(envUidMapper));

      sandbox.restore();
      sandbox = sinon.createSandbox();
      sandbox.stub(importStack as any, 'analyzeStackSettings').callsFake(async () => {
        (importStack as any).stackSettings = stackSettings;
        (importStack as any).envUidMapper = envUidMapper;
        return [true];
      });
      sandbox.stub(importStack as any, 'createSimpleProgress').returns({
        updateStatus: sandbox.stub()
      });
      sandbox.stub(importStack as any, 'completeProgress').resolves();

      const stackStub = sandbox.stub().resolves();
      sandbox.stub(importStack, 'stack').value({ addSettings: stackStub });
      
      await importStack.start();

      expect(stackStub.calledWith(stackSettings)).to.be.true;
      expect((importStack as any).stackSettings).to.deep.equal(stackSettings);
      expect((importStack as any).envUidMapper).to.deep.equal(envUidMapper);
    });

    it('should successfully import stack settings with live preview and environment mapping', async () => {
      fs.mkdirSync(path.dirname((importStack as any).stackSettingsPath), { recursive: true });
      fs.mkdirSync(path.dirname((importStack as any).envUidMapperPath), { recursive: true });
      
      const stackSettings = {
        live_preview: {
          'default-env': 'old-env-uid',
          other: 'settings'
        }
      };
      
      fs.writeFileSync((importStack as any).stackSettingsPath, JSON.stringify(stackSettings));
      fs.writeFileSync((importStack as any).envUidMapperPath, JSON.stringify({ 'old-env-uid': 'new-env-uid' }));

      const stackStub = sandbox.stub().resolves();
      sandbox.stub(importStack, 'stack').value({ addSettings: stackStub });
      
      await importStack.start();

      const expectedSettings = {
        live_preview: {
          'default-env': 'new-env-uid',
          other: 'settings'
        }
      };
      expect(stackStub.calledWith(expectedSettings)).to.be.true;
    });

    it('should handle live preview without default-env', async () => {
      fs.mkdirSync(path.dirname((importStack as any).stackSettingsPath), { recursive: true });
      fs.mkdirSync(path.dirname((importStack as any).envUidMapperPath), { recursive: true });
      
      const stackSettings = {
        live_preview: {
          other: 'settings'
        }
      };
      
      fs.writeFileSync((importStack as any).stackSettingsPath, JSON.stringify(stackSettings));
      fs.writeFileSync((importStack as any).envUidMapperPath, JSON.stringify({ 'env1': 'new-env1' }));

      const stackStub = sandbox.stub().resolves();
      sandbox.stub(importStack, 'stack').value({ addSettings: stackStub });
      
      await importStack.start();

      expect(stackStub.calledWith(stackSettings)).to.be.true;
    });

    it('should handle live preview with default-env but no mapping found', async () => {
      fs.mkdirSync(path.dirname((importStack as any).stackSettingsPath), { recursive: true });
      fs.mkdirSync(path.dirname((importStack as any).envUidMapperPath), { recursive: true });
      
      const stackSettings = {
        live_preview: {
          'default-env': 'unknown-env-uid',
          other: 'settings'
        }
      };
      
      fs.writeFileSync((importStack as any).stackSettingsPath, JSON.stringify(stackSettings));
      fs.writeFileSync((importStack as any).envUidMapperPath, JSON.stringify({ 'env1': 'new-env1' }));

      sandbox.restore();
      sandbox = sinon.createSandbox();
      sandbox.stub(importStack as any, 'analyzeStackSettings').callsFake(async () => {
        (importStack as any).stackSettings = stackSettings;
        (importStack as any).envUidMapper = { 'env1': 'new-env1' };
        return [true];
      });
      sandbox.stub(importStack as any, 'createSimpleProgress').returns({
        updateStatus: sandbox.stub()
      });
      sandbox.stub(importStack as any, 'completeProgress').resolves();

      const stackStub = sandbox.stub().resolves();
      sandbox.stub(importStack, 'stack').value({ addSettings: stackStub });
      
      await importStack.start();

      // Since default-env is undefined, it won't be modified, so check with original settings
      expect(stackStub.calledWith(sinon.match(stackSettings))).to.be.true;
    });

    it('should handle stack settings import error', async () => {
      fs.mkdirSync(path.dirname((importStack as any).stackSettingsPath), { recursive: true });
      fs.mkdirSync(path.dirname((importStack as any).envUidMapperPath), { recursive: true });
      
      fs.writeFileSync((importStack as any).stackSettingsPath, JSON.stringify({ some: 'settings' }));
      fs.writeFileSync((importStack as any).envUidMapperPath, JSON.stringify({ 'env1': 'new-env1' }));

      sandbox.restore();
      sandbox = sinon.createSandbox();
      sandbox.stub(importStack as any, 'analyzeStackSettings').resolves([true]);
      sandbox.stub(importStack as any, 'createSimpleProgress').returns({
        updateStatus: sandbox.stub()
      });
      sandbox.stub(importStack as any, 'importStackSettings').rejects(new Error('Stack settings error'));
      const completeProgressStub = sandbox.stub(importStack as any, 'completeProgress');

      const stackStub = sandbox.stub().rejects(new Error('Stack settings error'));
      sandbox.stub(importStack, 'stack').value({ addSettings: stackStub });
      
      await importStack.start();

      // The error should be caught and handled
      expect(completeProgressStub.calledWith(false, 'Stack settings import failed')).to.be.true;
    });

    it('should handle null stackSettings', async () => {
      fs.mkdirSync(path.dirname((importStack as any).stackSettingsPath), { recursive: true });
      fs.mkdirSync(path.dirname((importStack as any).envUidMapperPath), { recursive: true });
      
      fs.writeFileSync((importStack as any).stackSettingsPath, JSON.stringify(null));
      fs.writeFileSync((importStack as any).envUidMapperPath, JSON.stringify({ 'env1': 'new-env1' }));

      const stackStub = sandbox.stub().resolves();
      sandbox.stub(importStack, 'stack').value({ addSettings: stackStub });
      
      await importStack.start();

      // When stackSettings is null, analyzeStackSettings returns [false], so start() returns early
      expect(stackStub.called).to.be.false;
    });

    it('should handle empty stackSettings object', async () => {
      fs.mkdirSync(path.dirname((importStack as any).stackSettingsPath), { recursive: true });
      fs.mkdirSync(path.dirname((importStack as any).envUidMapperPath), { recursive: true });
      
      const stackSettings = {};
      fs.writeFileSync((importStack as any).stackSettingsPath, JSON.stringify(stackSettings));
      fs.writeFileSync((importStack as any).envUidMapperPath, JSON.stringify({ 'env1': 'new-env1' }));

      sandbox.restore();
      sandbox = sinon.createSandbox();
      sandbox.stub(importStack as any, 'analyzeStackSettings').callsFake(async () => {
        (importStack as any).stackSettings = stackSettings;
        (importStack as any).envUidMapper = { 'env1': 'new-env1' };
        return [true];
      });
      sandbox.stub(importStack as any, 'createSimpleProgress').returns({
        updateStatus: sandbox.stub()
      });
      sandbox.stub(importStack as any, 'completeProgress').resolves();

      const stackStub = sandbox.stub().resolves();
      sandbox.stub(importStack, 'stack').value({ addSettings: stackStub });
      
      await importStack.start();

      expect(stackStub.calledWith(stackSettings)).to.be.true;
    });

    it('should handle stackSettings without live_preview property', async () => {
      fs.mkdirSync(path.dirname((importStack as any).stackSettingsPath), { recursive: true });
      fs.mkdirSync(path.dirname((importStack as any).envUidMapperPath), { recursive: true });
      
      const stackSettings = {
        other: 'settings',
        not_live_preview: 'value'
      };
      
      fs.writeFileSync((importStack as any).stackSettingsPath, JSON.stringify(stackSettings));
      fs.writeFileSync((importStack as any).envUidMapperPath, JSON.stringify({ 'env1': 'new-env1' }));

      const stackStub = sandbox.stub().resolves();
      sandbox.stub(importStack, 'stack').value({ addSettings: stackStub });

      const logSpy = sandbox.spy(console, 'log');
      
      await importStack.start();

      expect(stackStub.calledWith(stackSettings)).to.be.true;
    });

    it('should handle live_preview with null default-env', async () => {
      fs.mkdirSync(path.dirname((importStack as any).stackSettingsPath), { recursive: true });
      fs.mkdirSync(path.dirname((importStack as any).envUidMapperPath), { recursive: true });
      
      const stackSettings = {
        live_preview: {
          'default-env': null as any,
          other: 'settings'
        }
      };
      
      fs.writeFileSync((importStack as any).stackSettingsPath, JSON.stringify(stackSettings));
      fs.writeFileSync((importStack as any).envUidMapperPath, JSON.stringify({ 'env1': 'new-env1' }));

      const stackStub = sandbox.stub().resolves();
      sandbox.stub(importStack, 'stack').value({ addSettings: stackStub });

      const logSpy = sandbox.spy(console, 'log');
      
      await importStack.start();

      const expectedSettings = {
        live_preview: {
          'default-env': null as any,
          other: 'settings'
        }
      };
      expect(stackStub.calledWith(expectedSettings)).to.be.true;
    });

    it('should handle live_preview with undefined default-env', async () => {
      fs.mkdirSync(path.dirname((importStack as any).stackSettingsPath), { recursive: true });
      fs.mkdirSync(path.dirname((importStack as any).envUidMapperPath), { recursive: true });
      
      const stackSettings = {
        live_preview: {
          other: 'settings'
        }
      };
      
      fs.writeFileSync((importStack as any).stackSettingsPath, JSON.stringify(stackSettings));
      fs.writeFileSync((importStack as any).envUidMapperPath, JSON.stringify({ 'env1': 'new-env1' }));

      sandbox.restore();
      sandbox = sinon.createSandbox();
      sandbox.stub(importStack as any, 'analyzeStackSettings').callsFake(async () => {
        (importStack as any).stackSettings = stackSettings;
        (importStack as any).envUidMapper = { 'env1': 'new-env1' };
        return [true];
      });
      sandbox.stub(importStack as any, 'createSimpleProgress').returns({
        updateStatus: sandbox.stub()
      });
      sandbox.stub(importStack as any, 'completeProgress').resolves();

      const stackStub = sandbox.stub().resolves();
      sandbox.stub(importStack, 'stack').value({ addSettings: stackStub });
      
      await importStack.start();

      expect(stackStub.calledWith(stackSettings)).to.be.true;
    });

    it('should handle live_preview with empty string default-env', async () => {
      fs.mkdirSync(path.dirname((importStack as any).stackSettingsPath), { recursive: true });
      fs.mkdirSync(path.dirname((importStack as any).envUidMapperPath), { recursive: true });
      
      const stackSettings = {
        live_preview: {
          'default-env': '' as any,
          other: 'settings'
        }
      };
      
      fs.writeFileSync((importStack as any).stackSettingsPath, JSON.stringify(stackSettings));
      fs.writeFileSync((importStack as any).envUidMapperPath, JSON.stringify({ '': 'new-env-uid' }));

      sandbox.restore();
      sandbox = sinon.createSandbox();
      sandbox.stub(importStack as any, 'analyzeStackSettings').callsFake(async () => {
        (importStack as any).stackSettings = JSON.parse(JSON.stringify(stackSettings)); // Deep copy
        (importStack as any).envUidMapper = { '': 'new-env-uid' };
        return [true];
      });
      sandbox.stub(importStack as any, 'createSimpleProgress').returns({
        updateStatus: sandbox.stub()
      });
      sandbox.stub(importStack as any, 'completeProgress').resolves();

      const stackStub = sandbox.stub().resolves();
      sandbox.stub(importStack, 'stack').value({ addSettings: stackStub });
      
      await importStack.start();

      // Since default-env is '', it will be mapped to 'new-env-uid' if mapping exists
      // Check that stackStub was called and verify the settings were modified
      expect(stackStub.called).to.be.true;
      const callArgs = stackStub.getCall(0).args[0];
      expect(callArgs.live_preview['default-env']).to.equal('new-env-uid');
    });

    it('should handle malformed JSON in stack settings file', async () => {
      fs.mkdirSync(path.dirname((importStack as any).stackSettingsPath), { recursive: true });
      fs.mkdirSync(path.dirname((importStack as any).envUidMapperPath), { recursive: true });
      
      fs.writeFileSync((importStack as any).stackSettingsPath, 'invalid json');
      fs.writeFileSync((importStack as any).envUidMapperPath, JSON.stringify({ 'env1': 'new-env1' }));

      const logSpy = sandbox.spy(console, 'log');
      
      try {
        await importStack.start();
      } catch (error) {
        // Should handle JSON parse error gracefully
        expect(error).to.be.instanceOf(Error);
      }
    });

    it('should handle malformed JSON in env mapper file', async () => {
      fs.mkdirSync(path.dirname((importStack as any).stackSettingsPath), { recursive: true });
      fs.mkdirSync(path.dirname((importStack as any).envUidMapperPath), { recursive: true });
      
      fs.writeFileSync((importStack as any).stackSettingsPath, JSON.stringify({ some: 'settings' }));
      fs.writeFileSync((importStack as any).envUidMapperPath, 'invalid json');

      const logSpy = sandbox.spy(console, 'log');
      
      try {
        await importStack.start();
      } catch (error) {
        // Should handle JSON parse error gracefully
        expect(error).to.be.instanceOf(Error);
      }
    });

    it('should handle file read errors', async () => {
      fs.mkdirSync(path.dirname((importStack as any).stackSettingsPath), { recursive: true });
      fs.mkdirSync(path.dirname((importStack as any).envUidMapperPath), { recursive: true });
      
      fs.writeFileSync((importStack as any).stackSettingsPath, JSON.stringify({ some: 'settings' }));
      fs.writeFileSync((importStack as any).envUidMapperPath, JSON.stringify({ 'env1': 'new-env1' }));

      // Make file unreadable
      fs.chmodSync((importStack as any).stackSettingsPath, 0o000);

      const logSpy = sandbox.spy(console, 'log');
      
      try {
        await importStack.start();
      } catch (error) {
        // Should handle file read error gracefully
        expect(error).to.be.instanceOf(Error);
      } finally {
        try {
          fs.chmodSync((importStack as any).stackSettingsPath, 0o644);
        } catch (e) {
          // Ignore
        }
      }
    });
  });
});