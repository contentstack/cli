import { FlagInput, Flags, ux } from '@contentstack/cli-utilities';

import config from '../../../../config';
import { auditMsg } from '../../../../messages';
import { AuditBaseCommand } from '../../../../audit-base-command';
import { getTableFlags } from '../../../../util';

export default class Audit extends AuditBaseCommand {
  static aliases: string[] = ['audit', 'cm:stacks:audit'];

  static description = auditMsg.AUDIT_CMD_DESCRIPTION;

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
    ...getTableFlags(),
  };

  /**
   * The `run` function is an asynchronous function that performs an audit on different modules
   * (content-types, global-fields, entries, workflows) and generates a report.
   */
  async run(): Promise<void> {
    try {
      await this.start('cm:stacks:audit');
    } catch (error) {
      console.trace(error);
      this.log(error instanceof Error ? error.message : error, 'error');
      ux.action.stop('Process failed.!');
      this.exit(1);
    }
  }
}
