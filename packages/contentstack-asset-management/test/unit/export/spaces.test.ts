import { expect } from 'chai';
import sinon from 'sinon';
import { CLIProgressManager, configHandler } from '@contentstack/cli-utilities';

import { ExportSpaces, exportSpaceStructure } from '../../../src/export/spaces';
import ExportAssetTypes from '../../../src/export/asset-types';
import ExportFields from '../../../src/export/fields';
import ExportWorkspace from '../../../src/export/workspaces';
import { AssetManagementExportAdapter } from '../../../src/export/base';

import type { AssetManagementExportOptions } from '../../../src/types/asset-management-api';

describe('ExportSpaces', () => {
  const baseOptions: AssetManagementExportOptions = {
    linkedWorkspaces: [
      { uid: 'ws-1', space_uid: 'space-1', is_default: true },
      { uid: 'ws-2', space_uid: 'space-2', is_default: false },
    ],
    exportDir: '/tmp/export',
    branchName: 'main',
    assetManagementUrl: 'https://am.example.com',
    org_uid: 'org-1',
  };

  const fakeProgress = {
    addProcess: sinon.stub().returnsThis(),
    startProcess: sinon.stub().returnsThis(),
    updateStatus: sinon.stub().returnsThis(),
    tick: sinon.stub(),
    completeProcess: sinon.stub(),
  };

  beforeEach(() => {
    sinon.stub(AssetManagementExportAdapter.prototype, 'init' as any).resolves();
    sinon.stub(configHandler, 'get').returns({ showConsoleLogs: false });
    sinon.stub(CLIProgressManager, 'createNested').returns(fakeProgress as any);
    sinon.stub(ExportAssetTypes.prototype, 'start').resolves();
    sinon.stub(ExportAssetTypes.prototype, 'setParentProgressManager');
    sinon.stub(ExportFields.prototype, 'start').resolves();
    sinon.stub(ExportFields.prototype, 'setParentProgressManager');
    sinon.stub(ExportWorkspace.prototype, 'start').resolves();
    sinon.stub(ExportWorkspace.prototype, 'setParentProgressManager');

    fakeProgress.addProcess.returnsThis();
    fakeProgress.startProcess.returnsThis();
    fakeProgress.updateStatus.returnsThis();
    fakeProgress.tick.reset();
    fakeProgress.completeProcess.reset();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('start method', () => {
    it('should return early when linkedWorkspaces is empty', async () => {
      const exporter = new ExportSpaces({ ...baseOptions, linkedWorkspaces: [] });
      await exporter.start();

      expect((ExportAssetTypes.prototype.start as sinon.SinonStub).called).to.be.false;
      expect((ExportFields.prototype.start as sinon.SinonStub).called).to.be.false;
    });

    it('should export shared asset types and fields from the first workspace', async () => {
      const exporter = new ExportSpaces(baseOptions);
      await exporter.start();

      const atStub = ExportAssetTypes.prototype.start as sinon.SinonStub;
      expect(atStub.calledOnce).to.be.true;
      expect(atStub.firstCall.args[0]).to.equal('space-1');

      const fieldsStub = ExportFields.prototype.start as sinon.SinonStub;
      expect(fieldsStub.calledOnce).to.be.true;
      expect(fieldsStub.firstCall.args[0]).to.equal('space-1');
    });

    it('should iterate over all workspaces', async () => {
      const exporter = new ExportSpaces(baseOptions);
      await exporter.start();

      const wsStub = ExportWorkspace.prototype.start as sinon.SinonStub;
      expect(wsStub.callCount).to.equal(2);
      expect(wsStub.firstCall.args[0]).to.deep.include({ space_uid: 'space-1' });
      expect(wsStub.secondCall.args[0]).to.deep.include({ space_uid: 'space-2' });
    });

    it('should complete progress on success', async () => {
      const exporter = new ExportSpaces(baseOptions);
      await exporter.start();

      expect(fakeProgress.completeProcess.calledOnce).to.be.true;
      expect(fakeProgress.completeProcess.firstCall.args[1]).to.be.true;
    });

    it('should re-throw and complete progress with failure when a workspace export fails', async () => {
      (ExportWorkspace.prototype.start as sinon.SinonStub).rejects(new Error('workspace-error'));

      const exporter = new ExportSpaces(baseOptions);
      try {
        await exporter.start();
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err.message).to.equal('workspace-error');
      }

      expect(fakeProgress.completeProcess.called).to.be.true;
      const lastCall = fakeProgress.completeProcess.lastCall;
      expect(lastCall.args[1]).to.be.false;
    });

    it('should use parentProgressManager directly when setParentProgressManager was called', async () => {
      const fakeParent = {
        addProcess: sinon.stub().returnsThis(),
        startProcess: sinon.stub().returnsThis(),
        updateStatus: sinon.stub().returnsThis(),
        tick: sinon.stub(),
        completeProcess: sinon.stub(),
      };
      const exporter = new ExportSpaces(baseOptions);
      exporter.setParentProgressManager(fakeParent as any);
      await exporter.start();

      expect((CLIProgressManager.createNested as sinon.SinonStub).called).to.be.false;
      expect(fakeParent.completeProcess.called).to.be.true;
    });
  });

  describe('exportSpaceStructure', () => {
    it('should delegate to ExportSpaces.start', async () => {
      await exportSpaceStructure({ ...baseOptions, linkedWorkspaces: [] });
      expect((ExportAssetTypes.prototype.start as sinon.SinonStub).called).to.be.false;
    });
  });
});
