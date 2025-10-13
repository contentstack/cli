import map from 'lodash/map';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';
import { join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

import { sanitizePath, cliux, log } from '@contentstack/cli-utilities';

import {
  ConfigType,
  ModularBlockType,
  ContentTypeStruct,
  GroupFieldDataType,
  RefErrorReturnType,
  CtConstructorParam,
  GlobalFieldDataType,
  JsonRTEFieldDataType,
  ModularBlocksDataType,
  ModuleConstructorParam,
  ReferenceFieldDataType,
  ContentTypeSchemaType,
  GlobalFieldSchemaTypes,
  ExtensionOrAppFieldDataType,
} from '../types';
import auditConfig from '../config';
import { $t, auditFixMsg, auditMsg, commonMsg } from '../messages';
import { MarketplaceAppsInstallationData } from '../types/extension';

/* The `ContentType` class is responsible for scanning content types, looking for references, and
generating a report in JSON and CSV formats. */
export default class ContentType {

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
  constructor({  fix, config, moduleName, ctSchema, gfSchema }: ModuleConstructorParam & CtConstructorParam) {
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

    log.debug(`Starting ${this.moduleName} audit process`, this.config.auditContext);
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
    
    log.debug(`Module ${moduleName} not found in config, defaulting to: content-types`, this.config.auditContext);
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
      log.warn(`Skipping ${this.moduleName} audit`, this.config.auditContext);
      cliux.print($t(auditMsg.NOT_VALID_PATH, { path: this.folderPath }), { color: 'yellow' });
      return returnFixSchema ? [] : {};
    }

    this.schema = this.moduleName === 'content-types' ? this.ctSchema : this.gfSchema;
    log.debug(`Found ${this.schema?.length || 0} ${this.moduleName} schemas to audit`, this.config.auditContext);

    await this.prerequisiteData();

    for (const schema of this.schema ?? []) {
      this.currentUid = schema.uid;
      this.currentTitle = schema.title;
      this.missingRefs[this.currentUid] = [];
      const { uid, title } = schema;
      log.debug(`Auditing ${this.moduleName}: ${title} (${uid})`, this.config.auditContext);
      await this.lookForReference([{ uid, name: title }], schema);
      log.debug(
        $t(auditMsg.SCAN_CT_SUCCESS_MSG, { title, module: this.config.moduleConfig[this.moduleName].name }),
        this.config.auditContext,
      );
    }

    if (returnFixSchema) {
      log.debug(`Returning fixed schema with ${this.schema?.length || 0} items`, this.config.auditContext);
      return this.schema;
    }

    if (this.fix) {
      log.debug('Writing fix content to files', this.config.auditContext);
      await this.writeFixContent();
    }

    log.debug('Cleaning up empty missing references', this.config.auditContext);
    log.debug(`Total missing reference properties: ${Object.keys(this.missingRefs).length}`, this.config.auditContext);
    
    for (let propName in this.missingRefs) {
      const refCount = this.missingRefs[propName].length;
      log.debug(`Property ${propName}: ${refCount} missing references`, this.config.auditContext);
      
      if (!refCount) {
        log.debug(`Removing empty property: ${propName}`, this.config.auditContext);
        delete this.missingRefs[propName];
      }
    }

    const totalIssues = Object.keys(this.missingRefs).length;
    log.debug(`${this.moduleName} audit completed. Found ${totalIssues} schemas with issues`, this.config.auditContext);
    return this.missingRefs;
  }

  /**
   * @method prerequisiteData
   * The `prerequisiteData` function reads and parses JSON files to retrieve extension and marketplace
   * app data, and stores them in the `extensions` array.
   */
  async prerequisiteData() {
    log.debug('Loading prerequisite data (extensions and marketplace apps)', this.config.auditContext);
    const extensionPath = resolve(this.config.basePath, 'extensions', 'extensions.json');
    const marketplacePath = resolve(this.config.basePath, 'marketplace_apps', 'marketplace_apps.json');

    if (existsSync(extensionPath)) {
      log.debug(`Loading extensions from: ${extensionPath}`, this.config.auditContext);
      try {
        this.extensions = Object.keys(JSON.parse(readFileSync(extensionPath, 'utf8')));
        log.debug(`Loaded ${this.extensions.length} extensions`, this.config.auditContext);
      } catch (error) {
        log.debug(`Failed to load extensions: ${error}`, this.config.auditContext);
      }
    } else {
      log.debug('No extensions.json found', this.config.auditContext);
    }

    if (existsSync(marketplacePath)) {
      log.debug(`Loading marketplace apps from: ${marketplacePath}`, this.config.auditContext);
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
  }

  /**
   * The function checks if it can write the fix content to a file and if so, it writes the content as
   * JSON to the specified file path.
   */
  async writeFixContent() {
    log.debug('Starting writeFixContent process', this.config.auditContext);
    let canWrite = true;
    
    if (!this.inMemoryFix && this.fix) {
      log.debug('Fix mode enabled, checking write permissions', this.config.auditContext);
      if (!this.config.flags['copy-dir'] && !this.config.flags['external-config']?.skipConfirm) {
        log.debug('Asking user for confirmation to write fix content', this.config.auditContext);
        canWrite = this.config.flags.yes ?? (await cliux.confirm(commonMsg.FIX_CONFIRMATION));
      } else {
        log.debug('Skipping confirmation due to copy-dir or external-config flags', this.config.auditContext);
      }

      if (canWrite) {
        const filePath = join(this.folderPath, this.config.moduleConfig[this.moduleName].fileName);
        log.debug(`Writing fixed schema to: ${filePath}`, this.config.auditContext);
        writeFileSync(filePath, JSON.stringify(this.schema));
        log.debug(`Successfully wrote ${this.schema?.length || 0} schemas to file`, this.config.auditContext);
      } else {
        log.debug('User declined to write fix content', this.config.auditContext);
      }
    } else {
      log.debug('Skipping writeFixContent - not in fix mode or in-memory fix', this.config.auditContext);
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
  ): Promise<void> {
    log.debug(`Looking for references in field: ${field.uid}`, this.config.auditContext);
    const fixTypes = this.config.flags['fix-only'] ?? this.config['fix-fields'];
    log.debug(`Fix types filter: ${fixTypes.join(', ')}`, this.config.auditContext);

    if (this.fix) {
      log.debug('Running fix on schema', this.config.auditContext);
      field.schema = this.runFixOnSchema(tree, field.schema as ContentTypeSchemaType[]);
    }
    
    const schemaFields = field.schema ?? [];
    log.debug(`Processing ${schemaFields.length} fields in schema`, this.config.auditContext);
    
    for (let child of schemaFields) {
      if (!fixTypes.includes(child.data_type) && child.data_type !== 'json') {
        log.debug(`Skipping field ${child.display_name} (${child.data_type}) - not in fix types`, this.config.auditContext);
        continue;
      }
      
      log.debug(`Processing field: ${child.display_name} (${child.data_type})`, this.config.auditContext);

      switch (child.data_type) {
        case 'reference':
          log.debug(`Validating reference field: ${child.display_name}`, this.config.auditContext);
          const refResults = this.validateReferenceField(
            [...tree, { uid: field.uid, name: child.display_name }],
            child as ReferenceFieldDataType,
          );
          this.missingRefs[this.currentUid].push(...refResults);
          log.debug(`Found ${refResults.length} missing references in field: ${child.display_name}`, this.config.auditContext);
          break;
        case 'global_field':
          log.debug(`Validating global field: ${child.display_name}`, this.config.auditContext);
          await this.validateGlobalField(
            [...tree, { uid: child.uid, name: child.display_name }],
            child as GlobalFieldDataType,
          );
          break;
        case 'json':
          if ('extension' in child.field_metadata && child.field_metadata.extension) {
            if (!fixTypes.includes('json:extension')) {
              log.debug(`Skipping extension field ${child.display_name} - not in fix types`, this.config.auditContext);
              continue;
            }
            log.debug(`Validating extension field: ${child.display_name}`, this.config.auditContext);
            // NOTE Custom field type
            const extResults = this.validateExtensionAndAppField(
              [...tree, { uid: child.uid, name: child.display_name }],
              child as ExtensionOrAppFieldDataType,
            );
            this.missingRefs[this.currentUid].push(...extResults);
            log.debug(`Found ${extResults.length} missing extension references in field: ${child.display_name}`, this.config.auditContext);
          } else if ('allow_json_rte' in child.field_metadata && child.field_metadata.allow_json_rte) {
            if (!fixTypes.includes('json:rte')) {
              log.debug(`Skipping JSON RTE field ${child.display_name} - not in fix types`, this.config.auditContext);
              continue;
            }
            log.debug(`Validating JSON RTE field: ${child.display_name}`, this.config.auditContext);
            // NOTE JSON RTE field type
            const rteResults = this.validateJsonRTEFields(
                [...tree, { uid: child.uid, name: child.display_name }],
                child as ReferenceFieldDataType,
              );
            this.missingRefs[this.currentUid].push(...rteResults);
            log.debug(`Found ${rteResults.length} missing RTE references in field: ${child.display_name}`, this.config.auditContext);
          }
          break;
        case 'blocks':
          log.debug(`Validating modular blocks field: ${child.display_name}`, this.config.auditContext);
          await this.validateModularBlocksField(
            [...tree, { uid: child.uid, name: child.display_name }],
            child as ModularBlocksDataType,
          );
          break;
        case 'group':
          log.debug(`Validating group field: ${child.display_name}`, this.config.auditContext);
          await this.validateGroupField(
            [...tree, { uid: child.uid, name: child.display_name }],
            child as GroupFieldDataType,
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
    log.debug(`Validating reference field: ${field.display_name} (${field.uid})`, this.config.auditContext);
    const results = this.validateReferenceToValues(tree, field);
    log.debug(`Reference field validation completed. Found ${results.length} missing references`, this.config.auditContext);
    return results;
  }

  /**
   * The function `validateExtensionAndAppsField` checks if a given field has a valid extension or app
   * reference and returns any missing references.
   * @param {Record<string, unknown>[]} tree - An array of objects representing a tree structure.
   * @param {ExtensionOrAppFieldDataType} field - The `field` parameter is of type `ExtensionOrAppFieldDataType`.
   * @returns The function `validateExtensionAndAppsField` returns an array of `RefErrorReturnType`
   * objects.
   */
  validateExtensionAndAppField(
    tree: Record<string, unknown>[],
    field: ExtensionOrAppFieldDataType,
  ): RefErrorReturnType[] {
    log.debug(`Validating extension/app field: ${field.display_name} (${field.uid})`, this.config.auditContext);
    if (this.fix) {
      log.debug('Skipping extension validation in fix mode', this.config.auditContext);
      return [];
    }

    const missingRefs = [];
    let { uid, extension_uid, display_name, data_type } = field;

    log.debug(`Checking if extension ${extension_uid} exists in loaded extensions`, this.config.auditContext);
    if (!this.extensions.includes(extension_uid)) {
      log.debug(`Extension ${extension_uid} not found in loaded extensions`, this.config.auditContext);
      missingRefs.push({ uid, extension_uid, type: 'Extension or Apps' } as any);
    } else {
      log.debug(`Extension ${extension_uid} found in loaded extensions`, this.config.auditContext);
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
    
    log.debug(`Extension/app field validation completed. Found ${result.length} issues`, this.config.auditContext);
    return result;
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
    log.debug(`Validating global field: ${field.display_name} (${field.uid})`, this.config.auditContext);
    // NOTE Any GlobalField related logic can be added here
    if (this.moduleName === 'global-fields') {
      let { reference_to } = field;
      log.debug(`Checking if global field ${reference_to} exists in schema`, this.config.auditContext);
      const refExist = find(this.schema, { uid: reference_to });
      if (!refExist) {
        log.debug(`Global field ${reference_to} not found in schema`, this.config.auditContext);
        this.missingRefs[this.currentUid].push({
          tree,
          ct: this.currentUid,
          name: this.currentTitle,
          data_type: field.data_type,
          display_name: field.display_name,
          missingRefs: 'Referred Global Field Does not Exist',
          treeStr: tree.map(({ name }) => name).join(' ➜ '),
        });
        return void 0;
      } else {
        log.debug(`Global field ${reference_to} found in schema`, this.config.auditContext);
      }
    } else if (this.moduleName === 'content-types') {
      log.debug('Processing global field in content-types module', this.config.auditContext);
      if (!field.schema && !this.fix) {
        log.debug(`Global field ${field.display_name} has no schema and not in fix mode`, this.config.auditContext);
        this.missingRefs[this.currentUid].push({
          tree,
          ct_uid: this.currentUid,
          name: this.currentTitle,
          data_type: field.data_type,
          display_name: field.display_name,
          missingRefs: 'Empty schema found',
          treeStr: tree.map(({ name }) => name).join(' ➜ '),
        });

        return void 0;
      } else {
        log.debug(`Global field ${field.display_name} has schema, proceeding with validation`, this.config.auditContext);
      }
    }

    log.debug(`Calling lookForReference for global field: ${field.display_name}`, this.config.auditContext);
    await this.lookForReference(tree, field);
    log.debug(`Global field validation completed: ${field.display_name}`, this.config.auditContext);
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
    log.debug(`Validating JSON RTE field: ${field.display_name} (${field.uid})`, this.config.auditContext);
    // NOTE Other possible reference logic will be added related to JSON RTE (Ex missing assets, extensions etc.,)
    const results = this.validateReferenceToValues(tree, field);
    log.debug(`JSON RTE field validation completed. Found ${results.length} missing references`, this.config.auditContext);
    return results;
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
    log.debug(`[CONTENT-TYPES] Validating modular blocks field: ${field.display_name} (${field.uid})`, this.config.auditContext);
    const { blocks } = field;
    log.debug(`Found ${blocks.length} blocks in modular blocks field`, this.config.auditContext);
    
    this.fixModularBlocksReferences(tree, blocks);

    for (const block of blocks) {
      const { uid, title } = block;
      log.debug(`Processing block: ${title} (${uid})`, this.config.auditContext);

      await this.lookForReference([...tree, { uid, name: title }], block);
    }
    log.debug(`Modular blocks field validation completed: ${field.display_name}`, this.config.auditContext);
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
    log.debug(`[CONTENT-TYPES] Validating group field: ${field.display_name} (${field.uid})`, this.config.auditContext);
    // NOTE Any Group Field related logic can be added here (Ex data serialization or picking any metadata for report etc.,)
    await this.lookForReference(tree, field);
    log.debug(`[CONTENT-TYPES] Group field validation completed: ${field.display_name}`, this.config.auditContext);
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
    log.debug(`Validating reference to values for field: ${field.display_name} (${field.uid})`, this.config.auditContext);
    if (this.fix) {
      log.debug('Skipping reference validation in fix mode', this.config.auditContext);
      return [];
    }

    const missingRefs: string[] = [];
    let { reference_to, display_name, data_type } = field;

    log.debug(`Reference_to type: ${Array.isArray(reference_to) ? 'array' : 'single'}, value: ${JSON.stringify(reference_to)}`, this.config.auditContext);

    if (!Array.isArray(reference_to)) {
      log.debug(`Processing single reference: ${reference_to}`, this.config.auditContext);
      log.debug($t(auditMsg.CT_REFERENCE_FIELD, { reference_to, data_type, display_name }), this.config.auditContext);
      log.debug($t(auditMsg.CT_REFERENCE_FIELD, { reference_to, display_name }), this.config.auditContext);
      if (!this.config.skipRefs.includes(reference_to)) {
        log.debug(`Checking if reference ${reference_to} exists in content type schema`, this.config.auditContext);
        const refExist = find(this.ctSchema, { uid: reference_to });

        if (!refExist) {
          log.debug(`Reference ${reference_to} not found in schema`, this.config.auditContext);
          missingRefs.push(reference_to);
        } else {
          log.debug(`Reference ${reference_to} found in schema`, this.config.auditContext);
        }
      } else {
        log.debug(`Skipping reference ${reference_to} - in skip list`, this.config.auditContext);
      }
    } else {
      log.debug(`Processing ${reference_to?.length || 0} references in array`, this.config.auditContext);
      for (const reference of reference_to ?? []) {
        // NOTE Can skip specific references keys (Ex, system defined keys can be skipped)
        if (this.config.skipRefs.includes(reference)) {
          log.debug(`Skipping reference ${reference} - in skip list`, this.config.auditContext);
          continue;
        }

        log.debug(`Checking if reference ${reference} exists in content type schema`, this.config.auditContext);
        const refExist = find(this.ctSchema, { uid: reference });

        if (!refExist) {
          log.debug(`Reference ${reference} not found in schema`, this.config.auditContext);
          missingRefs.push(reference);
        } else {
          log.debug(`Reference ${reference} found in schema`, this.config.auditContext);
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
            ct_uid: this.currentUid,
            name: this.currentTitle,
            treeStr: tree
              .map(({ name }) => name)
              .filter((val) => val)
              .join(' ➜ '),
          },
        ]
      : [];
    
    log.debug(`Reference validation completed. Found ${missingRefs.length} missing references: ${missingRefs.join(', ')}`, this.config.auditContext);
    return result;
  }

  /**
   * The function `runFixOnSchema` takes in a tree and a schema, and performs various fixes on the
   * schema based on the data types of the fields.
   * @param {Record<string, unknown>[]} tree - An array of objects representing the tree structure of
   * the schema.
   * @param {ContentTypeSchemaType[]} schema - The `schema` parameter is an array of
   * `ContentTypeSchemaType` objects. Each object represents a field in a content type schema and
   * contains properties such as `data_type`, `field_metadata`, `uid`, `name`, etc.
   * @returns an array of ContentTypeSchemaType objects.
   */
  runFixOnSchema(tree: Record<string, unknown>[], schema: ContentTypeSchemaType[]) {
    log.debug(`Running fix on schema with ${schema?.length || 0} fields`, this.config.auditContext);
    // NOTE Global field Fix
    const result = schema
      ?.map((field) => {
        const { data_type, display_name, uid } = field;
        const fixTypes = this.config.flags['fix-only'] ?? this.config['fix-fields'];
        log.debug(`Processing field for fix: ${display_name} (${uid}) - ${data_type}`, this.config.auditContext);

        if (!fixTypes.includes(data_type) && data_type !== 'json') {
          log.debug(`Skipping field ${display_name} - not in fix types`, this.config.auditContext);
          return field;
        }

        switch (data_type) {
          case 'global_field':
            log.debug(`Fixing global field references for: ${display_name}`, this.config.auditContext);
            return this.fixGlobalFieldReferences(tree, field as GlobalFieldDataType);
          case 'json':
          case 'reference':
            if (data_type === 'json') {
              if ('extension' in field.field_metadata && field.field_metadata.extension) {
                // NOTE Custom field type
                if (!fixTypes.includes('json:extension')) {
                  log.debug(`Skipping extension field ${display_name} - not in fix types`, this.config.auditContext);
                  return field;
                }
                log.debug(`Fixing extension/app field: ${display_name}`, this.config.auditContext);
                // NOTE Fix logic
                return this.fixMissingExtensionOrApp(tree, field as ExtensionOrAppFieldDataType);
              } else if ('allow_json_rte' in field.field_metadata && field.field_metadata.allow_json_rte) {
                if (!fixTypes.includes('json:rte')) {
                  log.debug(`Skipping JSON RTE field ${display_name} - not in fix types`, this.config.auditContext);
                  return field;
                }
                log.debug(`Fixing JSON RTE field: ${display_name}`, this.config.auditContext);
                return this.fixMissingReferences(tree, field as JsonRTEFieldDataType);
              }
            }
            log.debug(`Fixing reference field: ${display_name}`, this.config.auditContext);
            return this.fixMissingReferences(tree, field as ReferenceFieldDataType);
          case 'blocks':
            log.debug(`Fixing modular blocks field: ${display_name}`, this.config.auditContext);
            (field as ModularBlocksDataType).blocks = this.fixModularBlocksReferences(
              [...tree, { uid: field.uid, name: field.display_name, data_type: field.data_type }],
              (field as ModularBlocksDataType).blocks,
            );
            if (isEmpty((field as ModularBlocksDataType).blocks)) {
              log.debug(`Modular blocks field ${display_name} became empty after fix`, this.config.auditContext);
              return null;
            }
            return field;
          case 'group':
            log.debug(`Fixing group field: ${display_name}`, this.config.auditContext);
            return this.fixGroupField(tree, field as GroupFieldDataType);
          default:
            log.debug(`No fix needed for field type ${data_type}: ${display_name}`, this.config.auditContext);
            return field;
        }
      })
      .filter((val: any) => {
        if (this.config.skipFieldTypes.includes(val?.data_type)) {
          log.debug(`Keeping field ${val?.display_name} - in skip field types`, this.config.auditContext);
          return true;
        }
        if (
          val?.schema &&
          isEmpty(val?.schema) &&
          (!val?.data_type || this.config['schema-fields-data-type'].includes(val.data_type))
        ) {
          log.debug(`Filtering out field ${val?.display_name} - empty schema`, this.config.auditContext);
          return false;
        }
        if (val?.reference_to && isEmpty(val?.reference_to) && val.data_type === 'reference') {
          log.debug(`Filtering out field ${val?.display_name} - empty reference_to`, this.config.auditContext);
          return false;
        }

        return !!val;
      }) as ContentTypeSchemaType[];
    
    log.debug(`Schema fix completed. ${result?.length || 0} fields remain after filtering`, this.config.auditContext);
    return result;
  }

  /**
   * The function fixes global field references in a tree structure by adding missing references and
   * returning the field if the reference exists, otherwise returning null.
   * @param {Record<string, unknown>[]} tree - An array of objects representing a tree structure.
   * @param {GlobalFieldDataType} field - The `field` parameter is an object that represents a global
   * field. It has the following properties:
   * @returns either the `field` object if `reference_to` exists in `this.gfSchema`, or `null` if it
   * doesn't.
   */
  fixGlobalFieldReferences(tree: Record<string, unknown>[], field: GlobalFieldDataType) {
    log.debug(`Fixing global field references for: ${field.display_name} (${field.uid})`, this.config.auditContext);
    const { reference_to, display_name, data_type } = field;
    if (reference_to && data_type === 'global_field') {
      log.debug(`Processing global field reference: ${reference_to}`, this.config.auditContext);
      tree = [...tree, { uid: field.uid, name: field.display_name, data_type: field.data_type }];
      const refExist = find(this.gfSchema, { uid: reference_to });

      if (!refExist) {
        log.debug(`Global field reference ${reference_to} not found, marking as fixed`, this.config.auditContext);
        this.missingRefs[this.currentUid].push({
          tree,
          data_type,
          display_name,
          fixStatus: 'Fixed',
          ct_uid: this.currentUid,
          name: this.currentTitle,
          missingRefs: [reference_to],
          treeStr: tree.map(({ name }) => name).join(' ➜ '),
        });
      } else if (!field.schema && this.moduleName === 'content-types') {
        log.debug(`Global field ${reference_to} found, copying schema to field`, this.config.auditContext);
        const gfSchema = find(this.gfSchema, { uid: field.reference_to })?.schema;
        if (gfSchema) {
          log.debug(`Successfully copied schema from global field ${reference_to}`, this.config.auditContext);
          field.schema = gfSchema as GlobalFieldSchemaTypes[];
        } else {
          log.debug(`Global field ${reference_to} has no schema, marking as fixed`, this.config.auditContext);
          this.missingRefs[this.currentUid].push({
            tree,
            data_type,
            display_name,
            fixStatus: 'Fixed',
            ct_uid: this.currentUid,
            name: this.currentTitle,
            missingRefs: 'Empty schema found',
            treeStr: tree.map(({ name }) => name).join(' ➜ '),
          });
        }
      } else if (!field.schema && this.moduleName === 'global-fields') {
        log.debug(`Processing global field in global-fields module: ${reference_to}`, this.config.auditContext);
        const gfSchema = find(this.gfSchema, { uid: field.reference_to })?.schema;
        if (gfSchema) {
          log.debug(`Successfully copied schema from global field ${reference_to}`, this.config.auditContext);
          field.schema = gfSchema as GlobalFieldSchemaTypes[];
        } else {
          log.debug(`Global field ${reference_to} has no schema, marking as fixed`, this.config.auditContext);
          this.missingRefs[this.currentUid].push({
            tree,
            data_type,
            display_name,
            fixStatus: 'Fixed',
            ct_uid: this.currentUid,
            name: this.currentTitle,
            missingRefs: 'Referred Global Field Does not exist',
            treeStr: tree.map(({ name }) => name).join(' ➜ '),
          });
        }
      }

      if(field.schema && !isEmpty(field.schema)){
        log.debug(`Running recursive fix on global field schema: ${display_name}`, this.config.auditContext);
        field.schema = this.runFixOnSchema(tree, field.schema as ContentTypeSchemaType[]);
      }
      const result = refExist ? field : null;
      log.debug(`Global field fix completed for ${display_name}. Result: ${result ? 'kept' : 'removed'}`, this.config.auditContext);
      return result;
    }

    log.debug(`Skipping global field fix for ${display_name} - not a global field or no reference_to`, this.config.auditContext);
    return field;
  }

  /**
   * The function `fixModularBlocksReferences` takes in an array of tree objects and an array of
   * modular blocks, and returns an array of modular blocks with fixed references.
   * @param {Record<string, unknown>[]} tree - An array of objects representing the tree structure.
   * @param {ModularBlockType[]} blocks - An array of objects representing modular blocks. Each object
   * has properties such as "reference_to", "schema", "title", and "uid".
   * @returns an array of `ModularBlockType` objects.
   */
  fixModularBlocksReferences(tree: Record<string, unknown>[], blocks: ModularBlockType[]) {
    log.debug(`Fixing modular blocks references for ${blocks?.length || 0} blocks`, this.config.auditContext);
    const result = blocks
      ?.map((block) => {
        const { reference_to, schema, title: display_name, uid } = block;
        log.debug(`Processing modular block: ${display_name} (${uid})`, this.config.auditContext);
        tree = [...tree, { uid: block.uid, name: block.title }];
        const refErrorObj = {
          tree,
          display_name,
          ct_uid: this.currentUid,
          name: this.currentTitle,
          missingRefs: [reference_to],
          fixStatus: this.fix ? 'Fixed' : undefined,
          treeStr: tree.map(({ name }) => name).join(' ➜ '),
        };

        if (!schema && this.moduleName === 'content-types') {
          log.debug(`Modular block ${display_name} has no schema, marking as fixed`, this.config.auditContext);
          this.missingRefs[this.currentUid].push(refErrorObj);

          return false;
        }

        // NOTE Global field section
        if (reference_to) {
          log.debug(`Checking global field reference ${reference_to} for block ${display_name}`, this.config.auditContext);
          const refExist = find(this.gfSchema, { uid: reference_to });
          if (!refExist) {
            log.debug(`Global field reference ${reference_to} not found for block ${display_name}`, this.config.auditContext);
            this.missingRefs[this.currentUid].push(refErrorObj);

            return false;
          }
          if (!refExist) {
            this.missingRefs[this.currentUid].push(refErrorObj);

            return block;
          }
        }

        log.debug(`Running fix on block schema for: ${display_name}`, this.config.auditContext);
        block.schema = this.runFixOnSchema(tree, block.schema as ContentTypeSchemaType[]);

        if (isEmpty(block.schema) && this.moduleName === 'content-types') {
          log.debug(`Block ${display_name} became empty after fix`, this.config.auditContext);
          this.missingRefs[this.currentUid].push({
            ...refErrorObj,
            missingRefs: 'Empty schema found',
            treeStr: tree.map(({ name }) => name).join(' ➜ '),
          });

          log.info($t(auditFixMsg.EMPTY_FIX_MSG, { path: tree.map(({ name }) => name).join(' ➜ ') }));

          return null;
        }

        log.debug(`Block ${display_name} fix completed successfully`, this.config.auditContext);
        return block;
      })
      .filter((val) => val) as ModularBlockType[];
    
    log.debug(`Modular blocks fix completed. ${result?.length || 0} blocks remain`, this.config.auditContext);
    return result;
  }

  /**
   * The function checks for missing extension or app references in a given tree and fixes them if the
   * fix flag is enabled.
   * @param {Record<string, unknown>[]} tree - An array of objects representing a tree structure.
   * @param {ExtensionOrAppFieldDataType} field - The `field` parameter is of type
   * `ExtensionOrAppFieldDataType`.
   * @returns If the `fix` flag is true and there are missing references (`missingRefs` is not empty),
   * then `null` is returned. Otherwise, the `field` parameter is returned.
   */
  fixMissingExtensionOrApp(tree: Record<string, unknown>[], field: ExtensionOrAppFieldDataType) {
    log.debug(`Fixing missing extension/app for field: ${field.display_name} (${field.uid})`, this.config.auditContext);
    const missingRefs: string[] = [];
    const { uid, extension_uid, data_type, display_name } = field;

    log.debug(`Checking if extension ${extension_uid} exists in loaded extensions`, this.config.auditContext);
    if (!this.extensions.includes(extension_uid)) {
      log.debug(`Extension ${extension_uid} not found, adding to missing refs`, this.config.auditContext);
      missingRefs.push({ uid, extension_uid, type: 'Extension or Apps' } as any);
    } else {
      log.debug(`Extension ${extension_uid} found in loaded extensions`, this.config.auditContext);
    }

    if (this.fix && !isEmpty(missingRefs)) {
      log.debug(`Fix mode enabled and missing refs found, marking as fixed`, this.config.auditContext);
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

      return null;
    }

    log.debug(`Extension/app fix completed for ${display_name}. Result: ${missingRefs.length > 0 ? 'issues found' : 'no issues'}`, this.config.auditContext);
    return field;
  }

  /**
   * The function `fixMissingReferences` checks for missing references in a given tree and field, and
   * attempts to fix them by removing the missing references from the field's `reference_to` array.
   * @param {Record<string, unknown>[]} tree - An array of objects representing a tree structure. Each
   * object in the array should have a "name" property.
   * @param {ReferenceFieldDataType | JsonRTEFieldDataType} field - The `field` parameter is of type
   * `ReferenceFieldDataType` or `JsonRTEFieldDataType`.
   * @returns the `field` object.
   */
  fixMissingReferences(tree: Record<string, unknown>[], field: ReferenceFieldDataType | JsonRTEFieldDataType) {
    log.debug(`Fixing missing references for field: ${field.display_name} (${field.uid})`, this.config.auditContext);
    let fixStatus;
    const missingRefs: string[] = [];
    const { reference_to, data_type, display_name } = field;
    
    log.debug(`Reference_to type: ${Array.isArray(reference_to) ? 'array' : 'single'}, value: ${JSON.stringify(reference_to)}`, this.config.auditContext);
    
    if (!Array.isArray(reference_to)) {
      log.debug(`Processing single reference: ${reference_to}`, this.config.auditContext);
      log.error($t(auditMsg.CT_REFERENCE_FIELD, { reference_to, display_name }), this.config.auditContext);
      log.info($t(auditMsg.CT_REFERENCE_FIELD, { reference_to, display_name }), this.config.auditContext);
      if (!this.config.skipRefs.includes(reference_to)) {
        log.debug(`Checking if reference ${reference_to} exists in content type schema`, this.config.auditContext);
        const refExist = find(this.ctSchema, { uid: reference_to });

        if (!refExist) {
          log.debug(`Reference ${reference_to} not found, adding to missing refs`, this.config.auditContext);
          missingRefs.push(reference_to);
        } else {
          log.debug(`Reference ${reference_to} found in schema`, this.config.auditContext);
        }
      } else {
        log.debug(`Skipping reference ${reference_to} - in skip list`, this.config.auditContext);
      }

      log.debug(`Converting single reference to array format`, this.config.auditContext);
      field.reference_to = [reference_to];
      field.field_metadata = {
        ...field.field_metadata,
        ref_multiple_content_types: true,
      };
    } else {
      log.debug(`Processing ${reference_to?.length || 0} references in array`, this.config.auditContext);
      for (const reference of reference_to ?? []) {
        // NOTE Can skip specific references keys (Ex, system defined keys can be skipped)
        if (this.config.skipRefs.includes(reference)) {
          log.debug(`Skipping reference ${reference} - in skip list`, this.config.auditContext);
          continue;
        }

        log.debug(`Checking if reference ${reference} exists in content type schema`, this.config.auditContext);
        const refExist = find(this.ctSchema, { uid: reference });

        if (!refExist) {
          log.debug(`Reference ${reference} not found, adding to missing refs`, this.config.auditContext);
          missingRefs.push(reference);
        } else {
          log.debug(`Reference ${reference} found in schema`, this.config.auditContext);
        }
      }
    }

    log.debug(`Found ${missingRefs.length} missing references: ${missingRefs.join(', ')}`, this.config.auditContext);

    if (this.fix && !isEmpty(missingRefs)) {
      log.debug(`Fix mode enabled, removing missing references from field`, this.config.auditContext);
      try {
        field.reference_to = field.reference_to.filter((ref) => !missingRefs.includes(ref));
        fixStatus = 'Fixed';
        log.debug(`Successfully removed missing references. New reference_to: ${JSON.stringify(field.reference_to)}`, this.config.auditContext);
      } catch (error) {
        fixStatus = `Not Fixed (${JSON.stringify(error)})`;
        log.debug(`Failed to remove missing references: ${error}`, this.config.auditContext);
      }

      this.missingRefs[this.currentUid].push({
        tree,
        data_type,
        fixStatus,
        missingRefs,
        display_name,
        ct_uid: this.currentUid,
        name: this.currentTitle,
        treeStr: tree.map(({ name }) => name).join(' ➜ '),
      });
    }

    log.debug(`Missing references fix completed for ${display_name}. Status: ${fixStatus || 'no fix needed'}`, this.config.auditContext);
    return field;
  }

  /**
   * The function `fixGroupField` takes in an array of objects and a field, and performs some
   * operations on the field's schema property.
   * @param {Record<string, unknown>[]} tree - An array of objects representing a tree structure.
   * @param {GroupFieldDataType} field - The `field` parameter is an object that contains the following
   * properties:
   * @returns The function `fixGroupField` returns either `null` or the `field` object.
   */
  fixGroupField(tree: Record<string, unknown>[], field: GroupFieldDataType) {
    log.debug(`Fixing group field: ${field.display_name} (${field.uid})`, this.config.auditContext);
    const { data_type, display_name } = field;

    log.debug(`Running fix on group field schema for: ${display_name}`, this.config.auditContext);
    field.schema = this.runFixOnSchema(tree, field.schema as ContentTypeSchemaType[]);

    if (isEmpty(field.schema)) {
      log.debug(`Group field ${display_name} became empty after fix`, this.config.auditContext);
      this.missingRefs[this.currentUid].push({
        tree,
        data_type,
        display_name,
        fixStatus: 'Fixed',
        ct_uid: this.currentUid,
        name: this.currentTitle,
        missingRefs: 'Empty schema found',
        treeStr: tree.map(({ name }) => name).join(' ➜ '),
      });
      log.debug($t(auditFixMsg.EMPTY_FIX_MSG, { path: tree.map(({ name }) => name).join(' ➜ ') }));

      return null;
    }

    log.debug(`Group field fix completed successfully for: ${display_name}`, this.config.auditContext);
    return field;
  }
}
