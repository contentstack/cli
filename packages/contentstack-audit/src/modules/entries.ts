import find from 'lodash/find';
import values from 'lodash/values';
import isEmpty from 'lodash/isEmpty';
import { join, resolve } from 'path';
import { existsSync, readFileSync } from 'fs';

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
import { FsUtility } from '@contentstack/cli-utilities';

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

    return this.missingRefs;
  }

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

  validateReferenceField(
    tree: Record<string, unknown>[],
    fieldStructure: ReferenceFieldDataType,
    field: EntryReferenceFieldDataType[],
  ) {
    return this.validateReferenceValues(tree, fieldStructure, field);
  }

  async validateGlobalField(
    tree: Record<string, unknown>[],
    fieldStructure: GlobalFieldDataType,
    field: EntryGlobalFieldDataType,
  ): Promise<void> {
    // NOTE Any GlobalField related logic can be added here
    await this.lookForReference(tree, fieldStructure, field);
  }

  async validateJsonRTEFields(
    tree: Record<string, unknown>[],
    fieldStructure: JsonRTEFieldDataType,
    field: EntryJsonRTEFieldDataType,
  ) {
    // NOTE Other possible reference logic will be added related to JSON RTE (Ex missing assets, extensions etc.,)
    for (const child of field?.children ?? []) {
      const { uid: childrenUid, attrs, children } = child;
      const { 'entry-uid': entryUid } = attrs || {};

      if (entryUid) {
        const refExist = find(this.entryMetaData, { uid: entryUid });

        if (!refExist) {
          tree.push(
            { field: 'children' },
            { field: childrenUid, uid: fieldStructure.uid, name: fieldStructure.display_name },
          );
          this.missingRefs[this.currentUid].push({
            tree,
            uid: this.currentUid,
            name: this.currentTitle,
            data_type: fieldStructure.data_type,
            display_name: fieldStructure.display_name,
            treeStr: tree.map(({ field, name }) => name || field).join(' ➜ '),
            missingRefs: [{ uid: entryUid, 'content-type-uid': fieldStructure.uid }],
          });
        }
      }

      if (!isEmpty(children)) {
        await this.validateJsonRTEFields(tree, fieldStructure, child);
      }
    }
  }

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

      if (entryBlock[uid]) {
        await this.lookForReference([...tree, { field: uid }], ctBlock, entryBlock[uid] as EntryModularBlocksDataType);
      }
    }
  }

  async validateGroupField(
    tree: Record<string, unknown>[],
    fieldStructure: GroupFieldDataType,
    field: EntryGroupFieldDataType,
  ): Promise<void> {
    // NOTE Any Group Field related logic can be added here (Ex data serialization or picking any metadata for report etc.,)
    await this.lookForReference(tree, fieldStructure, field);
  }

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

  async prepareEntryMetaData() {
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
