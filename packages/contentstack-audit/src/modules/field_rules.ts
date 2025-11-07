import map from 'lodash/map';
import { join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

import { FsUtility, Locale, sanitizePath, cliux, log } from '@contentstack/cli-utilities';

import {
  ConfigType,
  ModularBlockType,
  ContentTypeStruct,
  GroupFieldDataType,
  CtConstructorParam,
  GlobalFieldDataType,
  ModularBlocksDataType,
  ModuleConstructorParam,
  EntryStruct,
  FieldRuleStruct,
} from '../types';
import auditConfig from '../config';
import { $t, auditFixMsg, auditMsg, commonMsg } from '../messages';
import { MarketplaceAppsInstallationData } from '../types/extension';
import { values } from 'lodash';

/* The `ContentType` class is responsible for scanning content types, looking for references, and
generating a report in JSON and CSV formats. */
export default class FieldRule {
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
  protected missingEnvLocale: Record<string, any> = {};
  public entryMetaData: Record<string, any>[] = [];
  public action: string[] = ['show', 'hide'];
  constructor({ fix, config, moduleName, ctSchema, gfSchema }: ModuleConstructorParam & CtConstructorParam) {
    this.config = config;
    this.fix = fix ?? false;
    this.ctSchema = ctSchema;
    this.gfSchema = gfSchema;
    
    log.debug(`Initializing FieldRule module`, this.config.auditContext);
    log.debug(`Fix mode: ${this.fix}`, this.config.auditContext);
    log.debug(`Content types count: ${ctSchema?.length || 0}`, this.config.auditContext);
    log.debug(`Global fields count: ${gfSchema?.length || 0}`, this.config.auditContext);
    log.debug(`Module name: ${moduleName}`, this.config.auditContext);
    
    this.moduleName = this.validateModules(moduleName!, this.config.moduleConfig);
    this.fileName = config.moduleConfig[this.moduleName].fileName;
    log.debug(`File name: ${this.fileName}`, this.config.auditContext);
    
    this.folderPath = resolve(
      sanitizePath(config.basePath),
      sanitizePath(config.moduleConfig[this.moduleName].dirName),
    );
    log.debug(`Folder path: ${this.folderPath}`, this.config.auditContext);
    
    log.debug(`FieldRule module initialization completed`, this.config.auditContext);
  }

  validateModules(
    moduleName: keyof typeof auditConfig.moduleConfig,
    moduleConfig: Record<string, unknown>,
  ): keyof typeof auditConfig.moduleConfig {
    log.debug(`Validating module: ${moduleName}`, this.config.auditContext);
    log.debug(`Available modules: ${Object.keys(moduleConfig).join(', ')}`, this.config.auditContext);
    
    if (Object.keys(moduleConfig).includes(moduleName)) {
      log.debug(`Module ${moduleName} is valid`, this.config.auditContext);
      return moduleName;
    }
    
    log.debug(`Module ${moduleName} not found, defaulting to 'content-types'`, this.config.auditContext);
    return 'content-types';
  }
  /**
   * The `run` function checks if a folder path exists, sets the schema based on the module name,
   * iterates over the schema and looks for references, and returns a list of missing references.
   * @returns the `missingRefs` object.
   */
  async run() {
    log.debug(`Starting ${this.moduleName} field rules audit process`, this.config.auditContext);
    log.debug(`Field rules folder path: ${this.folderPath}`, this.config.auditContext);
    log.debug(`Fix mode: ${this.fix}`, this.config.auditContext);
    
    if (!existsSync(this.folderPath)) {
      log.debug(`Skipping ${this.moduleName} audit - path does not exist`, this.config.auditContext);
      log.warn(`Skipping ${this.moduleName} audit`, this.config.auditContext);
      cliux.print($t(auditMsg.NOT_VALID_PATH, { path: this.folderPath }), { color: 'yellow' });
      return {};
    }

    this.schema = this.moduleName === 'content-types' ? this.ctSchema : this.gfSchema;
    log.debug(`Using ${this.moduleName} schema with ${this.schema?.length || 0} items`, this.config.auditContext);
    
    log.debug(`Loading prerequisite data`, this.config.auditContext);
    await this.prerequisiteData();
    log.debug(`Loaded ${this.extensions.length} extensions`, this.config.auditContext);
    
    log.debug(`Preparing entry metadata`, this.config.auditContext);
    await this.prepareEntryMetaData();
    log.debug(`Prepared metadata for ${this.entryMetaData.length} entries`, this.config.auditContext);
    
    log.debug(`Processing ${this.schema?.length || 0} schemas for field rules`, this.config.auditContext);
    for (const schema of this.schema ?? []) {
      this.currentUid = schema.uid;
      this.currentTitle = schema.title;
      this.missingRefs[this.currentUid] = [];
      const { uid, title } = schema;
      
      log.debug(`Processing schema: ${title} (${uid})`, this.config.auditContext);
      log.debug(`Field rules count: ${Array.isArray(schema.field_rules) ? schema.field_rules.length : 0}`, this.config.auditContext);

      log.debug(`Looking for references in schema: ${title}`, this.config.auditContext);
      await this.lookForReference([{ uid, name: title }], schema, null);
      log.debug(`Schema map contains ${this.schemaMap.length} field references`, this.config.auditContext);

      this.missingRefs[this.currentUid] = [];

      if (this.fix) {
        log.debug(`Fixing field rules for schema: ${title}`, this.config.auditContext);
        this.fixFieldRules(schema);
      } else {
        log.debug(`Validating field rules for schema: ${title}`, this.config.auditContext);
        this.validateFieldRules(schema);
      }

      this.schemaMap = [];
      log.info(
        $t(auditMsg.SCAN_CT_SUCCESS_MSG, { title, module: this.config.moduleConfig[this.moduleName].name }),
        this.config.auditContext
      );
    }

    if (this.fix) {
      log.debug(`Fix mode enabled, writing fix content`, this.config.auditContext);
      await this.writeFixContent();
    }

    log.debug(`Cleaning up empty missing references`, this.config.auditContext);
    for (let propName in this.missingRefs) {
      if (!this.missingRefs[propName].length) {
        log.debug(`Removing empty missing references for: ${propName}`, this.config.auditContext);
        delete this.missingRefs[propName];
      }
    }

    log.debug(`Field rules audit completed. Found ${Object.keys(this.missingRefs).length} schemas with issues`, this.config.auditContext);
    return this.missingRefs;
  }

  validateFieldRules(schema: Record<string, unknown>): void {
    log.debug(`Validating field rules for schema: ${schema.uid}`, this.config.auditContext);
    
    if (Array.isArray(schema.field_rules)) {
      log.debug(`Found ${schema.field_rules.length} field rules to validate`, this.config.auditContext);
      let count = 0;
      
      schema.field_rules.forEach((fr, index) => {
        log.debug(`Validating field rule ${index + 1}`, this.config.auditContext);
        log.debug(`Field rule actions count: ${fr.actions?.length || 0}`, this.config.auditContext);
        log.debug(`Field rule conditions count: ${fr.conditions?.length || 0}`, this.config.auditContext);
        
        fr.actions.forEach((actions: { target_field: any }, actionIndex: number) => {
          log.debug(`Validating action ${actionIndex + 1}: target_field=${actions.target_field}`, this.config.auditContext);
          
          if (!this.schemaMap.includes(actions.target_field)) {
            log.debug(`Missing target field: ${actions.target_field}`, this.config.auditContext);
            log.error(
              $t(auditMsg.FIELD_RULE_TARGET_ABSENT, {
                target_field: actions.target_field,
                ctUid: schema.uid as string,
              }),
              this.config.auditContext
            );

            this.addMissingReferences(actions);
          } else {
            log.debug(`Target field ${actions.target_field} is valid`, this.config.auditContext);
          }
          log.info(
            $t(auditMsg.FIELD_RULE_TARGET_SCAN_MESSAGE, { num: count.toString(), ctUid: schema.uid as string }),
            this.config.auditContext
          );
        });

        fr.conditions.forEach((actions: { operand_field: any }, conditionIndex: number) => {
          log.debug(`Validating condition ${conditionIndex + 1}: operand_field=${actions.operand_field}`, this.config.auditContext);
          
          if (!this.schemaMap.includes(actions.operand_field)) {
            log.debug(`Missing operand field: ${actions.operand_field}`, this.config.auditContext);
            this.addMissingReferences(actions);

            log.error($t(auditMsg.FIELD_RULE_CONDITION_ABSENT, { condition_field: actions.operand_field }), this.config.auditContext);
          } else {
            log.debug(`Operand field ${actions.operand_field} is valid`, this.config.auditContext);
          }
          log.info(
            $t(auditMsg.FIELD_RULE_CONDITION_SCAN_MESSAGE, { num: count.toString(), ctUid: schema.uid as string }),
            this.config.auditContext
          );
        });
        count = count + 1;
      });
    } else {
      log.debug(`No field rules found in schema: ${schema.uid}`, this.config.auditContext);
    }
    
    log.debug(`Field rules validation completed for schema: ${schema.uid}`, this.config.auditContext);
  }

  fixFieldRules(schema: Record<string, unknown>): void {
    log.debug(`Fixing field rules for schema: ${schema.uid}`, this.config.auditContext);
    
    if (!Array.isArray(schema.field_rules)) {
      log.debug(`No field rules found in schema: ${schema.uid}`, this.config.auditContext);
      return;
    }
    
    log.debug(`Found ${schema.field_rules.length} field rules to fix`, this.config.auditContext);
  
    schema.field_rules = schema.field_rules
      .map((fr: FieldRuleStruct, index: number) => {
        log.debug(`Fixing field rule ${index + 1}`, this.config.auditContext);
        log.debug(`Original actions count: ${fr.actions?.length || 0}`, this.config.auditContext);
        log.debug(`Original conditions count: ${fr.conditions?.length || 0}`, this.config.auditContext);
        
        const validActions = fr.actions?.filter(action => {
          const isValid = this.schemaMap.includes(action.target_field);
          log.debug(`Action target_field=${action.target_field}, valid=${isValid}`, this.config.auditContext);
          
          const logMsg = isValid 
            ? auditMsg.FIELD_RULE_TARGET_SCAN_MESSAGE
            : auditMsg.FIELD_RULE_TARGET_ABSENT;
          
          if (isValid) {
            log.info(
              $t(logMsg, { 
                num: index.toString(), 
                ctUid: schema.uid as string,
                ...(action.target_field && { target_field: action.target_field })
              }),
              this.config.auditContext
            );
          } else {
            log.error(
              $t(logMsg, { 
                num: index.toString(), 
                ctUid: schema.uid as string,
                ...(action.target_field && { target_field: action.target_field })
              }),
              this.config.auditContext
            );
          }
  
          if (!isValid) {
            log.debug(`Fixing invalid action target_field: ${action.target_field}`, this.config.auditContext);
            this.addMissingReferences(action, 'Fixed');
            log.info(
              $t(auditFixMsg.FIELD_RULE_FIX_MESSAGE, { 
                num: index.toString(), 
                ctUid: schema.uid as string 
              }),
              this.config.auditContext
            );
          }
          return isValid;
        }) ?? [];
        
        log.debug(`Valid actions after filtering: ${validActions.length}`, this.config.auditContext);
  
        const validConditions = fr.conditions?.filter(condition => {
          const isValid = this.schemaMap.includes(condition.operand_field);
          log.debug(`Condition operand_field=${condition.operand_field}, valid=${isValid}`, this.config.auditContext);
          
          const logMsg = isValid 
            ? auditMsg.FIELD_RULE_CONDITION_SCAN_MESSAGE
            : auditMsg.FIELD_RULE_CONDITION_ABSENT;
          
          if (isValid) {
            log.info(
              $t(logMsg, { 
                num: index.toString(), 
                ctUid: schema.uid as string,
                ...(condition.operand_field && { condition_field: condition.operand_field })
              }),
              this.config.auditContext
            );
          } else {
            log.error(
              $t(logMsg, { 
                num: index.toString(), 
                ctUid: schema.uid as string,
                ...(condition.operand_field && { condition_field: condition.operand_field })
              }),
              this.config.auditContext
            );
          }
  
          if (!isValid) {
            log.debug(`Fixing invalid condition operand_field: ${condition.operand_field}`, this.config.auditContext);
            this.addMissingReferences(condition, 'Fixed');
            log.info(
              $t(auditFixMsg.FIELD_RULE_FIX_MESSAGE, { 
                num: index.toString(), 
                ctUid: schema.uid as string 
              }),
              this.config.auditContext
            );
          }
          return isValid;
        }) ?? [];
        
        log.debug(`Valid conditions after filtering: ${validConditions.length}`, this.config.auditContext);
  
        const shouldKeepRule = validActions.length && validConditions.length;
        log.debug(`Field rule ${index + 1} ${shouldKeepRule ? 'kept' : 'removed'} (actions: ${validActions.length}, conditions: ${validConditions.length})`, this.config.auditContext);
        
        return shouldKeepRule ? {
          ...fr,
          actions: validActions,
          conditions: validConditions
        } : null;
      })
      .filter(Boolean);
      
    log.debug(`Field rules fix completed for schema: ${schema.uid}. ${(schema.field_rules as any[]).length} rules remaining`, this.config.auditContext);
  }


  addMissingReferences(actions: Record<string, unknown>, fixStatus?: string) {
    log.debug(`Adding missing reference for schema: ${this.currentUid}`, this.config.auditContext);
    log.debug(`Action data: ${JSON.stringify(actions)}`, this.config.auditContext);
    log.debug(`Fix status: ${fixStatus || 'none'}`, this.config.auditContext);
    
    if (fixStatus) {
      log.debug(`Recording fixed missing reference`, this.config.auditContext);
      this.missingRefs[this.currentUid].push({
        ctUid: this.currentUid,
        action: actions,
        fixStatus: 'Fixed',
      });
    } else {
      log.debug(`Recording missing reference for validation`, this.config.auditContext);
      this.missingRefs[this.currentUid].push({ ctUid: this.currentUid, action: actions });
    }
    
    log.debug(`Missing references count for ${this.currentUid}: ${this.missingRefs[this.currentUid].length}`, this.config.auditContext);
  }
  /**
   * @method prerequisiteData
   * The `prerequisiteData` function reads and parses JSON files to retrieve extension and marketplace
   * app data, and stores them in the `extensions` array.
   */
  async prerequisiteData(): Promise<void> {
    log.debug(`Loading prerequisite data`, this.config.auditContext);
    
    const extensionPath = resolve(this.config.basePath, 'extensions', 'extensions.json');
    const marketplacePath = resolve(this.config.basePath, 'marketplace_apps', 'marketplace_apps.json');
    
    log.debug(`Extensions path: ${extensionPath}`, this.config.auditContext);
    log.debug(`Marketplace apps path: ${marketplacePath}`, this.config.auditContext);

    if (existsSync(extensionPath)) {
      log.debug(`Loading extensions from file`, this.config.auditContext);
      try {
        this.extensions = Object.keys(JSON.parse(readFileSync(extensionPath, 'utf8')));
        log.debug(`Loaded ${this.extensions.length} extensions`, this.config.auditContext);
      } catch (error) {
        log.debug(`Error loading extensions: ${error}`, this.config.auditContext);
      }
    } else {
      log.debug(`Extensions file not found`, this.config.auditContext);
    }

    if (existsSync(marketplacePath)) {
      log.debug(`Loading marketplace apps from file`, this.config.auditContext);
      try {
        const marketplaceApps: MarketplaceAppsInstallationData[] = JSON.parse(readFileSync(marketplacePath, 'utf8'));
        log.debug(`Found ${marketplaceApps.length} marketplace apps`, this.config.auditContext);

        for (const app of marketplaceApps) {
          log.debug(`Processing marketplace app: ${app.uid}`, this.config.auditContext);
          const metaData = map(map(app?.ui_location?.locations, 'meta').flat(), 'extension_uid').filter(
            (val) => val,
          ) as string[];
          log.debug(`Found ${metaData.length} extension UIDs in app`, this.config.auditContext);
          this.extensions.push(...metaData);
        }
      } catch (error) {
        log.debug(`Error loading marketplace apps: ${error}`, this.config.auditContext);
      }
    } else {
      log.debug(`Marketplace apps file not found`, this.config.auditContext);
    }
    
    log.debug(`Prerequisite data loading completed. Total extensions: ${this.extensions.length}`, this.config.auditContext);
  }

  /**
   * The function checks if it can write the fix content to a file and if so, it writes the content as
   * JSON to the specified file path.
   */
  async writeFixContent(): Promise<void> {
    log.debug(`Writing fix content`, this.config.auditContext);
    log.debug(`Fix mode: ${this.fix}`, this.config.auditContext);
    log.debug(`Copy directory flag: ${this.config.flags['copy-dir']}`, this.config.auditContext);
    log.debug(`External config skip confirm: ${this.config.flags['external-config']?.skipConfirm}`, this.config.auditContext);
    log.debug(`Yes flag: ${this.config.flags.yes}`, this.config.auditContext);
    
    let canWrite = true;

    if (this.fix) {
      if (!this.config.flags['copy-dir'] && !this.config.flags['external-config']?.skipConfirm) {
        log.debug(`Asking user for confirmation to write fix content`, this.config.auditContext);
        canWrite = this.config.flags.yes ?? (await cliux.confirm(commonMsg.FIX_CONFIRMATION));
        log.debug(`User confirmation: ${canWrite}`, this.config.auditContext);
      } else {
        log.debug(`Skipping confirmation due to flags`, this.config.auditContext);
      }

      if (canWrite) {
        const outputPath = join(this.folderPath, this.config.moduleConfig[this.moduleName].fileName);
        log.debug(`Writing fixed schema to: ${outputPath}`, this.config.auditContext);
        log.debug(`Schema items to write: ${this.schema?.length || 0}`, this.config.auditContext);
        
        writeFileSync(outputPath, JSON.stringify(this.schema));
        log.debug(`Successfully wrote fixed schema to file`, this.config.auditContext);
      } else {
        log.debug(`Skipping file write - user declined confirmation`, this.config.auditContext);
      }
    } else {
      log.debug(`Skipping file write - fix mode disabled`, this.config.auditContext);
    }
  }

  async lookForReference(
    tree: Record<string, unknown>[],
    field: ContentTypeStruct | GlobalFieldDataType | ModularBlockType | GroupFieldDataType,
    parent: string | null = null,
  ): Promise<void> {
    log.debug(`Looking for references in field: ${(field as any).uid || (field as any).title || 'unknown'}`, this.config.auditContext);
    log.debug(`Parent: ${parent || 'none'}`, this.config.auditContext);
    log.debug(`Schema fields count: ${field.schema?.length || 0}`, this.config.auditContext);
    
    const fixTypes = this.config.flags['fix-only'] ?? this.config['fix-fields'];
    log.debug(`Fix types: ${fixTypes.join(', ')}`, this.config.auditContext);

    for (let child of field.schema ?? []) {
      const fieldPath = parent !== null ? `${parent}.${child?.uid}` : child.uid;
      log.debug(`Processing field: ${child.uid} (${child.data_type}) at path: ${fieldPath}`, this.config.auditContext);
      
      if (parent !== null) {
        this.schemaMap.push(`${parent}.${child?.uid}`);
      } else {
        this.schemaMap.push(child.uid);
      }

      if (!fixTypes.includes(child.data_type) && child.data_type !== 'json') {
        log.debug(`Skipping field ${child.uid} - data type ${child.data_type} not in fix types`, this.config.auditContext);
        continue;
      }

      log.debug(`Validating field ${child.uid} of type ${child.data_type}`, this.config.auditContext);
      switch (child.data_type) {
        case 'global_field':
          log.debug(`Validating global field: ${child.uid}`, this.config.auditContext);
          await this.validateGlobalField(
            [...tree, { uid: child.uid, name: child.display_name }],
            child as GlobalFieldDataType,
            parent ? `${parent}.${child?.uid}` : child?.uid,
          );
          break;
        case 'blocks':
          log.debug(`Validating modular blocks field: ${child.uid}`, this.config.auditContext);
          await this.validateModularBlocksField(
            [...tree, { uid: child.uid, name: child.display_name }],
            child as ModularBlocksDataType,
            parent ? `${parent}.${child?.uid}` : child?.uid,
          );
          break;
        case 'group':
          log.debug(`Validating group field: ${child.uid}`, this.config.auditContext);
          await this.validateGroupField(
            [...tree, { uid: child.uid, name: child.display_name }],
            child as GroupFieldDataType,
            parent ?`${parent}.${child?.uid}` : child?.uid,
          );
          break;
      }
    }
    
    log.debug(`Reference lookup completed for field: ${(field as any).uid || (field as any).title || 'unknown'}`, this.config.auditContext);
  }

  async validateGlobalField(
    tree: Record<string, unknown>[],
    field: GlobalFieldDataType,
    parent: string | null,
  ): Promise<void> {
    log.debug(`Validating global field: ${field.uid} (${field.display_name})`, this.config.auditContext);
    log.debug(`Tree depth: ${tree.length}`, this.config.auditContext);
    log.debug(`Parent: ${parent || 'none'}`, this.config.auditContext);
    
    await this.lookForReference(tree, field, parent);
    log.debug(`Global field validation completed: ${field.uid}`, this.config.auditContext);
  }

  async validateModularBlocksField(
    tree: Record<string, unknown>[],
    field: ModularBlocksDataType,
    parent: string | null,
  ): Promise<void> {
    log.debug(`Validating modular blocks field: ${field.uid} (${field.display_name})`, this.config.auditContext);
    log.debug(`Tree depth: ${tree.length}`, this.config.auditContext);
    log.debug(`Parent: ${parent || 'none'}`, this.config.auditContext);
    
    const { blocks } = field;
    log.debug(`Found ${blocks.length} blocks to validate`, this.config.auditContext);
    
    for (const block of blocks) {
      const { uid, title } = block;
      log.debug(`Validating block: ${uid} (${title})`, this.config.auditContext);
      
      const updatedTree = [...tree, { uid, name: title }];
      const blockParent = parent + '.' + block.uid;
      log.debug(`Updated tree depth: ${updatedTree.length}, block parent: ${blockParent}`, this.config.auditContext);

      await this.lookForReference(updatedTree, block, blockParent);
      log.debug(`Block validation completed: ${uid}`, this.config.auditContext);
    }
    
    log.debug(`Modular blocks field validation completed: ${field.uid}`, this.config.auditContext);
  }

  async validateGroupField(
    tree: Record<string, unknown>[],
    field: GroupFieldDataType,
    parent: string | null,
  ): Promise<void> {
    log.debug(`Validating group field: ${field.uid} (${field.display_name})`, this.config.auditContext);
    log.debug(`Tree depth: ${tree.length}`, this.config.auditContext);
    log.debug(`Parent: ${parent || 'none'}`, this.config.auditContext);
    
    // NOTE Any Group Field related logic can be added here (Ex data serialization or picking any metadata for report etc.,)
    await this.lookForReference(tree, field, parent);
    log.debug(`Group field validation completed: ${field.uid}`, this.config.auditContext);
  }

  async prepareEntryMetaData() {
    log.debug(`Preparing entry metadata`, this.config.auditContext);
    log.info(auditMsg.PREPARING_ENTRY_METADATA, this.config.auditContext);
    const localesFolderPath = resolve(this.config.basePath, this.config.moduleConfig.locales.dirName);
    const localesPath = join(localesFolderPath, this.config.moduleConfig.locales.fileName);
    const masterLocalesPath = join(localesFolderPath, 'master-locale.json');
    
    log.debug(`Locales folder path: ${localesFolderPath}`, this.config.auditContext);
    log.debug(`Locales path: ${localesPath}`, this.config.auditContext);
    log.debug(`Master locales path: ${masterLocalesPath}`, this.config.auditContext);
    
    log.debug(`Loading master locales`, this.config.auditContext);
    this.locales = existsSync(masterLocalesPath) ? values(JSON.parse(readFileSync(masterLocalesPath, 'utf8'))) : [];
    log.debug(`Loaded ${this.locales.length} master locales`, this.config.auditContext);

    if (existsSync(localesPath)) {
      log.debug(`Loading additional locales from file`, this.config.auditContext);
      this.locales.push(...values(JSON.parse(readFileSync(localesPath, 'utf8'))));
      log.debug(`Total locales after loading: ${this.locales.length}`, this.config.auditContext);
    } else {
      log.debug(`Additional locales file not found`, this.config.auditContext);
    }

    const entriesFolderPath = resolve(sanitizePath(this.config.basePath), 'entries');
    log.debug(`Entries folder path: ${entriesFolderPath}`, this.config.auditContext);
    log.debug(`Processing ${this.locales.length} locales and ${this.ctSchema?.length || 0} content types`, this.config.auditContext);
    
    for (const { code } of this.locales) {
      log.debug(`Processing locale: ${code}`, this.config.auditContext);
      for (const { uid } of this.ctSchema??[]) {
        log.debug(`Processing content type: ${uid}`, this.config.auditContext);
        let basePath = join(entriesFolderPath, uid, code);
        log.debug(`Base path: ${basePath}`, this.config.auditContext);
        
        let fsUtility = new FsUtility({ basePath, indexFileName: 'index.json' });
        let indexer = fsUtility.indexFileContent;
        log.debug(`Found ${Object.keys(indexer).length} entry files`, this.config.auditContext);

        for (const _ in indexer) {
          log.debug(`Loading entries from file`, this.config.auditContext);
          const entries = (await fsUtility.readChunkFiles.next()) as Record<string, EntryStruct>;
          log.debug(`Loaded ${Object.keys(entries).length} entries`, this.config.auditContext);
          
          for (const entryUid in entries) {
            let { title } = entries[entryUid];
            this.entryMetaData.push({ uid: entryUid, title, ctUid: uid });
          }
        }
      }
    }
    
    log.debug(`Entry metadata preparation completed. Total entries: ${this.entryMetaData.length}`, this.config.auditContext);
  }
}
