import map from 'lodash/map';
import find from 'lodash/find';
import values from 'lodash/values';
import isEmpty from 'lodash/isEmpty';
import { join, resolve } from 'path';
import { FsUtility, sanitizePath, cliux, log } from '@contentstack/cli-utilities';
import { existsSync, readFileSync, writeFileSync } from 'fs';

import auditConfig from '../config';
import ContentType from './content-types';
import { $t, auditFixMsg, auditMsg, commonMsg } from '../messages';
import {
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

  constructor({ fix, config, moduleName, ctSchema, gfSchema }: ModuleConstructorParam & CtConstructorParam) {

    this.config = config;
    log.debug(`Initializing Entries module`, this.config.auditContext);
    this.fix = fix ?? false;
    this.ctSchema = ctSchema;
    this.gfSchema = gfSchema;
    this.moduleName = this.validateModules(moduleName!, this.config.moduleConfig);
    this.fileName = config.moduleConfig[this.moduleName].fileName;
    this.folderPath = resolve(sanitizePath(config.basePath), sanitizePath(config.moduleConfig.entries.dirName));
    log.debug(`Starting ${this.moduleName} audit process`, this.config.auditContext);
    log.debug(`Data directory: ${this.folderPath}`, this.config.auditContext);
    log.debug(`Fix mode: ${this.fix}`, this.config.auditContext);
  }

  validateModules(
    moduleName: keyof typeof auditConfig.moduleConfig,
    moduleConfig: Record<string, unknown>,
  ): keyof typeof auditConfig.moduleConfig {
    log.debug(`Validating module: ${moduleName}`, this.config.auditContext);
    log.debug(`Available modules in config: ${Object.keys(moduleConfig).join(', ')}`, this.config.auditContext);
    
    if (Object.keys(moduleConfig).includes(moduleName)) {
      log.debug(`Module ${moduleName} found in config, returning: ${moduleName}`, this.config.auditContext);
      return moduleName;
    }
    
    log.debug(`Module ${moduleName} not found in config, defaulting to: entries`, this.config.auditContext);
    return 'entries';
  }

  /**
   * The `run` function checks if a folder path exists, sets the schema based on the module name,
   * iterates over the schema and looks for references, and returns a list of missing references.
   * @returns the `missingRefs` object.
   */
  async run() {
    
    if (!existsSync(this.folderPath)) {
      log.debug(`Skipping ${this.moduleName} audit - path does not exist`, this.config.auditContext);
      log.warn(`Skipping ${this.moduleName} audit`, this.config.auditContext);
      cliux.print($t(auditMsg.NOT_VALID_PATH, { path: this.folderPath }), { color: 'yellow' });
      return {};
    }

    log.debug(`Found ${this.ctSchema?.length || 0} content types to audit`, this.config.auditContext);
    log.debug(`Found ${this.locales?.length || 0} locales to process`, this.config.auditContext);

    log.debug('Preparing entry metadata', this.config.auditContext);
    await this.prepareEntryMetaData();
    log.debug(`Entry metadata prepared: ${this.entryMetaData.length} entries found`, this.config.auditContext);

    log.debug('Fixing prerequisite data', this.config.auditContext);
    await this.fixPrerequisiteData();
    log.debug('Prerequisite data fix completed', this.config.auditContext);

    log.debug(`Processing ${this.locales.length} locales and ${this.ctSchema.length} content types`, this.config.auditContext);
    for (const { code } of this.locales) {
      log.debug(`Processing locale: ${code}`, this.config.auditContext);
      for (const ctSchema of this.ctSchema) {
        log.debug(`Processing content type: ${ctSchema.uid} in locale ${code}`, this.config.auditContext);
        const basePath = join(this.folderPath, ctSchema.uid, code);
        log.debug(`Base path for entries: ${basePath}`, this.config.auditContext);
        
        const fsUtility = new FsUtility({ basePath, indexFileName: 'index.json', createDirIfNotExist: false });
        const indexer = fsUtility.indexFileContent;
        log.debug(`Found ${Object.keys(indexer).length} entry files to process`, this.config.auditContext);

        for (const fileIndex in indexer) {
          log.debug(`Processing entry file: ${indexer[fileIndex]}`, this.config.auditContext);
          const entries = (await fsUtility.readChunkFiles.next()) as Record<string, EntryStruct>;
          this.entries = entries;
          log.debug(`Loaded ${Object.keys(entries).length} entries from file`, this.config.auditContext);

          for (const entryUid in this.entries) {
            const entry = this.entries[entryUid];
            const { uid, title } = entry;
            this.currentUid = uid;
            this.currentTitle = title;
            if (this.currentTitle) {
              this.currentTitle = this.removeEmojiAndImages(this.currentTitle);
            }

            log.debug(`Processing entry - title:${this.currentTitle} with uid:(${uid})`, this.config.auditContext);

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
              log.debug(`Removing missing keys from entry ${uid}`, this.config.auditContext);
              this.removeMissingKeysOnEntry(ctSchema.schema as ContentTypeSchemaType[], this.entries[entryUid]);
            }

            log.debug(`Looking for references in entry ${uid}`, this.config.auditContext);
            this.lookForReference(
              [{ locale: code, uid, name: this.removeEmojiAndImages(this.currentTitle) }],
              ctSchema,
              this.entries[entryUid],
            );

            if (this.missingRefs[this.currentUid]?.length) {
              log.debug(`Found ${this.missingRefs[this.currentUid].length} missing references for entry ${uid}`, this.config.auditContext);
              this.missingRefs[this.currentUid].forEach((entry: any) => {
                entry.ct = ctSchema.uid;
                entry.locale = code;
              });
            }

            if (this.missingSelectFeild[this.currentUid]?.length) {
              log.debug(`Found ${this.missingSelectFeild[this.currentUid].length} missing select fields for entry ${uid}`, this.config.auditContext);
              this.missingSelectFeild[this.currentUid].forEach((entry: any) => {
                entry.ct = ctSchema.uid;
                entry.locale = code;
              });
            }

            if (this.missingMandatoryFields[this.currentUid]?.length) {
              log.debug(`Found ${this.missingMandatoryFields[this.currentUid].length} missing mandatory fields for entry ${uid}`, this.config.auditContext);
              this.missingMandatoryFields[this.currentUid].forEach((entry: any) => {
                entry.ct = ctSchema.uid;
                entry.locale = code;
              });
            }

            const fields = this.missingMandatoryFields[uid];
            const isPublished = entry.publish_details?.length > 0;
            log.debug(`Entry ${uid} published status: ${isPublished}, missing mandatory fields: ${fields?.length || 0}`, this.config.auditContext);
            
            if ((this.fix && fields.length && isPublished) || (!this.fix && fields)) {
              const fixStatus = this.fix ? 'Fixed' : '';
              log.debug(`Applying fix status: ${fixStatus} to ${fields.length} fields`, this.config.auditContext);
              
              fields?.forEach((field: { isPublished: boolean; fixStatus?: string }, index: number) => {
                log.debug(`Processing field ${index + 1}/${fields.length}`, this.config.auditContext);
                field.isPublished = isPublished;
                if (this.fix && isPublished) {
                  field.fixStatus = fixStatus;
                  log.debug(`Field ${index + 1} marked as published and fixed`, this.config.auditContext);
                }
              });

              if (this.fix && isPublished) {
                log.debug(`Fixing mandatory field issue for entry ${uid}`, this.config.auditContext);
                log.error($t(auditFixMsg.ENTRY_MANDATORY_FIELD_FIX, { uid, locale: code }), this.config.auditContext);
                entry.publish_details = [];
              }
            } else {
              delete this.missingMandatoryFields[uid];
            }

            const localKey = this.locales.map((locale: any) => locale.code);
            log.debug(`Available locales: ${localKey.join(', ')}, environments: ${this.environments.join(', ')}`, this.config.auditContext);

            if (this.entries[entryUid]?.publish_details && !Array.isArray(this.entries[entryUid].publish_details)) {
              log.debug(`Entry ${entryUid} has invalid publish_details format`, this.config.auditContext);
              log.debug($t(auditMsg.ENTRY_PUBLISH_DETAILS_NOT_EXIST, { uid: entryUid }), this.config.auditContext);
            }

            const originalPublishDetails = this.entries[entryUid]?.publish_details?.length || 0;
            this.entries[entryUid].publish_details = this.entries[entryUid]?.publish_details.filter((pd: any) => {
              log.debug(`Checking publish detail: locale=${pd.locale}, environment=${pd.environment}`, this.config.auditContext);
              
              if (localKey?.includes(pd.locale) && this.environments?.includes(pd.environment)) {
                log.debug(`Publish detail valid for entry ${entryUid}: locale=${pd.locale}, environment=${pd.environment}`, this.config.auditContext);
                return true;
              } else {
                log.debug(`Publish detail invalid for entry ${entryUid}: locale=${pd.locale}, environment=${pd.environment}`, this.config.auditContext);
                log.debug(
                  $t(auditMsg.ENTRY_PUBLISH_DETAILS, {
                    uid: entryUid,
                    ctuid: ctSchema.uid,
                    locale: code,
                    publocale: pd.locale,
                    environment: pd.environment,
                  }),
                  this.config.auditContext
                );
                if (!Object.keys(this.missingEnvLocale).includes(entryUid)) {
                  log.debug(`Creating new missing environment/locale entry for ${entryUid}`, this.config.auditContext);
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
                  log.debug(`Adding to existing missing environment/locale entry for ${entryUid}`, this.config.auditContext);
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
            log.debug(`Entry ${entryUid} publish details: ${originalPublishDetails} -> ${remainingPublishDetails}`, this.config.auditContext);

            const message = $t(auditMsg.SCAN_ENTRY_SUCCESS_MSG, {
              title,
              local: code,
              module: this.config.moduleConfig.entries.name,
            });
            log.debug(message, this.config.auditContext);
            log.info(message, this.config.auditContext);
          }

          if (this.fix) {
            log.debug(`Writing fix content for ${Object.keys(this.entries).length} entries`, this.config.auditContext);
            await this.writeFixContent(`${basePath}/${indexer[fileIndex]}`, this.entries);
          }
        }
      }
    }


    log.debug('Cleaning up empty missing references', this.config.auditContext);
    this.removeEmptyVal();
    
    const result = {
      missingEntryRefs: this.missingRefs,
      missingSelectFeild: this.missingSelectFeild,
      missingMandatoryFields: this.missingMandatoryFields,
      missingTitleFields: this.missingTitleFields,
      missingEnvLocale: this.missingEnvLocale,
      missingMultipleFields: this.missingMultipleField,
    };
    
    log.debug(`Entries audit completed. Found issues:`, this.config.auditContext);
    log.debug(`- Missing references: ${Object.keys(this.missingRefs).length}`, this.config.auditContext);
    log.debug(`- Missing select fields: ${Object.keys(this.missingSelectFeild).length}`, this.config.auditContext);
    log.debug(`- Missing mandatory fields: ${Object.keys(this.missingMandatoryFields).length}`, this.config.auditContext);
    log.debug(`- Missing title fields: ${Object.keys(this.missingTitleFields).length}`, this.config.auditContext);
    log.debug(`- Missing environment/locale: ${Object.keys(this.missingEnvLocale).length}`, this.config.auditContext);
    log.debug(`- Missing multiple fields: ${Object.keys(this.missingMultipleField).length}`, this.config.auditContext);
    
    return result;
  }

  /**
   * The function removes any properties from the `missingRefs` object that have an empty array value.
   */
  removeEmptyVal() {
    log.debug('Removing empty missing reference arrays', this.config.auditContext);
    
    let removedRefs = 0;
    for (let propName in this.missingRefs) {
      if (!this.missingRefs[propName].length) {
        log.debug(`Removing empty missing references for entry: ${propName}`, this.config.auditContext);
        delete this.missingRefs[propName];
        removedRefs++;
      }
    }
    
    let removedSelectFields = 0;
    for (let propName in this.missingSelectFeild) {
      if (!this.missingSelectFeild[propName].length) {
        log.debug(`Removing empty missing select fields for entry: ${propName}`, this.config.auditContext);
        delete this.missingSelectFeild[propName];
        removedSelectFields++;
      }
    }
    
    let removedMandatoryFields = 0;
    for (let propName in this.missingMandatoryFields) {
      if (!this.missingMandatoryFields[propName].length) {
        log.debug(`Removing empty missing mandatory fields for entry: ${propName}`, this.config.auditContext);
        delete this.missingMandatoryFields[propName];
        removedMandatoryFields++;
      }
    }
    
    log.debug(`Cleanup completed: removed ${removedRefs} empty refs, ${removedSelectFields} empty select fields, ${removedMandatoryFields} empty mandatory fields`, this.config.auditContext);
  }

  /**
   * The function `fixPrerequisiteData` fixes the prerequisite data by updating the `ctSchema` and
   * `gfSchema` properties using the `ContentType` class.
   */
  async fixPrerequisiteData() {
    log.debug('Starting prerequisite data fix process', this.config.auditContext);
    
    log.debug('Fixing content type schema', this.config.auditContext);
    this.ctSchema = (await new ContentType({
      fix: true,
      config: this.config,
      moduleName: 'content-types',
      ctSchema: this.ctSchema,
      gfSchema: this.gfSchema,
    }).run(true)) as ContentTypeStruct[];
    log.debug(`Content type schema fixed: ${this.ctSchema.length} schemas`, this.config.auditContext);
    
    log.debug('Fixing global field schema', this.config.auditContext);
    this.gfSchema = (await new GlobalField({
      fix: true,
      config: this.config,
      moduleName: 'global-fields',
      ctSchema: this.ctSchema,
      gfSchema: this.gfSchema,
    }).run(true)) as ContentTypeStruct[];
    log.debug(`Global field schema fixed: ${this.gfSchema.length} schemas`, this.config.auditContext);

    const extensionPath = resolve(this.config.basePath, 'extensions', 'extensions.json');
    const marketplacePath = resolve(this.config.basePath, 'marketplace_apps', 'marketplace_apps.json');
    
    log.debug(`Loading extensions from: ${extensionPath}`, this.config.auditContext);
    if (existsSync(extensionPath)) {
      try {
        this.extensions = Object.keys(JSON.parse(readFileSync(extensionPath, 'utf8')));
        log.debug(`Loaded ${this.extensions.length} extensions`, this.config.auditContext);
      } catch (error) {
        log.debug(`Failed to load extensions: ${error}`, this.config.auditContext);
      }
    } else {
      log.debug('No extensions.json found', this.config.auditContext);
    }

    log.debug(`Loading marketplace apps from: ${marketplacePath}`, this.config.auditContext);
    if (existsSync(marketplacePath)) {
      try {
        const marketplaceApps: MarketplaceAppsInstallationData[] = JSON.parse(readFileSync(marketplacePath, 'utf8'));
        log.debug(`Found ${marketplaceApps.length} marketplace apps`, this.config.auditContext);

        for (const app of marketplaceApps) {
          const metaData = map(map(app?.ui_location?.locations, 'meta').flat(), 'extension_uid').filter(
            (val) => val,
          ) as string[];
          this.extensions.push(...metaData);
          log.debug(`Added ${metaData.length} extension UIDs from app: ${app.manifest?.name || app.uid}`, this.config.auditContext);
        }
      } catch (error) {
        log.debug(`Failed to load marketplace apps: ${error}`, this.config.auditContext);
      }
    } else {
      log.debug('No marketplace_apps.json found', this.config.auditContext);
    }
    
    log.debug(`Total extensions loaded: ${this.extensions.length}`, this.config.auditContext);
    log.debug('Prerequisite data fix process completed', this.config.auditContext);
  }

  /**
   * The function checks if it can write the fix content to a file and if so, it writes the content as
   * JSON to the specified file path.
   */
  async writeFixContent(filePath: string, schema: Record<string, EntryStruct>) {
    log.debug(`Starting writeFixContent process for entries`, this.config.auditContext);
    log.debug(`Target file path: ${filePath}`, this.config.auditContext);
    log.debug(`Entries to write: ${Object.keys(schema).length}`, this.config.auditContext);

    if (this.fix) {
      log.debug('Fix mode enabled, checking write permissions', this.config.auditContext);
      
      const skipConfirm = this.config.flags['copy-dir'] || this.config.flags['external-config']?.skipConfirm;
      
      if (skipConfirm) {
        log.debug('Skipping confirmation due to copy-dir or external-config flags', this.config.auditContext);
      } else {
        log.debug('Asking user for confirmation to write fix content', this.config.auditContext);
      }

      const canWrite = skipConfirm || this.config.flags.yes || (await cliux.confirm(commonMsg.FIX_CONFIRMATION));
      
      if (canWrite) {
        log.debug(`Writing fixed entries to: ${filePath}`, this.config.auditContext);
        writeFileSync(filePath, JSON.stringify(schema));
        log.debug(`Successfully wrote ${Object.keys(schema).length} entries to file`, this.config.auditContext);
      } else {
        log.debug('User declined to write fix content', this.config.auditContext);
      }
    } else {
      log.debug('Skipping writeFixContent - not in fix mode', this.config.auditContext);
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
    log.debug(`Looking for references in field: ${(field as any).uid || (field as any).title || 'unknown'}`, this.config.auditContext);
    const schemaFields = field?.schema ?? [];
    log.debug(`Processing ${schemaFields.length} fields in schema`, this.config.auditContext);

    if (this.fix) {
      log.debug('Running fix on schema', this.config.auditContext);
      entry = this.runFixOnSchema(tree, field.schema as ContentTypeSchemaType[], entry);
    }

    for (const child of schemaFields) {
      const { uid, multiple, data_type, display_name } = child;
      log.debug(`Processing field: ${display_name} (${uid}) - ${data_type}`, this.config.auditContext);

      if (multiple && entry[uid] && !Array.isArray(entry[uid])) {
        log.debug(`Field ${display_name} should be array but is not`, this.config.auditContext);
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
      
      log.debug(`Validating mandatory fields for: ${display_name}`, this.config.auditContext);
      this.missingMandatoryFields[this.currentUid].push(
        ...this.validateMandatoryFields(
          [...tree, { uid: field.uid, name: child.display_name, field: uid }],
          child,
          entry,
        ),
      );
      if (!entry?.[uid] && !child.hasOwnProperty('display_type')) {
        log.debug(`Skipping field ${display_name} - no entry value and no display_type`, this.config.auditContext);
        continue;
      }

      log.debug(`Validating field type: ${data_type} for ${display_name}`, this.config.auditContext);
      switch (child.data_type) {
        case 'reference':
          log.debug(`Validating reference field: ${display_name}`, this.config.auditContext);
          const refResults = this.validateReferenceField(
            [...tree, { uid: child.uid, name: child.display_name, field: uid }],
            child as ReferenceFieldDataType,
            entry[uid] as EntryReferenceFieldDataType[],
          );
          this.missingRefs[this.currentUid].push(...refResults);
          log.debug(`Found ${refResults.length} missing references in field: ${display_name}`, this.config.auditContext);
          break;
        case 'global_field':
          log.debug(`Validating global field: ${display_name}`, this.config.auditContext);
          this.validateGlobalField(
            [...tree, { uid: child.uid, name: child.display_name, field: uid }],
            child as GlobalFieldDataType,
            entry[uid] as EntryGlobalFieldDataType,
          );
          break;
        case 'json':
          if ('extension' in child.field_metadata && child.field_metadata.extension) {
            log.debug(`Validating extension field: ${display_name}`, this.config.auditContext);
            const extResults = this.validateExtensionAndAppField(
              [...tree, { uid: child.uid, name: child.display_name, field: uid }],
              child as ExtensionOrAppFieldDataType,
              entry as EntryExtensionOrAppFieldDataType,
            );
            this.missingRefs[this.currentUid].push(...extResults);
            log.debug(`Found ${extResults.length} missing extension references in field: ${display_name}`, this.config.auditContext);
          } else if ('allow_json_rte' in child.field_metadata && child.field_metadata.allow_json_rte) {
            // NOTE JSON RTE field type
            log.debug(`Validating JSON RTE field: ${display_name}`, this.config.auditContext);
            this.validateJsonRTEFields(
              [...tree, { uid: child.uid, name: child.display_name, field: uid }],
              child as JsonRTEFieldDataType,
              entry[uid] as EntryJsonRTEFieldDataType,
            );
          }
          break;
        case 'blocks':
          log.debug(`Validating modular blocks field: ${display_name}`, this.config.auditContext);
          this.validateModularBlocksField(
            [...tree, { uid: child.uid, name: child.display_name, field: uid }],
            child as ModularBlocksDataType,
            entry[uid] as EntryModularBlocksDataType[],
          );
          break;
        case 'group':
          log.debug(`Validating group field: ${display_name}`, this.config.auditContext);
          this.validateGroupField(
            [...tree, { uid: field.uid, name: child.display_name, field: uid }],
            child as GroupFieldDataType,
            entry[uid] as EntryGroupFieldDataType[],
          );
          break;
        case 'text':
        case 'number':
          if (child.hasOwnProperty('display_type')) {
            log.debug(`Validating select field: ${display_name}`, this.config.auditContext);
            const selectResults = this.validateSelectField(
              [...tree, { uid: field.uid, name: child.display_name, field: uid }],
              child as SelectFeildStruct,
              entry[uid],
            );
            this.missingSelectFeild[this.currentUid].push(...selectResults);
            log.debug(`Found ${selectResults.length} missing select field values in field: ${display_name}`, this.config.auditContext);
          }
          break;
      }
    }
    log.debug(`Field reference validation completed: ${(field as any).uid || (field as any).title || 'unknown'}`, this.config.auditContext);
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
    log.debug(`Validating reference field: ${fieldStructure.display_name}`, this.config.auditContext);
    
    if (typeof field === 'string') {
      log.debug(`Converting string reference to JSON: ${field}`, this.config.auditContext);
      let stringReference = field as string;
      stringReference = stringReference.replace(/'/g, '"');
      field = JSON.parse(stringReference);
    }
    
    const result = this.validateReferenceValues(tree, fieldStructure, field);
    log.debug(`Reference field validation completed: ${result?.length || 0} missing references found`, this.config.auditContext);
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
    log.debug(`Validating extension/app field: ${fieldStructure.display_name}`, this.config.auditContext);
    
    if (this.fix) {
      log.debug('Fix mode enabled, skipping extension/app validation', this.config.auditContext);
      return [];
    }

    const missingRefs = [];
    let { uid, display_name, data_type } = fieldStructure || {};
    log.debug(`Checking extension/app field: ${uid}`, this.config.auditContext);

    if (field[uid]) {
      let { metadata: { extension_uid } = { extension_uid: '' } } = field[uid] || {};
      log.debug(`Found extension UID: ${extension_uid}`, this.config.auditContext);

      if (extension_uid && !this.extensions.includes(extension_uid)) {
        log.debug(`Missing extension: ${extension_uid}`, this.config.auditContext);
        missingRefs.push({ uid, extension_uid, type: 'Extension or Apps' } as any);
      } else {
        log.debug(`Extension ${extension_uid} is valid`, this.config.auditContext);
      }
    } else {
      log.debug(`No extension/app data found for field: ${uid}`, this.config.auditContext);
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
    
    log.debug(`Extension/app field validation completed: ${result.length} missing references found`, this.config.auditContext);
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
    log.debug(`Validating global field: ${fieldStructure.display_name}`, this.config.auditContext);
    log.debug(`Global field UID: ${fieldStructure.uid}`, this.config.auditContext);
    
    // NOTE Any GlobalField related logic can be added here
    this.lookForReference(tree, fieldStructure, field);
    
    log.debug(`Global field validation completed for: ${fieldStructure.display_name}`, this.config.auditContext);
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
    log.debug(`Validating JSON RTE field: ${fieldStructure.display_name}`, this.config.auditContext);
    log.debug(`JSON RTE field UID: ${fieldStructure.uid}`, this.config.auditContext);
    log.debug(`Found ${field?.children?.length || 0} children in JSON RTE field`, this.config.auditContext);
    
    // NOTE Other possible reference logic will be added related to JSON RTE (Ex missing assets, extensions etc.,)
    for (const index in field?.children ?? []) {
      const child = field.children[index];
      const { children } = child;
      log.debug(`Processing JSON RTE child ${index}`, this.config.auditContext);

      if (!this.fix) {
        log.debug(`Checking JSON RTE references for child ${index}`, this.config.auditContext);
        this.jsonRefCheck(tree, fieldStructure, child);
      }

      if (!isEmpty(children)) {
        log.debug(`Recursively validating JSON RTE children for child ${index}`, this.config.auditContext);
        this.validateJsonRTEFields(tree, fieldStructure, field.children[index]);
      }
    }
    
    log.debug(`JSON RTE field validation completed for: ${fieldStructure.display_name}`, this.config.auditContext);
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
    log.debug(`Validating modular blocks field: ${fieldStructure.display_name}`, this.config.auditContext);
    log.debug(`Modular blocks field UID: ${fieldStructure.uid}`, this.config.auditContext);
    log.debug(`Found ${field.length} modular blocks`, this.config.auditContext);
    log.debug(`Available blocks: ${fieldStructure.blocks.map(b => b.title).join(', ')}`);
    
    if (!this.fix) {
      log.debug('Checking modular block references (non-fix mode)');
      for (const index in field) {
        log.debug(`Checking references for modular block ${index}`);
        this.modularBlockRefCheck(tree, fieldStructure.blocks, field[index], +index);
      }
    }

    for (const block of fieldStructure.blocks) {
      const { uid, title } = block;
      log.debug(`Processing block: ${title} (${uid})`);

      for (const eBlock of field) {
        if (eBlock[uid]) {
          log.debug(`Found entry block data for: ${title}`);
          this.lookForReference([...tree, { uid, name: title }], block, eBlock[uid] as EntryModularBlocksDataType);
        }
      }
    }
    
    log.debug(`Modular blocks field validation completed for: ${fieldStructure.display_name}`);
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
    log.debug(`Validating group field: ${fieldStructure.display_name}`);
    log.debug(`Group field UID: ${fieldStructure.uid}`);
    log.debug(`Group field type: ${Array.isArray(field) ? 'array' : 'single'}`);
    
    // NOTE Any Group Field related logic can be added here (Ex data serialization or picking any metadata for report etc.,)
    if (Array.isArray(field)) {
      log.debug(`Processing ${field.length} group field entries`);
      field.forEach((eGroup, index) => {
        log.debug(`Processing group field entry ${index}`);
        this.lookForReference(
          [...tree, { uid: fieldStructure.uid, display_name: fieldStructure.display_name }],
          fieldStructure,
          eGroup,
        );
      });
    } else {
      log.debug('Processing single group field entry');
      this.lookForReference(tree, fieldStructure, field);
    }
    
    log.debug(`Group field validation completed for: ${fieldStructure.display_name}`);
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
    log.debug(`Validating reference values for field: ${fieldStructure.display_name}`);
    
    if (this.fix) {
      log.debug('Fix mode enabled, skipping reference validation');
      return [];
    }

    const missingRefs: Record<string, any>[] = [];
    const { uid: data_type, display_name, reference_to } = fieldStructure;
    log.debug(`Reference field UID: ${data_type}`);
    log.debug(`Reference to: ${reference_to?.join(', ') || 'none'}`);
    log.debug(`Found ${field?.length || 0} references to validate`);

    for (const index in field ?? []) {
      const reference: any = field[index];
      const { uid } = reference;
      log.debug(`Processing reference ${index}: ${uid || reference}`);
      
      if (!uid && reference.startsWith('blt')) {
        log.debug(`Checking reference: ${reference}`);
        const refExist = find(this.entryMetaData, { uid: reference });
        if (!refExist) {
          log.debug(`Missing reference: ${reference}`);
          if (Array.isArray(reference_to) && reference_to.length === 1) {
            missingRefs.push({ uid: reference, _content_type_uid: reference_to[0] });
          } else {
            missingRefs.push(reference);
          }
        } else {
          log.debug(`Reference ${reference} is valid`);
        }
      }
      // NOTE Can skip specific references keys (Ex, system defined keys can be skipped)
      // if (this.config.skipRefs.includes(reference)) continue;
      else {
        log.debug(`Checking standard reference: ${uid}`);
        const refExist = find(this.entryMetaData, { uid });

        if (!refExist) {
          log.debug(`Missing reference: ${uid}`);
          missingRefs.push(reference);
        } else {
          log.debug(`Reference ${uid} is valid`);
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
    
    log.debug(`Reference values validation completed: ${result.length} missing references found`);
    return result;
  }

  removeMissingKeysOnEntry(schema: ContentTypeSchemaType[], entry: EntryFieldType) {
    log.debug(`Removing missing keys from entry: ${this.currentUid}`);
    
    // NOTE remove invalid entry keys
    const ctFields = map(schema, 'uid');
    const entryFields = Object.keys(entry ?? {});
    log.debug(`Content type fields: ${ctFields.length}, Entry fields: ${entryFields.length}`);
    log.debug(`System keys: ${this.config.entries.systemKeys.join(', ')}`);

    entryFields.forEach((eKey) => {
      // NOTE Key should not be system key and not exist in schema means it's invalid entry key
      if (!this.config.entries.systemKeys.includes(eKey) && !ctFields.includes(eKey)) {
        log.debug(`Removing invalid field: ${eKey}`);
        delete entry[eKey];
      }
    });
    
    log.debug(`Missing keys removal completed for entry: ${this.currentUid}`);
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
    log.debug(`Running fix on schema for entry: ${this.currentUid}`);
    log.debug(`Schema fields: ${schema.length}, Entry fields: ${Object.keys(entry).length}`);
    
    // NOTE Global field Fix
    schema.forEach((field) => {
      const { uid, data_type, multiple } = field;
      log.debug(`Processing field: ${uid} (${data_type})`);

      if (!Object(entry).hasOwnProperty(uid)) {
        log.debug(`Field ${uid} not found in entry, skipping`);
        return;
      }

      if (multiple && entry[uid] && !Array.isArray(entry[uid])) {
        log.debug(`Fixing multiple field: ${uid} - converting to array`);
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
          log.debug(`Fixing global field: ${uid}`);
          entry[uid] = this.fixGlobalFieldReferences(
            [...tree, { uid: field.uid, name: field.display_name, data_type: field.data_type }],
            field as GlobalFieldDataType,
            entry[uid] as EntryGlobalFieldDataType,
          ) as EntryGlobalFieldDataType;
          break;
        case 'json':
        case 'reference':
          log.debug(`Fixing ${data_type} field: ${uid}`);
          if (data_type === 'json') {
            if ('extension' in field.field_metadata && field.field_metadata.extension) {
              // NOTE Custom field type
              log.debug(`Fixing extension/app field: ${uid}`);
              this.fixMissingExtensionOrApp(
                [...tree, { uid: field.uid, name: field.display_name, data_type: field.data_type }],
                field as ExtensionOrAppFieldDataType,
                entry as EntryExtensionOrAppFieldDataType,
              );
              break;
            } else if ('allow_json_rte' in field.field_metadata && field.field_metadata.allow_json_rte) {
              log.debug(`Fixing JSON RTE field: ${uid}`);
              this.fixJsonRteMissingReferences(
                [...tree, { uid: field.uid, name: field.display_name, data_type: field.data_type }],
                field as JsonRTEFieldDataType,
                entry[uid] as EntryJsonRTEFieldDataType,
              );
              break;
            }
          }
          // NOTE Reference field
          log.debug(`Fixing reference field: ${uid}`);
          entry[uid] = this.fixMissingReferences(
            [...tree, { uid: field.uid, name: field.display_name, data_type: field.data_type }],
            field as ReferenceFieldDataType,
            entry[uid] as EntryReferenceFieldDataType[],
          );
          if (!entry[uid]) {
            log.debug(`Deleting empty reference field: ${uid}`);
            delete entry[uid];
          }
          break;
        case 'blocks':
          log.debug(`Fixing modular blocks field: ${uid}`);
          entry[uid] = this.fixModularBlocksReferences(
            [...tree, { uid: field.uid, name: field.display_name, data_type: field.data_type }],
            (field as ModularBlocksDataType).blocks,
            entry[uid] as EntryModularBlocksDataType[],
          );
          break;
        case 'group':
          log.debug(`Fixing group field: ${uid}`);
          entry[uid] = this.fixGroupField(
            [...tree, { uid: field.uid, name: field.display_name, data_type: field.data_type }],
            field as GroupFieldDataType,
            entry[uid] as EntryGroupFieldDataType[],
          ) as EntryGroupFieldDataType;
          break;
        case 'text':
        case 'number':
          if (field.hasOwnProperty('display_type')) {
            log.debug(`Fixing select field: ${uid}`);
            entry[uid] = this.fixSelectField(
              [...tree, { uid: field.uid, name: field.display_name, data_type: field.data_type }],
              field as SelectFeildStruct,
              entry[uid] as EntrySelectFeildDataType,
            ) as EntrySelectFeildDataType;
          }
          break;
      }
    });

    log.debug(`Schema fix completed for entry: ${this.currentUid}`);
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
    log.debug(`Validating select field: ${fieldStructure.display_name}`);
    log.debug(`Select field UID: ${fieldStructure.uid}`);
    log.debug(`Field value: ${JSON.stringify(field)}`);
    log.debug(`Multiple: ${fieldStructure.multiple}, Display type: ${fieldStructure.display_type}`);
    
    const { display_name, enum: selectOptions, multiple, min_instance, display_type, data_type } = fieldStructure;
    if (
      field === null ||
      field === '' ||
      (Array.isArray(field) && field.length === 0) ||
      (!field && data_type !== 'number')
    ) {
      log.debug(`Select field is empty or null: ${display_name}`);
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
      log.debug(`Validating multiple select field: ${display_name}`);
      if (Array.isArray(field)) {
        log.debug(`Field is array with ${field.length} values`);
        let obj = this.findNotPresentSelectField(field, selectOptions);
        let { notPresent } = obj;
        if (notPresent.length) {
          log.debug(`Found ${notPresent.length} missing select values: ${notPresent.join(', ')}`);
          missingCTSelectFieldValues = notPresent;
        } else {
          log.debug(`All select values are valid`);
        }
      }
    } else {
      log.debug(`Validating single select field: ${display_name}`);
      if (!selectOptions.choices.some((choice) => choice.value === field)) {
        log.debug(`Invalid select value: ${field}`);
        missingCTSelectFieldValues = field;
      } else {
        log.debug(`Select value is valid: ${field}`);
      }
    }
    if (display_type && missingCTSelectFieldValues) {
      log.debug(`Select field validation found issues: ${JSON.stringify(missingCTSelectFieldValues)}`);
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
      log.debug(`Select field validation completed successfully: ${display_name}`);
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
    log.debug(`Fixing select field: ${field.display_name}`);
    log.debug(`Select field UID: ${field.uid}`);
    log.debug(`Current entry value: ${JSON.stringify(entry)}`);
    
    if (!this.config.fixSelectField) {
      log.debug('Select field fixing is disabled in config');
      return entry;
    }
    const { enum: selectOptions, multiple, min_instance, display_type, display_name, uid } = field;
    log.debug(`Select options: ${selectOptions.choices.length} choices, Multiple: ${multiple}, Min instance: ${min_instance}`);

    let missingCTSelectFieldValues;
    let isMissingValuePresent = false;
    let selectedValue: unknown = '';
    if (multiple) {
      log.debug('Processing multiple select field', this.config.auditContext);
      let obj = this.findNotPresentSelectField(entry, selectOptions);
      let { notPresent, filteredFeild } = obj;
      log.debug(`Found ${notPresent.length} invalid values, filtered to ${filteredFeild.length} values`, this.config.auditContext);
      entry = filteredFeild;
      missingCTSelectFieldValues = notPresent;
      if (missingCTSelectFieldValues.length) {
        isMissingValuePresent = true;
        log.debug(`Missing values found: ${missingCTSelectFieldValues.join(', ')}`, this.config.auditContext);
      }
      if (min_instance && Array.isArray(entry)) {
        const missingInstances = min_instance - entry.length;
        log.debug(`Checking min instance requirement: ${min_instance}, current: ${entry.length}, missing: ${missingInstances}`, this.config.auditContext);
        if (missingInstances > 0) {
          isMissingValuePresent = true;
          const newValues = selectOptions.choices
            .filter((choice) => !entry.includes(choice.value))
            .slice(0, missingInstances)
            .map((choice) => choice.value);
          log.debug(`Adding ${newValues.length} values to meet min instance requirement: ${newValues.join(', ')}`, this.config.auditContext);
          entry.push(...newValues);
          selectedValue = newValues;
          log.error($t(auditFixMsg.ENTRY_SELECT_FIELD_FIX, { value: newValues.join(' '), uid }), this.config.auditContext);
        }
      } else {
        if (entry.length === 0) {
          isMissingValuePresent = true;
          const defaultValue = selectOptions.choices.length > 0 ? selectOptions.choices[0].value : null;
          log.debug(`Empty multiple select field, adding default value: ${defaultValue}`, this.config.auditContext);
          entry.push(defaultValue);
          selectedValue = defaultValue;
          log.error($t(auditFixMsg.ENTRY_SELECT_FIELD_FIX, { value: defaultValue as string, uid }), this.config.auditContext);
        }
      }
    } else {
      log.debug('Processing single select field', this.config.auditContext);
      const isPresent = selectOptions.choices.some((choice) => choice.value === entry);
      if (!isPresent) {
        log.debug(`Invalid single select value: ${entry}`, this.config.auditContext);
        missingCTSelectFieldValues = entry;
        isMissingValuePresent = true;
        let defaultValue = selectOptions.choices.length > 0 ? selectOptions.choices[0].value : null;
        log.debug(`Replacing with default value: ${defaultValue}`, this.config.auditContext);
        entry = defaultValue;
        selectedValue = defaultValue;
        log.error($t(auditFixMsg.ENTRY_SELECT_FIELD_FIX, { value: defaultValue as string, uid }), this.config.auditContext);
      } else {
        log.debug(`Single select value is valid: ${entry}`, this.config.auditContext);
      }
    }
    if (display_type && isMissingValuePresent) {
      log.debug(`Recording select field fix for entry: ${this.currentUid}`, this.config.auditContext);
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
    log.debug(`Select field fix completed for: ${field.display_name}`);
    return entry;
  }

  validateMandatoryFields(tree: Record<string, unknown>[], fieldStructure: any, entry: any) {
    log.debug(`Validating mandatory field: ${fieldStructure.display_name}`);
    log.debug(`Field UID: ${fieldStructure.uid}, Mandatory: ${fieldStructure.mandatory}`);
    
    const { display_name, multiple, data_type, mandatory, field_metadata, uid } = fieldStructure;

    const isJsonRteEmpty = () => {
      const jsonNode = multiple
        ? entry[uid]?.[0]?.children?.[0]?.children?.[0]?.text
        : entry[uid]?.children?.[0]?.children?.[0]?.text;
      log.debug(`JSON RTE empty check: ${jsonNode === ''}`);
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
      log.debug(`Entry empty check: ${fieldValue === '' || !fieldValue}`);
      return fieldValue === '' || !fieldValue;
    };

    if (mandatory) {
      log.debug(`Field is mandatory, checking if empty`);
      if ((data_type === 'json' && field_metadata.allow_json_rte && isJsonRteEmpty()) || isEntryEmpty()) {
        log.debug(`Mandatory field is empty: ${display_name}`);
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
        log.debug(`Mandatory field has value: ${display_name}`);
      }
    } else {
      log.debug(`Field is not mandatory: ${display_name}`);
    }

    log.debug(`Mandatory field validation completed: ${display_name}`);
    return [];
  }

  /**
   * this is called in case the select field has multiple optins to chose from
   * @param field It contains the value to be searched
   * @param selectOptions It contains the options that were added in CT
   * @returns An Array of entry containing only the values that were present in CT, An array of not present entries
   */
  findNotPresentSelectField(field: any, selectOptions: any) {
    log.debug(`Finding not present select field values`);
    log.debug(`Field values: ${JSON.stringify(field)}`);
    log.debug(`Available choices: ${selectOptions.choices.length}`);
    
    if (!field) {
      log.debug('Field is null/undefined, initializing as empty array');
      field = [];
    }
    let present = [];
    let notPresent = [];
    const choicesMap = new Map(selectOptions.choices.map((choice: { value: any }) => [choice.value, choice]));
    log.debug(`Created choices map with ${choicesMap.size} entries`);
    
    for (const value of field) {
      const choice: any = choicesMap.get(value);
      log.debug(`Checking value: ${value}`);

      if (choice) {
        log.debug(`Value ${value} is present in choices`);
        present.push(choice.value);
      } else {
        log.debug(`Value ${value} is not present in choices`);
        notPresent.push(value);
      }
    }
    
    log.debug(`Result: ${present.length} present, ${notPresent.length} not present`);
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
    log.debug(`Fixing global field references: ${field.display_name}`);
    log.debug(`Global field UID: ${field.uid}`);
    log.debug(`Schema fields: ${field.schema?.length || 0}`);
    
    const result = this.runFixOnSchema([...tree, { uid: field.uid, display_name: field.display_name }], field.schema, entry);
    
    log.debug(`Global field references fix completed: ${field.display_name}`);
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
    log.debug(`Fixing modular blocks references`);
    log.debug(`Available blocks: ${blocks.length}, Entry blocks: ${entry?.length || 0}`);
    
    entry = entry
      ?.map((block, index) => {
        log.debug(`Checking modular block ${index}`);
        return this.modularBlockRefCheck(tree, blocks, block, index);
      })
      .filter((val) => {
        const isEmpty = !val || Object.keys(val).length === 0;
        log.debug(`Block ${val ? 'kept' : 'filtered out'} (empty: ${isEmpty})`);
        return !isEmpty;
      });

    blocks.forEach((block) => {
      log.debug(`Processing block: ${block.title} (${block.uid})`);
      entry = entry
        ?.map((eBlock) => {
          if (!isEmpty(block.schema)) {
            if (eBlock[block.uid]) {
              log.debug(`Fixing schema for block: ${block.title}`);
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
          log.debug(`Entry block ${val ? 'kept' : 'filtered out'} (empty: ${isEmpty})`);
          return !isEmpty;
        });
    });

    log.debug(`Modular blocks references fix completed: ${entry?.length || 0} blocks remaining`);
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
    log.debug(`Fixing missing extension/app: ${field.display_name}`);
    log.debug(`Extension/app field UID: ${field.uid}`);
    
    const missingRefs = [];

    let { uid, display_name, data_type } = field || {};

    if (entry[uid]) {
      let { metadata: { extension_uid } = { extension_uid: '' } } = entry[uid] || {};
      log.debug(`Found extension UID: ${extension_uid}`);

      if (extension_uid && !this.extensions.includes(extension_uid)) {
        log.debug(`Missing extension: ${extension_uid}`, this.config.auditContext);
        missingRefs.push({ uid, extension_uid, type: 'Extension or Apps' } as any);
      } else {
        log.debug(`Extension ${extension_uid} is valid`, this.config.auditContext);
      }
    } else {
      log.debug(`No extension/app data found for field: ${uid}`, this.config.auditContext);
    }

    if (this.fix && !isEmpty(missingRefs)) {
      log.debug(`Recording extension/app fix for entry: ${this.currentUid}`);
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

      log.debug(`Deleting invalid extension/app field: ${uid}`);
      delete entry[uid];
    }

    log.debug(`Extension/app fix completed for: ${field.display_name}`);
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
    log.debug(`Fixing group field: ${field.display_name}`);
    log.debug(`Group field UID: ${field.uid}`);
    log.debug(`Schema fields: ${field.schema?.length || 0}`);
    log.debug(`Entry type: ${Array.isArray(entry) ? 'array' : 'single'}`);
    
    if (!isEmpty(field.schema)) {
      log.debug(`Group field has schema, applying fixes`);
      if (Array.isArray(entry)) {
        log.debug(`Processing ${entry.length} group field entries`);
        entry = entry.map((eGroup, index) => {
          log.debug(`Fixing group field entry ${index}`);
          return this.runFixOnSchema(
            [...tree, { uid: field.uid, display_name: field.display_name }],
            field.schema as ContentTypeSchemaType[],
            eGroup,
          );
        }) as EntryGroupFieldDataType[];
      } else {
        log.debug(`Processing single group field entry`);
        entry = this.runFixOnSchema(
          [...tree, { uid: field.uid, display_name: field.display_name }],
          field.schema as ContentTypeSchemaType[],
          entry,
        ) as EntryGroupFieldDataType;
      }
    } else {
      log.debug(`Group field has no schema, skipping fixes`);
    }

    log.debug(`Group field fix completed for: ${field.display_name}`);
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
    log.debug(`Fixing JSON RTE missing references`);
    log.debug(`Field UID: ${field.uid}`);
    log.debug(`Entry type: ${Array.isArray(entry) ? 'array' : 'single'}`);
    
    if (Array.isArray(entry)) {
      log.debug(`Processing ${entry.length} JSON RTE entries`);
      entry = entry.map((child: any, index) => {
        log.debug(`Fixing JSON RTE entry ${index}: ${child?.type || 'unknown type'}`);
        return this.fixJsonRteMissingReferences([...tree, { index, type: child?.type, uid: child?.uid }], field, child);
      }) as EntryJsonRTEFieldDataType[];
    } else {
      if (entry?.children) {
        log.debug(`Processing ${entry.children.length} JSON RTE children`);
        entry.children = entry.children
          .map((child, index) => {
            log.debug(`Checking JSON RTE child ${index}: ${(child as any).type || 'unknown type'}`);
            const refExist = this.jsonRefCheck(tree, field, child);

            if (!refExist) {
              log.debug(`JSON RTE child ${index} has invalid reference, removing`);
              return null;
            }

            if (!isEmpty(child.children)) {
              log.debug(`JSON RTE child ${index} has children, recursively fixing`);
              child = this.fixJsonRteMissingReferences(tree, field, child) as EntryJsonRTEFieldDataType;
            }

            log.debug(`JSON RTE child ${index} reference is valid`);
            return child;
          })
          .filter((val) => {
            const isValid = val !== null;
            log.debug(`JSON RTE child ${val ? 'kept' : 'filtered out'}`);
            return isValid;
          }) as EntryJsonRTEFieldDataType[];
      } else {
        log.debug(`JSON RTE entry has no children`);
      }
    }

    log.debug(`JSON RTE missing references fix completed`);
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
    log.debug(`Fixing missing references`);
    log.debug(`Field UID: ${field.uid}`);
    log.debug(`Reference to: ${(field as any).reference_to?.join(', ') || 'none'}`);
    log.debug(`Entry type: ${typeof entry}, length: ${Array.isArray(entry) ? entry.length : 'N/A'}`);
    
    const missingRefs: Record<string, any>[] = [];
    if (typeof entry === 'string') {
      log.debug(`Entry is string, parsing JSON`);
      let stringReference = entry as string;
      stringReference = stringReference.replace(/'/g, '"');
      entry = JSON.parse(stringReference);
      log.debug(`Parsed entry: ${Array.isArray(entry) ? entry.length : 'N/A'} references`);
    }
    entry = entry
      ?.map((reference: any, index) => {
        const { uid } = reference;
        const { reference_to } = field;
        log.debug(`Processing reference ${index}: ${uid || reference}`);
        
        if (!uid && reference.startsWith('blt')) {
          log.debug(`Checking blt reference: ${reference}`);
          const refExist = find(this.entryMetaData, { uid: reference });
          if (!refExist) {
            log.debug(`Missing blt reference: ${reference}`);
            if (Array.isArray(reference_to) && reference_to.length === 1) {
              missingRefs.push({ uid: reference, _content_type_uid: reference_to[0] });
            } else {
              missingRefs.push(reference);
            }
          } else {
            log.debug(`Blt reference ${reference} is valid`);
            return { uid: reference, _content_type_uid: refExist.ctUid };
          }
        } else {
          log.debug(`Checking standard reference: ${uid}`);
          const refExist = find(this.entryMetaData, { uid });
          if (!refExist) {
            log.debug(`Missing reference: ${uid}`);
            missingRefs.push(reference);
            return null;
          } else {
            log.debug(`Reference ${uid} is valid`);
            return reference;
          }
        }
      })
      .filter((val) => {
        const isValid = val !== null;
        log.debug(`Reference ${val ? 'kept' : 'filtered out'}`);
        return isValid;
      }) as EntryReferenceFieldDataType[];

    if (!isEmpty(missingRefs)) {
      log.debug(`Recording ${missingRefs.length} missing references for entry: ${this.currentUid}`);
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
      log.debug(`No missing references found`);
    }

    log.debug(`Missing references fix completed: ${entry?.length || 0} references remaining`);
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
    log.debug(`Checking modular block references for block ${index}`);
    log.debug(`Available block UIDs: ${blocks.map(b => b.uid).join(', ')}`);
    log.debug(`Entry block keys: ${Object.keys(entryBlock).join(', ')}`);
    
    const validBlockUid = blocks.map((block) => block.uid);
    const invalidKeys = Object.keys(entryBlock).filter((key) => !validBlockUid.includes(key));
    log.debug(`Found ${invalidKeys.length} invalid keys: ${invalidKeys.join(', ')}`);

    invalidKeys.forEach((key) => {
      if (this.fix) {
        log.debug(`Deleting invalid key: ${key}`);
        delete entryBlock[key];
      }

      log.debug(`Recording invalid modular block key: ${key}`);
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

    log.debug(`Modular block reference check completed for block ${index}`);
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
    log.debug(`Checking JSON reference for child: ${(child as any).type || 'unknown type'}`);
    log.debug(`Child UID: ${child.uid}`);
    
    const { uid: childrenUid } = child;
    const { 'entry-uid': entryUid, 'content-type-uid': contentTypeUid } = child.attrs || {};
    log.debug(`Entry UID: ${entryUid}, Content type UID: ${contentTypeUid}`);

    if (entryUid) {
      log.debug(`Checking entry reference: ${entryUid}`);
      const refExist = find(this.entryMetaData, { uid: entryUid });

      if (!refExist) {
        log.debug(`Missing entry reference: ${entryUid}`);
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

        log.debug(`JSON reference check failed for entry: ${entryUid}`);
        return null;
      } else {
        log.debug(`Entry reference ${entryUid} is valid`);
      }
    } else {
      log.debug(`No entry UID found in JSON child`);
    }

    log.debug(`JSON reference check passed`);
    return true;
  }

  /**
   * The function prepares entry metadata by reading and processing files from different locales and
   * schemas.
   */
  async prepareEntryMetaData() {
    log.debug('Starting entry metadata preparation');
    log.info(auditMsg.PREPARING_ENTRY_METADATA);
    const localesFolderPath = resolve(this.config.basePath, this.config.moduleConfig.locales.dirName);
    const localesPath = join(localesFolderPath, this.config.moduleConfig.locales.fileName);
    const masterLocalesPath = join(localesFolderPath, 'master-locale.json');
    
    log.debug(`Loading locales from: ${masterLocalesPath}`);
    this.locales = existsSync(masterLocalesPath) ? values(JSON.parse(readFileSync(masterLocalesPath, 'utf8'))) : [];
    log.debug(`Loaded ${this.locales.length} master locales`);

    log.debug(`Loading additional locales from: ${localesPath}`);
    if (existsSync(localesPath)) {
      const additionalLocales = values(JSON.parse(readFileSync(localesPath, 'utf8')));
      this.locales.push(...additionalLocales);
      log.debug(`Added ${additionalLocales.length} additional locales`);
    } else {
      log.debug('No additional locales file found');
    }

    const environmentPath = resolve(
      this.config.basePath,
      this.config.moduleConfig.environments.dirName,
      this.config.moduleConfig.environments.fileName,
    );
    log.debug(`Loading environments from: ${environmentPath}`);
    this.environments = existsSync(environmentPath) ? keys(JSON.parse(readFileSync(environmentPath, 'utf8'))) : [];
    log.debug(`Loaded ${this.environments.length} environments: ${this.environments.join(', ')}`, this.config.auditContext);
    
    log.debug(`Processing ${this.locales.length} locales and ${this.ctSchema.length} content types for entry metadata`, this.config.auditContext);
    for (const { code } of this.locales) {
      log.debug(`Processing locale: ${code}`, this.config.auditContext);
      for (const { uid } of this.ctSchema) {
        log.debug(`Processing content type: ${uid} in locale ${code}`, this.config.auditContext);
        let basePath = join(this.folderPath, uid, code);
        log.debug(`Entry base path: ${basePath}`, this.config.auditContext);
        
        let fsUtility = new FsUtility({ basePath, indexFileName: 'index.json' });
        let indexer = fsUtility.indexFileContent;
        log.debug(`Found ${Object.keys(indexer).length} entry files for ${uid}/${code}`, this.config.auditContext);

        for (const _ in indexer) {
          const entries = (await fsUtility.readChunkFiles.next()) as Record<string, EntryStruct>;
          log.debug(`Processing ${Object.keys(entries).length} entries from file`, this.config.auditContext);
          
          for (const entryUid in entries) {
            let { title } = entries[entryUid];
            log.debug(`Processing entry metadata: ${entryUid} (${title || 'no title'})`, this.config.auditContext);

            if (entries[entryUid].hasOwnProperty('title') && !title) {
              log.debug(`Entry ${entryUid} has empty title field`, this.config.auditContext);
              this.missingTitleFields[entryUid] = {
                'Entry UID': entryUid,
                'Content Type UID': uid,
                Locale: code,
              };
              log.info(
                `The 'title' field in Entry with UID '${entryUid}' of Content Type '${uid}' in Locale '${code}' is empty.`,
                this.config.auditContext,
              );
            } else if (!title) {
              log.debug(`Entry ${entryUid} has no title field`, this.config.auditContext);
              log.debug(
                `The 'title' field in Entry with UID '${entryUid}' of Content Type '${uid}' in Locale '${code}' is empty.`,
                this.config.auditContext,
              );
            }
            this.entryMetaData.push({ uid: entryUid, title, ctUid: uid });
          }
        }
      }
    }
    
    log.debug(`Entry metadata preparation completed: ${this.entryMetaData.length} entries processed`, this.config.auditContext);
    log.debug(`Missing title fields found: ${Object.keys(this.missingTitleFields).length}`, this.config.auditContext);
  }
}
