import { expect } from 'chai';
import sinon from 'sinon';

import ExportFields from '../../../src/export/fields';
import { AssetManagementExportAdapter } from '../../../src/export/base';
import { PROCESS_NAMES } from '../../../src/constants/index';

import type { AssetManagementAPIConfig } from '../../../src/types/asset-management-api';
import type { ExportContext } from '../../../src/types/export-types';

describe('ExportFields', () => {
  const apiConfig: AssetManagementAPIConfig = {
    baseURL: 'https://am.example.com',
    headers: { organization_uid: 'org-1' },
  };

  const exportContext: ExportContext = {
    spacesRootPath: '/tmp/export/spaces',
  };

  const spaceUid = 'space-uid-1';
  const fieldsDir = '/tmp/export/spaces/fields';

  const fieldsResponse = {
    count: 2,
    relation: 'organization',
    fields: [
      { uid: 'f1', title: 'Tags', display_type: 'text' },
      { uid: 'f2', title: 'Description', display_type: 'textarea' },
    ],
  };

  beforeEach(() => {
    sinon.stub(AssetManagementExportAdapter.prototype, 'init' as any).resolves();
    sinon.stub(AssetManagementExportAdapter.prototype, 'writeItemsToChunkedJson' as any).resolves();
    sinon.stub(AssetManagementExportAdapter.prototype, 'tick' as any);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('start method', () => {
    it('should call getWorkspaceFields with the correct spaceUid', async () => {
      const getFieldsStub = sinon.stub(ExportFields.prototype, 'getWorkspaceFields').resolves(fieldsResponse);
      const exporter = new ExportFields(apiConfig, exportContext);
      await exporter.start(spaceUid);

      expect(getFieldsStub.calledOnce).to.be.true;
      expect(getFieldsStub.calledWith(spaceUid)).to.be.true;
    });

    it('should write fields with correct chunked JSON args', async () => {
      sinon.stub(ExportFields.prototype, 'getWorkspaceFields').resolves(fieldsResponse);
      const exporter = new ExportFields(apiConfig, exportContext);
      await exporter.start(spaceUid);

      const writeStub = (AssetManagementExportAdapter.prototype as any).writeItemsToChunkedJson as sinon.SinonStub;
      expect(writeStub.calledOnce).to.be.true;
      const args = writeStub.firstCall.args;
      expect(args[0]).to.equal(fieldsDir);
      expect(args[1]).to.equal('fields.json');
      expect(args[2]).to.equal('fields');
      expect(args[3]).to.deep.equal(['uid', 'title', 'display_type']);
      expect(args[4]).to.deep.equal(fieldsResponse.fields);
    });

    it('should write empty items when no fields returned', async () => {
      sinon.stub(ExportFields.prototype, 'getWorkspaceFields').resolves({
        count: 0,
        relation: 'organization',
        fields: [],
      });
      const exporter = new ExportFields(apiConfig, exportContext);
      await exporter.start(spaceUid);

      const writeStub = (AssetManagementExportAdapter.prototype as any).writeItemsToChunkedJson as sinon.SinonStub;
      expect(writeStub.calledOnce).to.be.true;
      expect(writeStub.firstCall.args[4]).to.deep.equal([]);
    });

    it('should call tick on success', async () => {
      sinon.stub(ExportFields.prototype, 'getWorkspaceFields').resolves(fieldsResponse);
      const exporter = new ExportFields(apiConfig, exportContext);
      await exporter.start(spaceUid);

      const tickStub = (AssetManagementExportAdapter.prototype as any).tick as sinon.SinonStub;
      expect(tickStub.called).to.be.true;
      const args = tickStub.firstCall.args;
      expect(args[0]).to.be.true;
      expect(args[1]).to.equal(PROCESS_NAMES.AM_FIELDS);
      expect(args[2]).to.be.null;
    });
  });
});
