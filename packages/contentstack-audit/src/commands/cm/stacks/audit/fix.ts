import { FlagInput, Flags, ux } from '@contentstack/cli-utilities';

import config from '../../../../config';
import { auditFixMsg, auditMsg } from '../../../../messages';
import { AuditBaseCommand } from '../../../../audit-base-command';

export default class AuditFix extends AuditBaseCommand {
  static aliases: string[] = ['cm:stacks:audit:fix'];

  static description = 'Audit and find possible errors in the exported data and fix';

  static examples = [
    '$ <%= config.bin %> <%= command.id %>',
    '$ <%= config.bin %> <%= command.id %> --report-path=<path>',
    '$ <%= config.bin %> <%= command.id %> --report-path=<path> --csv',
    '$ <%= config.bin %> <%= command.id %> --report-path=<path> --filter="name=<filter-value>"',
    '$ <%= config.bin %> <%= command.id %> --report-path=<path> --modules=content-types --filter="name="<filter-value>"',
  ];

  static flags: FlagInput = {
    'report-path': Flags.string({
      description: auditMsg.REPORT_PATH,
    }),
    'reference-only': Flags.boolean({
      hidden: true,
      description: auditMsg.REFERENCE_ONLY,
    }),
    modules: Flags.string({
      multiple: true,
      options: config.modules,
      description: auditMsg.MODULES,
    }),
    'backup-data': Flags.boolean({
      description: auditFixMsg.BACKUP_DATA,
    }),
    'backup-dir': Flags.string({
      dependsOn: ['backup-data'],
      description: auditFixMsg.BKP_PATH,
    }),
    yes: Flags.boolean({
      char: 'y',
      description: 'Use this flag to skip confirmation',
    }),
  };

  /**
   * The `run` function is an asynchronous function that performs an audit on different modules
   * (content-types, global-fields, entries) and generates a report.
   */
  async run(): Promise<void> {
    try {
      await this.start('cm:stacks:audit:fix');
      this.log(this.$t(this.messages.FIXED_CONTENT_PATH_MAG, { path: this.sharedConfig.basePath }), 'warn');
    } catch (error) {
      this.log(error instanceof Error ? error.message : error, 'error');
      console.trace(error);
      ux.action.stop('Process failed.!');
      this.exit(1);
    }
  }
}
