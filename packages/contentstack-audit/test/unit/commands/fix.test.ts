import fs from 'fs';
import winston from 'winston';
import { expect } from 'chai';
import { runCommand } from '@oclif/test';
import * as sinon from 'sinon';
import { FileTransportInstance } from 'winston/lib/winston/transports';

import { AuditBaseCommand } from '../../../src/audit-base-command';

describe('AuditFix command', () => {
  const fsTransport = class FsTransport {
    filename!: string;
  } as FileTransportInstance;

  // Check this test case later
  describe('AuditFix run method', () => {
    sinon.stub(fs, 'rmSync').callsFake(() => {});
    sinon.stub(winston.transports, 'File').callsFake(() => fsTransport);
    sinon.stub(winston, 'createLogger').call(() => ({ log: () => {}, error: () => {} }));
    const startSpy = sinon.stub(AuditBaseCommand.prototype, 'start').callsFake(() => {
      return Promise.resolve(true);
    });

    it('should trigger AuditBaseCommand start method', async () => {
      await runCommand(['cm:stacks:audit:fix', '-d', 'data-dir'], { root: process.cwd() });
      expect(startSpy.args).to.be.eql([['cm:stacks:audit']]);
    });
  });
});
