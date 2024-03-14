import winston from 'winston';
import { expect, test as fancy } from '@oclif/test';
import { FileTransportInstance } from 'winston/lib/winston/transports';

import { AuditBaseCommand } from '../../../src/audit-base-command';

describe('Audit command', () => {
  const fsTransport = class FsTransport {
    filename!: string;
  } as FileTransportInstance;

  describe('Audit run method', () => {
    const test = fancy.loadConfig({ root: process.cwd() });
    test
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(winston.transports, 'File', () => fsTransport)
      .stub(winston, 'createLogger', () => ({ log: () => {}, error: () => {} }))
      .stub(AuditBaseCommand.prototype, 'start', () => {})
      .command(['cm:stacks:audit'])
      .it('should trigger AuditBaseCommand start method', ({ stdout }) => {
        expect(stdout).to.be.string;
      });

    test
      .stderr({ print: false })
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(winston.transports, 'File', () => fsTransport)
      .stub(winston, 'createLogger', () => ({ log: console.log, error: console.error }))
      .stub(AuditBaseCommand.prototype, 'start', () => Promise.reject('process failed'))
      .command(['cm:stacks:audit'])
      .exit(1)
      .it('should log any error and exit with status code 1');

    test
      .stderr({ print: false })
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(winston.transports, 'File', () => fsTransport)
      .stub(winston, 'createLogger', () => ({ log: console.log, error: console.error }))
      .stub(AuditBaseCommand.prototype, 'start', () => {
        throw Error('process failed');
      })
      .command(['cm:stacks:audit'])
      .exit(1)
      .it('should log the error objet message and exit with status code 1');
  });
});
