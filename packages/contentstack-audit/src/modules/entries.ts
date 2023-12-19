import find from 'lodash/find';
import values from 'lodash/values';
import isEmpty from 'lodash/isEmpty';
import { join, resolve } from 'path';
import { ux, FsUtility } from '@contentstack/cli-utilities';
import { existsSync, readFileSync, writeFileSync } from 'fs';

import auditConfig from '../config';
import ContentType from './content-types';
import { $t, auditMsg, commonMsg } from '../messages';
import {
  LogFn,
  Locale,
  ConfigType,
  EntryStruct,
  EntryFieldType,
  ModularBlockType,
  ContentTypeStruct,
  CtConstructorParam,
  GroupFieldDataType,
  GlobalFieldDataType,
  JsonRTEFieldDataType,
  ContentTypeSchemaType,
  EntryModularBlockType,
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
import GlobalField from './global-fields';

export default class Entries {
  public log: LogFn;
  protected fix: boolean;
  public fileName: string;
  public locales!: Locale[];
  public config: ConfigType;
  public folderPath: string;
  public currentUid!: string;
  public currentTitle!: string;
  public gfSchema: ContentTypeStruct[];
  public ctSchema: ContentTypeStruct[];
  protected entries!: Record<string, EntryStruct>;
  protected missingRefs: Record<string, any> = {};
  public entryMetaData: Record<string, any>[] = [];
  public moduleName: keyof typeof auditConfig.moduleConfig = 'entries';

  constructor({ log, fix, config, moduleName, ctSchema, gfSchema }: ModuleConstructorParam & CtConstructorParam) {
    this.log = log;
    this.config = config;
    this.fix = fix ?? false;
    this.ctSchema = ctSchema;
    this.gfSchema = gfSchema;
    this.moduleName = moduleName ?? 'entries';
    this.fileName = config.moduleConfig[this.moduleName].fileName;
    this.folderPath = resolve(config.basePath, config.moduleConfig.entries.dirName);
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
    await this.fixPrerequisiteData();

    for (const { code } of this.locales) {
      for (const ctSchema of this.ctSchema) {
        const basePath = join(this.folderPath, ctSchema.uid, code);
        const fsUtility = new FsUtility({ basePath, indexFileName: 'index.json', createDirIfNotExist: false });
        const indexer = fsUtility.indexFileContent;

        for (const fileIndex in indexer) {
          const entries = (await fsUtility.readChunkFiles.next()) as Record<string, EntryStruct>;
          this.entries = entries;

          for (const entryUid in this.entries) {
            const entry = this.entries[entryUid];
            const { uid, title } = entry;
            this.currentUid = uid;
            this.currentTitle = title;

            if (!this.missingRefs[this.currentUid]) {
              this.missingRefs[this.currentUid] = [];
            }

            this.lookForReference([{ locale: code, uid, name: title }], ctSchema, this.entries[entryUid]);
            this.log(
              $t(auditMsg.SCAN_ENTRY_SUCCESS_MSG, {
                title,
                local: code,
                module: this.config.moduleConfig.entries.name,
              }),
              'info',
            );
          }

          if (this.fix) {
            await this.writeFixContent(`${basePath}/${indexer[fileIndex]}`, this.entries);
          }
        }
      }
    }
    this.log('', 'info'); // Adding empty line

    this.removeEmptyVal();

    return this.missingRefs;
  }

  /**
   * The function removes any properties from the `missingRefs` object that have an empty array value.
   */
  removeEmptyVal() {
    for (let propName in this.missingRefs) {
      if (!this.missingRefs[propName].length) {
        delete this.missingRefs[propName];
      }
    }
  }

  /**
   * The function `fixPrerequisiteData` fixes the prerequisite data by updating the `ctSchema` and
   * `gfSchema` properties using the `ContentType` class.
   */
  async fixPrerequisiteData() {
    this.ctSchema = (await new ContentType({
      fix: true,
      log: () => {},
      config: this.config,
      moduleName: 'content-types',
      ctSchema: this.ctSchema,
      gfSchema: this.gfSchema,
    }).run(true)) as ContentTypeStruct[];
    this.gfSchema = (await new GlobalField({
      fix: true,
      log: () => {},
      config: this.config,
      moduleName: 'global-fields',
      ctSchema: this.ctSchema,
      gfSchema: this.gfSchema,
    }).run(true)) as ContentTypeStruct[];
  }

  /**
   * The function checks if it can write the fix content to a file and if so, it writes the content as
   * JSON to the specified file path.
   */
  async writeFixContent(filePath: string, schema: Record<string, EntryStruct>) {
    let canWrite = true;

    if (this.fix) {
      if (!this.config.flags['copy-dir']) {
        canWrite = this.config.flags.yes || (await ux.confirm(commonMsg.FIX_CONFIRMATION));
      }

      if (canWrite) {
        writeFileSync(filePath, JSON.stringify(schema));
      }
    }
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
  lookForReference(
    tree: Record<string, unknown>[],
    field: ContentTypeStruct | GlobalFieldDataType | ModularBlockType | GroupFieldDataType,
    entry: EntryFieldType,
  ) {
    if (this.fix) {
      entry = this.runFixOnSchema(tree, field.schema as ContentTypeSchemaType[], entry);
    }

    for (const child of field.schema ?? []) {
      const { uid } = child;

      if (!entry?.[uid]) continue;

      switch (child.data_type) {
        case 'reference':
          this.missingRefs[this.currentUid].push(
            ...this.validateReferenceField(
              [...tree, { uid: child.uid, name: child.display_name, field: uid }],
              child as ReferenceFieldDataType,
              entry[uid] as EntryReferenceFieldDataType[],
            ),
          );
          break;
        case 'global_field':
          this.validateGlobalField(
            [...tree, { uid: child.uid, name: child.display_name, field: uid }],
            child as GlobalFieldDataType,
            entry[uid] as EntryGlobalFieldDataType,
          );
          break;
        case 'json':
          if (child.field_metadata.extension) {
            // NOTE Custom field type
          } else if (child.field_metadata.allow_json_rte) {
            // NOTE JSON RTE field type
            this.validateJsonRTEFields(
              [...tree, { uid: child.uid, name: child.display_name, field: uid }],
              child as JsonRTEFieldDataType,
              entry[uid] as EntryJsonRTEFieldDataType,
            );
          }
          break;
        case 'blocks':
          this.validateModularBlocksField(
            [...tree, { uid: child.uid, name: child.display_name, field: uid }],
            child as ModularBlocksDataType,
            entry[uid] as EntryModularBlocksDataType[],
          );
          break;
        case 'group':
          this.validateGroupField(
            [...tree, { uid: field.uid, name: child.display_name, field: uid }],
            child as GroupFieldDataType,
            entry[uid] as EntryGroupFieldDataType[],
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
  validateGlobalField(
    tree: Record<string, unknown>[],
    fieldStructure: GlobalFieldDataType,
    field: EntryGlobalFieldDataType,
  ) {
    // NOTE Any GlobalField related logic can be added here
    this.lookForReference(tree, fieldStructure, field);
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
  validateJsonRTEFields(
    tree: Record<string, unknown>[],
    fieldStructure: JsonRTEFieldDataType,
    field: EntryJsonRTEFieldDataType,
  ) {
    // NOTE Other possible reference logic will be added related to JSON RTE (Ex missing assets, extensions etc.,)
    for (const index in field?.children ?? []) {
      const child = field.children[index];
      const { children } = child;

      if (!this.fix) {
        this.jsonRefCheck(tree, fieldStructure, child);
      }

      if (!isEmpty(children)) {
        this.validateJsonRTEFields(tree, fieldStructure, field.children[index]);
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
  validateModularBlocksField(
    tree: Record<string, unknown>[],
    fieldStructure: ModularBlocksDataType,
    field: EntryModularBlocksDataType[],
  ) {
    if (!this.fix) {
      for (const index in field) {
        this.modularBlockRefCheck(tree, fieldStructure.blocks, field[index], +index);
      }
    }

    for (const block of fieldStructure.blocks) {
      const { uid, title } = block;

      for (const eBlock of field) {
        if (eBlock[uid]) {
          this.lookForReference([...tree, { uid, name: title }], block, eBlock[uid] as EntryModularBlocksDataType);
        }
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
  validateGroupField(
    tree: Record<string, unknown>[],
    fieldStructure: GroupFieldDataType,
    field: EntryGroupFieldDataType | EntryGroupFieldDataType[],
  ) {
    // NOTE Any Group Field related logic can be added here (Ex data serialization or picking any metadata for report etc.,)
    if (Array.isArray(field)) {
      field.forEach((eGroup) => {
        this.lookForReference(
          [...tree, { uid: fieldStructure.uid, display_name: fieldStructure.display_name }],
          fieldStructure,
          eGroup,
        );
      });
    } else {
      this.lookForReference(tree, fieldStructure, field);
    }
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
    if (this.fix) return [];

    const missingRefs: Record<string, any>[] = [];
    const { uid: data_type, display_name } = fieldStructure;

    for (const index in field ?? []) {
      const reference = field[index];
      const { uid } = reference;
      // NOTE Can skip specific references keys (Ex, system defined keys can be skipped)
      // if (this.config.skipRefs.includes(reference)) continue;

      const refExist = find(this.entryMetaData, { uid });

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
   * The function `runFixOnSchema` takes in a tree, schema, and entry, and applies fixes to the entry
   * based on the schema.
   * @param {Record<string, unknown>[]} tree - An array of objects representing the tree structure of
   * the schema. Each object has the following properties:
   * @param {ContentTypeSchemaType[]} schema - The `schema` parameter is an array of objects
   * representing the content type schema. Each object in the array contains information about a
   * specific field in the schema, such as its unique identifier (`uid`) and data type (`data_type`).
   * @param {EntryFieldType} entry - The `entry` parameter is of type `EntryFieldType`, which
   * represents the data of an entry. It is an object that contains fields as key-value pairs, where
   * the key is the field UID (unique identifier) and the value is the field data.
   * @returns the updated `entry` object after applying fixes to the fields based on the provided
   * `schema`.
   */
  runFixOnSchema(tree: Record<string, unknown>[], schema: ContentTypeSchemaType[], entry: EntryFieldType) {
    // NOTE Global field Fix
    schema.forEach((field) => {
      const { uid, data_type } = field;

      if (!Object(entry).hasOwnProperty(uid)) {
        return;
      }

      switch (data_type) {
        case 'global_field':
          entry[uid] = this.fixGlobalFieldReferences(
            [...tree, { uid: field.uid, name: field.display_name, data_type: field.data_type }],
            field as GlobalFieldDataType,
            entry[uid] as EntryGlobalFieldDataType,
          ) as EntryGlobalFieldDataType;
          break;
        case 'json':
        case 'reference':
          if (data_type === 'json') {
            if (field.field_metadata.extension) {
              // NOTE Custom field type
              break;
            } else if (field.field_metadata.allow_json_rte) {
              this.fixJsonRteMissingReferences(
                [...tree, { uid: field.uid, name: field.display_name, data_type: field.data_type }],
                field as JsonRTEFieldDataType,
                entry[uid] as EntryJsonRTEFieldDataType,
              );
              break;
            }
          }
          // NOTE Reference field
          entry[uid] = this.fixMissingReferences(
            [...tree, { uid: field.uid, name: field.display_name, data_type: field.data_type }],
            field as ReferenceFieldDataType,
            entry[uid] as EntryReferenceFieldDataType[],
          );
          break;
        case 'blocks':
          entry[uid] = this.fixModularBlocksReferences(
            [...tree, { uid: field.uid, name: field.display_name, data_type: field.data_type }],
            (field as ModularBlocksDataType).blocks,
            entry[uid] as EntryModularBlocksDataType[],
          );
          break;
        case 'group':
          entry[uid] = this.fixGroupField(
            [...tree, { uid: field.uid, name: field.display_name, data_type: field.data_type }],
            field as GroupFieldDataType,
            entry[uid] as EntryGroupFieldDataType[],
          ) as EntryGroupFieldDataType;
          break;
      }
    });

    return entry;
  }

  /**
   * The function `fixGlobalFieldReferences` adds a new entry to a tree data structure and runs a fix
   * on the schema.
   * @param {Record<string, unknown>[]} tree - An array of objects representing the tree structure.
   * @param {GlobalFieldDataType} field - The `field` parameter is of type `GlobalFieldDataType` and
   * represents a global field object. It contains properties such as `uid` and `display_name`.
   * @param {EntryGlobalFieldDataType} entry - The `entry` parameter is of type
   * `EntryGlobalFieldDataType` and represents the global field entry that needs to be fixed.
   * @returns the result of calling the `runFixOnSchema` method with the updated `tree` array,
   * `field.schema`, and `entry` as arguments.
   */
  fixGlobalFieldReferences(
    tree: Record<string, unknown>[],
    field: GlobalFieldDataType,
    entry: EntryGlobalFieldDataType,
  ) {
    return this.runFixOnSchema([...tree, { uid: field.uid, display_name: field.display_name }], field.schema, entry);
  }

  /**
   * The function `fixModularBlocksReferences` takes in a tree, a list of blocks, and an entry, and
   * performs various operations to fix references within the entry.
   * @param {Record<string, unknown>[]} tree - An array of objects representing the tree structure of
   * the modular blocks.
   * @param {ModularBlockType[]} blocks - An array of objects representing modular blocks. Each object
   * has properties like `uid` (unique identifier) and `title` (display name).
   * @param {EntryModularBlocksDataType[]} entry - An array of objects representing the modular blocks
   * data in an entry. Each object in the array represents a modular block and contains its unique
   * identifier (uid) and other properties.
   * @returns the updated `entry` array after performing some modifications.
   */
  fixModularBlocksReferences(
    tree: Record<string, unknown>[],
    blocks: ModularBlockType[],
    entry: EntryModularBlocksDataType[],
  ) {
    entry = entry
      .map((block, index) => this.modularBlockRefCheck(tree, blocks, block, index))
      .filter((val) => !isEmpty(val));

    blocks.forEach((block) => {
      entry = entry
        .map((eBlock) => {
          if (!isEmpty(block.schema)) {
            if (eBlock[block.uid]) {
              eBlock[block.uid] = this.runFixOnSchema(
                [...tree, { uid: block.uid, display_name: block.title }],
                block.schema as ContentTypeSchemaType[],
                eBlock[block.uid] as EntryFieldType,
              ) as EntryModularBlockType;
            }
          }

          return eBlock;
        })
        .filter((val) => !isEmpty(val));
    });

    return entry;
  }

  /**
   * The function `fixGroupField` takes in a tree, a field, and an entry, and if the field has a
   * schema, it runs a fix on the schema and returns the updated entry, otherwise it returns the
   * original entry.
   * @param {Record<string, unknown>[]} tree - An array of objects representing the tree structure.
   * @param {GroupFieldDataType} field - The `field` parameter is of type `GroupFieldDataType` and
   * represents a group field object. It contains properties such as `uid` (unique identifier) and
   * `display_name` (name of the field).
   * @param {EntryGroupFieldDataType} entry - The `entry` parameter is of type
   * `EntryGroupFieldDataType`.
   * @returns If the `field.schema` is not empty, the function will return the result of calling
   * `this.runFixOnSchema` with the updated `tree`, `field.schema`, and `entry` as arguments.
   * Otherwise, it will return the `entry` as is.
   */
  fixGroupField(
    tree: Record<string, unknown>[],
    field: GroupFieldDataType,
    entry: EntryGroupFieldDataType | EntryGroupFieldDataType[],
  ) {
    if (!isEmpty(field.schema)) {
      if (Array.isArray(entry)) {
        entry = entry.map((eGroup) => {
          return this.runFixOnSchema(
            [...tree, { uid: field.uid, display_name: field.display_name }],
            field.schema as ContentTypeSchemaType[],
            eGroup,
          );
        }) as EntryGroupFieldDataType[];
      } else {
        entry = this.runFixOnSchema(
          [...tree, { uid: field.uid, display_name: field.display_name }],
          field.schema as ContentTypeSchemaType[],
          entry,
        ) as EntryGroupFieldDataType;
      }
    }

    return entry;
  }

  /**
   * The function fixes missing references in a JSON tree structure.
   * @param {Record<string, unknown>[]} tree - An array of objects representing a tree structure. Each
   * object in the array has a string key and an unknown value.
   * @param {ReferenceFieldDataType | JsonRTEFieldDataType} field - The `field` parameter can be of
   * type `ReferenceFieldDataType` or `JsonRTEFieldDataType`.
   * @param {EntryJsonRTEFieldDataType} entry - The `entry` parameter is of type
   * `EntryJsonRTEFieldDataType`, which represents an entry in a JSON Rich Text Editor (JsonRTE) field.
   * @returns the updated `entry` object with fixed missing references in the `children` property.
   */
  fixJsonRteMissingReferences(
    tree: Record<string, unknown>[],
    field: ReferenceFieldDataType | JsonRTEFieldDataType,
    entry: EntryJsonRTEFieldDataType | EntryJsonRTEFieldDataType[],
  ) {
    if (Array.isArray(entry)) {
      entry = entry.map((child: any, index) => {
        return this.fixJsonRteMissingReferences([...tree, { index, type: child?.type, uid: child?.uid }], field, child);
      }) as EntryJsonRTEFieldDataType[];
    } else {
      if (entry?.children) {
        entry.children = entry.children
          .map((child) => {
            const refExist = this.jsonRefCheck(tree, field, child);

            if (!refExist) return null;

            if (!isEmpty(child.children)) {
              child = this.fixJsonRteMissingReferences(tree, field, child) as EntryJsonRTEFieldDataType;
            }

            return child;
          })
          .filter((val) => val) as EntryJsonRTEFieldDataType[];
      }
    }

    return entry;
  }

  /**
   * The `fixMissingReferences` function checks for missing references in an entry and adds them to a
   * list if they are not found.
   * @param {Record<string, unknown>[]} tree - An array of objects representing a tree structure. Each
   * object in the array should have a "name" property and an optional "index" property.
   * @param {ReferenceFieldDataType | JsonRTEFieldDataType} field - The `field` parameter is of type
   * `ReferenceFieldDataType` or `JsonRTEFieldDataType`.
   * @param {EntryReferenceFieldDataType[]} entry - The `entry` parameter is an array of objects that
   * represent references to other entries. Each object in the array has the following properties:
   * @returns the `entry` variable.
   */
  fixMissingReferences(
    tree: Record<string, unknown>[],
    field: ReferenceFieldDataType | JsonRTEFieldDataType,
    entry: EntryReferenceFieldDataType[],
  ) {
    const missingRefs: Record<string, any>[] = [];
    entry = entry
      .map((reference) => {
        const { uid } = reference;
        const refExist = find(this.entryMetaData, { uid });

        if (!refExist) {
          missingRefs.push(reference);
          return null;
        }

        return reference;
      })
      .filter((val) => val) as EntryReferenceFieldDataType[];

    if (!isEmpty(missingRefs)) {
      this.missingRefs[this.currentUid].push({
        tree,
        fixStatus: 'Fixed',
        uid: this.currentUid,
        name: this.currentTitle,
        data_type: field.data_type,
        display_name: field.display_name,
        treeStr: tree
          .map(({ name, index }) => (index || index === 0 ? `[${+index}].${name}` : name))
          .filter((val) => val)
          .join(' ➜ '),
        missingRefs,
      });
    }

    return entry;
  }

  /**
   * The function `modularBlockRefCheck` checks for invalid keys in an entry block and returns the
   * updated entry block.
   * @param {Record<string, unknown>[]} tree - An array of objects representing the tree structure of
   * the blocks.
   * @param {ModularBlockType[]} blocks - The `blocks` parameter is an array of `ModularBlockType`
   * objects.
   * @param {EntryModularBlocksDataType} entryBlock - The `entryBlock` parameter is an object that
   * represents a modular block entry. It contains key-value pairs where the keys are the UIDs of the
   * modular blocks and the values are the data associated with each modular block.
   * @param {Number} index - The `index` parameter is a number that represents the index of the current
   * block in the `tree` array.
   * @returns the `entryBlock` object.
   */
  modularBlockRefCheck(
    tree: Record<string, unknown>[],
    blocks: ModularBlockType[],
    entryBlock: EntryModularBlocksDataType,
    index: number,
  ) {
    const validBlockUid = blocks.map((block) => block.uid);
    const invalidKeys = Object.keys(entryBlock).filter((key) => !validBlockUid.includes(key));

    invalidKeys.forEach((key) => {
      if (this.fix) {
        delete entryBlock[key];
      }

      this.missingRefs[this.currentUid].push({
        uid: this.currentUid,
        name: this.currentTitle,
        data_type: key,
        display_name: key,
        fixStatus: this.fix ? 'Fixed' : undefined,
        tree: [...tree, { index, uid: key, name: key }],
        treeStr: [...tree, { index, uid: key, name: key }]
          .map(({ name, index }) => (index || index === 0 ? `[${+index}].${name}` : name))
          .filter((val) => val)
          .join(' ➜ '),
        missingRefs: [key],
      });
    });

    return entryBlock;
  }

  /**
   * The `jsonRefCheck` function checks if a reference exists in a JSON tree and adds missing
   * references to a list if they are not found.
   * @param {Record<string, unknown>[]} tree - An array of objects representing the tree structure.
   * @param {JsonRTEFieldDataType} schema - The `schema` parameter is of type `JsonRTEFieldDataType`
   * and represents the schema of a JSON field. It contains properties such as `uid`, `data_type`, and
   * `display_name`.
   * @param {EntryJsonRTEFieldDataType} child - The `child` parameter is an object that represents a
   * child entry in a JSON tree. It has the following properties:
   * @returns The function `jsonRefCheck` returns either `null` or `true`.
   */
  jsonRefCheck(tree: Record<string, unknown>[], schema: JsonRTEFieldDataType, child: EntryJsonRTEFieldDataType) {
    const { uid: childrenUid } = child;
    const { 'entry-uid': entryUid, 'content-type-uid': contentTypeUid } = child.attrs || {};

    if (entryUid) {
      const refExist = find(this.entryMetaData, { uid: entryUid });

      if (!refExist) {
        tree.push({ field: 'children' }, { field: childrenUid, uid: schema.uid });
        this.missingRefs[this.currentUid].push({
          tree,
          uid: this.currentUid,
          name: this.currentTitle,
          data_type: schema.data_type,
          display_name: schema.display_name,
          fixStatus: this.fix ? 'Fixed' : undefined,
          treeStr: tree
            .map(({ name }) => name)
            .filter((val) => val)
            .join(' ➜ '),
          missingRefs: [{ uid: entryUid, 'content-type-uid': contentTypeUid }],
        });

        return null;
      }
    }

    return true;
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
    this.locales = values(JSON.parse(readFileSync(masterLocalesPath, 'utf8')));
    this.locales.push(...values(JSON.parse(readFileSync(localesPath, 'utf8'))));

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
