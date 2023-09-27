import chalk from 'chalk';
import * as csv from 'fast-csv';
import { join, resolve } from 'path';
import { FlagInput, Flags, cliux, ux } from '@contentstack/cli-utilities';
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

import config from '../../../../config';
import { auditMsg } from '../../../../messages';
import { BaseCommand } from '../../../../base-command';
import { Entries, GlobalField, ContentType } from '../../../../modules';
import { ContentTypeStruct, OutputColumn, RefErrorReturnType } from '../../../../types';

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
      hidden: true,
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

  /**
   * The `run` function is an asynchronous function that performs an audit on different modules
   * (content-types, global-fields, entries) and generates a report.
   */
  async run(): Promise<void> {
    try {
      await this.promptQueue();
      const reportPath = this.flags['report-path'] || process.cwd();
      this.sharedConfig.reportPath = resolve(reportPath, 'audit-report');
      let { ctSchema, gfSchema } = this.getCtAndGfSchema();
      let missingCtRefs, missingGfRefs, missingEntryRefs;

      for (const module of this.sharedConfig.flags.modules || this.sharedConfig.modules) {
        ux.action.start(this.$t(this.messages.AUDIT_START_SPINNER, { module }));

        switch (module) {
          case 'content-types':
            missingCtRefs = await new ContentType({
              ctSchema,
              gfSchema,
              log: this.log,
              moduleName: module,
              config: this.sharedConfig,
            }).run();

            await this.prepareReport(module, missingCtRefs);
            break;
          case 'global-fields':
            missingGfRefs = await new GlobalField({
              ctSchema,
              gfSchema,
              log: this.log,
              moduleName: module,
              config: this.sharedConfig,
            }).run();

            await this.prepareReport(module, missingGfRefs);
            break;
          case 'entries':
            missingEntryRefs = await new Entries({
              ctSchema,
              gfSchema,
              log: this.log,
              moduleName: module,
              config: this.sharedConfig,
            }).run();
            await this.prepareReport(module, missingEntryRefs);
            break;
        }

        ux.action.stop();
      }

      if (this.sharedConfig.showTerminalOutput) {
        this.log(''); // NOTE adding new line
        for (const missingRefs of [missingCtRefs, missingGfRefs, missingEntryRefs]) {
          if (missingRefs) {
            this.showOutputOnScreen(missingRefs);
            this.log(''); // NOTE adding new line
          }
        }
      }

      this.log(this.$t(auditMsg.FINAL_REPORT_PATH, { path: this.sharedConfig.reportPath }), 'warn');
    } catch (error) {
      this.log(error instanceof Error ? error.message : error, 'error');
      console.trace(error);
      ux.action.stop('Process failed.!');
      this.exit(1);
    }
  }

  /**
   * The `promptQueue` function prompts the user to enter a data directory path if the `data-dir` flag
   * is missing, and sets the `basePath` property of the `sharedConfig` object to the entered path.
   */
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

  /**
   * The function `getCtAndGfSchema` reads and parses JSON files containing content type and global
   * field schemas, and returns them as an object.
   * @returns The function `getCtAndGfSchema()` returns an object with two properties: `ctSchema` and
   * `gfSchema`. The values of these properties are the parsed JSON data from two different files.
   */
  getCtAndGfSchema() {
    let ctSchema = JSON.parse(
      readFileSync(
        join(
          this.sharedConfig.basePath,
          this.sharedConfig.moduleConfig['content-types'].dirName,
          this.sharedConfig.moduleConfig['content-types'].fileName,
        ),
        'utf-8',
      ),
    ) as ContentTypeStruct[];
    let gfSchema = JSON.parse(
      readFileSync(
        join(
          this.sharedConfig.basePath,
          this.sharedConfig.moduleConfig['global-fields'].dirName,
          this.sharedConfig.moduleConfig['global-fields'].fileName,
        ),
        'utf-8',
      ),
    ) as ContentTypeStruct[];

    return { ctSchema, gfSchema };
  }

  /**
   * The function `showOutputOnScreen` displays data in a table format on the screen, with specific
   * column headers and formatting options.
   * @param data - The `data` parameter is a record object that contains information about fields. Each
   * field is represented by a key-value pair, where the key is the field name and the value is an
   * object containing various properties such as `name`, `display_name`, `data_type`, `missingRefs`,
   * and `
   */
  showOutputOnScreen(data: Record<string, any>) {
    ux.table(
      Object.values(data).flat(),
      {
        name: {
          minWidth: 7,
          header: 'Title',
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
            return chalk.red(typeof row.missingRefs === 'object' ? JSON.stringify(row.missingRefs) : row.missingRefs);
          },
        },
        treeStr: {
          minWidth: 7,
          header: 'Path',
        },
      },
      {
        ...this.flags,
      },
    );
  }

  /**
   * The `prepareReport` function takes a module name and a list of missing references, and generates a
   * report in both JSON and CSV formats.
   * @param moduleName - The `moduleName` parameter is a string that represents the name of a module.
   * It is used to generate the filenames for the report files (JSON and CSV).
   * @param listOfMissingRefs - The `listOfMissingRefs` parameter is a record object that contains
   * information about missing references. Each key in the record represents a reference, and the
   * corresponding value is an array of objects that contain details about the missing reference.
   * @returns The function `prepareReport` returns a Promise that resolves to `void`.
   */
  prepareReport(moduleName: keyof typeof config.moduleConfig, listOfMissingRefs: Record<string, any>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!existsSync(this.sharedConfig.reportPath)) {
        mkdirSync(this.sharedConfig.reportPath, { recursive: true });
      }

      // NOTE write int json
      writeFileSync(join(this.sharedConfig.reportPath, `${moduleName}.json`), JSON.stringify(listOfMissingRefs));

      // NOTE write into CSV
      const csvStream = csv.format({ headers: true });
      const csvPath = join(this.sharedConfig.reportPath, `${moduleName}.csv`);
      const assetFileStream = createWriteStream(csvPath);
      assetFileStream.on('error', (error) => {
        throw error;
      });
      csvStream
        .pipe(assetFileStream)
        .on('close', () => {
          resolve();
          // this.log(''); // NOTE add new line in terminal
        })
        .on('error', reject);

      const defaultColumns = Object.keys(OutputColumn);
      const userDefinedColumns = this.sharedConfig.flags.columns ? this.sharedConfig.flags.columns.split(',') : null;
      let missingRefs: RefErrorReturnType[] = Object.values(listOfMissingRefs).flat();
      const columns: (keyof typeof OutputColumn)[] = userDefinedColumns
        ? [...userDefinedColumns, ...defaultColumns.filter((val: string) => !userDefinedColumns.includes(val))]
        : defaultColumns;

      if (this.sharedConfig.flags.filter) {
        const [column, value]: [keyof typeof OutputColumn, string] = this.sharedConfig.flags.filter.split('=');
        missingRefs = missingRefs.filter((row: RefErrorReturnType) => row[OutputColumn[column]] === value);
      }

      for (const issue of missingRefs) {
        let row: Record<string, string | string[]> = {};

        for (const column of columns) {
          row[column] = issue[OutputColumn[column]];
          row[column] = typeof row[column] === 'object' ? JSON.stringify(row[column]) : row[column];
        }

        csvStream.write(row);
      }

      csvStream.end();
    });
  }
}
