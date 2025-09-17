import map from 'lodash/map';
import find from 'lodash/find';
import values from 'lodash/values';
import isEmpty from 'lodash/isEmpty';
import { join, resolve } from 'path';
import { FsUtility, sanitizePath, cliux } from '@contentstack/cli-utilities';
import { existsSync, readFileSync, writeFileSync } from 'fs';

import auditConfig from '../config';
import ContentType from './content-types';
import { $t, auditFixMsg, auditMsg, commonMsg } from '../messages';
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
  ExtensionOrAppFieldDataType,
  EntryExtensionOrAppFieldDataType,
  EntrySelectFeildDataType,
  SelectFeildStruct,
} from '../types';
import GlobalField from './global-fields';
import { MarketplaceAppsInstallationData } from '../types/extension';
import { keys } from 'lodash';

export default class Entries {
  public log: LogFn;
  protected fix: boolean;
  public fileName: string;
  public locales!: Locale[];
  public config: ConfigType;
  public folderPath: string;
  public currentUid!: string;
  public currentTitle!: string;
  public extensions: string[] = [];
  public gfSchema: ContentTypeStruct[];
  public ctSchema: ContentTypeStruct[];
  protected entries!: Record<string, EntryStruct>;
  protected missingRefs: Record<string, any> = {};
  protected missingSelectFeild: Record<string, any> = {};
  protected missingMandatoryFields: Record<string, any> = {};
  protected missingTitleFields: Record<string, any> = {};
  protected missingEnvLocale: Record<string, any> = {};
  protected missingMultipleField: Record<string, any> = {};
  public environments: string[] = [];
  public entryMetaData: Record<string, any>[] = [];
  public moduleName: keyof typeof auditConfig.moduleConfig = 'entries';

  constructor({ log, fix, config, moduleName, ctSchema, gfSchema }: ModuleConstructorParam & CtConstructorParam) {
    this.log = log;
    this.config = config;
    this.fix = fix ?? false;
    this.ctSchema = ctSchema;
    this.gfSchema = gfSchema;
    this.moduleName = this.validateModules(moduleName!, this.config.moduleConfig);
    this.fileName = config.moduleConfig[this.moduleName].fileName;
    this.folderPath = resolve(sanitizePath(config.basePath), sanitizePath(config.moduleConfig.entries.dirName));
  }

  validateModules(
    moduleName: keyof typeof auditConfig.moduleConfig,
    moduleConfig: Record<string, unknown>,
  ): keyof typeof auditConfig.moduleConfig {
    if (Object.keys(moduleConfig).includes(moduleName)) {
      return moduleName;
    }
    return 'entries';
  }

  /**
   * The `run` function checks if a folder path exists, sets the schema based on the module name,
   * iterates over the schema and looks for references, and returns a list of missing references.
   * @returns the `missingRefs` object.
   */
  async run() {
    this.log(`Starting ${this.moduleName} audit process`, 'debug');
    this.log(`Data directory: ${this.folderPath}`, 'debug');
    this.log(`Fix mode: ${this.fix}`, 'debug');
    
    if (!existsSync(this.folderPath)) {
      this.log(`Skipping ${this.moduleName} audit - path does not exist`, 'debug');
      this.log(`Skipping ${this.moduleName} audit`, 'warn');
      this.log($t(auditMsg.NOT_VALID_PATH, { path: this.folderPath }), { color: 'yellow' });
      return {};
    }

    this.log(`Found ${this.ctSchema?.length || 0} content types to audit`, 'debug');
    this.log(`Found ${this.locales?.length || 0} locales to process`, 'debug');

    this.log('Preparing entry metadata', 'debug');
    await this.prepareEntryMetaData();
    this.log(`Entry metadata prepared: ${this.entryMetaData.length} entries found`, 'debug');

    this.log('Fixing prerequisite data', 'debug');
    await this.fixPrerequisiteData();
    this.log('Prerequisite data fix completed', 'debug');

    this.log(`Processing ${this.locales.length} locales and ${this.ctSchema.length} content types`, 'debug');
    for (const { code } of this.locales) {
      this.log(`Processing locale: ${code}`, 'debug');
      for (const ctSchema of this.ctSchema) {
        this.log(`Processing content type: ${ctSchema.title} (${ctSchema.uid}) in locale ${code}`, 'debug');
        const basePath = join(this.folderPath, ctSchema.uid, code);
        this.log(`Base path for entries: ${basePath}`, 'debug');
        
        const fsUtility = new FsUtility({ basePath, indexFileName: 'index.json', createDirIfNotExist: false });
        const indexer = fsUtility.indexFileContent;
        this.log(`Found ${Object.keys(indexer).length} entry files to process`, 'debug');

        for (const fileIndex in indexer) {
          this.log(`Processing entry file: ${indexer[fileIndex]}`, 'debug');
          const entries = (await fsUtility.readChunkFiles.next()) as Record<string, EntryStruct>;
          this.entries = entries;
          this.log(`Loaded ${Object.keys(entries).length} entries from file`, 'debug');

          for (const entryUid in this.entries) {
            const entry = this.entries[entryUid];
            const { uid, title } = entry;
            this.currentUid = uid;
            this.currentTitle = title;
            if (this.currentTitle) {
              this.currentTitle = this.removeEmojiAndImages(this.currentTitle);
            }

            this.log(`Processing entry: ${this.currentTitle} (${uid})`, 'debug');

            if (!this.missingRefs[this.currentUid]) {
              this.missingRefs[this.currentUid] = [];
            }

            if (!this.missingSelectFeild[this.currentUid]) {
              this.missingSelectFeild[this.currentUid] = [];
            }

            if (!this.missingMandatoryFields[this.currentUid]) {
              this.missingMandatoryFields[this.currentUid] = [];
            }
            if (this.fix) {
              this.log(`Removing missing keys from entry ${uid}`, 'debug');
              this.removeMissingKeysOnEntry(ctSchema.schema as ContentTypeSchemaType[], this.entries[entryUid]);
            }

            this.log(`Looking for references in entry ${uid}`, 'debug');
            this.lookForReference(
              [{ locale: code, uid, name: this.removeEmojiAndImages(this.currentTitle) }],
              ctSchema,
              this.entries[entryUid],
            );

            if (this.missingRefs[this.currentUid]?.length) {
              this.log(`Found ${this.missingRefs[this.currentUid].length} missing references for entry ${uid}`, 'debug');
              this.missingRefs[this.currentUid].forEach((entry: any) => {
                entry.ct = ctSchema.uid;
                entry.locale = code;
              });
            }

            if (this.missingSelectFeild[this.currentUid]?.length) {
              this.log(`Found ${this.missingSelectFeild[this.currentUid].length} missing select fields for entry ${uid}`, 'debug');
              this.missingSelectFeild[this.currentUid].forEach((entry: any) => {
                entry.ct = ctSchema.uid;
                entry.locale = code;
              });
            }

            if (this.missingMandatoryFields[this.currentUid]?.length) {
              this.log(`Found ${this.missingMandatoryFields[this.currentUid].length} missing mandatory fields for entry ${uid}`, 'debug');
              this.missingMandatoryFields[this.currentUid].forEach((entry: any) => {
                entry.ct = ctSchema.uid;
                entry.locale = code;
              });
            }

            const fields = this.missingMandatoryFields[uid];
            const isPublished = entry.publish_details?.length > 0;
            this.log(`Entry ${uid} published status: ${isPublished}, missing mandatory fields: ${fields?.length || 0}`, 'debug');
            
            if ((this.fix && fields.length && isPublished) || (!this.fix && fields)) {
              const fixStatus = this.fix ? 'Fixed' : '';
              fields?.forEach((field: { isPublished: boolean; fixStatus?: string }) => {
                field.isPublished = isPublished;
                if (this.fix && isPublished) {
                  field.fixStatus = fixStatus;
                }
              });

              if (this.fix && isPublished) {
                this.log(`Fixing mandatory field issue for entry ${uid}`, 'debug');
                this.log($t(auditFixMsg.ENTRY_MANDATORY_FIELD_FIX, { uid, locale: code }), 'error');
                entry.publish_details = [];
              }
            } else {
              delete this.missingMandatoryFields[uid];
            }

            const localKey = this.locales.map((locale: any) => locale.code);
            this.log(`Available locales: ${localKey.join(', ')}, environments: ${this.environments.join(', ')}`, 'debug');

            if (this.entries[entryUid]?.publish_details && !Array.isArray(this.entries[entryUid].publish_details)) {
              this.log(`Entry ${entryUid} has invalid publish_details format`, 'debug');
              this.log($t(auditMsg.ENTRY_PUBLISH_DETAILS_NOT_EXIST, { uid: entryUid }), { color: 'red' });
            }

            const originalPublishDetails = this.entries[entryUid]?.publish_details?.length || 0;
            this.entries[entryUid].publish_details = this.entries[entryUid]?.publish_details.filter((pd: any) => {
              this.log(`Checking publish detail: locale=${pd.locale}, environment=${pd.environment}`, 'debug');
              
              if (localKey?.includes(pd.locale) && this.environments?.includes(pd.environment)) {
                this.log(`Publish detail valid for entry ${entryUid}: locale=${pd.locale}, environment=${pd.environment}`, 'debug');
                return true;
              } else {
                this.log(`Publish detail invalid for entry ${entryUid}: locale=${pd.locale}, environment=${pd.environment}`, 'debug');
                this.log(
                  $t(auditMsg.ENTRY_PUBLISH_DETAILS, {
                    uid: entryUid,
                    ctuid: ctSchema.uid,
                    locale: code,
                    publocale: pd.locale,
                    environment: pd.environment,
                  }),
                  { color: 'red' },
                );
                if (!Object.keys(this.missingEnvLocale).includes(entryUid)) {
                  this.log(`Creating new missing environment/locale entry for ${entryUid}`, 'debug');
                  this.missingEnvLocale[entryUid] = [
                    {
                      entry_uid: entryUid,
                      publish_locale: pd.locale,
                      publish_environment: pd.environment,
                      ctUid: ctSchema.uid,
                      ctLocale: code,
                    },
                  ];
                } else {
                  this.log(`Adding to existing missing environment/locale entry for ${entryUid}`, 'debug');
                  this.missingEnvLocale[entryUid].push({
                    entry_uid: entryUid,
                    publish_locale: pd.locale,
                    publish_environment: pd.environment,
                    ctUid: ctSchema.uid,
                    ctLocale: code,
                  });
                }
                return false;
              }
            });

            const remainingPublishDetails = this.entries[entryUid].publish_details?.length || 0;
            this.log(`Entry ${entryUid} publish details: ${originalPublishDetails} -> ${remainingPublishDetails}`, 'debug');

            const message = $t(auditMsg.SCAN_ENTRY_SUCCESS_MSG, {
              title,
              local: code,
              module: this.config.moduleConfig.entries.name,
            });
            this.log(message, 'hidden');
            this.log(`info: ${message}`, 'info');
          }

          if (this.fix) {
            this.log(`Writing fix content for ${Object.keys(this.entries).length} entries`, 'debug');
            await this.writeFixContent(`${basePath}/${indexer[fileIndex]}`, this.entries);
          }
        }
      }
    }
    // this.log('', 'info'); // Adding empty line

    this.log('Cleaning up empty missing references', 'debug');
    this.removeEmptyVal();
    
    const result = {
      missingEntryRefs: this.missingRefs,
      missingSelectFeild: this.missingSelectFeild,
      missingMandatoryFields: this.missingMandatoryFields,
      missingTitleFields: this.missingTitleFields,
      missingEnvLocale: this.missingEnvLocale,
      missingMultipleFields: this.missingMultipleField,
    };
    
    this.log(`Entries audit completed. Found issues:`, 'debug');
    this.log(`- Missing references: ${Object.keys(this.missingRefs).length}`, 'debug');
    this.log(`- Missing select fields: ${Object.keys(this.missingSelectFeild).length}`, 'debug');
    this.log(`- Missing mandatory fields: ${Object.keys(this.missingMandatoryFields).length}`, 'debug');
    this.log(`- Missing title fields: ${Object.keys(this.missingTitleFields).length}`, 'debug');
    this.log(`- Missing environment/locale: ${Object.keys(this.missingEnvLocale).length}`, 'debug');
    this.log(`- Missing multiple fields: ${Object.keys(this.missingMultipleField).length}`, 'debug');
    
    return result;
  }

  /**
   * The function removes any properties from the `missingRefs` object that have an empty array value.
   */
  removeEmptyVal() {
    this.log('Removing empty missing reference arrays', 'debug');
    
    let removedRefs = 0;
    for (let propName in this.missingRefs) {
      if (!this.missingRefs[propName].length) {
        this.log(`Removing empty missing references for entry: ${propName}`, 'debug');
        delete this.missingRefs[propName];
        removedRefs++;
      }
    }
    
    let removedSelectFields = 0;
    for (let propName in this.missingSelectFeild) {
      if (!this.missingSelectFeild[propName].length) {
        this.log(`Removing empty missing select fields for entry: ${propName}`, 'debug');
        delete this.missingSelectFeild[propName];
        removedSelectFields++;
      }
    }
    
    let removedMandatoryFields = 0;
    for (let propName in this.missingMandatoryFields) {
      if (!this.missingMandatoryFields[propName].length) {
        this.log(`Removing empty missing mandatory fields for entry: ${propName}`, 'debug');
        delete this.missingMandatoryFields[propName];
        removedMandatoryFields++;
      }
    }
    
    this.log(`Cleanup completed: removed ${removedRefs} empty refs, ${removedSelectFields} empty select fields, ${removedMandatoryFields} empty mandatory fields`, 'debug');
  }

  /**
   * The function `fixPrerequisiteData` fixes the prerequisite data by updating the `ctSchema` and
   * `gfSchema` properties using the `ContentType` class.
   */
  async fixPrerequisiteData() {
    this.log('Starting prerequisite data fix process', 'debug');
    
    this.log('Fixing content type schema', 'debug');
    this.ctSchema = (await new ContentType({
      fix: true,
      log: () => {},
      config: this.config,
      moduleName: 'content-types',
      ctSchema: this.ctSchema,
      gfSchema: this.gfSchema,
    }).run(true)) as ContentTypeStruct[];
    this.log(`Content type schema fixed: ${this.ctSchema.length} schemas`, 'debug');
    
    this.log('Fixing global field schema', 'debug');
    this.gfSchema = (await new GlobalField({
      fix: true,
      log: () => {},
      config: this.config,
      moduleName: 'global-fields',
      ctSchema: this.ctSchema,
      gfSchema: this.gfSchema,
    }).run(true)) as ContentTypeStruct[];
    this.log(`Global field schema fixed: ${this.gfSchema.length} schemas`, 'debug');

    const extensionPath = resolve(this.config.basePath, 'extensions', 'extensions.json');
    const marketplacePath = resolve(this.config.basePath, 'marketplace_apps', 'marketplace_apps.json');
    
    this.log(`Loading extensions from: ${extensionPath}`, 'debug');
    if (existsSync(extensionPath)) {
      try {
        this.extensions = Object.keys(JSON.parse(readFileSync(extensionPath, 'utf8')));
        this.log(`Loaded ${this.extensions.length} extensions`, 'debug');
      } catch (error) {
        this.log(`Failed to load extensions: ${error}`, 'debug');
      }
    } else {
      this.log('No extensions.json found', 'debug');
    }

    this.log(`Loading marketplace apps from: ${marketplacePath}`, 'debug');
    if (existsSync(marketplacePath)) {
      try {
        const marketplaceApps: MarketplaceAppsInstallationData[] = JSON.parse(readFileSync(marketplacePath, 'utf8'));
        this.log(`Found ${marketplaceApps.length} marketplace apps`, 'debug');

        for (const app of marketplaceApps) {
          const metaData = map(map(app?.ui_location?.locations, 'meta').flat(), 'extension_uid').filter(
            (val) => val,
          ) as string[];
          this.extensions.push(...metaData);
          this.log(`Added ${metaData.length} extension UIDs from app: ${app.manifest?.name || app.uid}`, 'debug');
        }
      } catch (error) {
        this.log(`Failed to load marketplace apps: ${error}`, 'debug');
      }
    } else {
      this.log('No marketplace_apps.json found', 'debug');
    }
    
    this.log(`Total extensions loaded: ${this.extensions.length}`, 'debug');
    this.log('Prerequisite data fix process completed', 'debug');
  }

  /**
   * The function checks if it can write the fix content to a file and if so, it writes the content as
   * JSON to the specified file path.
   */
  async writeFixContent(filePath: string, schema: Record<string, EntryStruct>) {
    this.log(`Starting writeFixContent process for entries`, 'debug');
    this.log(`Target file path: ${filePath}`, 'debug');
    this.log(`Entries to write: ${Object.keys(schema).length}`, 'debug');

    if (this.fix) {
      this.log('Fix mode enabled, checking write permissions', 'debug');
      
      const skipConfirm = this.config.flags['copy-dir'] || this.config.flags['external-config']?.skipConfirm;
      
      if (skipConfirm) {
        this.log('Skipping confirmation due to copy-dir or external-config flags', 'debug');
      } else {
        this.log('Asking user for confirmation to write fix content', 'debug');
      }

      const canWrite = skipConfirm || this.config.flags.yes || (await cliux.confirm(commonMsg.FIX_CONFIRMATION));
      
      if (canWrite) {
        this.log(`Writing fixed entries to: ${filePath}`, 'debug');
        writeFileSync(filePath, JSON.stringify(schema));
        this.log(`Successfully wrote ${Object.keys(schema).length} entries to file`, 'debug');
      } else {
        this.log('User declined to write fix content', 'debug');
      }
    } else {
      this.log('Skipping writeFixContent - not in fix mode', 'debug');
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
    this.log(`Looking for references in field: ${(field as any).uid || (field as any).title || 'unknown'}`, 'debug');
    const schemaFields = field?.schema ?? [];
    this.log(`Processing ${schemaFields.length} fields in schema`, 'debug');

    if (this.fix) {
      this.log('Running fix on schema', 'debug');
      entry = this.runFixOnSchema(tree, field.schema as ContentTypeSchemaType[], entry);
    }

    for (const child of schemaFields) {
      const { uid, multiple, data_type, display_name } = child;
      this.log(`Processing field: ${display_name} (${uid}) - ${data_type}`, 'debug');

      if (multiple && entry[uid] && !Array.isArray(entry[uid])) {
        this.log(`Field ${display_name} should be array but is not`, 'debug');
        if (!this.missingMultipleField[this.currentUid]) {
          this.missingMultipleField[this.currentUid] = [];
        }

        this.missingMultipleField[this.currentUid].push({
          uid: this.currentUid,
          name: this.currentTitle,
          field_uid: uid,
          data_type,
          multiple,
          tree,
          treeStr: tree
            .map(({ name }) => name)
            .filter((val) => val)
            .join(' ➜ '),
        });
      }
      
      this.log(`Validating mandatory fields for: ${display_name}`, 'debug');
      this.missingMandatoryFields[this.currentUid].push(
        ...this.validateMandatoryFields(
          [...tree, { uid: field.uid, name: child.display_name, field: uid }],
          child,
          entry,
        ),
      );
      if (!entry?.[uid] && !child.hasOwnProperty('display_type')) {
        this.log(`Skipping field ${display_name} - no entry value and no display_type`, 'debug');
        continue;
      }

      this.log(`Validating field type: ${data_type} for ${display_name}`, 'debug');
      switch (child.data_type) {
        case 'reference':
          this.log(`Validating reference field: ${display_name}`, 'debug');
          const refResults = this.validateReferenceField(
            [...tree, { uid: child.uid, name: child.display_name, field: uid }],
            child as ReferenceFieldDataType,
            entry[uid] as EntryReferenceFieldDataType[],
          );
          this.missingRefs[this.currentUid].push(...refResults);
          this.log(`Found ${refResults.length} missing references in field: ${display_name}`, 'debug');
          break;
        case 'global_field':
          this.log(`Validating global field: ${display_name}`, 'debug');
          this.validateGlobalField(
            [...tree, { uid: child.uid, name: child.display_name, field: uid }],
            child as GlobalFieldDataType,
            entry[uid] as EntryGlobalFieldDataType,
          );
          break;
        case 'json':
          if ('extension' in child.field_metadata && child.field_metadata.extension) {
            this.log(`Validating extension field: ${display_name}`, 'debug');
            const extResults = this.validateExtensionAndAppField(
              [...tree, { uid: child.uid, name: child.display_name, field: uid }],
              child as ExtensionOrAppFieldDataType,
              entry as EntryExtensionOrAppFieldDataType,
            );
            this.missingRefs[this.currentUid].push(...extResults);
            this.log(`Found ${extResults.length} missing extension references in field: ${display_name}`, 'debug');
          } else if ('allow_json_rte' in child.field_metadata && child.field_metadata.allow_json_rte) {
            // NOTE JSON RTE field type
            this.log(`Validating JSON RTE field: ${display_name}`, 'debug');
            this.validateJsonRTEFields(
              [...tree, { uid: child.uid, name: child.display_name, field: uid }],
              child as JsonRTEFieldDataType,
              entry[uid] as EntryJsonRTEFieldDataType,
            );
          }
          break;
        case 'blocks':
          this.log(`Validating modular blocks field: ${display_name}`, 'debug');
          this.validateModularBlocksField(
            [...tree, { uid: child.uid, name: child.display_name, field: uid }],
            child as ModularBlocksDataType,
            entry[uid] as EntryModularBlocksDataType[],
          );
          break;
        case 'group':
          this.log(`Validating group field: ${display_name}`, 'debug');
          this.validateGroupField(
            [...tree, { uid: field.uid, name: child.display_name, field: uid }],
            child as GroupFieldDataType,
            entry[uid] as EntryGroupFieldDataType[],
          );
          break;
        case 'text':
        case 'number':
          if (child.hasOwnProperty('display_type')) {
            this.log(`Validating select field: ${display_name}`, 'debug');
            const selectResults = this.validateSelectField(
              [...tree, { uid: field.uid, name: child.display_name, field: uid }],
              child as SelectFeildStruct,
              entry[uid],
            );
            this.missingSelectFeild[this.currentUid].push(...selectResults);
            this.log(`Found ${selectResults.length} missing select field values in field: ${display_name}`, 'debug');
          }
          break;
      }
    }
    this.log(`Field reference validation completed: ${(field as any).uid || (field as any).title || 'unknown'}`, 'debug');
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
    this.log(`Validating reference field: ${fieldStructure.display_name}`, 'debug');
    
    if (typeof field === 'string') {
      this.log(`Converting string reference to JSON: ${field}`, 'debug');
      let stringReference = field as string;
      stringReference = stringReference.replace(/'/g, '"');
      field = JSON.parse(stringReference);
    }
    
    const result = this.validateReferenceValues(tree, fieldStructure, field);
    this.log(`Reference field validation completed: ${result?.length || 0} missing references found`, 'debug');
    return result;
  }

  /**
   * The function `validateExtensionAndAppField` checks if a given field has a valid extension
   * reference and returns any missing references.
   * @param {Record<string, unknown>[]} tree - An array of objects representing a tree structure.
   * @param {ExtensionOrAppFieldDataType} fieldStructure - The `fieldStructure` parameter is of type
   * `ExtensionOrAppFieldDataType` and represents the structure of a field in an extension or app. It
   * contains properties such as `uid`, `display_name`, and `data_type`.
   * @param {EntryExtensionOrAppFieldDataType} field - The `field` parameter is of type
   * `EntryExtensionOrAppFieldDataType`, which is an object containing information about a specific
   * field in an entry. It has the following properties:
   * @returns an array containing an object if there are missing references. If there are no missing
   * references, an empty array is returned.
   */
  validateExtensionAndAppField(
    tree: Record<string, unknown>[],
    fieldStructure: ExtensionOrAppFieldDataType,
    field: EntryExtensionOrAppFieldDataType,
  ) {
    this.log(`Validating extension/app field: ${fieldStructure.display_name}`, 'debug');
    
    if (this.fix) {
      this.log('Fix mode enabled, skipping extension/app validation', 'debug');
      return [];
    }

    const missingRefs = [];
    let { uid, display_name, data_type } = fieldStructure || {};
    this.log(`Checking extension/app field: ${uid}`, 'debug');

    if (field[uid]) {
      let { metadata: { extension_uid } = { extension_uid: '' } } = field[uid] || {};
      this.log(`Found extension UID: ${extension_uid}`, 'debug');

      if (extension_uid && !this.extensions.includes(extension_uid)) {
        this.log(`Missing extension: ${extension_uid}`, 'debug');
        missingRefs.push({ uid, extension_uid, type: 'Extension or Apps' } as any);
      } else {
        this.log(`Extension ${extension_uid} is valid`, 'debug');
      }
    } else {
      this.log(`No extension/app data found for field: ${uid}`, 'debug');
    }

    const result = missingRefs.length
      ? [
          {
            tree,
            data_type,
            missingRefs,
            display_name,
            ct_uid: this.currentUid,
            name: this.currentTitle,
            treeStr: tree
              .map(({ name }) => name)
              .filter((val) => val)
              .join(' ➜ '),
          },
        ]
      : [];
    
    this.log(`Extension/app field validation completed: ${result.length} missing references found`, 'debug');
    return result;
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
    this.log(`Validating global field: ${fieldStructure.display_name}`, 'debug');
    this.log(`Global field UID: ${fieldStructure.uid}`, 'debug');
    
    // NOTE Any GlobalField related logic can be added here
    this.lookForReference(tree, fieldStructure, field);
    
    this.log(`Global field validation completed for: ${fieldStructure.display_name}`, 'debug');
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
    this.log(`Validating JSON RTE field: ${fieldStructure.display_name}`, 'debug');
    this.log(`JSON RTE field UID: ${fieldStructure.uid}`, 'debug');
    this.log(`Found ${field?.children?.length || 0} children in JSON RTE field`, 'debug');
    
    // NOTE Other possible reference logic will be added related to JSON RTE (Ex missing assets, extensions etc.,)
    for (const index in field?.children ?? []) {
      const child = field.children[index];
      const { children } = child;
      this.log(`Processing JSON RTE child ${index}`, 'debug');

      if (!this.fix) {
        this.log(`Checking JSON RTE references for child ${index}`, 'debug');
        this.jsonRefCheck(tree, fieldStructure, child);
      }

      if (!isEmpty(children)) {
        this.log(`Recursively validating JSON RTE children for child ${index}`, 'debug');
        this.validateJsonRTEFields(tree, fieldStructure, field.children[index]);
      }
    }
    
    this.log(`JSON RTE field validation completed for: ${fieldStructure.display_name}`, 'debug');
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
    this.log(`Validating modular blocks field: ${fieldStructure.display_name}`, 'debug');
    this.log(`Modular blocks field UID: ${fieldStructure.uid}`, 'debug');
    this.log(`Found ${field.length} modular blocks`, 'debug');
    this.log(`Available blocks: ${fieldStructure.blocks.map(b => b.title).join(', ')}`, 'debug');
    
    if (!this.fix) {
      this.log('Checking modular block references (non-fix mode)', 'debug');
      for (const index in field) {
        this.log(`Checking references for modular block ${index}`, 'debug');
        this.modularBlockRefCheck(tree, fieldStructure.blocks, field[index], +index);
      }
    }

    for (const block of fieldStructure.blocks) {
      const { uid, title } = block;
      this.log(`Processing block: ${title} (${uid})`, 'debug');

      for (const eBlock of field) {
        if (eBlock[uid]) {
          this.log(`Found entry block data for: ${title}`, 'debug');
          this.lookForReference([...tree, { uid, name: title }], block, eBlock[uid] as EntryModularBlocksDataType);
        }
      }
    }
    
    this.log(`Modular blocks field validation completed for: ${fieldStructure.display_name}`, 'debug');
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
    this.log(`Validating group field: ${fieldStructure.display_name}`, 'debug');
    this.log(`Group field UID: ${fieldStructure.uid}`, 'debug');
    this.log(`Group field type: ${Array.isArray(field) ? 'array' : 'single'}`, 'debug');
    
    // NOTE Any Group Field related logic can be added here (Ex data serialization or picking any metadata for report etc.,)
    if (Array.isArray(field)) {
      this.log(`Processing ${field.length} group field entries`, 'debug');
      field.forEach((eGroup, index) => {
        this.log(`Processing group field entry ${index}`, 'debug');
        this.lookForReference(
          [...tree, { uid: fieldStructure.uid, display_name: fieldStructure.display_name }],
          fieldStructure,
          eGroup,
        );
      });
    } else {
      this.log('Processing single group field entry', 'debug');
      this.lookForReference(tree, fieldStructure, field);
    }
    
    this.log(`Group field validation completed for: ${fieldStructure.display_name}`, 'debug');
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
    this.log(`Validating reference values for field: ${fieldStructure.display_name}`, 'debug');
    
    if (this.fix) {
      this.log('Fix mode enabled, skipping reference validation', 'debug');
      return [];
    }

    const missingRefs: Record<string, any>[] = [];
    const { uid: data_type, display_name, reference_to } = fieldStructure;
    this.log(`Reference field UID: ${data_type}`, 'debug');
    this.log(`Reference to: ${reference_to?.join(', ') || 'none'}`, 'debug');
    this.log(`Found ${field?.length || 0} references to validate`, 'debug');

    for (const index in field ?? []) {
      const reference: any = field[index];
      const { uid } = reference;
      this.log(`Processing reference ${index}: ${uid || reference}`, 'debug');
      
      if (!uid && reference.startsWith('blt')) {
        this.log(`Checking blt reference: ${reference}`, 'debug');
        const refExist = find(this.entryMetaData, { uid: reference });
        if (!refExist) {
          this.log(`Missing blt reference: ${reference}`, 'debug');
          if (Array.isArray(reference_to) && reference_to.length === 1) {
            missingRefs.push({ uid: reference, _content_type_uid: reference_to[0] });
          } else {
            missingRefs.push(reference);
          }
        } else {
          this.log(`Blt reference ${reference} is valid`, 'debug');
        }
      }
      // NOTE Can skip specific references keys (Ex, system defined keys can be skipped)
      // if (this.config.skipRefs.includes(reference)) continue;
      else {
        this.log(`Checking standard reference: ${uid}`, 'debug');
        const refExist = find(this.entryMetaData, { uid });

        if (!refExist) {
          this.log(`Missing reference: ${uid}`, 'debug');
          missingRefs.push(reference);
        } else {
          this.log(`Reference ${uid} is valid`, 'debug');
        }
      }
    }

    const result = missingRefs.length
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
    
    this.log(`Reference values validation completed: ${result.length} missing references found`, 'debug');
    return result;
  }

  removeMissingKeysOnEntry(schema: ContentTypeSchemaType[], entry: EntryFieldType) {
    this.log(`Removing missing keys from entry: ${this.currentUid}`, 'debug');
    
    // NOTE remove invalid entry keys
    const ctFields = map(schema, 'uid');
    const entryFields = Object.keys(entry ?? {});
    this.log(`Content type fields: ${ctFields.length}, Entry fields: ${entryFields.length}`, 'debug');
    this.log(`System keys: ${this.config.entries.systemKeys.join(', ')}`, 'debug');

    entryFields.forEach((eKey) => {
      // NOTE Key should not be system key and not exist in schema means it's invalid entry key
      if (!this.config.entries.systemKeys.includes(eKey) && !ctFields.includes(eKey)) {
        this.log(`Removing invalid field: ${eKey}`, 'debug');
        delete entry[eKey];
      }
    });
    
    this.log(`Missing keys removal completed for entry: ${this.currentUid}`, 'debug');
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
    this.log(`Running fix on schema for entry: ${this.currentUid}`, 'debug');
    this.log(`Schema fields: ${schema.length}, Entry fields: ${Object.keys(entry).length}`, 'debug');
    
    // NOTE Global field Fix
    schema.forEach((field) => {
      const { uid, data_type, multiple } = field;
      this.log(`Processing field: ${uid} (${data_type})`, 'debug');

      if (!Object(entry).hasOwnProperty(uid)) {
        this.log(`Field ${uid} not found in entry, skipping`, 'debug');
        return;
      }

      if (multiple && entry[uid] && !Array.isArray(entry[uid])) {
        this.log(`Fixing multiple field: ${uid} - converting to array`, 'debug');
        this.missingMultipleField[this.currentUid] ??= [];

        this.missingMultipleField[this.currentUid].push({
          uid: this.currentUid,
          name: this.currentTitle,
          field_uid: uid,
          data_type,
          multiple,
          tree,
          treeStr: tree
            .map(({ name }) => name)
            .filter(Boolean)
            .join(' ➜ '),
          fixStatus: 'Fixed',
        });

        entry[uid] = [entry[uid]];
      }

      switch (data_type) {
        case 'global_field':
          this.log(`Fixing global field: ${uid}`, 'debug');
          entry[uid] = this.fixGlobalFieldReferences(
            [...tree, { uid: field.uid, name: field.display_name, data_type: field.data_type }],
            field as GlobalFieldDataType,
            entry[uid] as EntryGlobalFieldDataType,
          ) as EntryGlobalFieldDataType;
          break;
        case 'json':
        case 'reference':
          this.log(`Fixing ${data_type} field: ${uid}`, 'debug');
          if (data_type === 'json') {
            if ('extension' in field.field_metadata && field.field_metadata.extension) {
              // NOTE Custom field type
              this.log(`Fixing extension/app field: ${uid}`, 'debug');
              this.fixMissingExtensionOrApp(
                [...tree, { uid: field.uid, name: field.display_name, data_type: field.data_type }],
                field as ExtensionOrAppFieldDataType,
                entry as EntryExtensionOrAppFieldDataType,
              );
              break;
            } else if ('allow_json_rte' in field.field_metadata && field.field_metadata.allow_json_rte) {
              this.log(`Fixing JSON RTE field: ${uid}`, 'debug');
              this.fixJsonRteMissingReferences(
                [...tree, { uid: field.uid, name: field.display_name, data_type: field.data_type }],
                field as JsonRTEFieldDataType,
                entry[uid] as EntryJsonRTEFieldDataType,
              );
              break;
            }
          }
          // NOTE Reference field
          this.log(`Fixing reference field: ${uid}`, 'debug');
          entry[uid] = this.fixMissingReferences(
            [...tree, { uid: field.uid, name: field.display_name, data_type: field.data_type }],
            field as ReferenceFieldDataType,
            entry[uid] as EntryReferenceFieldDataType[],
          );
          if (!entry[uid]) {
            this.log(`Deleting empty reference field: ${uid}`, 'debug');
            delete entry[uid];
          }
          break;
        case 'blocks':
          this.log(`Fixing modular blocks field: ${uid}`, 'debug');
          entry[uid] = this.fixModularBlocksReferences(
            [...tree, { uid: field.uid, name: field.display_name, data_type: field.data_type }],
            (field as ModularBlocksDataType).blocks,
            entry[uid] as EntryModularBlocksDataType[],
          );
          break;
        case 'group':
          this.log(`Fixing group field: ${uid}`, 'debug');
          entry[uid] = this.fixGroupField(
            [...tree, { uid: field.uid, name: field.display_name, data_type: field.data_type }],
            field as GroupFieldDataType,
            entry[uid] as EntryGroupFieldDataType[],
          ) as EntryGroupFieldDataType;
          break;
        case 'text':
        case 'number':
          if (field.hasOwnProperty('display_type')) {
            this.log(`Fixing select field: ${uid}`, 'debug');
            entry[uid] = this.fixSelectField(
              [...tree, { uid: field.uid, name: field.display_name, data_type: field.data_type }],
              field as SelectFeildStruct,
              entry[uid] as EntrySelectFeildDataType,
            ) as EntrySelectFeildDataType;
          }
          break;
      }
    });

    this.log(`Schema fix completed for entry: ${this.currentUid}`, 'debug');
    return entry;
  }

  /**
   * We check for the select field with condition in order of multiple -> Array
   * We find the missing values i.e. the values present in entry but not in the options of the content-type
   * @param tree : Contains all the tree where the select field is located used for getting the path to it
   * @param fieldStructure it contains the Content-type structure of the field
   * @param field It contains the value that is present in the entry it can be array or value of number | string
   * @returns if there is missing field returns field and path
   * Else empty array
   */
  removeEmojiAndImages(str: string) {
    return str?.replace(
      /[\p{Emoji}\p{Emoji_Presentation}\p{Emoji_Modifier}\p{Emoji_Modifier_Base}\p{Emoji_Component}]+/gu,
      '',
    );
  }

  validateSelectField(tree: Record<string, unknown>[], fieldStructure: SelectFeildStruct, field: any) {
    this.log(`Validating select field: ${fieldStructure.display_name}`, 'debug');
    this.log(`Select field UID: ${fieldStructure.uid}`, 'debug');
    this.log(`Field value: ${JSON.stringify(field)}`, 'debug');
    this.log(`Multiple: ${fieldStructure.multiple}, Display type: ${fieldStructure.display_type}`, 'debug');
    
    const { display_name, enum: selectOptions, multiple, min_instance, display_type, data_type } = fieldStructure;
    if (
      field === null ||
      field === '' ||
      (Array.isArray(field) && field.length === 0) ||
      (!field && data_type !== 'number')
    ) {
      this.log(`Select field is empty or null: ${display_name}`, 'debug');
      let missingCTSelectFieldValues = 'Not Selected';
      return [
        {
          uid: this.currentUid,
          name: this.currentTitle,
          display_name,
          display_type,
          missingCTSelectFieldValues,
          min_instance: min_instance ?? 'NA',
          tree,
          treeStr: tree
            .map(({ name }) => name)
            .filter((val) => val)
            .join(' ➜ '),
        },
      ];
    }
    let missingCTSelectFieldValues;

    if (multiple) {
      this.log(`Validating multiple select field: ${display_name}`, 'debug');
      if (Array.isArray(field)) {
        this.log(`Field is array with ${field.length} values`, 'debug');
        let obj = this.findNotPresentSelectField(field, selectOptions);
        let { notPresent } = obj;
        if (notPresent.length) {
          this.log(`Found ${notPresent.length} missing select values: ${notPresent.join(', ')}`, 'debug');
          missingCTSelectFieldValues = notPresent;
        } else {
          this.log(`All select values are valid`, 'debug');
        }
      }
    } else {
      this.log(`Validating single select field: ${display_name}`, 'debug');
      if (!selectOptions.choices.some((choice) => choice.value === field)) {
        this.log(`Invalid select value: ${field}`, 'debug');
        missingCTSelectFieldValues = field;
      } else {
        this.log(`Select value is valid: ${field}`, 'debug');
      }
    }
    if (display_type && missingCTSelectFieldValues) {
      this.log(`Select field validation found issues: ${JSON.stringify(missingCTSelectFieldValues)}`, 'debug');
      return [
        {
          uid: this.currentUid,
          name: this.currentTitle,
          display_name,
          display_type,
          missingCTSelectFieldValues,
          min_instance: min_instance ?? 'NA',
          tree,
          treeStr: tree
            .map(({ name }) => name)
            .filter((val) => val)
            .join(' ➜ '),
        },
      ];
    } else {
      this.log(`Select field validation completed successfully: ${display_name}`, 'debug');
      return [];
    }
  }

  /**
   * This functions check which of the select values used in entry is/are not present in the Content-type
   * Then removes those values from entry
   * If the entry is empty then adds the first value of the options
   * If the entry has multiple choices and min_instances then adds that number of instances
   * @param {Record<string, unknown>}tree Contains the path where the select field can be found
   * @param field : It contains the content-type structure of the select field
   * @param entry : it contains the value in the entry of select field one of the options of the CT.
   * @returns
   */
  fixSelectField(tree: Record<string, unknown>[], field: SelectFeildStruct, entry: any) {
    this.log(`Fixing select field: ${field.display_name}`, 'debug');
    this.log(`Select field UID: ${field.uid}`, 'debug');
    this.log(`Current entry value: ${JSON.stringify(entry)}`, 'debug');
    
    if (!this.config.fixSelectField) {
      this.log('Select field fixing is disabled in config', 'debug');
      return entry;
    }
    const { enum: selectOptions, multiple, min_instance, display_type, display_name, uid } = field;
    this.log(`Select options: ${selectOptions.choices.length} choices, Multiple: ${multiple}, Min instance: ${min_instance}`, 'debug');

    let missingCTSelectFieldValues;
    let isMissingValuePresent = false;
    let selectedValue: unknown = '';
    if (multiple) {
      this.log('Processing multiple select field', 'debug');
      let obj = this.findNotPresentSelectField(entry, selectOptions);
      let { notPresent, filteredFeild } = obj;
      this.log(`Found ${notPresent.length} invalid values, filtered to ${filteredFeild.length} values`, 'debug');
      entry = filteredFeild;
      missingCTSelectFieldValues = notPresent;
      if (missingCTSelectFieldValues.length) {
        isMissingValuePresent = true;
        this.log(`Missing values found: ${missingCTSelectFieldValues.join(', ')}`, 'debug');
      }
      if (min_instance && Array.isArray(entry)) {
        const missingInstances = min_instance - entry.length;
        this.log(`Checking min instance requirement: ${min_instance}, current: ${entry.length}, missing: ${missingInstances}`, 'debug');
        if (missingInstances > 0) {
          isMissingValuePresent = true;
          const newValues = selectOptions.choices
            .filter((choice) => !entry.includes(choice.value))
            .slice(0, missingInstances)
            .map((choice) => choice.value);
          this.log(`Adding ${newValues.length} values to meet min instance requirement: ${newValues.join(', ')}`, 'debug');
          entry.push(...newValues);
          selectedValue = newValues;
          this.log($t(auditFixMsg.ENTRY_SELECT_FIELD_FIX, { value: newValues.join(' '), uid }), 'error');
        }
      } else {
        if (entry.length === 0) {
          isMissingValuePresent = true;
          const defaultValue = selectOptions.choices.length > 0 ? selectOptions.choices[0].value : null;
          this.log(`Empty multiple select field, adding default value: ${defaultValue}`, 'debug');
          entry.push(defaultValue);
          selectedValue = defaultValue;
          this.log($t(auditFixMsg.ENTRY_SELECT_FIELD_FIX, { value: defaultValue as string, uid }), 'error');
        }
      }
    } else {
      this.log('Processing single select field', 'debug');
      const isPresent = selectOptions.choices.some((choice) => choice.value === entry);
      if (!isPresent) {
        this.log(`Invalid single select value: ${entry}`, 'debug');
        missingCTSelectFieldValues = entry;
        isMissingValuePresent = true;
        let defaultValue = selectOptions.choices.length > 0 ? selectOptions.choices[0].value : null;
        this.log(`Replacing with default value: ${defaultValue}`, 'debug');
        entry = defaultValue;
        selectedValue = defaultValue;
        this.log($t(auditFixMsg.ENTRY_SELECT_FIELD_FIX, { value: defaultValue as string, uid }), 'error');
      } else {
        this.log(`Single select value is valid: ${entry}`, 'debug');
      }
    }
    if (display_type && isMissingValuePresent) {
      this.log(`Recording select field fix for entry: ${this.currentUid}`, 'debug');
      this.missingSelectFeild[this.currentUid].push({
        uid: this.currentUid,
        name: this.currentTitle,
        display_name,
        display_type,
        missingCTSelectFieldValues,
        selectedValue,
        min_instance: min_instance ?? 'NA',
        tree,
        treeStr: tree
          .map(({ name }) => name)
          .filter((val) => val)
          .join(' ➜ '),
        fixStatus: 'Fixed',
      });
    }
    this.log(`Select field fix completed for: ${field.display_name}`, 'debug');
    return entry;
  }

  validateMandatoryFields(tree: Record<string, unknown>[], fieldStructure: any, entry: any) {
    this.log(`Validating mandatory field: ${fieldStructure.display_name}`, 'debug');
    this.log(`Field UID: ${fieldStructure.uid}, Mandatory: ${fieldStructure.mandatory}`, 'debug');
    
    const { display_name, multiple, data_type, mandatory, field_metadata, uid } = fieldStructure;

    const isJsonRteEmpty = () => {
      const jsonNode = multiple
        ? entry[uid]?.[0]?.children?.[0]?.children?.[0]?.text
        : entry[uid]?.children?.[0]?.children?.[0]?.text;
      this.log(`JSON RTE empty check: ${jsonNode === ''}`, 'debug');
      return jsonNode === '';
    };

    const isEntryEmpty = () => {
      let fieldValue = multiple ? entry[uid]?.length : entry;
      if (data_type === 'number' && !multiple) {
        fieldValue = entry[uid] || entry[uid] === 0 ? true : false;
      }
      if (data_type === 'text' && !multiple) {
        fieldValue = entry[uid] || entry[uid] === 0 ? true : false;
      }
      if (Array.isArray(entry[uid]) && data_type === 'reference') {
        fieldValue = entry[uid]?.length ? true : false;
      }
      this.log(`Entry empty check: ${fieldValue === '' || !fieldValue}`, 'debug');
      return fieldValue === '' || !fieldValue;
    };

    if (mandatory) {
      this.log(`Field is mandatory, checking if empty`, 'debug');
      if ((data_type === 'json' && field_metadata.allow_json_rte && isJsonRteEmpty()) || isEntryEmpty()) {
        this.log(`Mandatory field is empty: ${display_name}`, 'debug');
        return [
          {
            uid: this.currentUid,
            name: this.currentTitle,
            display_name,
            missingFieldUid: uid,
            tree,
            treeStr: tree
              .filter(({ name }) => name)
              .map(({ name }) => name)
              .join(' ➜ '),
          },
        ];
      } else {
        this.log(`Mandatory field has value: ${display_name}`, 'debug');
      }
    } else {
      this.log(`Field is not mandatory: ${display_name}`, 'debug');
    }

    this.log(`Mandatory field validation completed: ${display_name}`, 'debug');
    return [];
  }

  /**
   * this is called in case the select field has multiple optins to chose from
   * @param field It contains the value to be searched
   * @param selectOptions It contains the options that were added in CT
   * @returns An Array of entry containing only the values that were present in CT, An array of not present entries
   */
  findNotPresentSelectField(field: any, selectOptions: any) {
    this.log(`Finding not present select field values`, 'debug');
    this.log(`Field values: ${JSON.stringify(field)}`, 'debug');
    this.log(`Available choices: ${selectOptions.choices.length}`, 'debug');
    
    if (!field) {
      this.log('Field is null/undefined, initializing as empty array', 'debug');
      field = [];
    }
    let present = [];
    let notPresent = [];
    const choicesMap = new Map(selectOptions.choices.map((choice: { value: any }) => [choice.value, choice]));
    this.log(`Created choices map with ${choicesMap.size} entries`, 'debug');
    
    for (const value of field) {
      const choice: any = choicesMap.get(value);
      this.log(`Checking value: ${value}`, 'debug');

      if (choice) {
        this.log(`Value ${value} is present in choices`, 'debug');
        present.push(choice.value);
      } else {
        this.log(`Value ${value} is not present in choices`, 'debug');
        notPresent.push(value);
      }
    }
    
    this.log(`Result: ${present.length} present, ${notPresent.length} not present`, 'debug');
    return { filteredFeild: present, notPresent };
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
    this.log(`Fixing global field references: ${field.display_name}`, 'debug');
    this.log(`Global field UID: ${field.uid}`, 'debug');
    this.log(`Schema fields: ${field.schema?.length || 0}`, 'debug');
    
    const result = this.runFixOnSchema([...tree, { uid: field.uid, display_name: field.display_name }], field.schema, entry);
    
    this.log(`Global field references fix completed: ${field.display_name}`, 'debug');
    return result;
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
    this.log(`Fixing modular blocks references`, 'debug');
    this.log(`Available blocks: ${blocks.length}, Entry blocks: ${entry?.length || 0}`, 'debug');
    
    entry = entry
      ?.map((block, index) => {
        this.log(`Checking modular block ${index}`, 'debug');
        return this.modularBlockRefCheck(tree, blocks, block, index);
      })
      .filter((val) => {
        const isEmpty = !val || Object.keys(val).length === 0;
        this.log(`Block ${val ? 'kept' : 'filtered out'} (empty: ${isEmpty})`, 'debug');
        return !isEmpty;
      });

    blocks.forEach((block) => {
      this.log(`Processing block: ${block.title} (${block.uid})`, 'debug');
      entry = entry
        ?.map((eBlock) => {
          if (!isEmpty(block.schema)) {
            if (eBlock[block.uid]) {
              this.log(`Fixing schema for block: ${block.title}`, 'debug');
              eBlock[block.uid] = this.runFixOnSchema(
                [...tree, { uid: block.uid, display_name: block.title }],
                block.schema as ContentTypeSchemaType[],
                eBlock[block.uid] as EntryFieldType,
              ) as EntryModularBlockType;
            }
          }

          return eBlock;
        })
        .filter((val) => {
          const isEmpty = !val || Object.keys(val).length === 0;
          this.log(`Entry block ${val ? 'kept' : 'filtered out'} (empty: ${isEmpty})`, 'debug');
          return !isEmpty;
        });
    });

    this.log(`Modular blocks references fix completed: ${entry?.length || 0} blocks remaining`, 'debug');
    return entry;
  }

  /**
   * The function `fixMissingExtensionOrApp` checks if a field in an entry has a valid extension or app
   * reference, and fixes it if necessary.
   * @param {Record<string, unknown>[]} tree - An array of objects representing a tree structure.
   * @param {ExtensionOrAppFieldDataType} field - The `field` parameter is of type
   * `ExtensionOrAppFieldDataType`, which is an object with properties `uid`, `display_name`, and
   * `data_type`.
   * @param {EntryExtensionOrAppFieldDataType} entry - The `entry` parameter is of type
   * `EntryExtensionOrAppFieldDataType`, which is an object containing the data for a specific entry.
   * It may have a property with the key specified by the `uid` variable, which represents the field
   * that contains the extension or app data.
   * @returns the `field` parameter.
   */
  fixMissingExtensionOrApp(
    tree: Record<string, unknown>[],
    field: ExtensionOrAppFieldDataType,
    entry: EntryExtensionOrAppFieldDataType,
  ) {
    this.log(`Fixing missing extension/app: ${field.display_name}`, 'debug');
    this.log(`Extension/app field UID: ${field.uid}`, 'debug');
    
    const missingRefs = [];

    let { uid, display_name, data_type } = field || {};

    if (entry[uid]) {
      let { metadata: { extension_uid } = { extension_uid: '' } } = entry[uid] || {};
      this.log(`Found extension UID: ${extension_uid}`, 'debug');

      if (extension_uid && !this.extensions.includes(extension_uid)) {
        this.log(`Missing extension: ${extension_uid}`, 'debug');
        missingRefs.push({ uid, extension_uid, type: 'Extension or Apps' } as any);
      } else {
        this.log(`Extension ${extension_uid} is valid`, 'debug');
      }
    } else {
      this.log(`No extension/app data found for field: ${uid}`, 'debug');
    }

    if (this.fix && !isEmpty(missingRefs)) {
      this.log(`Recording extension/app fix for entry: ${this.currentUid}`, 'debug');
      this.missingRefs[this.currentUid].push({
        tree,
        data_type,
        missingRefs,
        display_name,
        fixStatus: 'Fixed',
        ct_uid: this.currentUid,
        name: this.currentTitle,
        treeStr: tree.map(({ name }) => name).join(' ➜ '),
      });

      this.log(`Deleting invalid extension/app field: ${uid}`, 'debug');
      delete entry[uid];
    }

    this.log(`Extension/app fix completed for: ${field.display_name}`, 'debug');
    return field;
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
    this.log(`Fixing group field: ${field.display_name}`, 'debug');
    this.log(`Group field UID: ${field.uid}`, 'debug');
    this.log(`Schema fields: ${field.schema?.length || 0}`, 'debug');
    this.log(`Entry type: ${Array.isArray(entry) ? 'array' : 'single'}`, 'debug');
    
    if (!isEmpty(field.schema)) {
      this.log(`Group field has schema, applying fixes`, 'debug');
      if (Array.isArray(entry)) {
        this.log(`Processing ${entry.length} group field entries`, 'debug');
        entry = entry.map((eGroup, index) => {
          this.log(`Fixing group field entry ${index}`, 'debug');
          return this.runFixOnSchema(
            [...tree, { uid: field.uid, display_name: field.display_name }],
            field.schema as ContentTypeSchemaType[],
            eGroup,
          );
        }) as EntryGroupFieldDataType[];
      } else {
        this.log(`Processing single group field entry`, 'debug');
        entry = this.runFixOnSchema(
          [...tree, { uid: field.uid, display_name: field.display_name }],
          field.schema as ContentTypeSchemaType[],
          entry,
        ) as EntryGroupFieldDataType;
      }
    } else {
      this.log(`Group field has no schema, skipping fixes`, 'debug');
    }

    this.log(`Group field fix completed for: ${field.display_name}`, 'debug');
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
    this.log(`Fixing JSON RTE missing references`, 'debug');
    this.log(`Field UID: ${field.uid}`, 'debug');
    this.log(`Entry type: ${Array.isArray(entry) ? 'array' : 'single'}`, 'debug');
    
    if (Array.isArray(entry)) {
      this.log(`Processing ${entry.length} JSON RTE entries`, 'debug');
      entry = entry.map((child: any, index) => {
        this.log(`Fixing JSON RTE entry ${index}: ${child?.type || 'unknown type'}`, 'debug');
        return this.fixJsonRteMissingReferences([...tree, { index, type: child?.type, uid: child?.uid }], field, child);
      }) as EntryJsonRTEFieldDataType[];
    } else {
      if (entry?.children) {
        this.log(`Processing ${entry.children.length} JSON RTE children`, 'debug');
        entry.children = entry.children
          .map((child, index) => {
            this.log(`Checking JSON RTE child ${index}: ${(child as any).type || 'unknown type'}`, 'debug');
            const refExist = this.jsonRefCheck(tree, field, child);

            if (!refExist) {
              this.log(`JSON RTE child ${index} has invalid reference, removing`, 'debug');
              return null;
            }

            if (!isEmpty(child.children)) {
              this.log(`JSON RTE child ${index} has children, recursively fixing`, 'debug');
              child = this.fixJsonRteMissingReferences(tree, field, child) as EntryJsonRTEFieldDataType;
            }

            this.log(`JSON RTE child ${index} reference is valid`, 'debug');
            return child;
          })
          .filter((val) => {
            const isValid = val !== null;
            this.log(`JSON RTE child ${val ? 'kept' : 'filtered out'}`, 'debug');
            return isValid;
          }) as EntryJsonRTEFieldDataType[];
      } else {
        this.log(`JSON RTE entry has no children`, 'debug');
      }
    }

    this.log(`JSON RTE missing references fix completed`, 'debug');
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
    this.log(`Fixing missing references`, 'debug');
    this.log(`Field UID: ${field.uid}`, 'debug');
    this.log(`Reference to: ${(field as any).reference_to?.join(', ') || 'none'}`, 'debug');
    this.log(`Entry type: ${typeof entry}, length: ${Array.isArray(entry) ? entry.length : 'N/A'}`, 'debug');
    
    const missingRefs: Record<string, any>[] = [];
    if (typeof entry === 'string') {
      this.log(`Entry is string, parsing JSON`, 'debug');
      let stringReference = entry as string;
      stringReference = stringReference.replace(/'/g, '"');
      entry = JSON.parse(stringReference);
      this.log(`Parsed entry: ${Array.isArray(entry) ? entry.length : 'N/A'} references`, 'debug');
    }
    entry = entry
      ?.map((reference: any, index) => {
        const { uid } = reference;
        const { reference_to } = field;
        this.log(`Processing reference ${index}: ${uid || reference}`, 'debug');
        
        if (!uid && reference.startsWith('blt')) {
          this.log(`Checking blt reference: ${reference}`, 'debug');
          const refExist = find(this.entryMetaData, { uid: reference });
          if (!refExist) {
            this.log(`Missing blt reference: ${reference}`, 'debug');
            if (Array.isArray(reference_to) && reference_to.length === 1) {
              missingRefs.push({ uid: reference, _content_type_uid: reference_to[0] });
            } else {
              missingRefs.push(reference);
            }
          } else {
            this.log(`Blt reference ${reference} is valid`, 'debug');
            return { uid: reference, _content_type_uid: refExist.ctUid };
          }
        } else {
          this.log(`Checking standard reference: ${uid}`, 'debug');
          const refExist = find(this.entryMetaData, { uid });
          if (!refExist) {
            this.log(`Missing reference: ${uid}`, 'debug');
            missingRefs.push(reference);
            return null;
          } else {
            this.log(`Reference ${uid} is valid`, 'debug');
            return reference;
          }
        }
      })
      .filter((val) => {
        const isValid = val !== null;
        this.log(`Reference ${val ? 'kept' : 'filtered out'}`, 'debug');
        return isValid;
      }) as EntryReferenceFieldDataType[];

    if (!isEmpty(missingRefs)) {
      this.log(`Recording ${missingRefs.length} missing references for entry: ${this.currentUid}`, 'debug');
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
    } else {
      this.log(`No missing references found`, 'debug');
    }

    this.log(`Missing references fix completed: ${entry?.length || 0} references remaining`, 'debug');
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
    this.log(`Checking modular block references for block ${index}`, 'debug');
    this.log(`Available block UIDs: ${blocks.map(b => b.uid).join(', ')}`, 'debug');
    this.log(`Entry block keys: ${Object.keys(entryBlock).join(', ')}`, 'debug');
    
    const validBlockUid = blocks.map((block) => block.uid);
    const invalidKeys = Object.keys(entryBlock).filter((key) => !validBlockUid.includes(key));
    this.log(`Found ${invalidKeys.length} invalid keys: ${invalidKeys.join(', ')}`, 'debug');

    invalidKeys.forEach((key) => {
      if (this.fix) {
        this.log(`Deleting invalid key: ${key}`, 'debug');
        delete entryBlock[key];
      }

      this.log(`Recording invalid modular block key: ${key}`, 'debug');
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

    this.log(`Modular block reference check completed for block ${index}`, 'debug');
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
    this.log(`Checking JSON reference for child: ${(child as any).type || 'unknown type'}`, 'debug');
    this.log(`Child UID: ${child.uid}`, 'debug');
    
    const { uid: childrenUid } = child;
    const { 'entry-uid': entryUid, 'content-type-uid': contentTypeUid } = child.attrs || {};
    this.log(`Entry UID: ${entryUid}, Content type UID: ${contentTypeUid}`, 'debug');

    if (entryUid) {
      this.log(`Checking entry reference: ${entryUid}`, 'debug');
      const refExist = find(this.entryMetaData, { uid: entryUid });

      if (!refExist) {
        this.log(`Missing entry reference: ${entryUid}`, 'debug');
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

        this.log(`JSON reference check failed for entry: ${entryUid}`, 'debug');
        return null;
      } else {
        this.log(`Entry reference ${entryUid} is valid`, 'debug');
      }
    } else {
      this.log(`No entry UID found in JSON child`, 'debug');
    }

    this.log(`JSON reference check passed`, 'debug');
    return true;
  }

  /**
   * The function prepares entry metadata by reading and processing files from different locales and
   * schemas.
   */
  async prepareEntryMetaData() {
    this.log('Starting entry metadata preparation', 'debug');
    this.log(auditMsg.PREPARING_ENTRY_METADATA, 'info');
    const localesFolderPath = resolve(this.config.basePath, this.config.moduleConfig.locales.dirName);
    const localesPath = join(localesFolderPath, this.config.moduleConfig.locales.fileName);
    const masterLocalesPath = join(localesFolderPath, 'master-locale.json');
    
    this.log(`Loading locales from: ${masterLocalesPath}`, 'debug');
    this.locales = existsSync(masterLocalesPath) ? values(JSON.parse(readFileSync(masterLocalesPath, 'utf8'))) : [];
    this.log(`Loaded ${this.locales.length} master locales`, 'debug');

    this.log(`Loading additional locales from: ${localesPath}`, 'debug');
    if (existsSync(localesPath)) {
      const additionalLocales = values(JSON.parse(readFileSync(localesPath, 'utf8')));
      this.locales.push(...additionalLocales);
      this.log(`Added ${additionalLocales.length} additional locales`, 'debug');
    } else {
      this.log('No additional locales file found', 'debug');
    }

    const environmentPath = resolve(
      this.config.basePath,
      this.config.moduleConfig.environments.dirName,
      this.config.moduleConfig.environments.fileName,
    );
    this.log(`Loading environments from: ${environmentPath}`, 'debug');
    this.environments = existsSync(environmentPath) ? keys(JSON.parse(readFileSync(environmentPath, 'utf8'))) : [];
    this.log(`Loaded ${this.environments.length} environments: ${this.environments.join(', ')}`, 'debug');
    
    this.log(`Processing ${this.locales.length} locales and ${this.ctSchema.length} content types for entry metadata`, 'debug');
    for (const { code } of this.locales) {
      this.log(`Processing locale: ${code}`, 'debug');
      for (const { uid } of this.ctSchema) {
        this.log(`Processing content type: ${uid} in locale ${code}`, 'debug');
        let basePath = join(this.folderPath, uid, code);
        this.log(`Entry base path: ${basePath}`, 'debug');
        
        let fsUtility = new FsUtility({ basePath, indexFileName: 'index.json' });
        let indexer = fsUtility.indexFileContent;
        this.log(`Found ${Object.keys(indexer).length} entry files for ${uid}/${code}`, 'debug');

        for (const _ in indexer) {
          const entries = (await fsUtility.readChunkFiles.next()) as Record<string, EntryStruct>;
          this.log(`Processing ${Object.keys(entries).length} entries from file`, 'debug');
          
          for (const entryUid in entries) {
            let { title } = entries[entryUid];
            this.log(`Processing entry metadata: ${entryUid} (${title || 'no title'})`, 'debug');

            if (entries[entryUid].hasOwnProperty('title') && !title) {
              this.log(`Entry ${entryUid} has empty title field`, 'debug');
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
              this.log(`Entry ${entryUid} has no title field`, 'debug');
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
    
    this.log(`Entry metadata preparation completed: ${this.entryMetaData.length} entries processed`, 'debug');
    this.log(`Missing title fields found: ${Object.keys(this.missingTitleFields).length}`, 'debug');
  }
}
