import winston from 'winston';
import { resolve } from 'path';
import { fancy } from 'fancy-test';
import { expect } from 'chai';
import { FileTransportInstance } from 'winston/lib/winston/transports';

import { BaseCommand } from '../../src/base-command';

describe('BaseCommand class', () => {
  class Command extends BaseCommand<typeof Command> {
    async run() {
      // this.parse();
      this.log('Test log');
    }
  }

  const fsTransport = class FsTransport {
    filename!: string;
  } as FileTransportInstance;

  const createMockWinstonLogger = () => ({
    log: (message: any) => process.stdout.write(typeof message === 'string' ? message : JSON.stringify(message) + '\n'),
    error: (message: any) => {
      const errorMsg = typeof message === 'string' ? message : (message?.message || JSON.stringify(message));
      process.stdout.write(`ERROR: ${errorMsg}\n`);
    },
    info: (message: any) => {
      const infoMsg = typeof message === 'string' ? message : (message?.message || JSON.stringify(message));
      process.stdout.write(`INFO: ${infoMsg}\n`);
    },
    warn: (message: any) => {
      const warnMsg = typeof message === 'string' ? message : (message?.message || JSON.stringify(message));
      process.stdout.write(`WARN: ${warnMsg}\n`);
    },
    debug: (message: any) => {
      const debugMsg = typeof message === 'string' ? message : (message?.message || JSON.stringify(message));
      process.stdout.write(`DEBUG: ${debugMsg}\n`);
    },
    level: 'info'
  });

  describe('command', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(winston.transports, 'File', () => fsTransport)
      .stub(winston, 'createLogger', createMockWinstonLogger)
      .do(() => Command.run([]))
      .do((output) => expect(output.stdout).to.equal('Test log\n'))
      .it('logs to stdout');

    fancy
      .stub(winston.transports, 'File', () => fsTransport)
      .stub(winston, 'createLogger', createMockWinstonLogger)
      .do(() => {
        class CMD extends BaseCommand<typeof CMD> {
          async run() {
            throw new Error('new error');
          }
        }

        return CMD.run([]);
      })
      .catch(/new error/)
      .it('errors out');
  });

  describe('validate config file', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(winston.transports, 'File', () => fsTransport)
      .stub(winston, 'createLogger', createMockWinstonLogger)
      .it('should log error', async (ctx) => {
        class CMD extends BaseCommand<typeof Command> {
          async run() {
            const { flags } = await this.parse(CMD);
            this.log(flags.config);
          }
        }

        const configPath = resolve(__dirname, 'mock', 'invalid-config.json');

        await CMD.run([`--config=${configPath}`]);
        expect(ctx.stdout).to.include('Unexpected token');
      });
  });
});
