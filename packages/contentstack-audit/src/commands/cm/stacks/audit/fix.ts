import { FlagInput, Flags, ux } from '@contentstack/cli-utilities';

import config from '../../../../config';
import { auditFixMsg, auditMsg } from '../../../../messages';
import { AuditBaseCommand } from '../../../../audit-base-command';

export default class AuditFix extends AuditBaseCommand {
  static aliases: string[] = ['audit:fix', 'cm:stacks:audit:fix'];

  static description = auditFixMsg.AUDIT_FIX_CMD_DESCRIPTION;

  static examples = [
    '$ <%= config.bin %> <%= command.id %> --copy-dir',
    '$ <%= config.bin %> <%= command.id %> --report-path=<path> --copy-dir',
    '$ <%= config.bin %> <%= command.id %> --report-path=<path> --copy-dir --csv',
    '$ <%= config.bin %> <%= command.id %> --report-path=<path> --filter="name=<filter-value>"',
    '$ <%= config.bin %> <%= command.id %> --report-path=<path> --modules=content-types --filter="name="<filter-value>" --copy-dir --copy-path=<path>',
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
    'copy-dir': Flags.boolean({
      description: auditFixMsg.COPY_DATA,
    }),
    'copy-path': Flags.string({
      dependsOn: ['copy-dir'],
      description: auditFixMsg.BKP_PATH,
    }),
    yes: Flags.boolean({
      char: 'y',
      hidden: true,
      description: 'Use this flag to skip confirmation',
    }),
    ...ux.table.flags({
      only: ['columns', 'sort', 'filter', 'csv', 'no-truncate'],
    }),
  };

  /**
   * The `run` function is an asynchronous function that performs an audit on different modules
   * (content-types, global-fields, entries) and generates a report.
   */
  async run(): Promise<void> {
    try {
      await this.start('cm:stacks:audit:fix');
    } catch (error) {
      this.log(error instanceof Error ? error.message : error, 'error');
      console.trace(error);
      ux.action.stop('Process failed.!');
      this.exit(1);
    }
  }
}
