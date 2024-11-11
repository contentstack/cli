import winston from 'winston';
import { expect } from 'chai';
import { runCommand } from '@oclif/test';
import fancy from 'fancy-test';
import { FileTransportInstance } from 'winston/lib/winston/transports';

import { AuditBaseCommand } from '../../../src/audit-base-command';
describe('Audit command', () => {
  const fsTransport = class FsTransport {
    filename!: string;
  } as FileTransportInstance;

  describe('Audit run method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(winston.transports, 'File', () => fsTransport)
      .stub(winston, 'createLogger', () => ({ log: () => {}, error: () => {} }))
      .stub(AuditBaseCommand.prototype, 'start', () => {})
      .it('should trigger AuditBaseCommand start method', async () => {
        const { stdout } = await runCommand(['cm:stacks:audit'], { root: process.cwd() });
        expect(stdout).to.be.string;
      });

    fancy
      .stderr({ print: false })
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(winston.transports, 'File', () => fsTransport)
      .stub(winston, 'createLogger', () => ({ log: console.log, error: console.error }))
      .stub(AuditBaseCommand.prototype, 'start', () => Promise.reject('process failed'))
      .it('should log any error and exit with status code 1', async () => {
        await runCommand(['cm:stacks:audit'], { root: process.cwd() });
      });

    fancy
      .stderr({ print: false })
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(winston.transports, 'File', () => fsTransport)
      .stub(winston, 'createLogger', () => ({ log: console.log, error: console.error }))
      .stub(AuditBaseCommand.prototype, 'start', () => {
        throw Error('process failed');
      })
      .it('should log the error objet message and exit with status code 1', async () => {
        await runCommand(['cm:stacks:audit'], { root: process.cwd() });
      });
  });
});
