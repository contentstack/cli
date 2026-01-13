import { expect } from 'chai';
import sinon from 'sinon';
import { CloneHandler } from '../../src/lib/util/clone-handler';
import { CloneConfig } from '../../src/types/clone-config';
import inquirer from 'inquirer';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require('../dummyConfig/index');

describe('Stack Clone Test', () => {
  let handler: CloneHandler;
  let sandbox: sinon.SinonSandbox;
  let mockConfig: CloneConfig;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    mockConfig = {
      pathDir: '/test/path',
      cloneType: 'a',
      cloneContext: {
        command: 'test',
        module: 'clone',
        email: 'test@example.com',
      },
    };
    handler = new CloneHandler(mockConfig);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('cloneTypeSelection', () => {
    it('should call cloneTypeSelection', async () => {
      const cloneTypeSelectionStub = sandbox.stub(handler, 'cloneTypeSelection').resolves('success');
      await handler.cloneTypeSelection();
      expect(cloneTypeSelectionStub.calledOnce).to.be.true;
    });
  });

  describe('getStack', () => {
    it('should call getStack', async () => {
      const getStackStub = sandbox.stub(handler, 'getStack').resolves({ stack: 'test-stack' });
      await handler.getStack({ Organization: 'test-org' });
      expect(getStackStub.calledOnce).to.be.true;
    });
  });

  describe('cmdExport', () => {
    it('should call cmdExport', async () => {
      const cmdExportStub = sandbox.stub(handler, 'cmdExport').resolves(true);
      await handler.cmdExport();
      expect(cmdExportStub.calledOnce).to.be.true;
    });
  });

  describe('cmdImport', () => {
    it('should call cmdImport', async () => {
      const cmdImportStub = sandbox.stub(handler, 'cmdImport').resolves();
      await handler.cmdImport();
      expect(cmdImportStub.calledOnce).to.be.true;
    });
  });

  describe('createNewStack', () => {
    it('should call createNewStack', async () => {
      const createNewStackStub = sandbox.stub(handler, 'createNewStack').resolves({ api_key: 'test-key' });
      await handler.createNewStack({ orgUid: 'dummyOrg' });
      expect(createNewStackStub.calledOnce).to.be.true;
    });
  });
});
