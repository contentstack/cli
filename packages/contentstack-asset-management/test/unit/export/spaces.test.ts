import { expect } from 'chai';
import sinon from 'sinon';
import { CLIProgressManager, configHandler } from '@contentstack/cli-utilities';

import { ExportSpaces, exportSpaceStructure } from '../../../src/export/spaces';
import ExportAssetTypes from '../../../src/export/asset-types';
import ExportFields from '../../../src/export/fields';
import ExportWorkspace from '../../../src/export/workspaces';
import { AssetManagementExportAdapter } from '../../../src/export/base';
import { AM_MAIN_PROCESS_NAME } from '../../../src/constants/index';

import type { AssetManagementExportOptions, LinkedWorkspace } from '../../../src/types/asset-management-api';

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
    it('should return early without starting any export when linkedWorkspaces is empty', async () => {
      const exporter = new ExportSpaces({ ...baseOptions, linkedWorkspaces: [] });
      await exporter.start();

      expect((CLIProgressManager.createNested as sinon.SinonStub).callCount).to.equal(0);
      expect((ExportAssetTypes.prototype.start as sinon.SinonStub).callCount).to.equal(0);
      expect((ExportFields.prototype.start as sinon.SinonStub).callCount).to.equal(0);
      expect((ExportWorkspace.prototype.start as sinon.SinonStub).callCount).to.equal(0);
    });

    it('should export shared asset types and fields from the first workspace space_uid', async () => {
      const exporter = new ExportSpaces(baseOptions);
      await exporter.start();

      const atStub = ExportAssetTypes.prototype.start as sinon.SinonStub;
      expect(atStub.firstCall.args[0]).to.equal('space-1');

      const fieldsStub = ExportFields.prototype.start as sinon.SinonStub;
      expect(fieldsStub.firstCall.args[0]).to.equal('space-1');
    });

    it('should iterate over all workspaces in order', async () => {
      const exporter = new ExportSpaces(baseOptions);
      await exporter.start();

      const wsStub = ExportWorkspace.prototype.start as sinon.SinonStub;
      expect(wsStub.callCount).to.equal(2);
      expect(wsStub.firstCall.args[0]).to.deep.include({ uid: 'ws-1', space_uid: 'space-1' });
      expect(wsStub.secondCall.args[0]).to.deep.include({ uid: 'ws-2', space_uid: 'space-2' });
    });

    it('should register and complete the progress process with success', async () => {
      const totalSteps = 2 + baseOptions.linkedWorkspaces.length * 4; // 10
      const exporter = new ExportSpaces(baseOptions);
      await exporter.start();

      expect(fakeProgress.addProcess.firstCall.args).to.deep.equal([AM_MAIN_PROCESS_NAME, totalSteps]);
      expect(fakeProgress.startProcess.firstCall.args[0]).to.equal(AM_MAIN_PROCESS_NAME);
      expect(fakeProgress.completeProcess.firstCall.args).to.deep.equal([AM_MAIN_PROCESS_NAME, true]);
    });

    it('should mark progress as failed and re-throw when a workspace export errors', async () => {
      (ExportWorkspace.prototype.start as sinon.SinonStub).rejects(new Error('workspace-error'));

      const exporter = new ExportSpaces(baseOptions);
      try {
        await exporter.start();
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err.message).to.equal('workspace-error');
      }

      expect(fakeProgress.completeProcess.firstCall.args).to.deep.equal([AM_MAIN_PROCESS_NAME, false]);
    });

    it('should use the provided parentProgressManager instead of creating a new one', async () => {
      const fakeParent = {
        addProcess: sinon.stub().returnsThis(),
        startProcess: sinon.stub().returnsThis(),
        updateStatus: sinon.stub().returnsThis(),
        tick: sinon.stub(),
        completeProcess: sinon.stub(),
      };
      const totalSteps = 2 + baseOptions.linkedWorkspaces.length * 4;

      const exporter = new ExportSpaces(baseOptions);
      exporter.setParentProgressManager(fakeParent as any);
      await exporter.start();

      expect((CLIProgressManager.createNested as sinon.SinonStub).callCount).to.equal(0);
      expect(fakeParent.addProcess.firstCall.args).to.deep.equal([AM_MAIN_PROCESS_NAME, totalSteps]);
      expect(fakeParent.startProcess.firstCall.args[0]).to.equal(AM_MAIN_PROCESS_NAME);
      expect(fakeParent.completeProcess.firstCall.args).to.deep.equal([AM_MAIN_PROCESS_NAME, true]);
    });
  });

  describe('exportSpaceStructure', () => {
    it('should be a thin wrapper that delegates to ExportSpaces.start', async () => {
      const startSpy = sinon.stub(ExportSpaces.prototype, 'start').resolves();
      const options: AssetManagementExportOptions = { ...baseOptions, linkedWorkspaces: [] as LinkedWorkspace[] };
      await exportSpaceStructure(options);

      expect(startSpy.callCount).to.equal(1);
    });
  });
});
