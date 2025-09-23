import chalk from 'chalk';
import * as csv from 'fast-csv';
import { copy } from 'fs-extra';
import { v4 as uuid } from 'uuid';
import isEmpty from 'lodash/isEmpty';
import { join, resolve } from 'path';
import cloneDeep from 'lodash/cloneDeep';
import { cliux, sanitizePath, TableFlags, TableHeader } from '@contentstack/cli-utilities';
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs';
import config from './config';
import { print } from './util/log';
import { auditMsg } from './messages';
import { BaseCommand } from './base-command';
import {
  Entries,
  GlobalField,
  ContentType,
  Extensions,
  Workflows,
  Assets,
  FieldRule,
  ModuleDataReader,
  CustomRoles,
} from './modules';

import {
  CommandNames,
  ContentTypeStruct,
  CtConstructorParam,
  ModuleConstructorParam,
  OutputColumn,
  RefErrorReturnType,
  WorkflowExtensionsRefErrorReturnType,
} from './types';

export abstract class AuditBaseCommand extends BaseCommand<typeof AuditBaseCommand> {
  private currentCommand!: CommandNames;
  private readonly summaryDataToPrint: Record<string, any> = [];
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
    this.log(`Starting audit command: ${command}`, 'debug');
    
    await this.promptQueue();
    await this.createBackUp();
    this.sharedConfig.reportPath = resolve(this.flags['report-path'] || process.cwd(), 'audit-report');
    this.log(`Data directory: ${this.flags['data-dir']}`, 'debug');
    this.log(`Report path: ${this.flags['report-path'] || process.cwd()}`, 'debug');

    const {
      missingCtRefs,
      missingGfRefs,
      missingEntryRefs,
      missingCtRefsInExtensions,
      missingCtRefsInWorkflow,
      missingSelectFeild,
      missingMandatoryFields,
      missingTitleFields,
      missingRefInCustomRoles,
      missingEnvLocalesInAssets,
      missingEnvLocalesInEntries,
      missingFieldRules,
      missingMultipleFields,
    } = await this.scanAndFix();

    if (this.flags['show-console-output']) {
      this.showOutputOnScreen([
        { module: 'Content types', missingRefs: missingCtRefs },
        { module: 'Global Fields', missingRefs: missingGfRefs },
        { module: 'Entries', missingRefs: missingEntryRefs },
      ]);
      this.showOutputOnScreenWorkflowsAndExtension([{ module: 'Extensions', missingRefs: missingCtRefsInExtensions }]);
      this.showOutputOnScreenWorkflowsAndExtension([{ module: 'Workflows', missingRefs: missingCtRefsInWorkflow }]);

      this.showOutputOnScreenWorkflowsAndExtension([
        { module: 'Entries Select Field', missingRefs: missingSelectFeild },
      ]);
      this.showOutputOnScreenWorkflowsAndExtension([
        { module: 'Entries Mandatory Field', missingRefs: missingMandatoryFields },
      ]);
      this.showOutputOnScreenWorkflowsAndExtension([
        { module: 'Entries Title Field', missingRefs: missingTitleFields },
      ]);
      this.showOutputOnScreenWorkflowsAndExtension([{ module: 'Custom Roles', missingRefs: missingRefInCustomRoles }]);
      this.showOutputOnScreenWorkflowsAndExtension([{ module: 'Assets', missingRefs: missingEnvLocalesInAssets }]);
      this.showOutputOnScreenWorkflowsAndExtension([
        { module: 'Entries Missing Locale and Environments', missingRefs: missingEnvLocalesInEntries },
      ]);
      this.showOutputOnScreenWorkflowsAndExtension([{ module: 'Field Rules', missingRefs: missingFieldRules }]);

      this.showOutputOnScreenWorkflowsAndExtension([
        { module: 'Entries Changed Multiple Fields', missingRefs: missingMultipleFields },
      ]);
    }
    this.showOutputOnScreenWorkflowsAndExtension([{ module: 'Summary', missingRefs: this.summaryDataToPrint }]);

    if (
      !isEmpty(missingCtRefs) ||
      !isEmpty(missingGfRefs) ||
      !isEmpty(missingEntryRefs) ||
      !isEmpty(missingCtRefsInWorkflow) ||
      !isEmpty(missingCtRefsInExtensions) ||
      !isEmpty(missingSelectFeild) ||
      !isEmpty(missingTitleFields) ||
      !isEmpty(missingRefInCustomRoles) ||
      !isEmpty(missingEnvLocalesInAssets) ||
      !isEmpty(missingEnvLocalesInEntries) ||
      !isEmpty(missingFieldRules) ||
      !isEmpty(missingMultipleFields)
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
      !isEmpty(missingSelectFeild) ||
      !isEmpty(missingRefInCustomRoles) ||
      !isEmpty(missingEnvLocalesInAssets) ||
      !isEmpty(missingEnvLocalesInEntries) ||
      !isEmpty(missingFieldRules)
    );
  }

  /**
   * The `scan` function performs an audit on different modules (content-types, global-fields, and
   * entries) and returns the missing references for each module.
   * @returns The function `scan()` returns an object with properties `missingCtRefs`, `missingGfRefs`,
   * and `missingEntryRefs`.
   */
  async scanAndFix() {
    this.log('Starting scan and fix process', 'debug');
    let { ctSchema, gfSchema } = this.getCtAndGfSchema();
    this.log(`Retrieved ${ctSchema?.length || 0} content types and ${gfSchema?.length || 0} global fields`, 'debug');
    
    let missingCtRefs,
      missingGfRefs,
      missingEntryRefs,
      missingCtRefsInExtensions,
      missingCtRefsInWorkflow,
      missingSelectFeild,
      missingEntry: {
        missingEntryRefs?: Record<string, any>;
        missingSelectFeild?: Record<string, any>;
        missingMandatoryFields?: Record<string, any>;
        missingTitleFields?: Record<string, any>;
        missingEnvLocale?: Record<string, any>;
        missingMultipleFields?: Record<string, any>;
      } = {},
      missingMandatoryFields,
      missingTitleFields,
      missingRefInCustomRoles,
      missingEnvLocalesInAssets,
      missingEnvLocalesInEntries,
      missingFieldRules,
      missingMultipleFields;

    const constructorParam: ModuleConstructorParam & CtConstructorParam = {
      ctSchema,
      gfSchema,
      log: this.log,
      config: this.sharedConfig,
      fix: this.currentCommand === 'cm:stacks:audit:fix',
    };

    let dataModuleWise: Record<string, any> = await new ModuleDataReader(cloneDeep(constructorParam)).run();
    this.log(`Data module wise: ${JSON.stringify(dataModuleWise)}`, 'debug');
    for (const module of this.sharedConfig.flags.modules || this.sharedConfig.modules) {
      this.log(`Starting audit for module: ${module}`, 'debug');
      print([
        {
          bold: true,
          color: 'whiteBright',
          message: this.$t(this.messages.AUDIT_START_SPINNER, { module }),
        },
      ]);

      constructorParam['moduleName'] = module;

      switch (module) {
        case 'assets':
          this.log('Executing assets audit', 'debug');
          missingEnvLocalesInAssets = await new Assets(cloneDeep(constructorParam)).run();
          await this.prepareReport(module, missingEnvLocalesInAssets);
          this.getAffectedData('assets', dataModuleWise['assets'], missingEnvLocalesInAssets);
          this.log(`Assets audit completed. Found ${Object.keys(missingEnvLocalesInAssets || {}).length} issues`, 'debug');
          break;
        case 'content-types':
          this.log('Executing content-types audit', 'debug');
          missingCtRefs = await new ContentType(cloneDeep(constructorParam)).run();
          await this.prepareReport(module, missingCtRefs);
          this.getAffectedData('content-types', dataModuleWise['content-types'], missingCtRefs);
          this.log(`Content-types audit completed. Found ${Object.keys(missingCtRefs || {}).length} issues`, 'debug');
          break;
        case 'global-fields':
          this.log('Executing global-fields audit', 'debug');
          missingGfRefs = await new GlobalField(cloneDeep(constructorParam)).run();
          await this.prepareReport(module, missingGfRefs);
          this.getAffectedData('global-fields', dataModuleWise['global-fields'], missingGfRefs);
          break;
        case 'entries':
          this.log('Executing entries audit', 'debug');
          missingEntry = await new Entries(cloneDeep(constructorParam)).run();
          missingEntryRefs = (missingEntry as any).missingEntryRefs ?? {};
          missingSelectFeild = (missingEntry as any).missingSelectFeild ?? {};
          missingMandatoryFields = (missingEntry as any).missingMandatoryFields ?? {};
          missingTitleFields = (missingEntry as any).missingTitleFields ?? {};
          missingEnvLocalesInEntries = (missingEntry as any).missingEnvLocale ?? {};
          missingMultipleFields = (missingEntry as any).missingMultipleFields ?? {};
          await this.prepareReport(module, missingEntryRefs);

          await this.prepareReport(`Entries_Select_feild`, missingSelectFeild);

          await this.prepareReport('Entries_Mandatory_feild', missingMandatoryFields);

          await this.prepareReport('Entries_Title_feild', missingTitleFields);

          await this.prepareReport('Entry_Missing_Locale_and_Env_in_Publish_Details', missingEnvLocalesInEntries);

          await this.prepareReport('Entry_Multiple_Fields', missingMultipleFields);
          this.getAffectedData('entries', dataModuleWise['entries'], missingEntry);
          this.log(`Entries audit completed. Found ${Object.keys(missingEntryRefs || {}).length} reference issues`, 'debug');

          break;
        case 'workflows':
          this.log('Executing workflows audit', 'debug');
          missingCtRefsInWorkflow = await new Workflows({
            ctSchema,
            log: this.log,
            moduleName: module,
            config: this.sharedConfig,
            fix: this.currentCommand === 'cm:stacks:audit:fix',
          }).run();
          await this.prepareReport(module, missingCtRefsInWorkflow);
          this.getAffectedData('workflows', dataModuleWise['workflows'], missingCtRefsInWorkflow);
          this.log(`Workflows audit completed. Found ${Object.keys(missingCtRefsInWorkflow || {}).length} issues`, 'debug');

          break;
        case 'extensions':
          this.log('Executing extensions audit', 'debug');
          missingCtRefsInExtensions = await new Extensions(cloneDeep(constructorParam)).run();
          await this.prepareReport(module, missingCtRefsInExtensions);
          this.getAffectedData('extensions', dataModuleWise['extensions'], missingCtRefsInExtensions);
          this.log(`Extensions audit completed. Found ${Object.keys(missingCtRefsInExtensions || {}).length} issues`, 'debug');
          break;
        case 'custom-roles':
          this.log('Executing custom-roles audit', 'debug');
          missingRefInCustomRoles = await new CustomRoles(cloneDeep(constructorParam)).run();
          await this.prepareReport(module, missingRefInCustomRoles);
          this.getAffectedData('custom-roles', dataModuleWise['custom-roles'], missingRefInCustomRoles);
          this.log(`Custom-roles audit completed. Found ${Object.keys(missingRefInCustomRoles || {}).length} issues`, 'debug');

          break;
        case 'field-rules':
          this.log('Executing field-rules audit', 'debug');
          // NOTE: We are using the fixed content-type for validation of field rules
          const data =  this.getCtAndGfSchema();
          constructorParam.ctSchema = data.ctSchema;
          constructorParam.gfSchema = data.gfSchema;
          missingFieldRules = await new FieldRule(cloneDeep(constructorParam)).run();
          await this.prepareReport(module, missingFieldRules);
          this.getAffectedData('field-rules', dataModuleWise['content-types'], missingFieldRules);
          this.log(`Field-rules audit completed. Found ${Object.keys(missingFieldRules || {}).length} issues`, 'debug');
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

    this.log('Scan and fix process completed', 'debug');
    this.prepareReport('Summary', this.summaryDataToPrint);
    this.prepareCSV('Summary', this.summaryDataToPrint);
    return {
      missingCtRefs,
      missingGfRefs,
      missingEntryRefs,
      missingCtRefsInExtensions,
      missingCtRefsInWorkflow,
      missingSelectFeild,
      missingMandatoryFields,
      missingTitleFields,
      missingRefInCustomRoles,
      missingEnvLocalesInAssets,
      missingEnvLocalesInEntries,
      missingFieldRules,
      missingMultipleFields,
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

          const tableHeaders: TableHeader[] = [
            {
              value: 'name',
              alias: 'Title',
            },
            {
              value: 'ct',
              alias: 'Content Type',
            },
            {
              value: 'locale',
              alias: 'Locale',
            },
            {
              value: 'display_name',
              alias: 'Field name',
            },
            {
              value: 'data_type',
              alias: 'Field type',
            },
            {
              value: 'missingRefs',
              alias: 'Missing references',
              formatter: (cellValue: any) => {
                return chalk.red(typeof cellValue === 'object' ? JSON.stringify(cellValue) : cellValue);
              },
            },
            {
              value: 'treeStr',
              alias: 'Path',
            },
          ];

          cliux.table(tableHeaders, tableValues, { ...(this.flags as TableFlags) });
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

      const tableHeaders: TableHeader[] = tableKeys
        .filter((key) => config.OutputTableKeys.includes(key)) // Remove invalid keys early
        .map((key: string) => ({
          value: key,
          formatter: (cellValue: any) => {
            if (key === 'fixStatus' || key === 'Fixable' || key === 'Fixed') {
              return chalk.green(typeof cellValue === 'object' ? JSON.stringify(cellValue) : cellValue);
            } else if (
              key === 'content_types' ||
              key === 'branches' ||
              key === 'missingCTSelectFieldValues' ||
              key === 'missingFieldUid' ||
              key === 'action' ||
              key === 'Non-Fixable' ||
              key === 'Not-Fixed'
            ) {
              return chalk.red(typeof cellValue === 'object' ? JSON.stringify(cellValue) : cellValue);
            } else {
              return chalk.white(typeof cellValue === 'object' ? JSON.stringify(cellValue) : cellValue);
            }
          },
        }));

      cliux.table(tableHeaders, tableValues, { ...(this.flags as TableFlags) });
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
    moduleName:
      | keyof typeof config.moduleConfig
      | keyof typeof config.ReportTitleForEntries
      | 'field-rules'
      | 'Summary',
    listOfMissingRefs: Record<string, any>,
  ): Promise<void> {
    this.log(`Preparing report for module: ${moduleName}`, 'debug');
    this.log(`Report path: ${this.sharedConfig.reportPath}`, 'debug');
    this.log(`Missing references count: ${Object.keys(listOfMissingRefs).length}`, 'debug');
    
    if (isEmpty(listOfMissingRefs)) {
      this.log(`No missing references found for ${moduleName}, skipping report generation`, 'debug');
      return Promise.resolve(void 0);
    }

    if (!existsSync(this.sharedConfig.reportPath)) {
      this.log(`Creating report directory: ${this.sharedConfig.reportPath}`, 'debug');
      mkdirSync(this.sharedConfig.reportPath, { recursive: true });
    } else {
      this.log(`Report directory already exists: ${this.sharedConfig.reportPath}`, 'debug');
    }

    // NOTE write int json
    const jsonFilePath = join(sanitizePath(this.sharedConfig.reportPath), `${sanitizePath(moduleName)}.json`);
    this.log(`Writing JSON report to: ${jsonFilePath}`, 'debug');
    writeFileSync(jsonFilePath, JSON.stringify(listOfMissingRefs));

    // NOTE write into CSV
    this.log(`Preparing CSV report for: ${moduleName}`, 'debug');
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
    moduleName:
      | keyof typeof config.moduleConfig
      | keyof typeof config.ReportTitleForEntries
      | 'field-rules'
      | 'Summary',
    listOfMissingRefs: Record<string, any>,
  ): Promise<void> {
    if (Object.keys(config.moduleConfig).includes(moduleName) || config.feild_level_modules.includes(moduleName)) {
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
        return reject();
      });
    }
  }

  getAffectedData(
    module: string,
    dataExported: Record<string, any>,
    listOfMissingRefs: Record<string, any>,
    isFixable: boolean = true,
  ): void {
    const result: Record<string, any> = { Module: module, ...dataExported };

    if (module === 'entries') {
      const missingRefs = Object.entries(listOfMissingRefs);
      const uidSet = new Set<string>();
      const nonFixable = new Set<string>();

      for (const [key, refs] of missingRefs) {
        const uids = Object.keys(refs);

        if (
          key === 'missingTitleFields' ||
          (!this.sharedConfig.fixSelectField &&
            key === 'missingSelectFeild' &&
            this.currentCommand === 'cm:stacks:audit:fix')
        ) {
          uids.forEach((uid) => {
            if (uidSet.has(uid)) {
              uidSet.delete(uid);
              nonFixable.add(uid);
            } else {
              nonFixable.add(uid);
            }
          });
        } else {
          uids.forEach((uid) => uidSet.add(uid));
        }
      }

      result.Passed = dataExported.Total - (uidSet.size + nonFixable.size);
      if (this.currentCommand === 'cm:stacks:audit:fix') {
        result.Fixed = uidSet.size;
        result['Not-Fixed'] = nonFixable.size;
      } else {
        result.Fixable = uidSet.size;
        result['Non-Fixable'] = nonFixable.size;
      }
    } else {
      const missingCount = Object.keys(listOfMissingRefs).length;
      result.Passed = dataExported.Total - missingCount;

      if (this.currentCommand === 'cm:stacks:audit:fix') {
        result.Fixed = missingCount > 0 && isFixable ? missingCount : 0;
        result['Not-Fixed'] = missingCount > 0 && !isFixable ? missingCount : 0;
      } else {
        result.Fixable = missingCount > 0 && isFixable ? missingCount : 0;
        result['Non-Fixable'] = missingCount > 0 && !isFixable ? missingCount : 0;
      }
    }

    this.summaryDataToPrint.push(result);
  }
}
