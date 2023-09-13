import { resolve } from 'path';
import chalk from 'chalk';
import { FlagInput, Flags, cliux, ux } from '@contentstack/cli-utilities';

import config from '../../../../config';
import { auditMsg } from '../../../../messages';
import { BaseCommand } from '../../../../base-command';
import ContentType from '../../../../modules/content-types';

export default class Audit extends BaseCommand<typeof Audit> {
  static aliases: string[] = ['cm:stacks:audit'];

  static description = 'Audit and find possible errors in the exported data';

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
      description: auditMsg.REFERENCE_ONLY,
    }),
    modules: Flags.string({
      multiple: true,
      options: config.modules,
      description: auditMsg.MODULES,
    }),
    ...ux.table.flags({
      only: ['columns', 'sort', 'filter', 'csv', 'no-truncate'],
    }),
  };

  async run(): Promise<void> {
    try {
      const { flags } = await this.parse(Audit);

      await this.promptQueue();
      const reportPath = this.flags['report-path'] || process.cwd();
      this.sharedConfig.reportPath = resolve(reportPath, 'audit-report');

      for (const module of this.sharedConfig.flags.modules || this.sharedConfig.modules) {
        switch (module) {
          case 'content-types':
            const ctErrors = await new ContentType({ config: this.sharedConfig, log: this.log }).run();
            cliux.table(
              Object.values(ctErrors).flat(),
              {
                name: {
                  minWidth: 7,
                  header: 'Content Type name',
                },
                display_name: {
                  minWidth: 7,
                  header: 'Field name',
                },
                data_type: {
                  minWidth: 7,
                  header: 'Field type',
                },
                missingRefs: {
                  minWidth: 7,
                  header: 'Missing references',
                  get: (row) => {
                    return chalk.red(row.missingRefs);
                  },
                },
                treeStr: {
                  minWidth: 7,
                  header: 'Path',
                },
              },
              {
                ...flags,
              },
            );
            this.log(''); // NOTE add new line in terminal
            this.log(''); // NOTE add new line in terminal
            break;
          case 'entries':
            break;
          case 'global-fields':
            break;
        }
      }
    } catch (error) {
      this.log(error, 'error');
      this.exit(1);
    }
  }

  async promptQueue() {
    // NOTE get content path if data-dir flag is missing
    this.sharedConfig.basePath =
      this.flags['data-dir'] ||
      (await cliux.inquire<string>({
        type: 'input',
        name: 'data-dir',
        message: this.messages.DATA_DIR,
      }));
  }
}
