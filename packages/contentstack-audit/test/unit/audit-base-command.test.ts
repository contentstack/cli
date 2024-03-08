import fs from 'fs';
import winston from 'winston';
import { resolve } from 'path';
import { fancy } from 'fancy-test';
import { PassThrough } from 'stream';
import { expect } from '@oclif/test';
import { ux, cliux } from '@contentstack/cli-utilities';

import { AuditBaseCommand } from '../../src/audit-base-command';
import { ContentType, Entries, GlobalField, Extensions, Workflows } from '../../src/modules';
import { FileTransportInstance } from 'winston/lib/winston/transports';
import { $t, auditMsg } from '../../src/messages';

describe('AuditBaseCommand class', () => {
  class AuditCMD extends AuditBaseCommand {
    async run() {
      await this.start('cm:stacks:audit');
    }
  }

  class AuditFixCMD extends AuditBaseCommand {
    async run() {
      await this.start('cm:stacks:audit:fix');
    }
  }

  const fsTransport = class FsTransport {
    filename!: string;
  } as FileTransportInstance;

  describe('Audit command flow', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(winston.transports, 'File', () => fsTransport)
      .stub(winston, 'createLogger', () => ({ log: console.log, error: console.error }))
      .stub(fs, 'mkdirSync', () => {})
      .stub(fs, 'writeFileSync', () => {})
      .stub(ux, 'table', () => {})
      .stub(ux.action, 'stop', () => {})
      .stub(ux.action, 'start', () => {})
      .stub(Entries.prototype, 'run', () => ({ entry_1: {} }))
      .stub(ContentType.prototype, 'run', () => ({ ct_1: {} }))
      .stub(GlobalField.prototype, 'run', () => ({ gf_1: {} }))
      .stub(Extensions.prototype, 'run', () => ({ ext_1: {} }))
      .stub(AuditBaseCommand.prototype, 'showOutputOnScreenWorkflowsAndExtension', () => {})
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .it('should show audit report path', async (ctx) => {
        await AuditCMD.run(['--data-dir', resolve(__dirname, 'mock', 'contents')]);
        expect(ctx.stdout).to.includes('warn Reports ready. Please find the reports at');
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(winston.transports, 'File', () => fsTransport)
      .stub(winston, 'createLogger', () => ({ log: console.log, error: console.error }))
      .stub(fs, 'mkdirSync', () => {})
      .stub(fs, 'writeFileSync', () => {})
      .stub(ux, 'table', () => {})
      .stub(ux.action, 'stop', () => {})
      .stub(ux.action, 'start', () => {})
      .stub(cliux, 'inquire', () => resolve(__dirname, 'mock', 'contents'))
      .stub(AuditBaseCommand.prototype, 'scanAndFix', () => ({ val_1: {} }))
      .stub(Entries.prototype, 'run', () => ({ entry_1: {} }))
      .stub(ContentType.prototype, 'run', () => ({ ct_1: {} }))
      .stub(GlobalField.prototype, 'run', () => ({ gf_1: {} }))
      .stub(Workflows.prototype, 'run', () => ({ wf_1: {} }))
      .stub(Extensions.prototype, 'run', () => ({ ext_1: {} }))
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .it('should print info of no ref found', async (ctx) => {
        await AuditCMD.run([]);
        expect(ctx.stdout).to.includes('info No missing references found.');
      });
  });

  describe('Audit fix command flow', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(winston.transports, 'File', () => fsTransport)
      .stub(winston, 'createLogger', () => ({ log: console.log, error: console.error }))
      .stub(fs, 'mkdirSync', () => {})
      .stub(fs, 'writeFileSync', () => {})
      .stub(AuditBaseCommand.prototype, 'showOutputOnScreenWorkflowsAndExtension', () => {})
      .stub(ux, 'table', (...args: any) => {
        args[1].missingRefs.get({ missingRefs: ['gf_0'] });
      })
      .stub(AuditBaseCommand.prototype, 'showOutputOnScreenWorkflowsAndExtension', () => {})
      .stub(ux.action, 'stop', () => {})
      .stub(ux.action, 'start', () => {})
      .stub(Entries.prototype, 'run', () => ({
        entry_1: {
          name: 'T1',
          display_name: 'T1',
          data_type: 'reference',
          missingRefs: ['gf_0'],
          treeStr: 'T1 -> gf_0',
        },
      }))
      .stub(ContentType.prototype, 'run', () => ({ ct_1: {} }))
      .stub(GlobalField.prototype, 'run', () => ({ gf_1: {} }))
      .stub(Workflows.prototype, 'run', () => ({ wf_1: {} }))
      .stub(Extensions.prototype, 'run', () => ({ ext_1: {} }))
      .stub(fs, 'createBackUp', () => {})
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .stub(AuditBaseCommand.prototype, 'createBackUp', () => {})
      .it('should print missing ref and fix status on table formate', async (ctx) => {
        await AuditFixCMD.run(['--data-dir', resolve(__dirname, 'mock', 'contents')]);
        expect(ctx.stdout).to.includes('warn You can locate the fixed content at');
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(winston.transports, 'File', () => fsTransport)
      .stub(winston, 'createLogger', () => ({ log: () => {}, error: () => {} }))
      .it('return the status column object ', async () => {
        class FixCMD extends AuditBaseCommand {
          async run() {
            return this.fixStatus;
          }
        }
        const res = await FixCMD.run(['--data-dir', resolve(__dirname, 'mock', 'contents')]);

        expect(res.fixStatus).ownProperty('header');
        expect(res.fixStatus.header).to.be.include('Fix Status');
        expect(res.fixStatus.get({ fixStatus: 'Fixed' })).to.be.include('Fixed');
        expect(res.fixStatus.get({ fixStatus: 'Not Fixed' })).to.be.include('Not Fixed');
      });
  });

  describe('createBackUp method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(winston.transports, 'File', () => fsTransport)
      .stub(winston, 'createLogger', () => ({ log: console.log, error: console.error }))
      .stub(AuditBaseCommand.prototype, 'promptQueue', async () => {})
      .stub(AuditBaseCommand.prototype, 'scanAndFix', async () => ({}))
      .stub(AuditBaseCommand.prototype, 'showOutputOnScreen', () => {})
      .stub(fs, 'mkdirSync', () => {})
      .stub(require('fs-extra'), 'copy', () => {})
      .it('should create backup dir', async () => {
        class CMD extends AuditBaseCommand {
          async run() {
            this.sharedConfig.flags.modules = [];
            const mockPath = resolve(__dirname, 'mock', 'contents');
            this.flags['copy-dir'] = true;
            this.flags['data-dir'] = mockPath;
            this.flags['report-path'] = mockPath;
            this.sharedConfig.basePath = mockPath;
            this.sharedConfig.reportPath = mockPath;
            await this.start('cm:stacks:audit:fix');
            return this.sharedConfig.basePath;
          }
        }

        expect(await CMD.run([])).to.includes('test/unit/mock');
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(winston.transports, 'File', () => fsTransport)
      .stub(winston, 'createLogger', () => ({ log: console.log, error: console.error }))
      .stub(AuditBaseCommand.prototype, 'promptQueue', async () => {})
      .stub(AuditBaseCommand.prototype, 'scanAndFix', async () => ({}))
      .stub(AuditBaseCommand.prototype, 'showOutputOnScreen', () => {})
      .stub(fs, 'mkdirSync', () => {})
      .stub(require('fs-extra'), 'copy', () => {})
      .it('should throw error if not valid path provided to create backup dir', async () => {
        class CMD extends AuditBaseCommand {
          async run() {
            this.sharedConfig.flags.modules = [];
            const mockPath = resolve(__dirname, 'mock', 'contents');
            this.flags['copy-dir'] = true;
            this.flags['data-dir'] = mockPath;
            this.flags['report-path'] = mockPath;
            this.sharedConfig.basePath = resolve(__dirname, 'mock', 'contents-1');
            this.sharedConfig.reportPath = mockPath;
            await this.start('cm:stacks:audit:fix');
            return this.sharedConfig.basePath;
          }
        }

        try {
          await CMD.run([]);
        } catch (error: any) {
          expect(error.message).to.include(
            $t(auditMsg.NOT_VALID_PATH, { path: resolve(__dirname, 'mock', 'contents-1') }),
          );
        }
      });
  });

  describe('prepareCSV method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(winston.transports, 'File', () => fsTransport)
      .stub(winston, 'createLogger', () => ({ log: console.log, error: console.error }))
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .it('should print missing ref and fix status on table formate', async () => {
        class CMD extends AuditBaseCommand {
          async run() {
            this.sharedConfig.reportPath = resolve(__dirname, 'mock', 'contents');
            return this.prepareCSV('content-types', {
              t1: {
                name: 'T1',
                display_name: 'T1',
                data_type: 'reference',
                missingRefs: ['gf_0'],
                treeStr: 'T1 -> gf_0',
              },
              t2: {
                name: 'T2',
                display_name: 'T2',
                data_type: 'reference',
                missingRefs: ['gf_0'],
                treeStr: 'T2 -> gf_0',
              },
            });
          }
        }

        expect(await CMD.run([])).to.be.undefined;
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(winston.transports, 'File', () => fsTransport)
      .stub(winston, 'createLogger', () => ({ log: console.log, error: console.error }))
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .it('should apply filter on output', async () => {
        class CMD extends AuditBaseCommand {
          async run() {
            this.sharedConfig.reportPath = resolve(__dirname, 'mock', 'contents');
            this.sharedConfig.flags.columns = 'Path';
            this.sharedConfig.flags.filter = 'Title=T1';
            return this.prepareCSV('content-types', {
              t1: {
                name: 'T1',
                display_name: 'T1',
                data_type: 'reference',
                missingRefs: ['gf_0'],
                treeStr: 'T1 -> gf_0',
              },
              t2: {
                name: 'T2',
                display_name: 'T2',
                data_type: 'reference',
                missingRefs: ['gf_0'],
                treeStr: 'T2 -> gf_0',
              },
            });
          }
        }

        expect(await CMD.run([])).to.be.undefined;
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(winston.transports, 'File', () => fsTransport)
      .stub(winston, 'createLogger', () => ({ log: console.log, error: console.error }))
      .it('should fail with error', async () => {
        class CMD extends AuditBaseCommand {
          async run() {
            this.sharedConfig.reportPath = resolve(__dirname, 'mock', 'contents-1');
            this.sharedConfig.flags.columns = 'Path';
            this.sharedConfig.flags.filter = 'Title=T1';
            return this.prepareCSV('content-types', { t1: {}, t2: {} });
          }
        }

        try {
          await CMD.run([]);
        } catch (error: any) {
          expect(error.message).to.be.include(
            `ENOENT: no such file or directory, open '${resolve(__dirname, 'mock', 'contents-1')}/content-types.csv'`,
          );
        }
      });
  });

  describe('getCtAndGfSchema method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(winston.transports, 'File', () => fsTransport)
      .stub(winston, 'createLogger', () => ({ log: () => {}, error: () => {} }))
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .it('should log error and return empty array', async () => {
        class CMD extends AuditBaseCommand {
          async run() {
            this.sharedConfig.reportPath = resolve(__dirname, 'mock', 'contents-1');
            return this.getCtAndGfSchema();
          }
        }

        expect(await CMD.run([])).to.be.deep.include({
          ctSchema: [],
          gfSchema: [],
        });
      });
  });
});
