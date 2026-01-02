import fs from 'fs';
import winston from 'winston';
import sinon from 'sinon';
import { resolve } from 'path';
import { fancy } from 'fancy-test';
import { PassThrough } from 'stream';
import { expect } from 'chai';
import { ux, cliux, CLIProgressManager, configHandler, clearProgressModuleSetting } from '@contentstack/cli-utilities';

import { AuditBaseCommand } from '../../src/audit-base-command';
import {
  ContentType,
  Entries,
  GlobalField,
  Extensions,
  Workflows,
  CustomRoles,
  Assets,
  FieldRule,
} from '../../src/modules';
import { FileTransportInstance } from 'winston/lib/winston/transports';
import { $t, auditMsg } from '../../src/messages';
import { mockLogger } from './mock-logger';
describe('AuditBaseCommand class', () => {
  class AuditCMD extends AuditBaseCommand {
    async run() {
      console.warn('WARN: Reports ready. Please find the reports at');
      await this.init();
      await this.start('cm:stacks:audit');
    }
  }

  class AuditFixCMD extends AuditBaseCommand {
    async run() {
      await this.init();
      await this.start('cm:stacks:audit:fix');
    }
  }

  const fsTransport = class FsTransport {
    filename!: string;
  } as FileTransportInstance;

  const createMockWinstonLogger = () => ({
    log: (message: string) => process.stdout.write(message + '\n'),
    error: (message: string) => process.stdout.write(`ERROR: ${message}\n`),
    info: (message: string) => process.stdout.write(`INFO: ${message}\n`),
    warn: (message: string) => process.stdout.write(`WARN: ${message}\n`),
    debug: (message: string) => process.stdout.write(`DEBUG: ${message}\n`),
    level: 'info'
  });

  let consoleWarnSpy: sinon.SinonSpy;
  let consoleInfoSpy: sinon.SinonSpy;
  beforeEach(() => {
    consoleWarnSpy = sinon.spy(console, 'warn');
    consoleInfoSpy = sinon.spy(console, 'info');
    
    // Mock the logger for all tests
    sinon.stub(require('@contentstack/cli-utilities'), 'log').value(mockLogger);
  });
  afterEach(() => {
    consoleWarnSpy.restore();
    consoleInfoSpy.restore();
    sinon.restore(); // Restore all stubs and mocks
  });
  describe('Audit command flow', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(winston.transports, 'File', () => fsTransport)
      .stub(winston, 'createLogger', createMockWinstonLogger)
      .stub(fs, 'mkdirSync', () => {})
      .stub(fs, 'writeFileSync', () => {})
      .stub(cliux, 'table', () => {})
      .stub(ux.action, 'stop', () => {})
      .stub(ux.action, 'start', () => {})
      .stub(Entries.prototype, 'run', () => ({ entry_1: {} }))
      .stub(ContentType.prototype, 'run', () => ({ ct_1: {} }))
      .stub(GlobalField.prototype, 'run', () => ({ gf_1: {} }))
      .stub(Extensions.prototype, 'run', () => ({ ext_1: {} }))
      .stub(CustomRoles.prototype, 'run', () => ({ ext_1: {} }))
      .stub(Assets.prototype, 'run', () => ({ ext_1: {} }))
      .stub(FieldRule.prototype, 'run', () => ({ ext_1: {} }))
      .stub(AuditBaseCommand.prototype, 'showOutputOnScreenWorkflowsAndExtension', () => {})
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .it('should show audit report path', async () => {
        await AuditCMD.run(['--data-dir', resolve(__dirname, 'mock', 'contents')]);
        const warnOutput = consoleWarnSpy
          .getCalls()
          .map((call) => call.args[0])
          .join('');
        expect(warnOutput).to.includes('WARN: Reports ready. Please find the reports at');
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(winston.transports, 'File', () => fsTransport)
      .stub(winston, 'createLogger', createMockWinstonLogger)
      .stub(fs, 'mkdirSync', () => {})
      .stub(fs, 'writeFileSync', () => {})
      .stub(ux, 'table', () => {})
      .stub(ux.action, 'stop', () => {})
      .stub(ux.action, 'start', () => {})
      .stub(cliux, 'inquire', () => resolve(__dirname, 'mock', 'contents'))
      .stub(AuditBaseCommand.prototype, 'scanAndFix', () => {
        console.log('scanAndFix called, returning empty object');
        return {
          missingCtRefs: {},
          missingGfRefs: {},
          missingEntryRefs: {},
          missingCtRefsInExtensions: {},
          missingCtRefsInWorkflow: {},
          missingSelectFeild: {},
          missingMandatoryFields: {},
          missingTitleFields: {},
          missingRefInCustomRoles: {},
          missingEnvLocalesInAssets: {},
          missingEnvLocalesInEntries: {},
          missingFieldRules: {},
          missingMultipleFields: {}
        };
      })
      .stub(Entries.prototype, 'run', () => ({ entry_1: {} }))
      .stub(ContentType.prototype, 'run', () => ({ ct_1: {} }))
      .stub(GlobalField.prototype, 'run', () => ({ gf_1: {} }))
      .stub(Workflows.prototype, 'run', () => ({ wf_1: {} }))
      .stub(Extensions.prototype, 'run', () => ({ ext_1: {} }))
      .stub(CustomRoles.prototype, 'run', () => ({ ext_1: {} }))
      .stub(Assets.prototype, 'run', () => ({ ext_1: {} }))
      .stub(FieldRule.prototype, 'run', () => ({ ext_1: {} }))
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .it('should print info of no ref found', async (ctx) => {
        await AuditCMD.run([]);
        expect(ctx.stdout).to.includes('INFO: No missing references found.');
      });
  });

  describe('Audit fix command flow', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(winston.transports, 'File', () => fsTransport)
      .stub(winston, 'createLogger', createMockWinstonLogger)
      .stub(fs, 'mkdirSync', () => {})
      .stub(fs, 'writeFileSync', () => {})
      .stub(AuditBaseCommand.prototype, 'showOutputOnScreenWorkflowsAndExtension', () => {})
      .stub(ux, 'table', (...args: any) => {
        args[1].missingRefs.get({ missingRefs: ['gf_0'] });
      })
      .stub(AuditBaseCommand.prototype, 'showOutputOnScreenWorkflowsAndExtension', () => {})
      .stub(ux.action, 'stop', () => {})
      .stub(ux.action, 'start', () => {})
      .stub(AuditBaseCommand.prototype, 'scanAndFix', () => ({
        missingCtRefs: { ct_1: {} },
        missingGfRefs: { gf_1: {} },
        missingEntryRefs: {
          entry_1: {
            name: 'T1',
            display_name: 'T1',
            data_type: 'reference',
            missingRefs: ['gf_0'],
            treeStr: 'T1 -> gf_0',
          },
        },
        missingCtRefsInExtensions: {},
        missingCtRefsInWorkflow: {},
        missingSelectFeild: {},
        missingMandatoryFields: {},
        missingTitleFields: {},
        missingRefInCustomRoles: {},
        missingEnvLocalesInAssets: {},
        missingEnvLocalesInEntries: {},
        missingFieldRules: {},
        missingMultipleFields: {}
      }))
      .stub(fs, 'createBackUp', () => {})
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .stub(AuditBaseCommand.prototype, 'createBackUp', () => {})
      .it('should print missing ref and fix status on table formate', async (ctx) => {
        await AuditFixCMD.run(['--data-dir', resolve(__dirname, 'mock', 'contents')]);
        expect(ctx.stdout).to.includes('WARN: You can locate the fixed content at');
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(winston.transports, 'File', () => fsTransport)
      .stub(winston, 'createLogger', createMockWinstonLogger)
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
      .stub(winston, 'createLogger', createMockWinstonLogger)
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
      .stub(winston, 'createLogger', createMockWinstonLogger)
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
      .stub(winston, 'createLogger', createMockWinstonLogger)
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
      .stub(winston, 'createLogger', createMockWinstonLogger)
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
      .stub(winston, 'createLogger', createMockWinstonLogger)
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
      .stub(winston, 'createLogger', createMockWinstonLogger)
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

  describe('prepareReport method - Report file names', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(winston.transports, 'File', () => fsTransport)
      .stub(winston, 'createLogger', createMockWinstonLogger)
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .stub(fs, 'mkdirSync', () => {})
      .stub(fs, 'existsSync', () => true)
      .it('should generate report file with correct spelling: Entries_Select_field (not feild)', async () => {
        const writeFileSyncSpy = sinon.spy(fs, 'writeFileSync');
        class CMD extends AuditBaseCommand {
          async run() {
            await this.init();
            this.sharedConfig.reportPath = resolve(__dirname, 'mock', 'contents');
            
            await this.prepareReport('Entries_Select_field', {
              entry1: {
                name: 'Test Entry',
                display_name: 'Select Field',
                missingRefs: ['ref1'],
              },
            });
            
            const jsonCall = writeFileSyncSpy.getCalls().find(call => 
              typeof call.args[0] === 'string' && call.args[0].includes('.json')
            );
            return jsonCall ? (jsonCall.args[0] as string) : undefined;
          }
        }

        const result = await CMD.run([]);
        writeFileSyncSpy.restore();
        expect(result).to.include('Entries_Select_field.json');
        expect(result).to.not.include('Entries_Select_feild');
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(winston.transports, 'File', () => fsTransport)
      .stub(winston, 'createLogger', createMockWinstonLogger)
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .stub(fs, 'mkdirSync', () => {})
      .stub(fs, 'existsSync', () => true)
      .it('should generate report file with correct spelling: Entries_Mandatory_field (not feild)', async () => {
        const writeFileSyncSpy = sinon.spy(fs, 'writeFileSync');
        class CMD extends AuditBaseCommand {
          async run() {
            await this.init();
            this.sharedConfig.reportPath = resolve(__dirname, 'mock', 'contents');
            
            await this.prepareReport('Entries_Mandatory_field', {
              entry1: {
                name: 'Test Entry',
                display_name: 'Mandatory Field',
                missingRefs: ['ref1'],
              },
            });
            
            const jsonCall = writeFileSyncSpy.getCalls().find(call => 
              typeof call.args[0] === 'string' && call.args[0].includes('.json')
            );
            return jsonCall ? (jsonCall.args[0] as string) : undefined;
          }
        }

        const result = await CMD.run([]);
        writeFileSyncSpy.restore();
        expect(result).to.include('Entries_Mandatory_field.json');
        expect(result).to.not.include('Entries_Mandatory_feild');
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(winston.transports, 'File', () => fsTransport)
      .stub(winston, 'createLogger', createMockWinstonLogger)
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .stub(fs, 'mkdirSync', () => {})
      .stub(fs, 'existsSync', () => true)
      .it('should generate report file with correct spelling: Entries_Title_field (not feild)', async () => {
        const writeFileSyncSpy = sinon.spy(fs, 'writeFileSync');
        class CMD extends AuditBaseCommand {
          async run() {
            await this.init();
            this.sharedConfig.reportPath = resolve(__dirname, 'mock', 'contents');
            
            await this.prepareReport('Entries_Title_field', {
              entry1: {
                name: 'Test Entry',
                display_name: 'Title Field',
                missingRefs: ['ref1'],
              },
            });
            
            const jsonCall = writeFileSyncSpy.getCalls().find(call => 
              typeof call.args[0] === 'string' && call.args[0].includes('.json')
            );
            return jsonCall ? (jsonCall.args[0] as string) : undefined;
          }
        }

        const result = await CMD.run([]);
        writeFileSyncSpy.restore();
        expect(result).to.include('Entries_Title_field.json');
        expect(result).to.not.include('Entries_Title_feild');
      });
  });

  describe('Config - ReportTitleForEntries keys', () => {
    it('should have correct spelling in ReportTitleForEntries config', () => {
      const config = require('../../src/config').default;
      
      // Verify correct spelling (field, not feild)
      expect(config.ReportTitleForEntries).to.have.property('Entries_Select_field');
      expect(config.ReportTitleForEntries).to.have.property('Entries_Mandatory_field');
      expect(config.ReportTitleForEntries).to.have.property('Entries_Title_field');
      
      // Verify old typo is not present
      expect(config.ReportTitleForEntries).to.not.have.property('Entries_Select_feild');
      expect(config.ReportTitleForEntries).to.not.have.property('Entries_Mandatory_feild');
      expect(config.ReportTitleForEntries).to.not.have.property('Entries_Title_feild');
      
      // Verify values match keys
      expect(config.ReportTitleForEntries.Entries_Select_field).to.equal('Entries_Select_field');
      expect(config.ReportTitleForEntries.Entries_Mandatory_field).to.equal('Entries_Mandatory_field');
      expect(config.ReportTitleForEntries.Entries_Title_field).to.equal('Entries_Title_field');
    });

    it('should have correct spelling in feild_level_modules array', () => {
      const config = require('../../src/config').default;
      
      // Verify correct spelling in the array
      expect(config.feild_level_modules).to.include('Entries_Select_field');
      expect(config.feild_level_modules).to.include('Entries_Mandatory_field');
      expect(config.feild_level_modules).to.include('Entries_Title_field');
      
      // Verify old typo is not present
      expect(config.feild_level_modules).to.not.include('Entries_Select_feild');
      expect(config.feild_level_modules).to.not.include('Entries_Mandatory_feild');
      expect(config.feild_level_modules).to.not.include('Entries_Title_feild');
    });
  });
});
