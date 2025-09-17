import map from 'lodash/map';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';
import { join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

import { sanitizePath, cliux } from '@contentstack/cli-utilities';

import {
  LogFn,
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
    this.log(`Starting ${this.moduleName} audit process`, 'debug');

    if (!existsSync(this.folderPath)) {
      this.log(`Skipping ${this.moduleName} audit`, 'warn');
      this.log($t(auditMsg.NOT_VALID_PATH, { path: this.folderPath }), { color: 'yellow' });
      return returnFixSchema ? [] : {};
    }

    this.schema = this.moduleName === 'content-types' ? this.ctSchema : this.gfSchema;
    this.log(`Found ${this.schema?.length || 0} ${this.moduleName} schemas to audit`, 'debug');

    await this.prerequisiteData();

    for (const schema of this.schema ?? []) {
      this.currentUid = schema.uid;
      this.currentTitle = schema.title;
      this.missingRefs[this.currentUid] = [];
      const { uid, title } = schema;
      this.log(`Auditing ${this.moduleName}: ${title} (${uid})`, 'debug');
      await this.lookForReference([{ uid, name: title }], schema);
      this.log(
        $t(auditMsg.SCAN_CT_SUCCESS_MSG, { title, module: this.config.moduleConfig[this.moduleName].name }),
        'info',
      );
    }

    if (returnFixSchema) {
      this.log(`Returning fixed schema with ${this.schema?.length || 0} items`, 'debug');
      return this.schema;
    }

    if (this.fix) {
      this.log('Writing fix content to files', 'debug');
      await this.writeFixContent();
    }

    this.log('Cleaning up empty missing references', 'debug');
    for (let propName in this.missingRefs) {
      if (!this.missingRefs[propName].length) {
        delete this.missingRefs[propName];
      }
    }

    const totalIssues = Object.keys(this.missingRefs).length;
    this.log(`${this.moduleName} audit completed. Found ${totalIssues} schemas with issues`, 'debug');
    return this.missingRefs;
  }

  /**
   * @method prerequisiteData
   * The `prerequisiteData` function reads and parses JSON files to retrieve extension and marketplace
   * app data, and stores them in the `extensions` array.
   */
  async prerequisiteData() {
    this.log('Loading prerequisite data (extensions and marketplace apps)', 'debug');
    const extensionPath = resolve(this.config.basePath, 'extensions', 'extensions.json');
    const marketplacePath = resolve(this.config.basePath, 'marketplace_apps', 'marketplace_apps.json');

    if (existsSync(extensionPath)) {
      this.log(`Loading extensions from: ${extensionPath}`, 'debug');
      try {
        this.extensions = Object.keys(JSON.parse(readFileSync(extensionPath, 'utf8')));
        this.log(`Loaded ${this.extensions.length} extensions`, 'debug');
      } catch (error) {
        this.log(`Failed to load extensions: ${error}`, 'debug');
      }
    } else {
      this.log('No extensions.json found', 'debug');
    }

    if (existsSync(marketplacePath)) {
      this.log(`Loading marketplace apps from: ${marketplacePath}`, 'debug');
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
  }

  /**
   * The function checks if it can write the fix content to a file and if so, it writes the content as
   * JSON to the specified file path.
   */
  async writeFixContent() {
    this.log('Starting writeFixContent process', 'debug');
    let canWrite = true;
    
    if (!this.inMemoryFix && this.fix) {
      this.log('Fix mode enabled, checking write permissions', 'debug');
      if (!this.config.flags['copy-dir'] && !this.config.flags['external-config']?.skipConfirm) {
        this.log('Asking user for confirmation to write fix content', 'debug');
        canWrite = this.config.flags.yes ?? (await cliux.confirm(commonMsg.FIX_CONFIRMATION));
      } else {
        this.log('Skipping confirmation due to copy-dir or external-config flags', 'debug');
      }

      if (canWrite) {
        const filePath = join(this.folderPath, this.config.moduleConfig[this.moduleName].fileName);
        this.log(`Writing fixed schema to: ${filePath}`, 'debug');
        writeFileSync(filePath, JSON.stringify(this.schema));
        this.log(`Successfully wrote ${this.schema?.length || 0} schemas to file`, 'debug');
      } else {
        this.log('User declined to write fix content', 'debug');
      }
    } else {
      this.log('Skipping writeFixContent - not in fix mode or in-memory fix', 'debug');
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
    this.log(`Looking for references in field: ${field.uid}`, 'debug');
    const fixTypes = this.config.flags['fix-only'] ?? this.config['fix-fields'];
    this.log(`Fix types filter: ${fixTypes.join(', ')}`, 'debug');

    if (this.fix) {
      this.log('Running fix on schema', 'debug');
      field.schema = this.runFixOnSchema(tree, field.schema as ContentTypeSchemaType[]);
    }
    
    const schemaFields = field.schema ?? [];
    this.log(`Processing ${schemaFields.length} fields in schema`, 'debug');
    
    for (let child of schemaFields) {
      if (!fixTypes.includes(child.data_type) && child.data_type !== 'json') {
        this.log(`Skipping field ${child.display_name} (${child.data_type}) - not in fix types`, 'debug');
        continue;
      }
      
      this.log(`Processing field: ${child.display_name} (${child.data_type})`, 'debug');

      switch (child.data_type) {
        case 'reference':
          this.log(`Validating reference field: ${child.display_name}`, 'debug');
          const refResults = this.validateReferenceField(
            [...tree, { uid: field.uid, name: child.display_name }],
            child as ReferenceFieldDataType,
          );
          this.missingRefs[this.currentUid].push(...refResults);
          this.log(`Found ${refResults.length} missing references in field: ${child.display_name}`, 'debug');
          break;
        case 'global_field':
          this.log(`Validating global field: ${child.display_name}`, 'debug');
          await this.validateGlobalField(
            [...tree, { uid: child.uid, name: child.display_name }],
            child as GlobalFieldDataType,
          );
          break;
        case 'json':
          if ('extension' in child.field_metadata && child.field_metadata.extension) {
            if (!fixTypes.includes('json:extension')) {
              this.log(`Skipping extension field ${child.display_name} - not in fix types`, 'debug');
              continue;
            }
            this.log(`Validating extension field: ${child.display_name}`, 'debug');
            // NOTE Custom field type
            const extResults = this.validateExtensionAndAppField(
              [...tree, { uid: child.uid, name: child.display_name }],
              child as ExtensionOrAppFieldDataType,
            );
            this.missingRefs[this.currentUid].push(...extResults);
            this.log(`Found ${extResults.length} missing extension references in field: ${child.display_name}`, 'debug');
          } else if ('allow_json_rte' in child.field_metadata && child.field_metadata.allow_json_rte) {
            if (!fixTypes.includes('json:rte')) {
              this.log(`Skipping JSON RTE field ${child.display_name} - not in fix types`, 'debug');
              continue;
            }
            this.log(`Validating JSON RTE field: ${child.display_name}`, 'debug');
            // NOTE JSON RTE field type
            const rteResults = this.validateJsonRTEFields(
                [...tree, { uid: child.uid, name: child.display_name }],
                child as ReferenceFieldDataType,
              );
            this.missingRefs[this.currentUid].push(...rteResults);
            this.log(`Found ${rteResults.length} missing RTE references in field: ${child.display_name}`, 'debug');
          }
          break;
        case 'blocks':
          this.log(`Validating modular blocks field: ${child.display_name}`, 'debug');
          await this.validateModularBlocksField(
            [...tree, { uid: child.uid, name: child.display_name }],
            child as ModularBlocksDataType,
          );
          break;
        case 'group':
          this.log(`Validating group field: ${child.display_name}`, 'debug');
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
    this.log(`Validating reference field: ${field.display_name} (${field.uid})`, 'debug');
    const results = this.validateReferenceToValues(tree, field);
    this.log(`Reference field validation completed. Found ${results.length} missing references`, 'debug');
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
    this.log(`Validating extension/app field: ${field.display_name} (${field.uid})`, 'debug');
    if (this.fix) {
      this.log('Skipping extension validation in fix mode', 'debug');
      return [];
    }

    const missingRefs = [];
    let { uid, extension_uid, display_name, data_type } = field;

    this.log(`Checking if extension ${extension_uid} exists in loaded extensions`, 'debug');
    if (!this.extensions.includes(extension_uid)) {
      this.log(`Extension ${extension_uid} not found in loaded extensions`, 'debug');
      missingRefs.push({ uid, extension_uid, type: 'Extension or Apps' } as any);
    } else {
      this.log(`Extension ${extension_uid} found in loaded extensions`, 'debug');
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
    
    this.log(`Extension/app field validation completed. Found ${result.length} issues`, 'debug');
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
    this.log(`Validating global field: ${field.display_name} (${field.uid})`, 'debug');
    // NOTE Any GlobalField related logic can be added here
    if (this.moduleName === 'global-fields') {
      let { reference_to } = field;
      this.log(`Checking if global field ${reference_to} exists in schema`, 'debug');
      const refExist = find(this.schema, { uid: reference_to });
      if (!refExist) {
        this.log(`Global field ${reference_to} not found in schema`, 'debug');
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
        this.log(`Global field ${reference_to} found in schema`, 'debug');
      }
    } else if (this.moduleName === 'content-types') {
      this.log('Processing global field in content-types module', 'debug');
      if (!field.schema && !this.fix) {
        this.log(`Global field ${field.display_name} has no schema and not in fix mode`, 'debug');
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
        this.log(`Global field ${field.display_name} has schema, proceeding with validation`, 'debug');
      }
    }

    this.log(`Calling lookForReference for global field: ${field.display_name}`, 'debug');
    await this.lookForReference(tree, field);
    this.log(`Global field validation completed: ${field.display_name}`, 'debug');
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
    this.log(`Validating JSON RTE field: ${field.display_name} (${field.uid})`, 'debug');
    // NOTE Other possible reference logic will be added related to JSON RTE (Ex missing assets, extensions etc.,)
    const results = this.validateReferenceToValues(tree, field);
    this.log(`JSON RTE field validation completed. Found ${results.length} missing references`, 'debug');
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
    this.log(`Validating modular blocks field: ${field.display_name} (${field.uid})`, 'debug');
    const { blocks } = field;
    this.log(`Found ${blocks.length} blocks in modular blocks field`, 'debug');
    
    this.fixModularBlocksReferences(tree, blocks);

    for (const block of blocks) {
      const { uid, title } = block;
      this.log(`Processing block: ${title} (${uid})`, 'debug');

      await this.lookForReference([...tree, { uid, name: title }], block);
    }
    this.log(`Modular blocks field validation completed: ${field.display_name}`, 'debug');
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
    this.log(`Validating group field: ${field.display_name} (${field.uid})`, 'debug');
    // NOTE Any Group Field related logic can be added here (Ex data serialization or picking any metadata for report etc.,)
    await this.lookForReference(tree, field);
    this.log(`Group field validation completed: ${field.display_name}`, 'debug');
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
    this.log(`Validating reference to values for field: ${field.display_name} (${field.uid})`, 'debug');
    if (this.fix) {
      this.log('Skipping reference validation in fix mode', 'debug');
      return [];
    }

    const missingRefs: string[] = [];
    let { reference_to, display_name, data_type } = field;

    this.log(`Reference_to type: ${Array.isArray(reference_to) ? 'array' : 'single'}, value: ${JSON.stringify(reference_to)}`, 'debug');

    if (!Array.isArray(reference_to)) {
      this.log(`Processing single reference: ${reference_to}`, 'debug');
      this.log($t(auditMsg.CT_REFERENCE_FIELD, { reference_to, data_type, display_name }), 'error');
      this.log($t(auditMsg.CT_REFERENCE_FIELD, { reference_to, display_name }), 'info');
      if (!this.config.skipRefs.includes(reference_to)) {
        this.log(`Checking if reference ${reference_to} exists in content type schema`, 'debug');
        const refExist = find(this.ctSchema, { uid: reference_to });

        if (!refExist) {
          this.log(`Reference ${reference_to} not found in schema`, 'debug');
          missingRefs.push(reference_to);
        } else {
          this.log(`Reference ${reference_to} found in schema`, 'debug');
        }
      } else {
        this.log(`Skipping reference ${reference_to} - in skip list`, 'debug');
      }
    } else {
      this.log(`Processing ${reference_to?.length || 0} references in array`, 'debug');
      for (const reference of reference_to ?? []) {
        // NOTE Can skip specific references keys (Ex, system defined keys can be skipped)
        if (this.config.skipRefs.includes(reference)) {
          this.log(`Skipping reference ${reference} - in skip list`, 'debug');
          continue;
        }

        this.log(`Checking if reference ${reference} exists in content type schema`, 'debug');
        const refExist = find(this.ctSchema, { uid: reference });

        if (!refExist) {
          this.log(`Reference ${reference} not found in schema`, 'debug');
          missingRefs.push(reference);
        } else {
          this.log(`Reference ${reference} found in schema`, 'debug');
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
    
    this.log(`Reference validation completed. Found ${missingRefs.length} missing references: ${missingRefs.join(', ')}`, 'debug');
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
    this.log(`Running fix on schema with ${schema?.length || 0} fields`, 'debug');
    // NOTE Global field Fix
    const result = schema
      ?.map((field) => {
        const { data_type, display_name, uid } = field;
        const fixTypes = this.config.flags['fix-only'] ?? this.config['fix-fields'];
        this.log(`Processing field for fix: ${display_name} (${uid}) - ${data_type}`, 'debug');

        if (!fixTypes.includes(data_type) && data_type !== 'json') {
          this.log(`Skipping field ${display_name} - not in fix types`, 'debug');
          return field;
        }

        switch (data_type) {
          case 'global_field':
            this.log(`Fixing global field references for: ${display_name}`, 'debug');
            return this.fixGlobalFieldReferences(tree, field as GlobalFieldDataType);
          case 'json':
          case 'reference':
            if (data_type === 'json') {
              if ('extension' in field.field_metadata && field.field_metadata.extension) {
                // NOTE Custom field type
                if (!fixTypes.includes('json:extension')) {
                  this.log(`Skipping extension field ${display_name} - not in fix types`, 'debug');
                  return field;
                }
                this.log(`Fixing extension/app field: ${display_name}`, 'debug');
                // NOTE Fix logic
                return this.fixMissingExtensionOrApp(tree, field as ExtensionOrAppFieldDataType);
              } else if ('allow_json_rte' in field.field_metadata && field.field_metadata.allow_json_rte) {
                if (!fixTypes.includes('json:rte')) {
                  this.log(`Skipping JSON RTE field ${display_name} - not in fix types`, 'debug');
                  return field;
                }
                this.log(`Fixing JSON RTE field: ${display_name}`, 'debug');
                return this.fixMissingReferences(tree, field as JsonRTEFieldDataType);
              }
            }
            this.log(`Fixing reference field: ${display_name}`, 'debug');
            return this.fixMissingReferences(tree, field as ReferenceFieldDataType);
          case 'blocks':
            this.log(`Fixing modular blocks field: ${display_name}`, 'debug');
            (field as ModularBlocksDataType).blocks = this.fixModularBlocksReferences(
              [...tree, { uid: field.uid, name: field.display_name, data_type: field.data_type }],
              (field as ModularBlocksDataType).blocks,
            );
            if (isEmpty((field as ModularBlocksDataType).blocks)) {
              this.log(`Modular blocks field ${display_name} became empty after fix`, 'debug');
              return null;
            }
            return field;
          case 'group':
            this.log(`Fixing group field: ${display_name}`, 'debug');
            return this.fixGroupField(tree, field as GroupFieldDataType);
          default:
            this.log(`No fix needed for field type ${data_type}: ${display_name}`, 'debug');
            return field;
        }
      })
      .filter((val: any) => {
        if (this.config.skipFieldTypes.includes(val?.data_type)) {
          this.log(`Keeping field ${val?.display_name} - in skip field types`, 'debug');
          return true;
        }
        if (
          val?.schema &&
          isEmpty(val?.schema) &&
          (!val?.data_type || this.config['schema-fields-data-type'].includes(val.data_type))
        ) {
          this.log(`Filtering out field ${val?.display_name} - empty schema`, 'debug');
          return false;
        }
        if (val?.reference_to && isEmpty(val?.reference_to) && val.data_type === 'reference') {
          this.log(`Filtering out field ${val?.display_name} - empty reference_to`, 'debug');
          return false;
        }

        return !!val;
      }) as ContentTypeSchemaType[];
    
    this.log(`Schema fix completed. ${result?.length || 0} fields remain after filtering`, 'debug');
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
    this.log(`Fixing global field references for: ${field.display_name} (${field.uid})`, 'debug');
    const { reference_to, display_name, data_type } = field;
    if (reference_to && data_type === 'global_field') {
      this.log(`Processing global field reference: ${reference_to}`, 'debug');
      tree = [...tree, { uid: field.uid, name: field.display_name, data_type: field.data_type }];
      const refExist = find(this.gfSchema, { uid: reference_to });

      if (!refExist) {
        this.log(`Global field reference ${reference_to} not found, marking as fixed`, 'debug');
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
        this.log(`Global field ${reference_to} found, copying schema to field`, 'debug');
        const gfSchema = find(this.gfSchema, { uid: field.reference_to })?.schema;
        if (gfSchema) {
          this.log(`Successfully copied schema from global field ${reference_to}`, 'debug');
          field.schema = gfSchema as GlobalFieldSchemaTypes[];
        } else {
          this.log(`Global field ${reference_to} has no schema, marking as fixed`, 'debug');
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
        this.log(`Processing global field in global-fields module: ${reference_to}`, 'debug');
        const gfSchema = find(this.gfSchema, { uid: field.reference_to })?.schema;
        if (gfSchema) {
          this.log(`Successfully copied schema from global field ${reference_to}`, 'debug');
          field.schema = gfSchema as GlobalFieldSchemaTypes[];
        } else {
          this.log(`Global field ${reference_to} has no schema, marking as fixed`, 'debug');
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
        this.log(`Running recursive fix on global field schema: ${display_name}`, 'debug');
        field.schema = this.runFixOnSchema(tree, field.schema as ContentTypeSchemaType[]);
      }
      const result = refExist ? field : null;
      this.log(`Global field fix completed for ${display_name}. Result: ${result ? 'kept' : 'removed'}`, 'debug');
      return result;
    }

    this.log(`Skipping global field fix for ${display_name} - not a global field or no reference_to`, 'debug');
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
    this.log(`Fixing modular blocks references for ${blocks?.length || 0} blocks`, 'debug');
    const result = blocks
      ?.map((block) => {
        const { reference_to, schema, title: display_name, uid } = block;
        this.log(`Processing modular block: ${display_name} (${uid})`, 'debug');
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
          this.log(`Modular block ${display_name} has no schema, marking as fixed`, 'debug');
          this.missingRefs[this.currentUid].push(refErrorObj);

          return false;
        }

        // NOTE Global field section
        if (reference_to) {
          this.log(`Checking global field reference ${reference_to} for block ${display_name}`, 'debug');
          const refExist = find(this.gfSchema, { uid: reference_to });
          if (!refExist) {
            this.log(`Global field reference ${reference_to} not found for block ${display_name}`, 'debug');
            this.missingRefs[this.currentUid].push(refErrorObj);

            return false;
          }
          if (!refExist) {
            this.missingRefs[this.currentUid].push(refErrorObj);

            return block;
          }
        }

        this.log(`Running fix on block schema for: ${display_name}`, 'debug');
        block.schema = this.runFixOnSchema(tree, block.schema as ContentTypeSchemaType[]);

        if (isEmpty(block.schema) && this.moduleName === 'content-types') {
          this.log(`Block ${display_name} became empty after fix`, 'debug');
          this.missingRefs[this.currentUid].push({
            ...refErrorObj,
            missingRefs: 'Empty schema found',
            treeStr: tree.map(({ name }) => name).join(' ➜ '),
          });

          this.log($t(auditFixMsg.EMPTY_FIX_MSG, { path: tree.map(({ name }) => name).join(' ➜ ') }), 'info');

          return null;
        }

        this.log(`Block ${display_name} fix completed successfully`, 'debug');
        return block;
      })
      .filter((val) => val) as ModularBlockType[];
    
    this.log(`Modular blocks fix completed. ${result?.length || 0} blocks remain`, 'debug');
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
    this.log(`Fixing missing extension/app for field: ${field.display_name} (${field.uid})`, 'debug');
    const missingRefs: string[] = [];
    const { uid, extension_uid, data_type, display_name } = field;

    this.log(`Checking if extension ${extension_uid} exists in loaded extensions`, 'debug');
    if (!this.extensions.includes(extension_uid)) {
      this.log(`Extension ${extension_uid} not found, adding to missing refs`, 'debug');
      missingRefs.push({ uid, extension_uid, type: 'Extension or Apps' } as any);
    } else {
      this.log(`Extension ${extension_uid} found in loaded extensions`, 'debug');
    }

    if (this.fix && !isEmpty(missingRefs)) {
      this.log(`Fix mode enabled and missing refs found, marking as fixed`, 'debug');
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

    this.log(`Extension/app fix completed for ${display_name}. Result: ${missingRefs.length > 0 ? 'issues found' : 'no issues'}`, 'debug');
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
    this.log(`Fixing missing references for field: ${field.display_name} (${field.uid})`, 'debug');
    let fixStatus;
    const missingRefs: string[] = [];
    const { reference_to, data_type, display_name } = field;
    
    this.log(`Reference_to type: ${Array.isArray(reference_to) ? 'array' : 'single'}, value: ${JSON.stringify(reference_to)}`, 'debug');
    
    if (!Array.isArray(reference_to)) {
      this.log(`Processing single reference: ${reference_to}`, 'debug');
      this.log($t(auditMsg.CT_REFERENCE_FIELD, { reference_to, display_name }), 'error');
      this.log($t(auditMsg.CT_REFERENCE_FIELD, { reference_to, display_name }), 'info');
      if (!this.config.skipRefs.includes(reference_to)) {
        this.log(`Checking if reference ${reference_to} exists in content type schema`, 'debug');
        const refExist = find(this.ctSchema, { uid: reference_to });

        if (!refExist) {
          this.log(`Reference ${reference_to} not found, adding to missing refs`, 'debug');
          missingRefs.push(reference_to);
        } else {
          this.log(`Reference ${reference_to} found in schema`, 'debug');
        }
      } else {
        this.log(`Skipping reference ${reference_to} - in skip list`, 'debug');
      }

      this.log(`Converting single reference to array format`, 'debug');
      field.reference_to = [reference_to];
      field.field_metadata = {
        ...field.field_metadata,
        ref_multiple_content_types: true,
      };
    } else {
      this.log(`Processing ${reference_to?.length || 0} references in array`, 'debug');
      for (const reference of reference_to ?? []) {
        // NOTE Can skip specific references keys (Ex, system defined keys can be skipped)
        if (this.config.skipRefs.includes(reference)) {
          this.log(`Skipping reference ${reference} - in skip list`, 'debug');
          continue;
        }

        this.log(`Checking if reference ${reference} exists in content type schema`, 'debug');
        const refExist = find(this.ctSchema, { uid: reference });

        if (!refExist) {
          this.log(`Reference ${reference} not found, adding to missing refs`, 'debug');
          missingRefs.push(reference);
        } else {
          this.log(`Reference ${reference} found in schema`, 'debug');
        }
      }
    }

    this.log(`Found ${missingRefs.length} missing references: ${missingRefs.join(', ')}`, 'debug');

    if (this.fix && !isEmpty(missingRefs)) {
      this.log(`Fix mode enabled, removing missing references from field`, 'debug');
      try {
        field.reference_to = field.reference_to.filter((ref) => !missingRefs.includes(ref));
        fixStatus = 'Fixed';
        this.log(`Successfully removed missing references. New reference_to: ${JSON.stringify(field.reference_to)}`, 'debug');
      } catch (error) {
        fixStatus = `Not Fixed (${JSON.stringify(error)})`;
        this.log(`Failed to remove missing references: ${error}`, 'debug');
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

    this.log(`Missing references fix completed for ${display_name}. Status: ${fixStatus || 'no fix needed'}`, 'debug');
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
    this.log(`Fixing group field: ${field.display_name} (${field.uid})`, 'debug');
    const { data_type, display_name } = field;

    this.log(`Running fix on group field schema for: ${display_name}`, 'debug');
    field.schema = this.runFixOnSchema(tree, field.schema as ContentTypeSchemaType[]);

    if (isEmpty(field.schema)) {
      this.log(`Group field ${display_name} became empty after fix`, 'debug');
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
      this.log($t(auditFixMsg.EMPTY_FIX_MSG, { path: tree.map(({ name }) => name).join(' ➜ ') }), 'info');

      return null;
    }

    this.log(`Group field fix completed successfully for: ${display_name}`, 'debug');
    return field;
  }
}
