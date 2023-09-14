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

    this.contentTypes = JSON.parse(readFileSync(join(this.folderPath, 'schema.json'), 'utf-8'));

    for (const ct of this.contentTypes) {
      this.currentCTId = ct.uid;
      this.currentCTName = ct.title;
      this.ctErrors[this.currentCTId] = [];
      const { uid, title } = ct;
      await this.lookForReference([{ uid, name: title }], ct);
      this.log($t(auditMsg.SCAN_CT_SUCCESS_MSG, { title }), 'info');
    }

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
        this.log($t(auditMsg.FINAL_REPORT_PATH, { path: this.config.reportPath }), 'info');
        this.log(''); // NOTE add new line in terminal
      })
      .on('error', (error) => {
        throw error;
      });
    const ctRefIssues: RefErrorReturnType[] = Object.values(this.ctErrors).flat();
    const columns: (keyof typeof OutputColumn)[] =
      (this.config.flags.columns || '').split(',') || Object.keys(OutputColumn);

    for (const issue of ctRefIssues) {
      let row: Record<string, string | string[]> = {};

      for (const column of columns) {
        row[column] = issue[OutputColumn[column]];
      }

      csvStream.write(row);
    }

    csvStream.end();

    return this.ctErrors;
  }

  /**
   * The function `lookForReference` iterates through a given schema and performs validation checks
   * based on the data type of each field.
   * @param {Record<string, unknown>[]} tree - An array of objects representing the tree structure of
   * the content type or field being validated. Each object in the array should have a "uid" property
   * representing the unique identifier of the field or content type, and a "name" property
   * representing the display name of the field or content type.
   * @param {ContentTypeStruct | GlobalFieldDataType | ModularBlockType | GroupFieldDataType}  - -
   * `tree`: An array of objects representing the path to the current field in the content type schema.
   */
  async lookForReference(
    tree: Record<string, unknown>[],
    { schema }: ContentTypeStruct | GlobalFieldDataType | ModularBlockType | GroupFieldDataType,
  ) {
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
   * The function "validateReferenceFields" validates reference fields in a tree data structure.
   * @param {Record<string, unknown>[]} tree - The "tree" parameter is an array of objects, where each
   * object represents a node in a tree-like structure. Each object can have multiple properties, and
   * the values of these properties can be of any data type.
   * @param {ReferenceFieldDataType} field - The `field` parameter is of type `ReferenceFieldDataType`.
   * @returns an array of RefErrorReturnType.
   */
  validateReferenceField(tree: Record<string, unknown>[], field: ReferenceFieldDataType): RefErrorReturnType[] {
    return this.validateReferenceToValues(tree, field);
  }

  /**
   * The function "validateGlobalField" is an asynchronous function that takes in an array of objects
   * and a field of type GlobalFieldDataType, and it performs some logic related to GlobalField.
   * @param {Record<string, unknown>[]} tree - The `tree` parameter is an array of objects, where each
   * object represents a record. Each record is a key-value pair, where the key is a string and the
   * value can be of any type.
   * @param {GlobalFieldDataType} field - The `field` parameter is of type `GlobalFieldDataType`. It
   * represents the field that needs to be validated.
   */
  async validateGlobalField(tree: Record<string, unknown>[], field: GlobalFieldDataType) {
    // NOTE Any GlobalField related logic can be added here
    await this.lookForReference(tree, field);
  }

  /**
   * The function `validateJsonRTEFields` validates the reference to values in a JSON RTE field.
   * @param {Record<string, unknown>[]} tree - The "tree" parameter is an array of objects, where each
   * object represents a record in JSON format.
   * @param {JsonRTEFieldDataType} field - The field parameter is of type JsonRTEFieldDataType.
   * @returns The function `validateJsonRTEFields` is returning an array of `RefErrorReturnType` objects.
   */
  validateJsonRTEFields(tree: Record<string, unknown>[], field: JsonRTEFieldDataType): RefErrorReturnType[] {
    // NOTE Other possible reference logic will be added related to JSON RTE (Ex missing assets, extensions etc.,)
    return this.validateReferenceToValues(tree, field);
  }

  /**
   * The function `validateModularBlocksField` traverses each module in a given tree and looks for
   * references.
   * @param {Record<string, unknown>[]} tree - The `tree` parameter is an array of objects, where each
   * object represents a node in a tree structure. Each object has a `uid` property and a `name`
   * property.
   * @param {ModularBlocksDataType} field - The `field` parameter is of type `ModularBlocksDataType`.
   */
  async validateModularBlocksField(tree: Record<string, unknown>[], field: ModularBlocksDataType) {
    const { blocks } = field;

    // NOTE Traverse each and every module and look for reference
    for (const block of blocks) {
      const { uid, title } = block;

      await this.lookForReference([...tree, { uid, name: title }, { uid: field.uid, name: field.display_name }], block);
    }
  }

  /**
   * The function `validateGroupField` is used to validate a group field by looking for references in a
   * tree data structure.
   * @param {Record<string, unknown>[]} tree - The `tree` parameter is an array of objects, where each
   * object represents a node in a tree structure. Each object can have any number of key-value pairs,
   * where the keys are strings and the values can be of any type.
   * @param {GroupFieldDataType} field - The `field` parameter is of type `GroupFieldDataType`. It
   * represents the group field that needs to be validated.
   */
  async validateGroupField(tree: Record<string, unknown>[], field: GroupFieldDataType) {
    // NOTE Any Group Field related logic can be added here (Ex data serialization or picking any metadata for report etc.,)
    await this.lookForReference(tree, field);
  }

  /**
   * The function `validateReferenceToValues` checks if the references specified in a field exist in a
   * given tree of records and returns any missing references.
   * @param {Record<string, unknown>[]} tree - An array of objects representing a tree structure. Each
   * object in the array should have a "name" property.
   * @param {ReferenceFieldDataType | JsonRTEFieldDataType} field - The `field` parameter is of type
   * `ReferenceFieldDataType` or `JsonRTEFieldDataType`.
   * @returns The function `validateReferenceToValues` returns an array of `RefErrorReturnType` objects.
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
