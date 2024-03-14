import fs from 'fs';
import winston from 'winston';
import { expect } from '@oclif/test';
import { fancy } from '@contentstack/cli-dev-dependencies';
import { FileTransportInstance } from 'winston/lib/winston/transports';

import { AuditBaseCommand } from '../../../src/audit-base-command';

describe('AuditFix command', () => {
  const fsTransport = class FsTransport {
    filename!: string;
  } as FileTransportInstance;

  describe('AuditFix run method', () => {
    const test = fancy.loadConfig({ root: process.cwd() });
    test
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(fs, 'rmSync', () => {})
      .stub(winston.transports, 'File', () => fsTransport)
      .stub(winston, 'createLogger', () => ({ log: () => {}, error: () => {} }))
      .stub(AuditBaseCommand.prototype, 'start', () => {})
      .spy(AuditBaseCommand.prototype, 'start')
      .command(['cm:stacks:audit:fix'])
      .it('should trigger AuditBaseCommand start method', ({ stdout, spy }) => {
        expect(stdout).to.be.empty.string;
        expect(spy.start.callCount).to.be.equals(1);
        expect(spy.start.args).deep.equal([['cm:stacks:audit:fix']]);
      });
  });
});
