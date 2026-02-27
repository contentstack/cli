import { expect } from 'chai';
import sinon from 'sinon';

import ExportWorkspace from '../../../src/export/workspaces';
import ExportAssets from '../../../src/export/assets';
import { AssetManagementExportAdapter } from '../../../src/export/base';

import type { AssetManagementAPIConfig, LinkedWorkspace, SpaceResponse } from '../../../src/types/asset-management-api';
import type { ExportContext } from '../../../src/types/export-types';

describe('ExportWorkspace', () => {
  const apiConfig: AssetManagementAPIConfig = {
    baseURL: 'https://am.example.com',
    headers: { organization_uid: 'org-1' },
  };

  const exportContext: ExportContext = {
    spacesRootPath: '/tmp/export/spaces',
  };

  const workspace: LinkedWorkspace = {
    uid: 'ws-1',
    space_uid: 'space-uid-1',
    is_default: true,
  };

  const spaceDir = '/tmp/export/spaces/space-uid-1';
  const branchName = 'develop';

  const spaceResponse: SpaceResponse = {
    space: {
      uid: 'space-uid-1',
      title: 'My Space',
      org_uid: 'org-1',
    },
  };

  beforeEach(() => {
    sinon.stub(AssetManagementExportAdapter.prototype, 'init' as any).resolves();
    sinon.stub(AssetManagementExportAdapter.prototype, 'tick' as any);
    sinon.stub(ExportAssets.prototype, 'start').resolves();
    sinon.stub(ExportAssets.prototype, 'setParentProgressManager');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('start method', () => {
    it('should call getSpace with the workspace space_uid', async () => {
      const getSpaceStub = sinon.stub(ExportWorkspace.prototype, 'getSpace').resolves(spaceResponse);
      const exporter = new ExportWorkspace(apiConfig, exportContext);
      await exporter.start(workspace, spaceDir, branchName);

      expect(getSpaceStub.firstCall.args[0]).to.equal(workspace.space_uid);
    });

    it('should tick success after writing metadata', async () => {
      sinon.stub(ExportWorkspace.prototype, 'getSpace').resolves(spaceResponse);
      const exporter = new ExportWorkspace(apiConfig, exportContext);
      await exporter.start(workspace, spaceDir, branchName);

      const tickStub = (AssetManagementExportAdapter.prototype as any).tick as sinon.SinonStub;
      expect(tickStub.firstCall.args).to.deep.equal([true, `space: ${workspace.space_uid}`, null]);
    });

    it('should delegate to ExportAssets.start with workspace and spaceDir', async () => {
      sinon.stub(ExportWorkspace.prototype, 'getSpace').resolves(spaceResponse);
      const exporter = new ExportWorkspace(apiConfig, exportContext);
      await exporter.start(workspace, spaceDir, branchName);

      const startStub = ExportAssets.prototype.start as sinon.SinonStub;
      expect(startStub.firstCall.args[0]).to.deep.equal(workspace);
      expect(startStub.firstCall.args[1]).to.equal(spaceDir);
    });

    it('should write "main" as branch in metadata when branchName is empty', async () => {
      const os = require('node:os');
      const path = require('node:path');
      const fs = require('node:fs');
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-ws-'));

      sinon.stub(ExportWorkspace.prototype, 'getSpace').resolves(spaceResponse);
      const exporter = new ExportWorkspace(apiConfig, exportContext);
      await exporter.start(workspace, tmpDir, '');

      const metadata = JSON.parse(fs.readFileSync(path.join(tmpDir, 'metadata.json'), 'utf-8'));
      expect(metadata.branch).to.equal('main');
      expect(metadata.workspace_uid).to.equal(workspace.uid);
      expect(metadata.is_default).to.equal(workspace.is_default);

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('should NOT call setParentProgressManager on assets exporter when progressOrParent is null', async () => {
      sinon.stub(ExportWorkspace.prototype, 'getSpace').resolves(spaceResponse);
      const setParentStub = ExportAssets.prototype.setParentProgressManager as sinon.SinonStub;

      const exporter = new ExportWorkspace(apiConfig, exportContext);
      await exporter.start(workspace, spaceDir, branchName);

      expect(setParentStub.callCount).to.equal(0);
    });

    it('should call setParentProgressManager on assets exporter when a progress manager is set', async () => {
      sinon.stub(ExportWorkspace.prototype, 'getSpace').resolves(spaceResponse);
      const fakeProgress = { tick: sinon.stub(), updateStatus: sinon.stub() } as any;
      const setParentStub = ExportAssets.prototype.setParentProgressManager as sinon.SinonStub;

      const exporter = new ExportWorkspace(apiConfig, exportContext);
      exporter.setParentProgressManager(fakeProgress);
      await exporter.start(workspace, spaceDir, branchName);

      expect(setParentStub.firstCall.args[0]).to.equal(fakeProgress);
    });
  });
});
