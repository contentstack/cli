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
    
    log.debug(`Initializing FieldRule module`);
    log.debug(`Fix mode: ${this.fix}`);
    log.debug(`Content types count: ${ctSchema?.length || 0}`);
    log.debug(`Global fields count: ${gfSchema?.length || 0}`);
    log.debug(`Module name: ${moduleName}`);
    
    this.moduleName = this.validateModules(moduleName!, this.config.moduleConfig);
    this.fileName = config.moduleConfig[this.moduleName].fileName;
    log.debug(`File name: ${this.fileName}`);
    
    this.folderPath = resolve(
      sanitizePath(config.basePath),
      sanitizePath(config.moduleConfig[this.moduleName].dirName),
    );
    log.debug(`Folder path: ${this.folderPath}`);
    
    log.debug(`FieldRule module initialization completed`);
  }

  validateModules(
    moduleName: keyof typeof auditConfig.moduleConfig,
    moduleConfig: Record<string, unknown>,
  ): keyof typeof auditConfig.moduleConfig {
    log.debug(`Validating module: ${moduleName}`);
    log.debug(`Available modules: ${Object.keys(moduleConfig).join(', ')}`);
    
    if (Object.keys(moduleConfig).includes(moduleName)) {
      log.debug(`Module ${moduleName} is valid`);
      return moduleName;
    }
    
    log.debug(`Module ${moduleName} not found, defaulting to 'content-types'`);
    return 'content-types';
  }
  /**
   * The `run` function checks if a folder path exists, sets the schema based on the module name,
   * iterates over the schema and looks for references, and returns a list of missing references.
   * @returns the `missingRefs` object.
   */
  async run() {
    log.debug(`Starting ${this.moduleName} field rules audit process`);
    log.debug(`Field rules folder path: ${this.folderPath}`);
    log.debug(`Fix mode: ${this.fix}`);
    
    if (!existsSync(this.folderPath)) {
      log.debug(`Skipping ${this.moduleName} audit - path does not exist`);
      log.warn(`Skipping ${this.moduleName} audit`);
      cliux.print($t(auditMsg.NOT_VALID_PATH, { path: this.folderPath }), { color: 'yellow' });
      return {};
    }

    this.schema = this.moduleName === 'content-types' ? this.ctSchema : this.gfSchema;
    log.debug(`Using ${this.moduleName} schema with ${this.schema?.length || 0} items`);
    
    log.debug(`Loading prerequisite data`);
    await this.prerequisiteData();
    log.debug(`Loaded ${this.extensions.length} extensions`);
    
    log.debug(`Preparing entry metadata`);
    await this.prepareEntryMetaData();
    log.debug(`Prepared metadata for ${this.entryMetaData.length} entries`);
    
    log.debug(`Processing ${this.schema?.length || 0} schemas for field rules`);
    for (const schema of this.schema ?? []) {
      this.currentUid = schema.uid;
      this.currentTitle = schema.title;
      this.missingRefs[this.currentUid] = [];
      const { uid, title } = schema;
      
      log.debug(`Processing schema: ${title} (${uid})`);
      log.debug(`Field rules count: ${Array.isArray(schema.field_rules) ? schema.field_rules.length : 0}`);

      log.debug(`Looking for references in schema: ${title}`);
      await this.lookForReference([{ uid, name: title }], schema, null);
      log.debug(`Schema map contains ${this.schemaMap.length} field references`);

      this.missingRefs[this.currentUid] = [];

      if (this.fix) {
        log.debug(`Fixing field rules for schema: ${title}`);
        this.fixFieldRules(schema);
      } else {
        log.debug(`Validating field rules for schema: ${title}`);
        this.validateFieldRules(schema);
      }

      this.schemaMap = [];
      log.info(
        $t(auditMsg.SCAN_CT_SUCCESS_MSG, { title, module: this.config.moduleConfig[this.moduleName].name })
      );
    }

    if (this.fix) {
      log.debug(`Fix mode enabled, writing fix content`);
      await this.writeFixContent();
    }

    log.debug(`Cleaning up empty missing references`);
    for (let propName in this.missingRefs) {
      if (!this.missingRefs[propName].length) {
        log.debug(`Removing empty missing references for: ${propName}`);
        delete this.missingRefs[propName];
      }
    }

    log.debug(`Field rules audit completed. Found ${Object.keys(this.missingRefs).length} schemas with issues`);
    return this.missingRefs;
  }

  validateFieldRules(schema: Record<string, unknown>): void {
    log.debug(`Validating field rules for schema: ${schema.uid}`);
    
    if (Array.isArray(schema.field_rules)) {
      log.debug(`Found ${schema.field_rules.length} field rules to validate`);
      let count = 0;
      
      schema.field_rules.forEach((fr, index) => {
        log.debug(`Validating field rule ${index + 1}`);
        log.debug(`Field rule actions count: ${fr.actions?.length || 0}`);
        log.debug(`Field rule conditions count: ${fr.conditions?.length || 0}`);
        
        fr.actions.forEach((actions: { target_field: any }, actionIndex: number) => {
          log.debug(`Validating action ${actionIndex + 1}: target_field=${actions.target_field}`);
          
          if (!this.schemaMap.includes(actions.target_field)) {
            log.debug(`Missing target field: ${actions.target_field}`);
            log.error(
              $t(auditMsg.FIELD_RULE_TARGET_ABSENT, {
                target_field: actions.target_field,
                ctUid: schema.uid as string,
              })
            );

            this.addMissingReferences(actions);
          } else {
            log.debug(`Target field ${actions.target_field} is valid`);
          }
          log.info(
            $t(auditMsg.FIELD_RULE_TARGET_SCAN_MESSAGE, { num: count.toString(), ctUid: schema.uid as string })
          );
        });

        fr.conditions.forEach((actions: { operand_field: any }, conditionIndex: number) => {
          log.debug(`Validating condition ${conditionIndex + 1}: operand_field=${actions.operand_field}`);
          
          if (!this.schemaMap.includes(actions.operand_field)) {
            log.debug(`Missing operand field: ${actions.operand_field}`);
            this.addMissingReferences(actions);

            log.error($t(auditMsg.FIELD_RULE_CONDITION_ABSENT, { condition_field: actions.operand_field }));
          } else {
            log.debug(`Operand field ${actions.operand_field} is valid`);
          }
          log.info(
            $t(auditMsg.FIELD_RULE_CONDITION_SCAN_MESSAGE, { num: count.toString(), ctUid: schema.uid as string })
          );
        });
        count = count + 1;
      });
    } else {
      log.debug(`No field rules found in schema: ${schema.uid}`);
    }
    
    log.debug(`Field rules validation completed for schema: ${schema.uid}`);
  }

  fixFieldRules(schema: Record<string, unknown>): void {
    log.debug(`Fixing field rules for schema: ${schema.uid}`);
    
    if (!Array.isArray(schema.field_rules)) {
      log.debug(`No field rules found in schema: ${schema.uid}`);
      return;
    }
    
    log.debug(`Found ${schema.field_rules.length} field rules to fix`);
  
    schema.field_rules = schema.field_rules
      .map((fr: FieldRuleStruct, index: number) => {
        log.debug(`Fixing field rule ${index + 1}`);
        log.debug(`Original actions count: ${fr.actions?.length || 0}`);
        log.debug(`Original conditions count: ${fr.conditions?.length || 0}`);
        
        const validActions = fr.actions?.filter(action => {
          const isValid = this.schemaMap.includes(action.target_field);
          log.debug(`Action target_field=${action.target_field}, valid=${isValid}`);
          
          const logMsg = isValid 
            ? auditMsg.FIELD_RULE_TARGET_SCAN_MESSAGE
            : auditMsg.FIELD_RULE_TARGET_ABSENT;
          
          if (isValid) {
            log.info(
              $t(logMsg, { 
                num: index.toString(), 
                ctUid: schema.uid as string,
                ...(action.target_field && { target_field: action.target_field })
              })
            );
          } else {
            log.error(
              $t(logMsg, { 
                num: index.toString(), 
                ctUid: schema.uid as string,
                ...(action.target_field && { target_field: action.target_field })
              })
            );
          }
  
          if (!isValid) {
            log.debug(`Fixing invalid action target_field: ${action.target_field}`);
            this.addMissingReferences(action, 'Fixed');
            log.info(
              $t(auditFixMsg.FIELD_RULE_FIX_MESSAGE, { 
                num: index.toString(), 
                ctUid: schema.uid as string 
              })
            );
          }
          return isValid;
        }) ?? [];
        
        log.debug(`Valid actions after filtering: ${validActions.length}`);
  
        const validConditions = fr.conditions?.filter(condition => {
          const isValid = this.schemaMap.includes(condition.operand_field);
          log.debug(`Condition operand_field=${condition.operand_field}, valid=${isValid}`);
          
          const logMsg = isValid 
            ? auditMsg.FIELD_RULE_CONDITION_SCAN_MESSAGE
            : auditMsg.FIELD_RULE_CONDITION_ABSENT;
          
          if (isValid) {
            log.info(
              $t(logMsg, { 
                num: index.toString(), 
                ctUid: schema.uid as string,
                ...(condition.operand_field && { condition_field: condition.operand_field })
              })
            );
          } else {
            log.error(
              $t(logMsg, { 
                num: index.toString(), 
                ctUid: schema.uid as string,
                ...(condition.operand_field && { condition_field: condition.operand_field })
              })
            );
          }
  
          if (!isValid) {
            log.debug(`Fixing invalid condition operand_field: ${condition.operand_field}`);
            this.addMissingReferences(condition, 'Fixed');
            log.info(
              $t(auditFixMsg.FIELD_RULE_FIX_MESSAGE, { 
                num: index.toString(), 
                ctUid: schema.uid as string 
              })
            );
          }
          return isValid;
        }) ?? [];
        
        log.debug(`Valid conditions after filtering: ${validConditions.length}`);
  
        const shouldKeepRule = validActions.length && validConditions.length;
        log.debug(`Field rule ${index + 1} ${shouldKeepRule ? 'kept' : 'removed'} (actions: ${validActions.length}, conditions: ${validConditions.length})`);
        
        return shouldKeepRule ? {
          ...fr,
          actions: validActions,
          conditions: validConditions
        } : null;
      })
      .filter(Boolean);
      
    log.debug(`Field rules fix completed for schema: ${schema.uid}. ${(schema.field_rules as any[]).length} rules remaining`);
  }


  addMissingReferences(actions: Record<string, unknown>, fixStatus?: string) {
    log.debug(`Adding missing reference for schema: ${this.currentUid}`);
    log.debug(`Action data: ${JSON.stringify(actions)}`);
    log.debug(`Fix status: ${fixStatus || 'none'}`);
    
    if (fixStatus) {
      log.debug(`Recording fixed missing reference`);
      this.missingRefs[this.currentUid].push({
        ctUid: this.currentUid,
        action: actions,
        fixStatus: 'Fixed',
      });
    } else {
      log.debug(`Recording missing reference for validation`);
      this.missingRefs[this.currentUid].push({ ctUid: this.currentUid, action: actions });
    }
    
    log.debug(`Missing references count for ${this.currentUid}: ${this.missingRefs[this.currentUid].length}`);
  }
  /**
   * @method prerequisiteData
   * The `prerequisiteData` function reads and parses JSON files to retrieve extension and marketplace
   * app data, and stores them in the `extensions` array.
   */
  async prerequisiteData(): Promise<void> {
    log.debug(`Loading prerequisite data`);
    
    const extensionPath = resolve(this.config.basePath, 'extensions', 'extensions.json');
    const marketplacePath = resolve(this.config.basePath, 'marketplace_apps', 'marketplace_apps.json');
    
    log.debug(`Extensions path: ${extensionPath}`);
    log.debug(`Marketplace apps path: ${marketplacePath}`);

    if (existsSync(extensionPath)) {
      log.debug(`Loading extensions from file`);
      try {
        this.extensions = Object.keys(JSON.parse(readFileSync(extensionPath, 'utf8')));
        log.debug(`Loaded ${this.extensions.length} extensions`);
      } catch (error) {
        log.debug(`Error loading extensions: ${error}`);
      }
    } else {
      log.debug(`Extensions file not found`);
    }

    if (existsSync(marketplacePath)) {
      log.debug(`Loading marketplace apps from file`);
      try {
        const marketplaceApps: MarketplaceAppsInstallationData[] = JSON.parse(readFileSync(marketplacePath, 'utf8'));
        log.debug(`Found ${marketplaceApps.length} marketplace apps`);

        for (const app of marketplaceApps) {
          log.debug(`Processing marketplace app: ${app.uid}`);
          const metaData = map(map(app?.ui_location?.locations, 'meta').flat(), 'extension_uid').filter(
            (val) => val,
          ) as string[];
          log.debug(`Found ${metaData.length} extension UIDs in app`);
          this.extensions.push(...metaData);
        }
      } catch (error) {
        log.debug(`Error loading marketplace apps: ${error}`);
      }
    } else {
      log.debug(`Marketplace apps file not found`);
    }
    
    log.debug(`Prerequisite data loading completed. Total extensions: ${this.extensions.length}`);
  }

  /**
   * The function checks if it can write the fix content to a file and if so, it writes the content as
   * JSON to the specified file path.
   */
  async writeFixContent(): Promise<void> {
    log.debug(`Writing fix content`);
    log.debug(`Fix mode: ${this.fix}`);
    log.debug(`Copy directory flag: ${this.config.flags['copy-dir']}`);
    log.debug(`External config skip confirm: ${this.config.flags['external-config']?.skipConfirm}`);
    log.debug(`Yes flag: ${this.config.flags.yes}`);
    
    let canWrite = true;

    if (this.fix) {
      if (!this.config.flags['copy-dir'] && !this.config.flags['external-config']?.skipConfirm) {
        log.debug(`Asking user for confirmation to write fix content`);
        canWrite = this.config.flags.yes ?? (await cliux.confirm(commonMsg.FIX_CONFIRMATION));
        log.debug(`User confirmation: ${canWrite}`);
      } else {
        log.debug(`Skipping confirmation due to flags`);
      }

      if (canWrite) {
        const outputPath = join(this.folderPath, this.config.moduleConfig[this.moduleName].fileName);
        log.debug(`Writing fixed schema to: ${outputPath}`);
        log.debug(`Schema items to write: ${this.schema?.length || 0}`);
        
        writeFileSync(outputPath, JSON.stringify(this.schema));
        log.debug(`Successfully wrote fixed schema to file`);
      } else {
        log.debug(`Skipping file write - user declined confirmation`);
      }
    } else {
      log.debug(`Skipping file write - fix mode disabled`);
    }
  }

  async lookForReference(
    tree: Record<string, unknown>[],
    field: ContentTypeStruct | GlobalFieldDataType | ModularBlockType | GroupFieldDataType,
    parent: string | null = null,
  ): Promise<void> {
    log.debug(`Looking for references in field: ${(field as any).uid || (field as any).title || 'unknown'}`);
    log.debug(`Parent: ${parent || 'none'}`);
    log.debug(`Schema fields count: ${field.schema?.length || 0}`);
    
    const fixTypes = this.config.flags['fix-only'] ?? this.config['fix-fields'];
    log.debug(`Fix types: ${fixTypes.join(', ')}`);

    for (let child of field.schema ?? []) {
      const fieldPath = parent !== null ? `${parent}.${child?.uid}` : child.uid;
      log.debug(`Processing field: ${child.uid} (${child.data_type}) at path: ${fieldPath}`);
      
      if (parent !== null) {
        this.schemaMap.push(`${parent}.${child?.uid}`);
      } else {
        this.schemaMap.push(child.uid);
      }

      if (!fixTypes.includes(child.data_type) && child.data_type !== 'json') {
        log.debug(`Skipping field ${child.uid} - data type ${child.data_type} not in fix types`);
        continue;
      }

      log.debug(`Validating field ${child.uid} of type ${child.data_type}`);
      switch (child.data_type) {
        case 'global_field':
          log.debug(`Validating global field: ${child.uid}`);
          await this.validateGlobalField(
            [...tree, { uid: child.uid, name: child.display_name }],
            child as GlobalFieldDataType,
            parent ? `${parent}.${child?.uid}` : child?.uid,
          );
          break;
        case 'blocks':
          log.debug(`Validating modular blocks field: ${child.uid}`);
          await this.validateModularBlocksField(
            [...tree, { uid: child.uid, name: child.display_name }],
            child as ModularBlocksDataType,
            parent ? `${parent}.${child?.uid}` : child?.uid,
          );
          break;
        case 'group':
          log.debug(`Validating group field: ${child.uid}`);
          await this.validateGroupField(
            [...tree, { uid: child.uid, name: child.display_name }],
            child as GroupFieldDataType,
            parent ?`${parent}.${child?.uid}` : child?.uid,
          );
          break;
      }
    }
    
    log.debug(`Reference lookup completed for field: ${(field as any).uid || (field as any).title || 'unknown'}`);
  }

  async validateGlobalField(
    tree: Record<string, unknown>[],
    field: GlobalFieldDataType,
    parent: string | null,
  ): Promise<void> {
    log.debug(`Validating global field: ${field.uid} (${field.display_name})`);
    log.debug(`Tree depth: ${tree.length}`);
    log.debug(`Parent: ${parent || 'none'}`);
    
    await this.lookForReference(tree, field, parent);
    log.debug(`Global field validation completed: ${field.uid}`);
  }

  async validateModularBlocksField(
    tree: Record<string, unknown>[],
    field: ModularBlocksDataType,
    parent: string | null,
  ): Promise<void> {
    log.debug(`Validating modular blocks field: ${field.uid} (${field.display_name})`);
    log.debug(`Tree depth: ${tree.length}`);
    log.debug(`Parent: ${parent || 'none'}`);
    
    const { blocks } = field;
    log.debug(`Found ${blocks.length} blocks to validate`);
    
    for (const block of blocks) {
      const { uid, title } = block;
      log.debug(`Validating block: ${uid} (${title})`);
      
      const updatedTree = [...tree, { uid, name: title }];
      const blockParent = parent + '.' + block.uid;
      log.debug(`Updated tree depth: ${updatedTree.length}, block parent: ${blockParent}`);

      await this.lookForReference(updatedTree, block, blockParent);
      log.debug(`Block validation completed: ${uid}`);
    }
    
    log.debug(`Modular blocks field validation completed: ${field.uid}`);
  }

  async validateGroupField(
    tree: Record<string, unknown>[],
    field: GroupFieldDataType,
    parent: string | null,
  ): Promise<void> {
    log.debug(`Validating group field: ${field.uid} (${field.display_name})`);
    log.debug(`Tree depth: ${tree.length}`);
    log.debug(`Parent: ${parent || 'none'}`);
    
    // NOTE Any Group Field related logic can be added here (Ex data serialization or picking any metadata for report etc.,)
    await this.lookForReference(tree, field, parent);
    log.debug(`Group field validation completed: ${field.uid}`);
  }

  async prepareEntryMetaData() {
    log.debug(`Preparing entry metadata`);
    log.info(auditMsg.PREPARING_ENTRY_METADATA);
    const localesFolderPath = resolve(this.config.basePath, this.config.moduleConfig.locales.dirName);
    const localesPath = join(localesFolderPath, this.config.moduleConfig.locales.fileName);
    const masterLocalesPath = join(localesFolderPath, 'master-locale.json');
    
    log.debug(`Locales folder path: ${localesFolderPath}`);
    log.debug(`Locales path: ${localesPath}`);
    log.debug(`Master locales path: ${masterLocalesPath}`);
    
    log.debug(`Loading master locales`);
    this.locales = existsSync(masterLocalesPath) ? values(JSON.parse(readFileSync(masterLocalesPath, 'utf8'))) : [];
    log.debug(`Loaded ${this.locales.length} master locales`);

    if (existsSync(localesPath)) {
      log.debug(`Loading additional locales from file`);
      this.locales.push(...values(JSON.parse(readFileSync(localesPath, 'utf8'))));
      log.debug(`Total locales after loading: ${this.locales.length}`);
    } else {
      log.debug(`Additional locales file not found`);
    }

    const entriesFolderPath = resolve(sanitizePath(this.config.basePath), 'entries');
    log.debug(`Entries folder path: ${entriesFolderPath}`);
    log.debug(`Processing ${this.locales.length} locales and ${this.ctSchema?.length || 0} content types`);
    
    for (const { code } of this.locales) {
      log.debug(`Processing locale: ${code}`);
      for (const { uid } of this.ctSchema??[]) {
        log.debug(`Processing content type: ${uid}`);
        let basePath = join(entriesFolderPath, uid, code);
        log.debug(`Base path: ${basePath}`);
        
        let fsUtility = new FsUtility({ basePath, indexFileName: 'index.json' });
        let indexer = fsUtility.indexFileContent;
        log.debug(`Found ${Object.keys(indexer).length} entry files`);

        for (const _ in indexer) {
          log.debug(`Loading entries from file`);
          const entries = (await fsUtility.readChunkFiles.next()) as Record<string, EntryStruct>;
          log.debug(`Loaded ${Object.keys(entries).length} entries`);
          
          for (const entryUid in entries) {
            let { title } = entries[entryUid];
            this.entryMetaData.push({ uid: entryUid, title, ctUid: uid });
          }
        }
      }
    }
    
    log.debug(`Entry metadata preparation completed. Total entries: ${this.entryMetaData.length}`);
  }
}
