import find from 'lodash/find';
import values from 'lodash/values';
import isEmpty from 'lodash/isEmpty';
import { join, resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { FsUtility } from '@contentstack/cli-utilities';

import {
  LogFn,
  Locale,
  ConfigType,
  EntryStruct,
  ModularBlockType,
  ContentTypeStruct,
  CtConstructorParam,
  GroupFieldDataType,
  GlobalFieldDataType,
  JsonRTEFieldDataType,
  ModularBlocksDataType,
  ModuleConstructorParam,
  ReferenceFieldDataType,
  EntryRefErrorReturnType,
  EntryGroupFieldDataType,
  EntryGlobalFieldDataType,
  EntryJsonRTEFieldDataType,
  EntryModularBlocksDataType,
  EntryReferenceFieldDataType,
} from '../types';
import auditConfig from '../config';
import { $t, auditMsg } from '../messages';

export default class Entries {
  public log: LogFn;
  public fileName: string;
  public locales!: Locale[];
  public config: ConfigType;
  public folderPath: string;
  public currentUid!: string;
  public currentTitle!: string;
  public gfSchema: ContentTypeStruct[];
  public ctSchema: ContentTypeStruct[];
  protected missingRefs: Record<string, any> = {};
  public entryMetaData: Record<string, any>[] = [];
  public moduleName: keyof typeof auditConfig.moduleConfig = 'content-types';

  constructor({ log, config, moduleName, ctSchema, gfSchema }: ModuleConstructorParam & CtConstructorParam) {
    this.log = log;
    this.config = config;
    this.ctSchema = ctSchema;
    this.gfSchema = gfSchema;
    this.fileName = config.moduleConfig[this.moduleName].fileName;
    this.folderPath = resolve(config.basePath, config.moduleConfig.entries.dirName);

    if (moduleName) this.moduleName = moduleName;
  }

  /**
   * The `run` function checks if a folder path exists, sets the schema based on the module name,
   * iterates over the schema and looks for references, and returns a list of missing references.
   * @returns the `missingRefs` object.
   */
  async run() {
    if (!existsSync(this.folderPath)) {
      throw new Error($t(auditMsg.NOT_VALID_PATH, { path: this.folderPath }));
    }

    await this.prepareEntryMetaData();

    for (const { code } of this.locales) {
      for (const ctSchema of this.ctSchema) {
        const basePath = join(this.folderPath, ctSchema.uid, code);
        const fsUtility = new FsUtility({ basePath, indexFileName: 'index.json' });
        const indexer = fsUtility.indexFileContent;

        for (const _ in indexer) {
          const entries = (await fsUtility.readChunkFiles.next()) as Record<string, EntryStruct>;
          for (const entryUid in entries) {
            let entry = entries[entryUid];
            const { uid, title } = entry;
            this.currentUid = uid;
            this.currentTitle = title;
            this.missingRefs[this.currentUid] = [];
            await this.lookForReference([{ uid, name: title }], ctSchema, entry);
            this.log(
              $t(auditMsg.SCAN_ENTRY_SUCCESS_MSG, {
                title,
                local: code,
                module: this.config.moduleConfig.entries.name,
              }),
              'info',
            );
          }
        }
      }
    }
    this.log('', 'info'); // Adding empty line

    for (let propName in this.missingRefs) {
      if (!this.missingRefs[propName].length) {
        delete this.missingRefs[propName];
      }
    }

    return this.missingRefs;
  }

  /**
   * The function `lookForReference` iterates over a given schema and validates different field types
   * such as reference, global field, JSON, modular blocks, and group fields.
   * @param {Record<string, unknown>[]} tree - An array of objects representing the tree structure of
   * the content type or field being validated. Each object in the array has the following properties:
   * @param {ContentTypeStruct | GlobalFieldDataType | ModularBlockType | GroupFieldDataType}  - -
   * `tree`: An array of objects representing the tree structure of the content type or field being
   * validated.
   * @param {EntryStruct | EntryGlobalFieldDataType | EntryModularBlocksDataType |
   * EntryGroupFieldDataType} entry - The `entry` parameter is an object that represents the data of an
   * entry. It can have different types depending on the `schema` parameter.
   */
  async lookForReference(
    tree: Record<string, unknown>[],
    { schema }: ContentTypeStruct | GlobalFieldDataType | ModularBlockType | GroupFieldDataType,
    entry: EntryStruct | EntryGlobalFieldDataType | EntryModularBlocksDataType | EntryGroupFieldDataType,
  ): Promise<void> {
    for (const field of schema ?? []) {
      const { uid } = field;
      switch (field.data_type) {
        case 'reference':
          this.missingRefs[this.currentUid].push(
            ...this.validateReferenceField(
              [...tree, { uid: field.uid, name: field.display_name, field: uid }],
              field as ReferenceFieldDataType,
              entry[uid] as EntryReferenceFieldDataType[],
            ),
          );
          break;
        case 'global_field':
          await this.validateGlobalField(
            [...tree, { uid: field.uid, name: field.display_name, field: uid }],
            field as GlobalFieldDataType,
            entry[uid] as EntryGlobalFieldDataType,
          );
          break;
        case 'json':
          if (field.field_metadata.extension) {
            // NOTE Custom field type
          } else if (field.field_metadata.allow_json_rte) {
            // NOTE JSON RTE field type
            await this.validateJsonRTEFields(
              [...tree, { uid: field.uid, name: field.display_name, field: uid }],
              field as JsonRTEFieldDataType,
              entry[uid] as EntryJsonRTEFieldDataType,
            );
          }
          break;
        case 'blocks':
          await this.validateModularBlocksField(
            [...tree, { uid: field.uid, name: field.display_name, field: uid }],
            field as ModularBlocksDataType,
            entry[uid] as EntryModularBlocksDataType[],
          );
          break;
        case 'group':
          await this.validateGroupField(
            [...tree, { uid: field.uid, name: field.display_name, field: uid }],
            field as GroupFieldDataType,
            entry[uid] as EntryGroupFieldDataType,
          );
          break;
      }
    }
  }

  /**
   * The function `validateReferenceField` validates the reference values of a given field in a tree
   * structure.
   * @param {Record<string, unknown>[]} tree - An array of objects representing a tree structure. Each
   * object in the array should have a unique identifier field.
   * @param {ReferenceFieldDataType} fieldStructure - The `fieldStructure` parameter is of type
   * `ReferenceFieldDataType`. It represents the structure of the reference field that needs to be
   * validated.
   * @param {EntryReferenceFieldDataType[]} field - The `field` parameter is an array of
   * `EntryReferenceFieldDataType` objects.
   * @returns the result of calling the `validateReferenceValues` function with the provided arguments
   * `tree`, `fieldStructure`, and `field`.
   */
  validateReferenceField(
    tree: Record<string, unknown>[],
    fieldStructure: ReferenceFieldDataType,
    field: EntryReferenceFieldDataType[],
  ) {
    return this.validateReferenceValues(tree, fieldStructure, field);
  }

  /**
   * The function "validateGlobalField" is an asynchronous function that takes in a tree,
   * fieldStructure, and field as parameters and looks for references in the tree.
   * @param {Record<string, unknown>[]} tree - The `tree` parameter is an array of objects. Each object
   * represents a node in a tree structure. The tree structure can be represented as a hierarchical
   * structure where each object can have child objects.
   * @param {GlobalFieldDataType} fieldStructure - The `fieldStructure` parameter is of type
   * `GlobalFieldDataType` and represents the structure of the global field. It defines the expected
   * properties and their types for the global field.
   * @param {EntryGlobalFieldDataType} field - The `field` parameter is of type
   * `EntryGlobalFieldDataType`. It represents a single global field entry.
   */
  async validateGlobalField(
    tree: Record<string, unknown>[],
    fieldStructure: GlobalFieldDataType,
    field: EntryGlobalFieldDataType,
  ): Promise<void> {
    // NOTE Any GlobalField related logic can be added here
    await this.lookForReference(tree, fieldStructure, field);
  }

  /**
   * The function `validateJsonRTEFields` is used to validate the JSON RTE fields by checking if the
   * referenced entries exist and adding missing references to a tree structure.
   * @param {Record<string, unknown>[]} tree - An array of objects representing the tree structure of
   * the JSON RTE fields.
   * @param {JsonRTEFieldDataType} fieldStructure - The `fieldStructure` parameter is of type
   * `JsonRTEFieldDataType` and represents the structure of a JSON RTE field. It contains properties
   * such as `uid`, `data_type`, and `display_name`.
   * @param {EntryJsonRTEFieldDataType} field - The `field` parameter is of type
   * `EntryJsonRTEFieldDataType`, which represents a JSON RTE field in an entry. It contains properties
   * such as `uid`, `attrs`, and `children`.
   */
  async validateJsonRTEFields(
    tree: Record<string, unknown>[],
    fieldStructure: JsonRTEFieldDataType,
    field: EntryJsonRTEFieldDataType,
  ) {
    // NOTE Other possible reference logic will be added related to JSON RTE (Ex missing assets, extensions etc.,)
    for (const child of field?.children ?? []) {
      const { uid: childrenUid, attrs, children } = child;
      const { 'entry-uid': entryUid, 'content-type-uid': contentTypeUid } = attrs || {};

      if (entryUid) {
        const refExist = find(this.entryMetaData, { uid: entryUid });

        if (!refExist) {
          tree.push({ field: 'children' }, { field: childrenUid, uid: fieldStructure.uid });
          this.missingRefs[this.currentUid].push({
            tree,
            uid: this.currentUid,
            name: this.currentTitle,
            data_type: fieldStructure.data_type,
            display_name: fieldStructure.display_name,
            treeStr: tree
              .map(({ name }) => name)
              .filter((val) => val)
              .join(' ➜ '),
            missingRefs: [{ uid: entryUid, 'content-type-uid': contentTypeUid }],
          });
        }
      }

      if (!isEmpty(children)) {
        await this.validateJsonRTEFields(tree, fieldStructure, child);
      }
    }
  }

  /**
   * The function validates the modular blocks field by traversing each module and looking for
   * references.
   * @param {Record<string, unknown>[]} tree - The `tree` parameter is an array of objects that
   * represent the structure of the modular blocks field. Each object in the array represents a level
   * in the tree structure, and it contains a `field` property that represents the unique identifier of
   * the modular block at that level.
   * @param {ModularBlocksDataType} fieldStructure - The `fieldStructure` parameter is of type
   * `ModularBlocksDataType` and represents the structure of the modular blocks field. It contains
   * information about the blocks and their properties.
   * @param {EntryModularBlocksDataType[]} field - The `field` parameter is an array of objects of type
   * `EntryModularBlocksDataType`.
   */
  async validateModularBlocksField(
    tree: Record<string, unknown>[],
    fieldStructure: ModularBlocksDataType,
    field: EntryModularBlocksDataType[],
  ): Promise<void> {
    const { blocks } = fieldStructure;

    // NOTE Traverse each and every module and look for reference
    for (let index = 0; index < blocks.length; index++) {
      const ctBlock = blocks[index];
      const entryBlock = field[index];
      const { uid } = ctBlock;

      if (entryBlock?.[uid]) {
        await this.lookForReference([...tree, { field: uid }], ctBlock, entryBlock[uid] as EntryModularBlocksDataType);
      }
    }
  }

  /**
   * The function validates a group field by looking for a reference in a tree structure.
   * @param {Record<string, unknown>[]} tree - An array of objects representing the tree structure.
   * @param {GroupFieldDataType} fieldStructure - The `fieldStructure` parameter is of type
   * `GroupFieldDataType` and represents the structure of the group field. It contains information
   * about the fields and their types within the group.
   * @param {EntryGroupFieldDataType} field - The `field` parameter is of type
   * `EntryGroupFieldDataType` and represents a single group field entry.
   */
  async validateGroupField(
    tree: Record<string, unknown>[],
    fieldStructure: GroupFieldDataType,
    field: EntryGroupFieldDataType,
  ): Promise<void> {
    // NOTE Any Group Field related logic can be added here (Ex data serialization or picking any metadata for report etc.,)
    await this.lookForReference(tree, fieldStructure, field);
  }

  /**
   * The function `validateReferenceValues` checks if the references in a given field exist in the
   * provided tree and returns any missing references.
   * @param {Record<string, unknown>[]} tree - An array of objects representing the tree structure of
   * the data. Each object in the array represents a node in the tree.
   * @param {ReferenceFieldDataType} fieldStructure - The `fieldStructure` parameter is of type
   * `ReferenceFieldDataType` and represents the structure of a reference field. It contains properties
   * such as `data_type` (the data type of the reference field) and `display_name` (the display name of
   * the reference field).
   * @param {EntryReferenceFieldDataType[]} field - The `field` parameter is an array of objects
   * representing entry reference fields. Each object in the array has properties such as `uid` which
   * represents the unique identifier of the referenced entry.
   * @returns The function `validateReferenceValues` returns an array of `EntryRefErrorReturnType`
   * objects.
   */
  validateReferenceValues(
    tree: Record<string, unknown>[],
    fieldStructure: ReferenceFieldDataType,
    field: EntryReferenceFieldDataType[],
  ): EntryRefErrorReturnType[] {
    const missingRefs = [];
    const { data_type, display_name } = fieldStructure;

    for (const reference of field ?? []) {
      const { uid } = reference;
      // NOTE Can skip specific references keys (Ex, system defined keys can be skipped)
      // if (this.config.skipRefs.includes(reference)) continue;

      const refExist = find(this.entryMetaData, { uid });

      if (!refExist) {
        missingRefs.push(reference as Record<string, unknown>);
      }
    }

    return missingRefs.length
      ? [
          {
            tree,
            data_type,
            missingRefs,
            display_name,
            uid: this.currentUid,
            name: this.currentTitle,
            treeStr: tree
              .map(({ name }) => name)
              .filter((val) => val)
              .join(' ➜ '),
          },
        ]
      : [];
  }

  /**
   * The function prepares entry metadata by reading and processing files from different locales and
   * schemas.
   */
  async prepareEntryMetaData() {
    this.log(auditMsg.PREPARING_ENTRY_METADATA, 'info');
    const localesFolderPath = resolve(this.config.basePath, this.config.moduleConfig.locales.dirName);
    const localesPath = join(localesFolderPath, this.config.moduleConfig.locales.fileName);
    const masterLocalesPath = join(localesFolderPath, 'master-locale.json');
    this.locales = values(JSON.parse(readFileSync(masterLocalesPath, 'utf-8')));
    this.locales.push(...values(JSON.parse(readFileSync(localesPath, 'utf-8'))));

    for (const { code } of this.locales) {
      for (const { uid } of this.ctSchema) {
        let basePath = join(this.folderPath, uid, code);
        let fsUtility = new FsUtility({ basePath, indexFileName: 'index.json' });
        let indexer = fsUtility.indexFileContent;

        for (const _ in indexer) {
          const entries = (await fsUtility.readChunkFiles.next()) as Record<string, EntryStruct>;
          for (const entryUid in entries) {
            let { title } = entries[entryUid];
            this.entryMetaData.push({ uid: entryUid, title });
          }
        }
      }
    }
  }
}
