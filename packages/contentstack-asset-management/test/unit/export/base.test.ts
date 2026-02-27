import { expect } from 'chai';
import sinon from 'sinon';
import { FsUtility, CLIProgressManager, configHandler } from '@contentstack/cli-utilities';

import { AssetManagementExportAdapter } from '../../../src/export/base';

import type { AssetManagementAPIConfig } from '../../../src/types/asset-management-api';
import type { ExportContext } from '../../../src/types/export-types';

class TestAdapter extends AssetManagementExportAdapter {
  public callCreateNestedProgress(name: string) {
    return this.createNestedProgress(name);
  }
  public callTick(success: boolean, name: string, error: string | null) {
    return this.tick(success, name, error);
  }
  public callUpdateStatus(msg: string) {
    return this.updateStatus(msg);
  }
  public callCompleteProcess(name: string, success: boolean) {
    return this.completeProcess(name, success);
  }
  public callWriteItemsToChunkedJson(...args: Parameters<AssetManagementExportAdapter['writeItemsToChunkedJson']>) {
    return this.writeItemsToChunkedJson(...args);
  }
  public getProgressOrParent() {
    return this.progressOrParent;
  }
  public getAssetTypesDirPublic() {
    return this.getAssetTypesDir();
  }
  public getFieldsDirPublic() {
    return this.getFieldsDir();
  }
  public get spacesRootPathPublic() {
    return this.spacesRootPath;
  }
}

describe('AssetManagementExportAdapter (base)', () => {
  const apiConfig: AssetManagementAPIConfig = {
    baseURL: 'https://am.example.com',
    headers: { organization_uid: 'org-1' },
  };

  const exportContext: ExportContext = {
    spacesRootPath: '/tmp/export/spaces',
  };

  beforeEach(() => {
    sinon.stub(AssetManagementExportAdapter.prototype, 'init' as any).resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('constructor + path helpers', () => {
    it('should expose spacesRootPath from exportContext', () => {
      const adapter = new TestAdapter(apiConfig, exportContext);
      expect(adapter.spacesRootPathPublic).to.equal('/tmp/export/spaces');
    });

    it('should build getAssetTypesDir from spacesRootPath', () => {
      const adapter = new TestAdapter(apiConfig, exportContext);
      expect(adapter.getAssetTypesDirPublic()).to.include('asset_types');
    });

    it('should build getFieldsDir from spacesRootPath', () => {
      const adapter = new TestAdapter(apiConfig, exportContext);
      expect(adapter.getFieldsDirPublic()).to.include('fields');
    });
  });

  describe('setParentProgressManager / progressOrParent getter', () => {
    it('should return null when no progress manager is set', () => {
      const adapter = new TestAdapter(apiConfig, exportContext);
      expect(adapter.getProgressOrParent()).to.be.null;
    });

    it('should return parentProgressManager when set', () => {
      const fakeParent = { tick: sinon.stub() } as any;
      const adapter = new TestAdapter(apiConfig, exportContext);
      adapter.setParentProgressManager(fakeParent);
      expect(adapter.getProgressOrParent()).to.equal(fakeParent);
    });

    it('should return progressManager when parentProgressManager is not set', () => {
      sinon.stub(configHandler, 'get').returns({});
      const fakeProgress = { tick: sinon.stub() } as any;
      sinon.stub(CLIProgressManager, 'createNested').returns(fakeProgress);

      const adapter = new TestAdapter(apiConfig, exportContext);
      adapter.callCreateNestedProgress('test');
      expect(adapter.getProgressOrParent()).to.equal(fakeProgress);
    });
  });

  describe('createNestedProgress', () => {
    it('should create a new CLIProgressManager when no parent is set', () => {
      const getStub = sinon.stub(configHandler, 'get').returns({ showConsoleLogs: true });
      const fakeProgress = { tick: sinon.stub() } as any;
      const createNestedStub = sinon.stub(CLIProgressManager, 'createNested').returns(fakeProgress);

      const adapter = new TestAdapter(apiConfig, exportContext);
      const result = adapter.callCreateNestedProgress('my-module');

      expect(createNestedStub.calledOnce).to.be.true;
      expect(createNestedStub.firstCall.args[0]).to.equal('my-module');
      expect(result).to.equal(fakeProgress);
    });

    it('should return parentProgressManager directly when parent is set', () => {
      const fakeParent = { tick: sinon.stub() } as any;
      const adapter = new TestAdapter(apiConfig, exportContext);
      adapter.setParentProgressManager(fakeParent);

      const result = adapter.callCreateNestedProgress('ignored');
      expect(result).to.equal(fakeParent);
    });

    it('should default showConsoleLogs to false when log config is missing', () => {
      sinon.stub(configHandler, 'get').returns(null);
      const fakeProgress = { tick: sinon.stub() } as any;
      const createNestedStub = sinon.stub(CLIProgressManager, 'createNested').returns(fakeProgress);

      const adapter = new TestAdapter(apiConfig, exportContext);
      adapter.callCreateNestedProgress('test');

      expect(createNestedStub.firstCall.args[1]).to.be.false;
    });
  });

  describe('tick', () => {
    it('should call tick on progressOrParent when available', () => {
      const fakeParent = { tick: sinon.stub(), updateStatus: sinon.stub() } as any;
      const adapter = new TestAdapter(apiConfig, exportContext);
      adapter.setParentProgressManager(fakeParent);

      adapter.callTick(true, 'my-item', null);

      expect(fakeParent.tick.calledOnce).to.be.true;
      const args = fakeParent.tick.firstCall.args;
      expect(args[0]).to.be.true;
      expect(args[1]).to.equal('my-item');
      expect(args[2]).to.be.null;
    });

    it('should not throw when progressOrParent is null', () => {
      const adapter = new TestAdapter(apiConfig, exportContext);
      expect(() => adapter.callTick(true, 'item', null)).to.not.throw();
    });
  });

  describe('updateStatus', () => {
    it('should call updateStatus on progressOrParent when available', () => {
      const fakeParent = { tick: sinon.stub(), updateStatus: sinon.stub() } as any;
      const adapter = new TestAdapter(apiConfig, exportContext);
      adapter.setParentProgressManager(fakeParent);

      adapter.callUpdateStatus('Fetching...');

      expect(fakeParent.updateStatus.calledOnce).to.be.true;
      expect(fakeParent.updateStatus.firstCall.args[0]).to.equal('Fetching...');
    });

    it('should not throw when progressOrParent is null', () => {
      const adapter = new TestAdapter(apiConfig, exportContext);
      expect(() => adapter.callUpdateStatus('msg')).to.not.throw();
    });
  });

  describe('completeProcess', () => {
    it('should call completeProcess on progressManager when no parent is set', () => {
      sinon.stub(configHandler, 'get').returns({});
      const fakeProgress = { tick: sinon.stub(), completeProcess: sinon.stub() } as any;
      sinon.stub(CLIProgressManager, 'createNested').returns(fakeProgress);

      const adapter = new TestAdapter(apiConfig, exportContext);
      adapter.callCreateNestedProgress('test');
      adapter.callCompleteProcess('test', true);

      expect(fakeProgress.completeProcess.calledWith('test', true)).to.be.true;
    });

    it('should NOT call completeProcess when parentProgressManager is set', () => {
      const fakeParent = { tick: sinon.stub(), completeProcess: sinon.stub() } as any;
      const adapter = new TestAdapter(apiConfig, exportContext);
      adapter.setParentProgressManager(fakeParent);

      adapter.callCompleteProcess('test', true);

      expect(fakeParent.completeProcess.called).to.be.false;
    });
  });

  describe('writeItemsToChunkedJson', () => {
    it('should write {} to an empty file when items array is empty', async () => {
      const os = require('node:os');
      const path = require('node:path');
      const fsReal = require('node:fs');
      const tmpDir = os.tmpdir();
      const adapter = new TestAdapter(apiConfig, exportContext);
      await adapter.callWriteItemsToChunkedJson(tmpDir, 'test-empty.json', 'items', ['uid'], []);

      const written = fsReal.readFileSync(path.join(tmpDir, 'test-empty.json'), 'utf-8');
      expect(written).to.equal('{}');
      fsReal.unlinkSync(path.join(tmpDir, 'test-empty.json'));
    });

    it('should use FsUtility to write items in batches when items exist', async () => {
      const writeIntoFileStub = sinon.stub(FsUtility.prototype, 'writeIntoFile');
      const completeFileStub = sinon.stub(FsUtility.prototype, 'completeFile');

      const items = Array.from({ length: 3 }, (_, i) => ({ uid: `item-${i}` }));
      const adapter = new TestAdapter(apiConfig, exportContext);
      await adapter.callWriteItemsToChunkedJson('/tmp/dir', 'items.json', 'items', ['uid'], items);

      expect(writeIntoFileStub.called).to.be.true;
      expect(completeFileStub.calledWith(true)).to.be.true;
    });

    it('should write items in batches of BATCH_SIZE (50)', async () => {
      const writeIntoFileStub = sinon.stub(FsUtility.prototype, 'writeIntoFile');
      sinon.stub(FsUtility.prototype, 'completeFile');

      const items = Array.from({ length: 120 }, (_, i) => ({ uid: `item-${i}` }));
      const adapter = new TestAdapter(apiConfig, exportContext);
      await adapter.callWriteItemsToChunkedJson('/tmp/dir', 'items.json', 'items', ['uid'], items);

      expect(writeIntoFileStub.callCount).to.equal(3);
      expect(writeIntoFileStub.firstCall.args[0]).to.have.length(50);
      expect(writeIntoFileStub.secondCall.args[0]).to.have.length(50);
      expect(writeIntoFileStub.thirdCall.args[0]).to.have.length(20);
    });
  });
});
