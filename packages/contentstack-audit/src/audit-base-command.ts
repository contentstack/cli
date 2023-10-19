import chalk from 'chalk';
import * as csv from 'fast-csv';
import { copy } from 'fs-extra';
import { v4 as uuid } from 'uuid';
import isEmpty from 'lodash/isEmpty';
import { join, resolve } from 'path';
import cloneDeep from 'lodash/cloneDeep';
import { cliux, ux } from '@contentstack/cli-utilities';
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

import config from './config';
import { print } from './util/log';
import { auditMsg } from './messages';
import { BaseCommand } from './base-command';
import { Entries, GlobalField, ContentType } from './modules';
import { ContentTypeStruct, OutputColumn, RefErrorReturnType } from './types';

export abstract class AuditBaseCommand extends BaseCommand<typeof AuditBaseCommand> {
  private currentCommand!: string;

  get fixStatus() {
    return {
      fixStatus: {
        minWidth: 7,
        header: 'Fix Status',
        get: (row: any) => {
          return row.fixStatus === 'Fixed' ? chalk.greenBright(row.fixStatus) : chalk.redBright(row.fixStatus);
        },
      },
    };
  }

  /**
   * The `start` function performs an audit on content types, global fields, and entries, and displays
   * any missing references.
   * @param {string} command - The `command` parameter is a string that represents the current command
   * being executed.
   */
  async start(command: string): Promise<void> {
    this.currentCommand = command;
    await this.promptQueue();
    await this.createBackUp();
    this.sharedConfig.reportPath = resolve(this.flags['report-path'] || process.cwd(), 'audit-report');

    const { missingCtRefs, missingGfRefs, missingEntryRefs } = await this.scanAndFix();

    this.showOutputOnScreen([
      { module: 'Content types', missingRefs: missingCtRefs },
      { module: 'Global Fields', missingRefs: missingGfRefs },
      { module: 'Entries', missingRefs: missingEntryRefs },
    ]);

    if (!isEmpty(missingCtRefs) || !isEmpty(missingGfRefs) || !isEmpty(missingEntryRefs)) {
      if (this.currentCommand === 'cm:stacks:audit') {
        this.log(this.$t(auditMsg.FINAL_REPORT_PATH, { path: this.sharedConfig.reportPath }), 'warn');
      } else {
        this.log(this.$t(this.messages.FIXED_CONTENT_PATH_MAG, { path: this.sharedConfig.basePath }), 'warn');
      }
    } else {
      this.log(this.messages.NO_MISSING_REF_FOUND, 'info');
      this.log('');
    }
  }

  /**
   * The `scan` function performs an audit on different modules (content-types, global-fields, and
   * entries) and returns the missing references for each module.
   * @returns The function `scan()` returns an object with properties `missingCtRefs`, `missingGfRefs`,
   * and `missingEntryRefs`.
   */
  async scanAndFix() {
    let { ctSchema, gfSchema } = this.getCtAndGfSchema();
    let missingCtRefs, missingGfRefs, missingEntryRefs;
    for (const module of this.sharedConfig.flags.modules || this.sharedConfig.modules) {
      ux.action.start(this.$t(this.messages.AUDIT_START_SPINNER, { module }));

      const constructorParam = {
        ctSchema,
        gfSchema,
        log: this.log,
        moduleName: module,
        config: this.sharedConfig,
        fix: this.currentCommand === 'cm:stacks:audit:fix',
      };

      switch (module) {
        case 'content-types':
          missingCtRefs = await new ContentType(cloneDeep(constructorParam)).run();
          await this.prepareReport(module, missingCtRefs);
          break;
        case 'global-fields':
          missingGfRefs = await new GlobalField(cloneDeep(constructorParam)).run();
          await this.prepareReport(module, missingGfRefs);
          break;
        case 'entries':
          missingEntryRefs = await new Entries(cloneDeep(constructorParam)).run();
          await this.prepareReport(module, missingEntryRefs);
          break;
      }

      ux.action.stop();
    }

    return { missingCtRefs, missingGfRefs, missingEntryRefs };
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
   * The function `createBackUp` creates a backup of data if the `copy-dir` flag is set, and throws
   * an error if the specified path does not exist.
   */
  async createBackUp() {
    if (this.currentCommand === 'cm:stacks:audit:fix' && this.flags['copy-dir']) {
      if (!existsSync(this.sharedConfig.basePath)) {
        throw Error(this.$t(this.messages.NOT_VALID_PATH, { path: this.sharedConfig.basePath }));
      }

      // NOTE create bkp directory
      const backupDirPath = `${(this.flags['copy-path'] || this.flags['data-dir']).replace(
        /\/+$/,
        '',
      )}_backup_${uuid()}`;

      if (!existsSync(backupDirPath)) {
        mkdirSync(backupDirPath, { recursive: true });
      }

      await copy(this.sharedConfig.basePath, backupDirPath);

      this.sharedConfig.basePath = backupDirPath;
    }
  }

  /**
   * The function `getCtAndGfSchema` reads and parses JSON files containing content type and global
   * field schemas, and returns them as an object.
   * @returns The function `getCtAndGfSchema()` returns an object with two properties: `ctSchema` and
   * `gfSchema`. The values of these properties are the parsed JSON data from two different files.
   */
  getCtAndGfSchema() {
    const modules = this.sharedConfig.flags.modules || this.sharedConfig.modules;
    const ctPath = join(
      this.sharedConfig.basePath,
      this.sharedConfig.moduleConfig['content-types'].dirName,
      this.sharedConfig.moduleConfig['content-types'].fileName,
    );
    const gfPath = join(
      this.sharedConfig.basePath,
      this.sharedConfig.moduleConfig['global-fields'].dirName,
      this.sharedConfig.moduleConfig['global-fields'].fileName,
    );

    if (modules.includes('content-types')) {
      if (!existsSync(ctPath)) {
        this.log(this.$t(auditMsg.NOT_VALID_PATH, { path: ctPath }), 'error');
      }
    }

    if (modules.includes('global-fields')) {
      if (!existsSync(gfPath)) {
        this.log(this.$t(auditMsg.NOT_VALID_PATH, { path: ctPath }), 'error');
      }
    }

    let gfSchema = existsSync(gfPath) ? (JSON.parse(readFileSync(gfPath, 'utf-8')) as ContentTypeStruct[]) : [];
    let ctSchema = existsSync(ctPath) ? (JSON.parse(readFileSync(ctPath, 'utf-8')) as ContentTypeStruct[]) : [];

    return { ctSchema, gfSchema };
  }

  /**
   * The function `showOutputOnScreen` displays missing references on the terminal screen if the
   * `showTerminalOutput` flag is set to true.
   * @param {{ module: string; missingRefs?: Record<string, any> }[]} allMissingRefs - An array of
   * objects, where each object has two properties:
   */
  showOutputOnScreen(allMissingRefs: { module: string; missingRefs?: Record<string, any> }[]) {
    if (this.sharedConfig.showTerminalOutput) {
      this.log(''); // NOTE adding new line
      for (const { module, missingRefs } of allMissingRefs) {
        if (!isEmpty(missingRefs)) {
          print([
            {
              bold: true,
              color: 'cyan',
              message: ` ${module}`,
            },
          ]);
          const tableValues = Object.values(missingRefs).flat();

          ux.table(
            tableValues,
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
                  return chalk.red(
                    typeof row.missingRefs === 'object' ? JSON.stringify(row.missingRefs) : row.missingRefs,
                  );
                },
              },
              ...(tableValues[0]?.fixStatus ? this.fixStatus : {}),
              treeStr: {
                minWidth: 7,
                header: 'Path',
              },
            },
            {
              ...this.flags,
            },
          );
          this.log(''); // NOTE adding new line
        }
      }
    }
  }

  /**
   * The function prepares a report by writing a JSON file and a CSV file with a list of missing
   * references for a given module.
   * @param moduleName - The `moduleName` parameter is a string that represents the name of a module.
   * It is used to generate the filename for the report.
   * @param listOfMissingRefs - The `listOfMissingRefs` parameter is a record object that contains
   * information about missing references. It is a key-value pair where the key represents the
   * reference name and the value represents additional information about the missing reference.
   * @returns The function `prepareReport` returns a Promise that resolves to `void`.
   */
  prepareReport(moduleName: keyof typeof config.moduleConfig, listOfMissingRefs: Record<string, any>): Promise<void> {
    if (isEmpty(listOfMissingRefs)) return Promise.resolve(void 0);

    if (!existsSync(this.sharedConfig.reportPath)) {
      mkdirSync(this.sharedConfig.reportPath, { recursive: true });
    }

    // NOTE write int json
    writeFileSync(join(this.sharedConfig.reportPath, `${moduleName}.json`), JSON.stringify(listOfMissingRefs));

    // NOTE write into CSV
    return this.prepareCSV(moduleName, listOfMissingRefs);
  }

  /**
   * The function `prepareCSV` takes a module name and a list of missing references, and generates a
   * CSV file with the specified columns and filtered rows.
   * @param moduleName - The `moduleName` parameter is a string that represents the name of a module.
   * It is used to generate the name of the CSV file that will be created.
   * @param listOfMissingRefs - The `listOfMissingRefs` parameter is a record object that contains
   * information about missing references. Each key in the record represents a reference, and the
   * corresponding value is an array of objects that contain details about the missing reference.
   * @returns The function `prepareCSV` returns a Promise that resolves to `void`.
   */
  prepareCSV(moduleName: keyof typeof config.moduleConfig, listOfMissingRefs: Record<string, any>): Promise<void> {
    const csvStream = csv.format({ headers: true });
    const csvPath = join(this.sharedConfig.reportPath, `${moduleName}.csv`);
    const assetFileStream = createWriteStream(csvPath);
    assetFileStream.on('error', (error) => {
      throw error;
    });

    return new Promise<void>((resolve, reject) => {
      csvStream.pipe(assetFileStream).on('close', resolve).on('error', reject);
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

        if (this.currentCommand === 'cm:stacks:audit:fix') {
          row['Fix status'] = row.fixStatus;
        }

        csvStream.write(row);
      }

      csvStream.end();
    });
  }
}
