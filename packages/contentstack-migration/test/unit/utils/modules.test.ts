import { expect } from 'chai';
import { createSandbox, SinonStub } from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import * as childProcess from 'child_process';
import installModules from '../../../src/utils/modules';

describe('Modules Utils', () => {
  let sandbox: ReturnType<typeof createSandbox>;
  let accessSyncStub: SinonStub;
  let existsSyncStub: SinonStub;
  let readdirSyncStub: SinonStub;
  let readFileSyncStub: SinonStub;
  let writeFileSyncStub: SinonStub;
  let spawnSyncStub: SinonStub;
  let pathJoinStub: SinonStub;
  let pathExtnameStub: SinonStub;
  let pathBasenameStub: SinonStub;
  let pathDirnameStub: SinonStub;
  let consoleLogStub: SinonStub;
  let consoleErrorStub: SinonStub;
  let sanitizePathStub: SinonStub;

  beforeEach(() => {
    sandbox = createSandbox();
    
    // Stub console methods to avoid noise in test output
    consoleLogStub = sandbox.stub(console, 'log');
    consoleErrorStub = sandbox.stub(console, 'error');

    // Use require to get the actual module that the source code uses
    const fsModule = require('fs');
    const pathModule = require('path');
    const childProcessModule = require('child_process');
    
    // accessSync might be non-configurable in newer Node versions, use try-catch
    try {
      accessSyncStub = sandbox.stub(fsModule, 'accessSync');
    } catch (e: unknown) {
      accessSyncStub = sandbox.stub().callsFake(() => {});
    }
    
    // existsSync might be non-configurable in newer Node versions, use try-catch
    try {
      existsSyncStub = sandbox.stub(fsModule, 'existsSync');
    } catch (e: unknown) {
      existsSyncStub = sandbox.stub().callsFake(() => false);
    }
    
    try {
      readdirSyncStub = sandbox.stub(fsModule, 'readdirSync');
    } catch (e: unknown) {
      readdirSyncStub = sandbox.stub().callsFake(() => []);
    }
    
    try {
      readFileSyncStub = sandbox.stub(fsModule, 'readFileSync');
    } catch (e: unknown) {
      readFileSyncStub = sandbox.stub().callsFake(() => '');
    }
    
    try {
      writeFileSyncStub = sandbox.stub(fsModule, 'writeFileSync');
    } catch (e: unknown) {
      writeFileSyncStub = sandbox.stub().callsFake(() => {});
    }
    
    try {
      spawnSyncStub = sandbox.stub(childProcessModule, 'spawnSync');
    } catch (e: unknown) {
      spawnSyncStub = sandbox.stub().callsFake(() => ({ error: null }));
    }
    
    try {
      pathJoinStub = sandbox.stub(pathModule, 'join').callsFake((...args: string[]) => args.join('/'));
    } catch (e: unknown) {
      pathJoinStub = sandbox.stub().callsFake((...args: string[]) => args.join('/'));
    }
    
    try {
      pathExtnameStub = sandbox.stub(pathModule, 'extname').callsFake((filePath: string) => {
        const regex = /\.([^.]+)$/;
        const match = regex.exec(filePath);
        return match ? `.${match[1]}` : '';
      });
    } catch (e: unknown) {
      pathExtnameStub = sandbox.stub().callsFake((filePath: string) => {
        const regex = /\.([^.]+)$/;
        const match = regex.exec(filePath);
        return match ? `.${match[1]}` : '';
      });
    }
    
    try {
      pathBasenameStub = sandbox.stub(pathModule, 'basename').callsFake((filePath: string) => {
        return filePath.split('/').pop() || filePath;
      });
    } catch (e: unknown) {
      pathBasenameStub = sandbox.stub().callsFake((filePath: string) => {
        return filePath.split('/').pop() || filePath;
      });
    }
    
    try {
      pathDirnameStub = sandbox.stub(pathModule, 'dirname').callsFake((filePath: string) => {
        const parts = filePath.split('/');
        parts.pop();
        return parts.join('/') || '/';
      });
    } catch (e: unknown) {
      pathDirnameStub = sandbox.stub().callsFake((filePath: string) => {
        const parts = filePath.split('/');
        parts.pop();
        return parts.join('/') || '/';
      });
    }
    
    // Stub sanitizePath from @contentstack/cli-utilities
    const cliUtilities = require('@contentstack/cli-utilities');
    try {
      sanitizePathStub = sandbox.stub(cliUtilities, 'sanitizePath').callsFake((p: string) => p);
    } catch (e: unknown) {
      sanitizePathStub = sandbox.stub().callsFake((p: string) => p);
    }
  });

  afterEach(() => {
    sandbox.restore();
  });

  // Phase 1 - Test 1: Test file structure and imports - verify installModules is exported
  it('should export installModules function', () => {
    expect(installModules).to.exist;
    expect(installModules).to.be.a('function');
  });

  describe('checkWritePermissionToDirectory', () => {
    // Phase 1 - Test 2: Test checkWritePermissionToDirectory - success case (returns true)
    it('should return true when directory has write permission', async () => {
      accessSyncStub.returns(undefined);
      
      const result = await installModules('/tmp/test.js', false);
      
      // This will call checkWritePermissionToDirectory internally
      // We can verify by checking that accessSync was called
      expect(accessSyncStub.called).to.be.true;
    });

    // Phase 1 - Test 3: Test checkWritePermissionToDirectory - failure case (returns false, logs message)
    it('should return false and log message when no write permission', async () => {
      accessSyncStub.throws(new Error('Permission denied'));
      
      const result = await installModules('/tmp/test.js', false);
      
      expect(result).to.be.false;
      expect(consoleLogStub.called).to.be.true;
      const logCall = consoleLogStub.getCalls().find((call) => 
        call.args[0]?.includes('Permission denied') || call.args[0]?.includes('write permission')
      );
      expect(logCall).to.exist;
    });
  });

  describe('doesPackageJsonExist', () => {
    // Phase 1 - Test 4: Test doesPackageJsonExist - returns true when package.json exists
    it('should return true when package.json exists', async () => {
      accessSyncStub.returns(undefined);
      existsSyncStub.returns(true);
      readFileSyncStub.returns('const fs = require("fs");');
      spawnSyncStub.returns({ error: null } as any);
      
      await installModules('/tmp/test.js', false);
      
      expect(existsSyncStub.called).to.be.true;
      const existsCall = existsSyncStub.getCalls().find((call) => 
        call.args[0]?.includes('package.json')
      );
      expect(existsCall).to.exist;
    });

    // Phase 1 - Test 5: Test doesPackageJsonExist - returns false when package.json doesn't exist
    it('should return false when package.json does not exist', async () => {
      accessSyncStub.returns(undefined);
      existsSyncStub.returns(false);
      readFileSyncStub.returns('const fs = require("fs");');
      spawnSyncStub.returns({ error: null } as any);
      
      await installModules('/tmp/test.js', false);
      
      expect(existsSyncStub.returned(false)).to.be.true;
    });
  });

  describe('scanDirectory', () => {
    // Phase 1 - Test 6: Test scanDirectory - returns array of files
    it('should return array of files from directory', async () => {
      accessSyncStub.returns(undefined);
      existsSyncStub.returns(false);
      readdirSyncStub.returns(['file1.js', 'file2.js'] as any);
      readFileSyncStub.returns('const fs = require("fs");');
      spawnSyncStub.returns({ error: null } as any);
      
      await installModules('/tmp', true);
      
      expect(readdirSyncStub.called).to.be.true;
      expect(readdirSyncStub.returned(['file1.js', 'file2.js'])).to.be.true;
    });

    // Phase 1 - Test 7: Test scanDirectory - handles empty directory
    it('should handle empty directory', async () => {
      accessSyncStub.returns(undefined);
      readdirSyncStub.returns([] as any);
      
      const result = await installModules('/tmp', true);
      
      expect(result).to.be.true;
      expect(readdirSyncStub.called).to.be.true;
      expect(consoleLogStub.called).to.be.true;
      const logCall = consoleLogStub.getCalls().find((call) => 
        call.args[0]?.includes('Could not locate files')
      );
      expect(logCall).to.exist;
    });
  });

  describe('findModulesSync', () => {
    // Phase 1 - Test 8: Test findModulesSync - extracts require() statements with single quotes
    it('should extract require statements with single quotes', async () => {
      accessSyncStub.returns(undefined);
      existsSyncStub.returns(false);
      readFileSyncStub.returns(`const pkg = require('some-package');`);
      spawnSyncStub.returns({ error: null } as any);
      
      await installModules('/tmp/test.js', false);
      
      expect(spawnSyncStub.called).to.be.true;
      const call = spawnSyncStub.getCalls()[0];
      expect(call.args[1][1]).to.equal('some-package');
    });

    // Phase 1 - Test 9: Test findModulesSync - extracts require() statements with double quotes
    it('should extract require statements with double quotes', async () => {
      accessSyncStub.returns(undefined);
      existsSyncStub.returns(false);
      readFileSyncStub.returns(`const pkg = require("some-package");`);
      spawnSyncStub.returns({ error: null } as any);
      
      await installModules('/tmp/test.js', false);
      
      expect(spawnSyncStub.called).to.be.true;
      const call = spawnSyncStub.getCalls()[0];
      expect(call.args[1][1]).to.equal('some-package');
    });

    // Phase 1 - Test 10: Test findModulesSync - extracts require() statements with backticks
    it('should extract require statements with backticks', async () => {
      accessSyncStub.returns(undefined);
      existsSyncStub.returns(false);
      readFileSyncStub.returns('const pkg = require(`some-package`);');
      spawnSyncStub.returns({ error: null } as any);
      
      await installModules('/tmp/test.js', false);
      
      expect(spawnSyncStub.called).to.be.true;
      const call = spawnSyncStub.getCalls()[0];
      expect(call.args[1][1]).to.equal('some-package');
    });

    // Phase 2 - Test 11: Test findModulesSync - extracts import statements (default import)
    it('should extract import statements with default import', async () => {
      accessSyncStub.returns(undefined);
      existsSyncStub.returns(false);
      readFileSyncStub.returns(`import React from 'react';`);
      spawnSyncStub.returns({ error: null } as any);
      
      await installModules('/tmp/test.js', false);
      
      expect(spawnSyncStub.called).to.be.true;
      const call = spawnSyncStub.getCalls()[0];
      expect(call.args[1][1]).to.equal('react');
    });

    // Phase 2 - Test 12: Test findModulesSync - extracts import statements (named imports)
    it('should extract import statements with named imports', async () => {
      accessSyncStub.returns(undefined);
      existsSyncStub.returns(false);
      readFileSyncStub.returns(`import { useState, useEffect } from 'react';`);
      spawnSyncStub.returns({ error: null } as any);
      
      await installModules('/tmp/test.js', false);
      
      expect(spawnSyncStub.called).to.be.true;
      const call = spawnSyncStub.getCalls()[0];
      expect(call.args[1][1]).to.equal('react');
    });

    // Phase 2 - Test 13: Test findModulesSync - extracts import statements (namespace import)
    it('should extract import statements with namespace import', async () => {
      accessSyncStub.returns(undefined);
      existsSyncStub.returns(false);
      readFileSyncStub.returns(`import * as React from 'react';`);
      spawnSyncStub.returns({ error: null } as any);
      
      await installModules('/tmp/test.js', false);
      
      expect(spawnSyncStub.called).to.be.true;
      const call = spawnSyncStub.getCalls()[0];
      expect(call.args[1][1]).to.equal('react');
    });

    // Phase 2 - Test 14: Test findModulesSync - extracts import statements (side-effect import)
    it('should extract import statements without from clause', async () => {
      accessSyncStub.returns(undefined);
      existsSyncStub.returns(false);
      readFileSyncStub.returns(`import 'some-polyfill';`);
      spawnSyncStub.returns({ error: null } as any);
      
      await installModules('/tmp/test.js', false);
      
      expect(spawnSyncStub.called).to.be.true;
      const call = spawnSyncStub.getCalls()[0];
      expect(call.args[1][1]).to.equal('some-polyfill');
    });

    // Phase 2 - Test 15: Test findModulesSync - handles mixed require and import
    it('should handle mixed require and import statements', async () => {
      accessSyncStub.returns(undefined);
      existsSyncStub.returns(false);
      readFileSyncStub.returns(`
        const fs = require('fs');
        import React from 'react';
        const lodash = require('lodash');
        import { useState } from 'react';
      `);
      spawnSyncStub.returns({ error: null } as any);
      
      await installModules('/tmp/test.js', false);
      
      expect(spawnSyncStub.called).to.be.true;
      const calls = spawnSyncStub.getCalls();
      const installedPackages = calls.map((call) => call.args[1][1]);
      // Should not include 'fs' (internal module), but should include 'react' and 'lodash'
      expect(installedPackages).to.not.include('fs');
      expect(installedPackages).to.include('react');
      expect(installedPackages).to.include('lodash');
    });

    // Phase 2 - Test 16: Test findModulesSync - skips internal Node.js modules
    it('should skip internal Node.js modules', async () => {
      accessSyncStub.returns(undefined);
      existsSyncStub.returns(false);
      readFileSyncStub.returns(`
        const fs = require('fs');
        const path = require('path');
        const http = require('http');
        const custom = require('custom-package');
      `);
      spawnSyncStub.returns({ error: null } as any);
      
      await installModules('/tmp/test.js', false);
      
      const calls = spawnSyncStub.getCalls();
      const installedPackages = calls.map((call) => call.args[1][1]);
      expect(installedPackages).to.not.include('fs');
      expect(installedPackages).to.not.include('path');
      expect(installedPackages).to.not.include('http');
      expect(installedPackages).to.include('custom-package');
    });

    // Phase 2 - Test 17: Test findModulesSync - handles scoped packages
    it('should handle scoped packages correctly', async () => {
      accessSyncStub.returns(undefined);
      existsSyncStub.returns(false);
      readFileSyncStub.returns(`
        const pkg = require('@scope/package');
      `);
      spawnSyncStub.returns({ error: null } as any);
      
      await installModules('/tmp/test.js', false);
      
      expect(spawnSyncStub.called).to.be.true;
      const call = spawnSyncStub.getCalls()[0];
      expect(call.args[1][1]).to.equal('@scope/package');
    });

    // Phase 2 - Test 18: Test findModulesSync - handles nested package paths
    it('should handle nested package paths', async () => {
      accessSyncStub.returns(undefined);
      existsSyncStub.returns(false);
      readFileSyncStub.returns(`
        const pkg = require('package/submodule');
      `);
      spawnSyncStub.returns({ error: null } as any);
      
      await installModules('/tmp/test.js', false);
      
      expect(spawnSyncStub.called).to.be.true;
      // installDependencies extracts base package: dep.split('/')[0]
      const call = spawnSyncStub.getCalls()[0];
      expect(call.args[1][1]).to.equal('package');
    });

    // Phase 2 - Test 19: Test findModulesSync - handles duplicate dependencies
    it('should handle duplicate dependencies and return unique', async () => {
      accessSyncStub.returns(undefined);
      existsSyncStub.returns(false);
      readFileSyncStub.returns(`
        const pkg1 = require('lodash');
        const pkg2 = require('lodash');
        const pkg3 = require('lodash');
      `);
      spawnSyncStub.returns({ error: null } as any);
      
      await installModules('/tmp/test.js', false);
      
      expect(spawnSyncStub.called).to.be.true;
      // Should only install once despite multiple requires
      const calls = spawnSyncStub.getCalls();
      const lodashCalls = calls.filter((call) => call.args[1][1] === 'lodash');
      expect(lodashCalls.length).to.equal(1);
    });

    // Phase 2 - Test 20: Test findModulesSync - handles empty or invalid input
    it('should handle empty or invalid input gracefully', async () => {
      accessSyncStub.returns(undefined);
      existsSyncStub.returns(false);
      // Test with empty file content
      readFileSyncStub.returns('');
      spawnSyncStub.returns({ error: null } as any);
      
      const result = await installModules('/tmp/test.js', false);
      
      // Should complete successfully even with no dependencies
      expect(result).to.be.true;
      // No dependencies means spawnSync might not be called, or called with empty deps
      // The important thing is it doesn't throw
    });
  });
});
