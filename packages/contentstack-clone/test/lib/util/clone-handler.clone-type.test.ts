import { expect } from 'chai';
import { CloneHandler } from '../../../src/core/util/clone-handler';
import { CloneConfig } from '../../../src/types/clone-config';
import sinon from 'sinon';
import inquirer from 'inquirer';

describe('CloneHandler - Clone Type', () => {
  describe('cloneTypeSelection', () => {
    let handler: CloneHandler;
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
        sourceStackBranch: 'main',
      };
      handler = new CloneHandler(config);
      sandbox.stub(console, 'clear');
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should select structure type and call cmdImport', async () => {
      (handler as any).config.cloneType = 'a';
      const cmdImportStub = sandbox.stub(handler, 'cmdImport').resolves();

      const result = await handler.cloneTypeSelection();

      expect(result).to.equal('Stack clone Structure completed');
      expect(cmdImportStub.calledOnce).to.be.true;
    });

    it('should prompt for clone type when not provided', async () => {
      (handler as any).config.cloneType = undefined;
      const inquirerStub = sandbox.stub(inquirer, 'prompt').resolves({ type: 'Structure (all modules except entries & assets)' });
      const cmdImportStub = sandbox.stub(handler, 'cmdImport').resolves();

      const result = await handler.cloneTypeSelection();

      expect(result).to.equal('Stack clone Structure completed');
      expect(inquirerStub.calledOnce).to.be.true;
      expect(cmdImportStub.calledOnce).to.be.true;
      inquirerStub.restore();
    });

    it('should handle structure with content type', async () => {
      (handler as any).config.cloneType = 'b';
      const cmdImportStub = sandbox.stub(handler, 'cmdImport').resolves();

      const result = await handler.cloneTypeSelection();

      expect(result).to.equal('Stack clone completed with structure and content');
      expect(cmdImportStub.calledOnce).to.be.true;
    });

    it('should handle error in cloneTypeSelection catch block (covers line 825)', async () => {
      (handler as any).config.cloneType = 'a';
      const cmdImportError = new Error('Import failed');
      const cmdImportStub = sandbox.stub(handler, 'cmdImport').rejects(cmdImportError);

      try {
        await handler.cloneTypeSelection();
        expect.fail('Should have rejected');
      } catch (error) {
        expect(error).to.equal(cmdImportError);
      }
      expect(cmdImportStub.calledOnce).to.be.true;
    });
  });
});
