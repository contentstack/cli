import { join } from 'path';
import find from 'lodash/find';
import * as csv from 'fast-csv';
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

import {
  LogFn,
  ConfigType,
  OutputColumn,
  ModularBlockType,
  ContentTypeStruct,
  GroupFieldDataType,
  RefErrorReturnType,
  GlobalFieldDataType,
  JsonRTEFieldDataType,
  ModularBlocksDataType,
  ModuleConstructorParam,
  ReferenceFieldDataType,
} from '../types';
import { $t, auditMsg } from '../messages';

/* The `ContentType` class is responsible for scanning content types, looking for references, and
generating a report in JSON and CSV formats. */
export default class ContentType {
  private log: LogFn;
  private config: ConfigType;
  private folderPath: string;
  private currentCTId!: string;
  private currentCTName!: string;
  private ctErrors: Record<string, any> = {};
  private contentTypes: ContentTypeStruct[] = [];

  constructor({ log, config }: ModuleConstructorParam) {
    this.log = log;
    this.config = config;
    this.folderPath = join(config.basePath, config.moduleConfig['content-types'].dirName);
  }

  /**
   * The above function scans content types, looks for references, and generates a report in both JSON
   * and CSV formats.
   * @returns The function `run()` returns the `ctErrors` object.
   */
  async run() {
    if (!existsSync(this.folderPath)) {
      throw new Error($t(auditMsg.NOT_VALID_PATH, { path: this.folderPath }));
    }

    this.contentTypes = JSON.parse(readFileSync(join(this.folderPath, 'schema.json'), 'utf-8')); // TODO check size

    for (const ct of this.contentTypes) {
      this.currentCTId = ct.uid;
      this.currentCTName = ct.title;
      this.ctErrors[this.currentCTId] = [];
      const { uid, title } = ct;
      await this.lookForReference([{ uid, name: title }], ct);
      this.log($t(auditMsg.SCAN_CT_SUCCESS_MSG, { title }), 'info');
    }

    await this.prepareReport();

    return this.ctErrors;
  }

  /**
   * The `prepareReport` function prepares a report by writing content types errors into a JSON file
   * and a CSV file.
   * @returns The `prepareReport()` function returns a Promise that resolves to `void`.
   */
  prepareReport(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!existsSync(this.config.reportPath)) {
        mkdirSync(this.config.reportPath, { recursive: true });
      }

      // NOTE write int json
      writeFileSync(join(this.config.reportPath, 'content-types.json'), JSON.stringify(this.ctErrors));
      this.log(''); // NOTE add new line in terminal

      // NOTE write into CSV
      const csvStream = csv.format({ headers: true });
      const csvPath = join(this.config.reportPath, 'content-types.csv');
      const assetFileStream = createWriteStream(csvPath);
      assetFileStream.on('error', (error) => {
        throw error;
      });
      csvStream
        .pipe(assetFileStream)
        .on('close', () => {
          resolve();
          this.log($t(auditMsg.FINAL_REPORT_PATH, { path: this.config.reportPath }), 'warn');
          this.log(''); // NOTE add new line in terminal
        })
        .on('error', reject);

      const defaultColumns = Object.keys(OutputColumn);
      const userDefinedColumns = this.config.flags.columns ? this.config.flags.columns.split(',') : null;
      let ctRefIssues: RefErrorReturnType[] = Object.values(this.ctErrors).flat();
      const columns: (keyof typeof OutputColumn)[] = userDefinedColumns
        ? [...userDefinedColumns, ...defaultColumns.filter((val: string) => !userDefinedColumns.includes(val))]
        : defaultColumns;

      if (this.config.flags.filter) {
        const [column, value]: [keyof typeof OutputColumn, string] = this.config.flags.filter.split('=');
        ctRefIssues = ctRefIssues.filter((row: RefErrorReturnType) => row[OutputColumn[column]] === value);
      }

      for (const issue of ctRefIssues) {
        let row: Record<string, string | string[]> = {};

        for (const column of columns) {
          row[column] = issue[OutputColumn[column]];
        }

        csvStream.write(row);
      }

      csvStream.end();
    });
  }

  /**
   * The function `lookForReference` iterates through a given schema and performs validation checks
   * based on the data type of each field.
   * @param {Record<string, unknown>[]} tree - An array of objects representing the tree structure of
   * the content type or field being validated. Each object in the array should have a "uid" property
   * representing the unique identifier of the content type or field, and a "name" property
   * representing the display name of the content type or field.
   * @param {ContentTypeStruct | GlobalFieldDataType | ModularBlockType | GroupFieldDataType}  - -
   * `tree`: An array of objects representing the tree structure of the content type or field. Each
   * object in the array should have a `uid` and `name` property.
   */
  async lookForReference(
    tree: Record<string, unknown>[],
    { schema }: ContentTypeStruct | GlobalFieldDataType | ModularBlockType | GroupFieldDataType,
  ): Promise<void> {
    for (const field of schema) {
      switch (field.data_type) {
        case 'reference':
          this.ctErrors[this.currentCTId].push(
            ...this.validateReferenceField(
              [...tree, { uid: field.uid, name: field.display_name }],
              field as ReferenceFieldDataType,
            ),
          );
          break;
        case 'global_field':
          await this.validateGlobalField(
            [...tree, { uid: field.uid, name: field.display_name }],
            field as GlobalFieldDataType,
          );
          break;
        case 'json':
          if (field.field_metadata.extension) {
            // NOTE Custom field type
          } else if (field.field_metadata.allow_json_rte) {
            // NOTE JSON RTE field type
            this.ctErrors[this.currentCTId].push(
              ...this.validateJsonRTEFields(
                [...tree, { uid: field.uid, name: field.display_name }],
                field as ReferenceFieldDataType,
              ),
            );
          }
          break;
        case 'blocks':
          await this.validateModularBlocksField(
            [...tree, { uid: field.uid, name: field.display_name }],
            field as ModularBlocksDataType,
          );
          break;
        case 'group':
          await this.validateGroupField(
            [...tree, { uid: field.uid, name: field.display_name }],
            field as GroupFieldDataType,
          );
          break;
      }
    }
  }

  /**
   * The function validates a reference field in a tree data structure.
   * @param {Record<string, unknown>[]} tree - The "tree" parameter is an array of objects, where each
   * object represents a node in a tree-like structure. Each object can have multiple properties, and
   * the structure of the tree is defined by the relationships between these properties.
   * @param {ReferenceFieldDataType} field - The `field` parameter is of type `ReferenceFieldDataType`.
   * @returns an array of RefErrorReturnType.
   */
  validateReferenceField(tree: Record<string, unknown>[], field: ReferenceFieldDataType): RefErrorReturnType[] {
    return this.validateReferenceToValues(tree, field);
  }

  /**
   * The function "validateGlobalField" asynchronously validates a global field by looking for a
   * reference in a tree data structure.
   * @param {Record<string, unknown>[]} tree - The `tree` parameter is an array of objects. Each object
   * represents a node in a tree structure. The tree structure can be represented as a hierarchical
   * structure where each object can have child nodes.
   * @param {GlobalFieldDataType} field - The `field` parameter is of type `GlobalFieldDataType`. It
   * represents the field that needs to be validated.
   */
  async validateGlobalField(tree: Record<string, unknown>[], field: GlobalFieldDataType): Promise<void> {
    // NOTE Any GlobalField related logic can be added here
    await this.lookForReference(tree, field);
  }

  /**
   * The function validates the reference to values in a JSON RTE field.
   * @param {Record<string, unknown>[]} tree - The "tree" parameter is an array of objects where each
   * object represents a node in a tree-like structure. Each object can have multiple key-value pairs,
   * where the key is a string and the value can be of any type.
   * @param {JsonRTEFieldDataType} field - The `field` parameter is of type `JsonRTEFieldDataType`.
   * @returns The function `validateJsonRTEFields` is returning an array of `RefErrorReturnType`
   * objects.
   */
  validateJsonRTEFields(tree: Record<string, unknown>[], field: JsonRTEFieldDataType): RefErrorReturnType[] {
    // NOTE Other possible reference logic will be added related to JSON RTE (Ex missing assets, extensions etc.,)
    return this.validateReferenceToValues(tree, field);
  }

  /**
   * The function validates the modular blocks field by traversing each module and looking for
   * references.
   * @param {Record<string, unknown>[]} tree - An array of objects representing the tree structure of
   * the modular blocks. Each object in the array represents a node in the tree and contains properties
   * like "uid" and "name".
   * @param {ModularBlocksDataType} field - The `field` parameter is of type `ModularBlocksDataType`.
   * It represents a modular blocks field and contains an array of blocks. Each block has properties
   * like `uid` and `title`.
   */
  async validateModularBlocksField(tree: Record<string, unknown>[], field: ModularBlocksDataType): Promise<void> {
    const { blocks } = field;

    // NOTE Traverse each and every module and look for reference
    for (const block of blocks) {
      const { uid, title } = block;

      await this.lookForReference([...tree, { uid, name: title }, { uid: field.uid, name: field.display_name }], block);
    }
  }

  /**
   * The function `validateGroupField` is an asynchronous function that validates a group field by
   * looking for a reference in a tree data structure.
   * @param {Record<string, unknown>[]} tree - The `tree` parameter is an array of objects that
   * represents a tree structure. Each object in the array represents a node in the tree, and it
   * contains key-value pairs where the keys are field names and the values are the corresponding field
   * values.
   * @param {GroupFieldDataType} field - The `field` parameter is of type `GroupFieldDataType`. It
   * represents the group field that needs to be validated.
   */
  async validateGroupField(tree: Record<string, unknown>[], field: GroupFieldDataType): Promise<void> {
    // NOTE Any Group Field related logic can be added here (Ex data serialization or picking any metadata for report etc.,)
    await this.lookForReference(tree, field);
  }

  /**
   * The function `validateReferenceToValues` checks if all the references specified in a field exist
   * in a given tree of records and returns any missing references.
   * @param {Record<string, unknown>[]} tree - An array of objects representing a tree structure. Each
   * object in the array should have a "name" property.
   * @param {ReferenceFieldDataType | JsonRTEFieldDataType} field - The `field` parameter is an object
   * that represents a reference field in a content type. It has the following properties:
   * @returns The function `validateReferenceToValues` returns an array of `RefErrorReturnType`
   * objects.
   */
  validateReferenceToValues(
    tree: Record<string, unknown>[],
    field: ReferenceFieldDataType | JsonRTEFieldDataType,
  ): RefErrorReturnType[] {
    const missingRefs = [];
    const { reference_to, display_name, data_type } = field;

    for (const reference of reference_to) {
      // NOTE can skip specific references keys (Ex, system defined keys can be skipped)
      if (this.config.skipRefs.includes(reference)) continue;

      const refExist = find(this.contentTypes, { uid: reference });

      if (!refExist) {
        missingRefs.push(reference);
      }
    }

    return missingRefs.length
      ? [
          {
            tree,
            data_type,
            missingRefs,
            display_name,
            ct_uid: this.currentCTId,
            name: this.currentCTName,
            treeStr: tree.map(({ name }) => name).join(' ➜ '),
          },
        ]
      : [];
  }
}
