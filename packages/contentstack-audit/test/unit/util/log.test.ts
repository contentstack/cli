import sinon from 'sinon';
import winston from 'winston';
import { resolve } from 'path';
import { fancy } from 'fancy-test';
import { expect } from '@oclif/test';
import { cliux as ux } from '@contentstack/cli-utilities';
import { FileTransportInstance } from 'winston/lib/winston/transports';

import { Logger, print } from '../../../src/util';

describe('Log utility', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('Stubbing winston createLogger', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(
        winston.transports,
        'File',
        () =>
          class FsTransport {
            constructor() {}
          } as FileTransportInstance,
      )
      .it('should create logger instance', () => {
        sinon.replace(winston, 'createLogger', () => ({} as unknown as winston.Logger));
        const logSpy = sinon.spy(winston, 'createLogger');
        new Logger({ basePath: resolve(__dirname, '..', 'mock') });
        expect(logSpy.callCount).to.be.equals(2);
      });
  });

  describe('Stubbing winston logger method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(ux, 'print', () => {})
      .stub(
        winston.transports,
        'File',
        () => (class FsTransport {
          constructor() {}
        }) as FileTransportInstance)
      .it('should log message', () => {
        const logSpy = sinon.spy();
        sinon.stub(winston, 'createLogger').returns({ log: logSpy, error: logSpy } as unknown as winston.Logger);
        const logger = new Logger({ basePath: resolve(__dirname, '..', 'mock') });
        logger.log('Simple log');
        logger.log('Info log', 'info');
        logger.log('Error log', 'error');
        expect(logSpy.args).deep.equal([['info', 'Info log'], ['Error log']]);
      });
  });

  describe('Replace sensitive data before log', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(
        winston.transports,
        'File',
        () =>
          class FsTransport {
            constructor() {}
          } as FileTransportInstance,
      )
      .stub(ux, 'print', () => {})
      .stub(winston, 'createLogger', () => {})
      .it('should remove any credentials before log message', () => {
        const logSpy = sinon.spy();
        sinon.replace(winston, 'createLogger', () => ({} as unknown as winston.Logger));
        sinon.stub(winston, 'createLogger').callsFake(
          () =>
            ({
              log: logSpy,
              error: logSpy
            } as unknown as winston.Logger),
        );
        const logger = new Logger({ basePath: resolve(__dirname, '..', 'mock') });

        let circularObject: any = {};
        circularObject.myself = circularObject;
        logger.log(['Test'], 'info');
        logger.log({ authtoken: 'test token' }, 'info');
        logger.log([{ authtoken: 'test token' }], 'info');
        logger.log(circularObject, 'error');

        expect(logSpy.calledWith(circularObject)).to.be.true;
        expect(logSpy.args[1]).to.deep.equals(['info', '{"authtoken": "..."}']);
      });
  });

  describe('Stubbing print method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .do(() => {
        print([
          {
            message: 'test',
          },
          {
            bold: true,
            color: 'cyan',
            message: 'message',
          },
        ]);
      })
      .it('print method should apply given styles on the message', ({ stdout }) => {
        expect(stdout).to.includes('test message')
      });
  });
});
