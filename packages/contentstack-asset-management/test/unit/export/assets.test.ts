import { expect } from 'chai';
import sinon from 'sinon';
import { configHandler } from '@contentstack/cli-utilities';

import ExportAssets from '../../../src/export/assets';
import { AssetManagementExportAdapter } from '../../../src/export/base';

import type { AssetManagementAPIConfig, LinkedWorkspace } from '../../../src/types/asset-management-api';
import type { ExportContext } from '../../../src/types/export-types';

const foldersData = [{ uid: 'folder-1', name: 'Images' }];
const assetsResponseWithItems = {
  items: [
    { uid: 'a1', url: 'https://cdn.example.com/a1.png', filename: 'image.png' },
    { uid: 'a2', url: 'https://cdn.example.com/a2.pdf', file_name: 'doc.pdf' },
  ],
};
const emptyAssetsResponse = { items: [] as any[] };

describe('ExportAssets', () => {
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

  let fetchStub: sinon.SinonStub;

  const makeFetchResponse = () => {
    const webStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('file-content'));
        controller.close();
      },
    });
    return { ok: true, status: 200, body: webStream };
  };

  beforeEach(() => {
    sinon.stub(AssetManagementExportAdapter.prototype, 'init' as any).resolves();
    sinon.stub(AssetManagementExportAdapter.prototype, 'writeItemsToChunkedJson' as any).resolves();
    sinon.stub(AssetManagementExportAdapter.prototype, 'tick' as any);
    sinon.stub(AssetManagementExportAdapter.prototype, 'updateStatus' as any);
    fetchStub = sinon.stub(globalThis, 'fetch');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('start method', () => {
    it('should fetch folders and assets in parallel', async () => {
      const foldersStub = sinon.stub(ExportAssets.prototype, 'getWorkspaceFolders').resolves(foldersData);
      const assetsStub = sinon.stub(ExportAssets.prototype, 'getWorkspaceAssets').resolves(emptyAssetsResponse);

      const exporter = new ExportAssets(apiConfig, exportContext);
      await exporter.start(workspace, spaceDir);

      expect(foldersStub.calledOnce).to.be.true;
      expect(foldersStub.calledWith(workspace.space_uid)).to.be.true;
      expect(assetsStub.calledOnce).to.be.true;
      expect(assetsStub.calledWith(workspace.space_uid)).to.be.true;
    });

    it('should write chunked assets metadata with correct args', async () => {
      sinon.stub(ExportAssets.prototype, 'getWorkspaceFolders').resolves(foldersData);
      sinon.stub(ExportAssets.prototype, 'getWorkspaceAssets').resolves(assetsResponseWithItems);
      fetchStub.callsFake(async () => makeFetchResponse() as any);

      const exporter = new ExportAssets(apiConfig, exportContext);
      await exporter.start(workspace, spaceDir);

      const writeStub = (AssetManagementExportAdapter.prototype as any).writeItemsToChunkedJson as sinon.SinonStub;
      expect(writeStub.calledOnce).to.be.true;
      const args = writeStub.firstCall.args;
      expect(args[1]).to.equal('assets.json');
      expect(args[2]).to.equal('assets');
      expect(args[3]).to.deep.equal(['uid', 'url', 'filename', 'file_name', 'parent_uid']);
      expect(args[4]).to.have.length(2);
    });

    it('should skip downloads when no asset items exist', async () => {
      sinon.stub(ExportAssets.prototype, 'getWorkspaceFolders').resolves(foldersData);
      sinon.stub(ExportAssets.prototype, 'getWorkspaceAssets').resolves(emptyAssetsResponse);

      const exporter = new ExportAssets(apiConfig, exportContext);
      await exporter.start(workspace, spaceDir);

      const tickStub = (AssetManagementExportAdapter.prototype as any).tick as sinon.SinonStub;
      const downloadTick = tickStub.getCalls().find((c) => String(c.args[1]).startsWith('downloads:'));
      expect(downloadTick).to.be.undefined;
    });

    it('should handle download failures gracefully without throwing', async () => {
      sinon.stub(ExportAssets.prototype, 'getWorkspaceFolders').resolves(foldersData);
      sinon.stub(ExportAssets.prototype, 'getWorkspaceAssets').resolves(assetsResponseWithItems);
      fetchStub.rejects(new Error('network failure'));

      const exporter = new ExportAssets(apiConfig, exportContext);
      await exporter.start(workspace, spaceDir);

      const tickStub = (AssetManagementExportAdapter.prototype as any).tick as sinon.SinonStub;
      const downloadTick = tickStub.getCalls().find((c) => String(c.args[1]).startsWith('downloads:'));
      expect(downloadTick).to.not.be.undefined;
      expect(downloadTick!.args[0]).to.be.false;
      expect(downloadTick!.args[2]).to.equal('network failure');
    });

    it('should tick success for downloads when all succeed', async () => {
      sinon.stub(ExportAssets.prototype, 'getWorkspaceFolders').resolves(foldersData);
      sinon.stub(ExportAssets.prototype, 'getWorkspaceAssets').resolves(assetsResponseWithItems);
      fetchStub.callsFake(async () => makeFetchResponse() as any);

      const exporter = new ExportAssets(apiConfig, exportContext);
      await exporter.start(workspace, spaceDir);

      const tickStub = (AssetManagementExportAdapter.prototype as any).tick as sinon.SinonStub;
      const downloadTick = tickStub.getCalls().find((c) => String(c.args[1]).startsWith('downloads:'));
      expect(downloadTick).to.not.be.undefined;
      expect(downloadTick!.args[0]).to.be.true;
      expect(downloadTick!.args[2]).to.be.null;
    });

    it('should skip assets with no url or uid', async () => {
      const incompleteAssets = {
        items: [
          { uid: 'a1', url: null as any },
          { url: 'https://cdn.example.com/a2.png', filename: 'img.png' },
          { uid: null as any, url: null as any },
        ],
      };
      sinon.stub(ExportAssets.prototype, 'getWorkspaceFolders').resolves(foldersData);
      sinon.stub(ExportAssets.prototype, 'getWorkspaceAssets').resolves(incompleteAssets);

      const exporter = new ExportAssets(apiConfig, exportContext);
      await exporter.start(workspace, spaceDir);

      expect(fetchStub.called).to.be.false;
    });

    it('should use _uid when uid is not present on asset', async () => {
      const assetsWithUnderscoreUid = {
        items: [{ _uid: 'a-uid', url: 'https://cdn.example.com/a.png', filename: 'a.png' }],
      };
      sinon.stub(ExportAssets.prototype, 'getWorkspaceFolders').resolves(foldersData);
      sinon.stub(ExportAssets.prototype, 'getWorkspaceAssets').resolves(assetsWithUnderscoreUid);
      fetchStub.callsFake(async () => makeFetchResponse() as any);

      const exporter = new ExportAssets(apiConfig, exportContext);
      await exporter.start(workspace, spaceDir);

      const tickStub = (AssetManagementExportAdapter.prototype as any).tick as sinon.SinonStub;
      const downloadTick = tickStub.getCalls().find((c) => String(c.args[1]).startsWith('downloads:'));
      expect(downloadTick).to.not.be.undefined;
      expect(downloadTick!.args[0]).to.be.true;
    });

    it('should use file_name when filename is not present, defaulting to "asset"', async () => {
      const assetsNoFilename = {
        items: [
          { uid: 'a1', url: 'https://cdn.example.com/a1', file_name: 'named.pdf' },
          { uid: 'a2', url: 'https://cdn.example.com/a2' },
        ],
      };
      sinon.stub(ExportAssets.prototype, 'getWorkspaceFolders').resolves(foldersData);
      sinon.stub(ExportAssets.prototype, 'getWorkspaceAssets').resolves(assetsNoFilename);
      fetchStub.callsFake(async () => makeFetchResponse() as any);

      const exporter = new ExportAssets(apiConfig, exportContext);
      await exporter.start(workspace, spaceDir);

      expect(fetchStub.callCount).to.equal(2);
    });

    it('should append authtoken to URL when securedAssets is true', async () => {
      sinon.stub(configHandler, 'get').returns('my-auth-token');
      sinon.stub(ExportAssets.prototype, 'getWorkspaceFolders').resolves(foldersData);
      sinon.stub(ExportAssets.prototype, 'getWorkspaceAssets').resolves({
        items: [{ uid: 'a1', url: 'https://cdn.example.com/a1.png', filename: 'img.png' }],
      });
      fetchStub.callsFake(async () => makeFetchResponse() as any);

      const securedContext: typeof exportContext = { ...exportContext, securedAssets: true };
      const exporter = new ExportAssets(apiConfig, securedContext);
      await exporter.start(workspace, spaceDir);

      const downloadUrl = fetchStub.firstCall.args[0] as string;
      expect(downloadUrl).to.include('authtoken=my-auth-token');
    });

    it('should use "&" separator when URL already contains "?"', async () => {
      sinon.stub(configHandler, 'get').returns('my-token');
      sinon.stub(ExportAssets.prototype, 'getWorkspaceFolders').resolves(foldersData);
      sinon.stub(ExportAssets.prototype, 'getWorkspaceAssets').resolves({
        items: [{ uid: 'a1', url: 'https://cdn.example.com/a1?v=1', filename: 'img.png' }],
      });
      fetchStub.callsFake(async () => makeFetchResponse() as any);

      const securedContext: typeof exportContext = { ...exportContext, securedAssets: true };
      const exporter = new ExportAssets(apiConfig, securedContext);
      await exporter.start(workspace, spaceDir);

      const downloadUrl = fetchStub.firstCall.args[0] as string;
      expect(downloadUrl).to.include('?v=1&authtoken=');
    });

    it('should handle non-ok HTTP response as download failure', async () => {
      sinon.stub(ExportAssets.prototype, 'getWorkspaceFolders').resolves(foldersData);
      sinon.stub(ExportAssets.prototype, 'getWorkspaceAssets').resolves({
        items: [{ uid: 'a1', url: 'https://cdn.example.com/a1.png', filename: 'img.png' }],
      });
      fetchStub.resolves({ ok: false, status: 403, body: null } as any);

      const exporter = new ExportAssets(apiConfig, exportContext);
      await exporter.start(workspace, spaceDir);

      const tickStub = (AssetManagementExportAdapter.prototype as any).tick as sinon.SinonStub;
      const downloadTick = tickStub.getCalls().find((c) => String(c.args[1]).startsWith('downloads:'));
      expect(downloadTick!.args[0]).to.be.false;
      expect(downloadTick!.args[2]).to.include('403');
    });

    it('should handle missing response body as download failure', async () => {
      sinon.stub(ExportAssets.prototype, 'getWorkspaceFolders').resolves(foldersData);
      sinon.stub(ExportAssets.prototype, 'getWorkspaceAssets').resolves({
        items: [{ uid: 'a1', url: 'https://cdn.example.com/a1.png', filename: 'img.png' }],
      });
      fetchStub.resolves({ ok: true, status: 200, body: null } as any);

      const exporter = new ExportAssets(apiConfig, exportContext);
      await exporter.start(workspace, spaceDir);

      const tickStub = (AssetManagementExportAdapter.prototype as any).tick as sinon.SinonStub;
      const downloadTick = tickStub.getCalls().find((c) => String(c.args[1]).startsWith('downloads:'));
      expect(downloadTick!.args[0]).to.be.false;
      expect(downloadTick!.args[2]).to.equal('No response body');
    });
  });
});
