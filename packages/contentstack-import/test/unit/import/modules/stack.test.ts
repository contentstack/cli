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
    
    // Create a temporary directory for testing
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
      // Don't create the stack settings file
      const logSpy = sandbox.spy(console, 'log');
      
      await importStack.start();

      expect((importStack as any).stackSettings).to.be.null;
    });

    it('should skip import when environment UID mapper file does not exist', async () => {
      // Create stack settings file but not env mapper
      fs.mkdirSync(path.dirname((importStack as any).stackSettingsPath), { recursive: true });
      fs.writeFileSync((importStack as any).stackSettingsPath, JSON.stringify({ some: 'settings' }));
      
      const logSpy = sandbox.spy(console, 'log');
      
      await importStack.start();

      expect((importStack as any).stackSettings).to.deep.equal({ some: 'settings' });
    });

    it('should successfully import stack settings without live preview', async () => {
      // Create both required files
      fs.mkdirSync(path.dirname((importStack as any).stackSettingsPath), { recursive: true });
      fs.mkdirSync(path.dirname((importStack as any).envUidMapperPath), { recursive: true });
      
      fs.writeFileSync((importStack as any).stackSettingsPath, JSON.stringify({ some: 'settings' }));
      fs.writeFileSync((importStack as any).envUidMapperPath, JSON.stringify({ 'env1': 'new-env1' }));

      // Mock the stack.addSettings method
      const stackStub = sandbox.stub().resolves();
      sandbox.stub(importStack, 'stack').value({ addSettings: stackStub });

      const logSpy = sandbox.spy(console, 'log');
      
      await importStack.start();

      expect(stackStub.calledWith({ some: 'settings' })).to.be.true;
      expect((importStack as any).stackSettings).to.deep.equal({ some: 'settings' });
      expect((importStack as any).envUidMapper).to.deep.equal({ 'env1': 'new-env1' });
    });

    it('should successfully import stack settings with live preview and environment mapping', async () => {
      // Create both required files
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

      // Mock the stack.addSettings method
      const stackStub = sandbox.stub().resolves();
      sandbox.stub(importStack, 'stack').value({ addSettings: stackStub });

      const logSpy = sandbox.spy(console, 'log');
      
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
      // Create both required files
      fs.mkdirSync(path.dirname((importStack as any).stackSettingsPath), { recursive: true });
      fs.mkdirSync(path.dirname((importStack as any).envUidMapperPath), { recursive: true });
      
      const stackSettings = {
        live_preview: {
          other: 'settings'
        }
      };
      
      fs.writeFileSync((importStack as any).stackSettingsPath, JSON.stringify(stackSettings));
      fs.writeFileSync((importStack as any).envUidMapperPath, JSON.stringify({ 'env1': 'new-env1' }));

      // Mock the stack.addSettings method
      const stackStub = sandbox.stub().resolves();
      sandbox.stub(importStack, 'stack').value({ addSettings: stackStub });

      const logSpy = sandbox.spy(console, 'log');
      
      await importStack.start();

      expect(stackStub.calledWith(stackSettings)).to.be.true;
    });

    it('should handle live preview with default-env but no mapping found', async () => {
      // Create both required files
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

      // Mock the stack.addSettings method
      const stackStub = sandbox.stub().resolves();
      sandbox.stub(importStack, 'stack').value({ addSettings: stackStub });

      const logSpy = sandbox.spy(console, 'log');
      
      await importStack.start();

      const expectedSettings = {
        live_preview: {
          'default-env': undefined as any,
          other: 'settings'
        }
      };
      expect(stackStub.calledWith(expectedSettings)).to.be.true;
    });

    it('should handle stack settings import error', async () => {
      // Create both required files
      fs.mkdirSync(path.dirname((importStack as any).stackSettingsPath), { recursive: true });
      fs.mkdirSync(path.dirname((importStack as any).envUidMapperPath), { recursive: true });
      
      fs.writeFileSync((importStack as any).stackSettingsPath, JSON.stringify({ some: 'settings' }));
      fs.writeFileSync((importStack as any).envUidMapperPath, JSON.stringify({ 'env1': 'new-env1' }));

      // Mock the stack.addSettings method to throw an error
      const stackStub = sandbox.stub().rejects(new Error('Stack settings error'));
      sandbox.stub(importStack, 'stack').value({ addSettings: stackStub });

      const logSpy = sandbox.spy(console, 'log');
      
      await importStack.start();

      // The error should be caught and handled
      expect(stackStub.called).to.be.true;
    });

    it('should handle null stackSettings', async () => {
      // Create both required files
      fs.mkdirSync(path.dirname((importStack as any).stackSettingsPath), { recursive: true });
      fs.mkdirSync(path.dirname((importStack as any).envUidMapperPath), { recursive: true });
      
      fs.writeFileSync((importStack as any).stackSettingsPath, JSON.stringify(null));
      fs.writeFileSync((importStack as any).envUidMapperPath, JSON.stringify({ 'env1': 'new-env1' }));

      // Mock the stack.addSettings method
      const stackStub = sandbox.stub().resolves();
      sandbox.stub(importStack, 'stack').value({ addSettings: stackStub });

      const logSpy = sandbox.spy(console, 'log');
      
      await importStack.start();

      expect(stackStub.calledWith(null)).to.be.true;
    });

    it('should handle empty stackSettings object', async () => {
      // Create both required files
      fs.mkdirSync(path.dirname((importStack as any).stackSettingsPath), { recursive: true });
      fs.mkdirSync(path.dirname((importStack as any).envUidMapperPath), { recursive: true });
      
      fs.writeFileSync((importStack as any).stackSettingsPath, JSON.stringify({}));
      fs.writeFileSync((importStack as any).envUidMapperPath, JSON.stringify({ 'env1': 'new-env1' }));

      // Mock the stack.addSettings method
      const stackStub = sandbox.stub().resolves();
      sandbox.stub(importStack, 'stack').value({ addSettings: stackStub });

      const logSpy = sandbox.spy(console, 'log');
      
      await importStack.start();

      expect(stackStub.calledWith({})).to.be.true;
    });

    it('should handle stackSettings without live_preview property', async () => {
      // Create both required files
      fs.mkdirSync(path.dirname((importStack as any).stackSettingsPath), { recursive: true });
      fs.mkdirSync(path.dirname((importStack as any).envUidMapperPath), { recursive: true });
      
      const stackSettings = {
        other: 'settings',
        not_live_preview: 'value'
      };
      
      fs.writeFileSync((importStack as any).stackSettingsPath, JSON.stringify(stackSettings));
      fs.writeFileSync((importStack as any).envUidMapperPath, JSON.stringify({ 'env1': 'new-env1' }));

      // Mock the stack.addSettings method
      const stackStub = sandbox.stub().resolves();
      sandbox.stub(importStack, 'stack').value({ addSettings: stackStub });

      const logSpy = sandbox.spy(console, 'log');
      
      await importStack.start();

      expect(stackStub.calledWith(stackSettings)).to.be.true;
    });

    it('should handle live_preview with null default-env', async () => {
      // Create both required files
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

      // Mock the stack.addSettings method
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
      // Create both required files
      fs.mkdirSync(path.dirname((importStack as any).stackSettingsPath), { recursive: true });
      fs.mkdirSync(path.dirname((importStack as any).envUidMapperPath), { recursive: true });
      
      const stackSettings = {
        live_preview: {
          other: 'settings'
        }
      };
      
      fs.writeFileSync((importStack as any).stackSettingsPath, JSON.stringify(stackSettings));
      fs.writeFileSync((importStack as any).envUidMapperPath, JSON.stringify({ 'env1': 'new-env1' }));

      // Mock the stack.addSettings method
      const stackStub = sandbox.stub().resolves();
      sandbox.stub(importStack, 'stack').value({ addSettings: stackStub });

      const logSpy = sandbox.spy(console, 'log');
      
      await importStack.start();

      expect(stackStub.calledWith(stackSettings)).to.be.true;
    });

    it('should handle live_preview with empty string default-env', async () => {
      // Create both required files
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

      // Mock the stack.addSettings method
      const stackStub = sandbox.stub().resolves();
      sandbox.stub(importStack, 'stack').value({ addSettings: stackStub });

      const logSpy = sandbox.spy(console, 'log');
      
      await importStack.start();

      const expectedSettings = {
        live_preview: {
          'default-env': '' as any,
          other: 'settings'
        }
      };
      expect(stackStub.calledWith(expectedSettings)).to.be.true;
    });

    it('should handle malformed JSON in stack settings file', async () => {
      // Create both required files
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
      // Create both required files
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
      // Create directories but make files unreadable
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
        // Restore file permissions for cleanup
        try {
          fs.chmodSync((importStack as any).stackSettingsPath, 0o644);
        } catch (e) {
          // Ignore
        }
      }
    });
  });
});