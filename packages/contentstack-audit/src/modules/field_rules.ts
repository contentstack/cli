import map from 'lodash/map';
import { join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

import { FsUtility, Locale, sanitizePath, ux } from '@contentstack/cli-utilities';

import {
  LogFn,
  ConfigType,
  ModularBlockType,
  ContentTypeStruct,
  GroupFieldDataType,
  CtConstructorParam,
  GlobalFieldDataType,
  ModularBlocksDataType,
  ModuleConstructorParam,
  EntryStruct,
} from '../types';
import auditConfig from '../config';
import { $t, auditFixMsg, auditMsg, commonMsg } from '../messages';
import { MarketplaceAppsInstallationData } from '../types/extension';
import { keys, values } from 'lodash';

/* The `ContentType` class is responsible for scanning content types, looking for references, and
generating a report in JSON and CSV formats. */
export default class FieldRule {
  public log: LogFn;
  protected fix: boolean;
  public fileName: string;
  public config: ConfigType;
  public folderPath: string;
  public currentUid!: string;
  public currentTitle!: string;
  public extensions: string[] = [];
  public inMemoryFix: boolean = false;
  public gfSchema: ContentTypeStruct[];
  public ctSchema: ContentTypeStruct[];
  protected schema: ContentTypeStruct[] = [];
  protected missingRefs: Record<string, any> = {};
  public moduleName: keyof typeof auditConfig.moduleConfig;
  public schemaMap: any = [];
  public locales!: Locale[];
  protected entries!: Record<string, EntryStruct>;
  protected missingSelectFeild: Record<string, any> = {};
  protected missingMandatoryFields: Record<string, any> = {};
  protected missingTitleFields: Record<string, any> = {};
  protected missingEnvLocale: Record<string, any> = {};
  public environments: string[] = [];
  public entryMetaData: Record<string, any>[] = [];
  public action: string[] = ['show', 'hide'];
  constructor({ log, fix, config, moduleName, ctSchema, gfSchema }: ModuleConstructorParam & CtConstructorParam) {
    this.log = log;
    this.config = config;
    this.fix = fix ?? false;
    this.ctSchema = ctSchema;
    this.gfSchema = gfSchema;
    this.moduleName = this.validateModules(moduleName!, this.config.moduleConfig);
    this.fileName = config.moduleConfig[this.moduleName].fileName;
    this.folderPath = resolve(
      sanitizePath(config.basePath),
      sanitizePath(config.moduleConfig[this.moduleName].dirName),
    );
  }

  validateModules(
    moduleName: keyof typeof auditConfig.moduleConfig,
    moduleConfig: Record<string, unknown>,
  ): keyof typeof auditConfig.moduleConfig {
    if (Object.keys(moduleConfig).includes(moduleName)) {
      return moduleName;
    }
    return 'content-types';
  }
  /**
   * The `run` function checks if a folder path exists, sets the schema based on the module name,
   * iterates over the schema and looks for references, and returns a list of missing references.
   * @returns the `missingRefs` object.
   */
  async run(returnFixSchema = false) {
    this.inMemoryFix = returnFixSchema;

    if (!existsSync(this.folderPath)) {
      this.log(`Skipping ${this.moduleName} audit`, 'warn');
      this.log($t(auditMsg.NOT_VALID_PATH, { path: this.folderPath }), { color: 'yellow' });
      return returnFixSchema ? [] : {};
    }

    this.schema = this.moduleName === 'content-types' ? this.ctSchema : this.gfSchema;

    await this.prerequisiteData();
    await this.prepareEntryMetaData();
    for (const schema of this.schema ?? []) {
      this.currentUid = schema.uid;
      this.currentTitle = schema.title;
      this.missingRefs[this.currentUid] = [];
      const { uid, title } = schema;

      await this.lookForReference([{ uid, name: title }], schema, null);

      this.missingRefs[this.currentUid] = [];

      if(this.fix) {
        if (Array.isArray(schema.field_rules)) {
          let count = 0;
          schema.field_rules = schema.field_rules.map((fr) => {
            fr.actions = fr.actions.map((actions: { target_field: any }) => {
              if (!this.schemaMap.includes(actions.target_field)) {
                this.log($t(auditMsg.FIELD_RULE_TARGET_ABSENT, { target_field: actions.target_field, ctUid: schema.uid }), 'error');
                this.missingRefs[this.currentUid].push({ctUid: this.currentUid, action: actions, fixStatus:'Fixed'});
                this.log($t(auditFixMsg.FIELD_RULE_FIX_MESSAGE, {num: count.toString() , ctUid: schema.uid }), 'info');
                this.log($t(auditMsg.FIELD_RULE_TARGET_SCAN_MESSAGE, {num: count.toString() , ctUid: schema.uid }), 'info');
                return
              } else {
                this.log($t(auditMsg.FIELD_RULE_TARGET_SCAN_MESSAGE, {num: count.toString() , ctUid: schema.uid }), 'info');
                return actions;
              }
            }).filter((v: any)=>v);
  
            fr.conditions = fr.conditions.map((actions: { operand_field: any }) => {
              if (!this.schemaMap.includes(actions.operand_field)) {
                this.log($t(auditMsg.FIELD_RULE_CONDITION_ABSENT, { condition_field: actions.operand_field}), 'error');
                this.missingRefs[this.currentUid].push({
                  ctUid: this.currentUid,
                  action: actions,
                  fixStatus: "Fixed"
                });
                this.log($t(auditFixMsg.FIELD_RULE_FIX_MESSAGE, {num: count.toString() , ctUid: schema.uid }), 'info');
                this.log($t(auditMsg.FIELD_RULE_TARGET_SCAN_MESSAGE, {num: count.toString() , ctUid: schema.uid }), 'info');
                return
              } else {
                this.log($t(auditMsg.FIELD_RULE_CONDITION_SCAN_MESSAGE, {num: count.toString() , ctUid: schema.uid }), 'info');
                return actions;
              }
            }).filter((v:any)=>v);

            count = count+1;
            if(fr.actions.length && fr.conditions.length) {
              return fr;
            }
          }).filter((v:any)=>v);
        }
      } else {
        if (Array.isArray(schema.field_rules)) {
          let count = 0;
          schema.field_rules.forEach((fr) => {
            fr.actions.forEach((actions: { target_field: any }) => {
              if (!this.schemaMap.includes(actions.target_field)) {
                this.log($t(auditMsg.FIELD_RULE_TARGET_ABSENT, { target_field: actions.target_field, ctUid: schema.uid }), 'error');
                this.missingRefs[this.currentUid].push({action: actions, ctUid: this.currentUid});
              } else {
                this.log($t(auditMsg.FIELD_RULE_TARGET_SCAN_MESSAGE, {num: count.toString() , ctUid: schema.uid }), 'info');
              }
            });
  
            fr.conditions.forEach((actions: { operand_field: any }) => {
              if (!this.schemaMap.includes(actions.operand_field)) {
                this.log($t(auditMsg.FIELD_RULE_CONDITION_ABSENT, { condition_field: actions.operand_field }), 'error');
                this.missingRefs[this.currentUid].push({
                  action: actions,
                  ctUid: this.currentUid
                });
              } else {
                this.log($t(auditMsg.FIELD_RULE_CONDITION_SCAN_MESSAGE, {num: count.toString() , ctUid: schema.uid }), 'info');
              }
            });
            count = count+1;
          });
        }
      }

      this.schemaMap = [];
      this.log(
        $t(auditMsg.SCAN_CT_SUCCESS_MSG, { title, module: this.config.moduleConfig[this.moduleName].name }),
        'info',
      );

    }

    if (this.fix) {
      await this.writeFixContent();
    }

    for (let propName in this.missingRefs) {
      if (!this.missingRefs[propName].length) {
        delete this.missingRefs[propName];
      }
    }

    return this.missingRefs;
  }

  /**
   * @method prerequisiteData
   * The `prerequisiteData` function reads and parses JSON files to retrieve extension and marketplace
   * app data, and stores them in the `extensions` array.
   */
  async prerequisiteData() {
    const extensionPath = resolve(this.config.basePath, 'extensions', 'extensions.json');
    const marketplacePath = resolve(this.config.basePath, 'marketplace_apps', 'marketplace_apps.json');

    if (existsSync(extensionPath)) {
      try {
        this.extensions = Object.keys(JSON.parse(readFileSync(extensionPath, 'utf8')));
      } catch (error) {}
    }

    if (existsSync(marketplacePath)) {
      try {
        const marketplaceApps: MarketplaceAppsInstallationData[] = JSON.parse(readFileSync(marketplacePath, 'utf8'));

        for (const app of marketplaceApps) {
          const metaData = map(map(app?.ui_location?.locations, 'meta').flat(), 'extension_uid').filter(
            (val) => val,
          ) as string[];
          this.extensions.push(...metaData);
        }
      } catch (error) {}
    }
  }

  /**
   * The function checks if it can write the fix content to a file and if so, it writes the content as
   * JSON to the specified file path.
   */
  async writeFixContent() {
    let canWrite = true;

    if (!this.inMemoryFix && this.fix) {
      if (!this.config.flags['copy-dir'] && !this.config.flags['external-config']?.skipConfirm) {
        canWrite = this.config.flags.yes ?? (await ux.confirm(commonMsg.FIX_CONFIRMATION));
      }

      if (canWrite) {
        writeFileSync(
          join(this.folderPath, this.config.moduleConfig[this.moduleName].fileName),
          JSON.stringify(this.schema),
        );
      }
    }
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
    field: ContentTypeStruct | GlobalFieldDataType | ModularBlockType | GroupFieldDataType,
    parent: any = null,
  ): Promise<void> {
    const fixTypes = this.config.flags['fix-only'] ?? this.config['fix-fields'];

    for (let child of field.schema ?? []) {
      if (parent !== null) {
        this.schemaMap.push(parent + '.' + child.uid);
      } else {
        this.schemaMap.push(child.uid);
      }

      if (!fixTypes.includes(child.data_type) && child.data_type !== 'json') continue;

      switch (child.data_type) {
        case 'global_field':
          await this.validateGlobalField(
            [...tree, { uid: child.uid, name: child.display_name }],
            child as GlobalFieldDataType,
            parent ? parent + '.' + child.uid : child.uid,
          );
          break;
        case 'blocks':
          await this.validateModularBlocksField(
            [...tree, { uid: child.uid, name: child.display_name }],
            child as ModularBlocksDataType,
            parent ? parent + '.' + child.uid : child.uid,
          );
          break;
        case 'group':
          await this.validateGroupField(
            [...tree, { uid: child.uid, name: child.display_name }],
            child as GroupFieldDataType,
            parent ? parent + '.' + child.uid : child.uid,
          );
          break;
      }
    }
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
  async validateGlobalField(tree: Record<string, unknown>[], field: GlobalFieldDataType, parent: any): Promise<void> {

    await this.lookForReference(tree, field, parent);
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
  async validateModularBlocksField(
    tree: Record<string, unknown>[],
    field: ModularBlocksDataType,
    parent: any,
  ): Promise<void> {
    const { blocks } = field;
    for (const block of blocks) {
      const { uid, title } = block;

      await this.lookForReference([...tree, { uid, name: title }], block, parent + '.' + block.uid);
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
  async validateGroupField(tree: Record<string, unknown>[], field: GroupFieldDataType, parent: any): Promise<void> {
    // NOTE Any Group Field related logic can be added here (Ex data serialization or picking any metadata for report etc.,)
    await this.lookForReference(tree, field, parent);
  }


  async prepareEntryMetaData() {
    this.log(auditMsg.PREPARING_ENTRY_METADATA, 'info');
    const localesFolderPath = resolve(this.config.basePath, this.config.moduleConfig.locales.dirName);
    const localesPath = join(localesFolderPath, this.config.moduleConfig.locales.fileName);
    const masterLocalesPath = join(localesFolderPath, 'master-locale.json');
    this.locales = existsSync(masterLocalesPath) ? values(JSON.parse(readFileSync(masterLocalesPath, 'utf8'))) : [];

    if (existsSync(localesPath)) {
      this.locales.push(...values(JSON.parse(readFileSync(localesPath, 'utf8'))));
    }

    const environmentPath = resolve(
      this.config.basePath,
      this.config.moduleConfig.environments.dirName,
      this.config.moduleConfig.environments.fileName,
    );
    this.environments = existsSync(environmentPath) ? keys(JSON.parse(readFileSync(environmentPath, 'utf8'))) : [];
    const entriesFolderPath = resolve(
      sanitizePath(this.config.basePath),
      'entries',
    )
    for (const { code } of this.locales) {
      for (const { uid } of this.ctSchema) {
        let basePath = join(entriesFolderPath, uid, code);
        let fsUtility = new FsUtility({ basePath, indexFileName: 'index.json' });
        let indexer = fsUtility.indexFileContent;

        for (const _ in indexer) {
          const entries = (await fsUtility.readChunkFiles.next()) as Record<string, EntryStruct>;
          for (const entryUid in entries) {
            let { title } = entries[entryUid];

            if (entries[entryUid].hasOwnProperty('title') && !title) {
              this.missingTitleFields[entryUid] = {
                'Entry UID': entryUid,
                'Content Type UID': uid,
                Locale: code,
              };
              this.log(
                `The 'title' field in Entry with UID '${entryUid}' of Content Type '${uid}' in Locale '${code}' is empty.`,
                `error`,
              );
            } else if (!title) {
              this.log(
                `The 'title' field in Entry with UID '${entryUid}' of Content Type '${uid}' in Locale '${code}' is empty.`,
                `error`,
              );
            }
            this.entryMetaData.push({ uid: entryUid, title, ctUid: uid });
          }
        }
      }
    }
  }
}
