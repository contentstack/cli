import chalk from 'chalk';
import * as csv from 'fast-csv';
import { copy } from 'fs-extra';
import { v4 as uuid } from 'uuid';
import isEmpty from 'lodash/isEmpty';
import { join, resolve } from 'path';
import cloneDeep from 'lodash/cloneDeep';
import { cliux, sanitizePath, ux } from '@contentstack/cli-utilities';
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs';

import config from './config';
import { print } from './util/log';
import { auditMsg } from './messages';
import { BaseCommand } from './base-command';
import { Entries, GlobalField, ContentType, Extensions, Workflows } from './modules';
import {
  CommandNames,
  ContentTypeStruct,
  OutputColumn,
  RefErrorReturnType,
  WorkflowExtensionsRefErrorReturnType,
} from './types';

export abstract class AuditBaseCommand extends BaseCommand<typeof AuditBaseCommand> {
  private currentCommand!: CommandNames;

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
   * The `start` function performs an audit on content types, global fields, entries, and workflows and displays
   * any missing references.
   * @param {string} command - The `command` parameter is a string that represents the current command
   * being executed.
   */
  async start(command: CommandNames): Promise<boolean> {
    this.currentCommand = command;
    await this.promptQueue();
    await this.createBackUp();
    this.sharedConfig.reportPath = resolve(this.flags['report-path'] || process.cwd(), 'audit-report');

    const {
      missingCtRefs,
      missingGfRefs,
      missingEntryRefs,
      missingCtRefsInExtensions,
      missingCtRefsInWorkflow,
      missingSelectFeild,
      missingMandatoryFields,
    } = await this.scanAndFix();

    this.showOutputOnScreen([
      { module: 'Content types', missingRefs: missingCtRefs },
      { module: 'Global Fields', missingRefs: missingGfRefs },
      { module: 'Entries', missingRefs: missingEntryRefs },
    ]);
    this.showOutputOnScreenWorkflowsAndExtension([{ module: 'Extensions', missingRefs: missingCtRefsInExtensions }]);
    this.showOutputOnScreenWorkflowsAndExtension([{ module: 'Workflows', missingRefs: missingCtRefsInWorkflow }]);
    this.showOutputOnScreenWorkflowsAndExtension([{ module: 'Entries Select Field', missingRefs: missingSelectFeild }]);
    this.showOutputOnScreenWorkflowsAndExtension([
      { module: 'Entries Mandatory Field', missingRefs: missingMandatoryFields },
    ]);
    if (
      !isEmpty(missingCtRefs) ||
      !isEmpty(missingGfRefs) ||
      !isEmpty(missingEntryRefs) ||
      !isEmpty(missingCtRefsInWorkflow) ||
      !isEmpty(missingCtRefsInExtensions) ||
      !isEmpty(missingSelectFeild)
    ) {
      if (this.currentCommand === 'cm:stacks:audit') {
        this.log(this.$t(auditMsg.FINAL_REPORT_PATH, { path: this.sharedConfig.reportPath }), 'warn');
      } else {
        this.log(this.$t(this.messages.FIXED_CONTENT_PATH_MAG, { path: this.sharedConfig.basePath }), 'warn');
      }
    } else {
      this.log(this.messages.NO_MISSING_REF_FOUND, 'info');
      this.log('');

      if (
        this.flags['copy-dir'] &&
        this.currentCommand === 'cm:stacks:audit:fix' &&
        existsSync(this.sharedConfig.basePath)
      ) {
        // NOTE Clean up the backup dir if no issue found while audit the content
        rmSync(this.sharedConfig.basePath, { recursive: true });
      }
    }

    return (
      !isEmpty(missingCtRefs) ||
      !isEmpty(missingGfRefs) ||
      !isEmpty(missingEntryRefs) ||
      !isEmpty(missingCtRefsInWorkflow) ||
      !isEmpty(missingCtRefsInExtensions) ||
      !isEmpty(missingSelectFeild)
    );
  }

  /**
   * The `scan` function performs an audit on different modules (content-types, global-fields, and
   * entries) and returns the missing references for each module.
   * @returns The function `scan()` returns an object with properties `missingCtRefs`, `missingGfRefs`,
   * and `missingEntryRefs`.
   */
  async scanAndFix() {
    let { ctSchema, gfSchema } = this.getCtAndGfSchema();
    let missingCtRefs,
      missingGfRefs,
      missingEntryRefs,
      missingCtRefsInExtensions,
      missingCtRefsInWorkflow,
      missingSelectFeild,
      missingEntry,
      missingMandatoryFields;

    for (const module of this.sharedConfig.flags.modules || this.sharedConfig.modules) {
      print([
        {
          bold: true,
          color: 'whiteBright',
          message: this.$t(this.messages.AUDIT_START_SPINNER, { module }),
        },
      ]);

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
          missingEntry = await new Entries(cloneDeep(constructorParam)).run();
          missingEntryRefs = missingEntry.missingEntryRefs ?? {};
          missingSelectFeild = missingEntry.missingSelectFeild ?? {};
          missingMandatoryFields = missingEntry.missingMandatoryFields ?? {};
          await this.prepareReport(module, missingEntryRefs);

          await this.prepareReport(`Entries_Select_feild`, missingSelectFeild);

          await this.prepareReport('Entries_Mandatory_feild', missingMandatoryFields);
          break;
        case 'workflows':
          missingCtRefsInWorkflow = await new Workflows({
            ctSchema,
            log: this.log,
            moduleName: module,
            config: this.sharedConfig,
            fix: this.currentCommand === 'cm:stacks:audit:fix',
          }).run();
          await this.prepareReport(module, missingCtRefsInWorkflow);
          break;
        case 'extensions':
          missingCtRefsInExtensions = await new Extensions(cloneDeep(constructorParam)).run();
          await this.prepareReport(module, missingCtRefsInExtensions);
          break;
      }

      print([
        {
          bold: true,
          color: 'whiteBright',
          message: this.$t(this.messages.AUDIT_START_SPINNER, { module }),
        },
        {
          bold: true,
          message: ' done',
          color: 'whiteBright',
        },
      ]);
    }

    return {
      missingCtRefs,
      missingGfRefs,
      missingEntryRefs,
      missingCtRefsInExtensions,
      missingCtRefsInWorkflow,
      missingSelectFeild,
      missingMandatoryFields,
    };
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
      const backupDirPath = `${(
        this.flags['copy-path'] ||
        this.flags['data-dir'] ||
        this.sharedConfig.basePath
      ).replace(/\/+$/, '')}_backup_${uuid()}`;

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

    const gfSchema = existsSync(gfPath) ? (JSON.parse(readFileSync(gfPath, 'utf8')) as ContentTypeStruct[]) : [];
    const ctSchema = existsSync(ctPath) ? (JSON.parse(readFileSync(ctPath, 'utf8')) as ContentTypeStruct[]) : [];

    return { ctSchema, gfSchema };
  }

  /**
   * The function `showOutputOnScreen` displays missing references on the terminal screen if the
   * `showTerminalOutput` flag is set to true.
   * @param {{ module: string; missingRefs?: Record<string, any> }[]} allMissingRefs - An array of
   * objects, where each object has two properties:
   */
  showOutputOnScreen(allMissingRefs: { module: string; missingRefs?: Record<string, any> }[]) {
    if (this.sharedConfig.showTerminalOutput && !this.flags['external-config']?.noTerminalOutput) {
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

  // Make it generic it takes the column header as param
  showOutputOnScreenWorkflowsAndExtension(allMissingRefs: { module: string; missingRefs?: Record<string, any> }[]) {
    if (!this.sharedConfig.showTerminalOutput || this.flags['external-config']?.noTerminalOutput) {
      return;
    }
    this.log(''); // Adding a new line

    for (let { module, missingRefs } of allMissingRefs) {
      if (isEmpty(missingRefs)) {
        continue;
      }

      print([{ bold: true, color: 'cyan', message: ` ${module}` }]);

      const tableValues = Object.values(missingRefs).flat();
      missingRefs = Object.values(missingRefs).flat();
      const tableKeys = Object.keys(missingRefs[0]);
      const arrayOfObjects = tableKeys.map((key) => {
        if (config.OutputTableKeys.includes(key)) {
          return {
            [key]: {
              minWidth: 7,
              header: key,
              get: (row: Record<string, unknown>) => {
                if (key === 'fixStatus') {
                  return chalk.green(typeof row[key] === 'object' ? JSON.stringify(row[key]) : row[key]);
                } else if (
                  key === 'content_types' ||
                  key === 'branches' ||
                  key === 'missingCTSelectFieldValues' ||
                  key === 'missingFieldUid'
                ) {
                  return chalk.red(typeof row[key] === 'object' ? JSON.stringify(row[key]) : row[key]);
                } else {
                  return chalk.white(typeof row[key] === 'object' ? JSON.stringify(row[key]) : row[key]);
                }
              },
            },
          };
        }
        return {};
      });
      const mergedObject = Object.assign({}, ...arrayOfObjects);

      ux.table(tableValues, mergedObject, { ...this.flags });
      this.log(''); // Adding a new line
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
  prepareReport(
    moduleName: keyof typeof config.moduleConfig | keyof typeof config.ReportTitleForEntries,
    listOfMissingRefs: Record<string, any>,
  ): Promise<void> {
    if (isEmpty(listOfMissingRefs)) return Promise.resolve(void 0);

    if (!existsSync(this.sharedConfig.reportPath)) {
      mkdirSync(this.sharedConfig.reportPath, { recursive: true });
    }

    // NOTE write int json
    writeFileSync(join(sanitizePath(this.sharedConfig.reportPath), `${sanitizePath(moduleName)}.json`), JSON.stringify(listOfMissingRefs));

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
  prepareCSV(
    moduleName: keyof typeof config.moduleConfig | keyof typeof config.ReportTitleForEntries,
    listOfMissingRefs: Record<string, any>,
  ): Promise<void> {
    if (Object.keys(config.moduleConfig).includes(moduleName)) {
      const csvPath = join(sanitizePath(this.sharedConfig.reportPath), `${sanitizePath(moduleName)}.csv`);
      return new Promise<void>((resolve, reject) => {
        // file deepcode ignore MissingClose: Will auto close once csv stream end
        const ws = createWriteStream(csvPath).on('error', reject);
        const defaultColumns = Object.keys(OutputColumn);
        const userDefinedColumns = this.sharedConfig.flags.columns ? this.sharedConfig.flags.columns.split(',') : null;
        let missingRefs: RefErrorReturnType[] | WorkflowExtensionsRefErrorReturnType[] =
          Object.values(listOfMissingRefs).flat();
        const columns: (keyof typeof OutputColumn)[] = userDefinedColumns
          ? [...userDefinedColumns, ...defaultColumns.filter((val: string) => !userDefinedColumns.includes(val))]
          : defaultColumns;

        if (this.sharedConfig.flags.filter) {
          const [column, value]: [keyof typeof OutputColumn, string] = this.sharedConfig.flags.filter.split('=');
          // Filter the missingRefs array
          missingRefs = missingRefs.filter((row) => {
            if (OutputColumn[column] in row) {
              const rowKey = OutputColumn[column] as keyof (RefErrorReturnType | WorkflowExtensionsRefErrorReturnType);
              return row[rowKey] === value;
            }
            return false;
          });
        }

        const rowData: Record<string, string | string[]>[] = [];
        for (const issue of missingRefs) {
          let row: Record<string, string | string[]> = {};

          for (const column of columns) {
            if (Object.keys(issue).includes(OutputColumn[column])) {
              const issueKey = OutputColumn[column] as keyof typeof issue;
              row[column] = issue[issueKey] as string;
              row[column] = typeof row[column] === 'object' ? JSON.stringify(row[column]) : row[column];
            }
          }

          if (this.currentCommand === 'cm:stacks:audit:fix') {
            row['Fix status'] = row.fixStatus;
          }

          rowData.push(row);
        }
        csv.write(rowData, { headers: true }).pipe(ws).on('error', reject).on('finish', resolve);
      });
    } else {
      return new Promise<void>((reject) => {
        return reject()
      })
    }
  }
}
