import map from 'lodash/map';
import { join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

import { FsUtility, Locale, sanitizePath, cliux } from '@contentstack/cli-utilities';

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
  FieldRuleStruct,
} from '../types';
import auditConfig from '../config';
import { $t, auditFixMsg, auditMsg, commonMsg } from '../messages';
import { MarketplaceAppsInstallationData } from '../types/extension';
import { values } from 'lodash';

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
  protected missingEnvLocale: Record<string, any> = {};
  public entryMetaData: Record<string, any>[] = [];
  public action: string[] = ['show', 'hide'];
  constructor({ log, fix, config, moduleName, ctSchema, gfSchema }: ModuleConstructorParam & CtConstructorParam) {
    this.log = log;
    this.config = config;
    this.fix = fix ?? false;
    this.ctSchema = ctSchema;
    this.gfSchema = gfSchema;
    
    this.log(`Initializing FieldRule module`, 'debug');
    this.log(`Fix mode: ${this.fix}`, 'debug');
    this.log(`Content types count: ${ctSchema?.length || 0}`, 'debug');
    this.log(`Global fields count: ${gfSchema?.length || 0}`, 'debug');
    this.log(`Module name: ${moduleName}`, 'debug');
    
    this.moduleName = this.validateModules(moduleName!, this.config.moduleConfig);
    this.fileName = config.moduleConfig[this.moduleName].fileName;
    this.log(`File name: ${this.fileName}`, 'debug');
    
    this.folderPath = resolve(
      sanitizePath(config.basePath),
      sanitizePath(config.moduleConfig[this.moduleName].dirName),
    );
    this.log(`Folder path: ${this.folderPath}`, 'debug');
    
    this.log(`FieldRule module initialization completed`, 'debug');
  }

  validateModules(
    moduleName: keyof typeof auditConfig.moduleConfig,
    moduleConfig: Record<string, unknown>,
  ): keyof typeof auditConfig.moduleConfig {
    this.log(`Validating module: ${moduleName}`, 'debug');
    this.log(`Available modules: ${Object.keys(moduleConfig).join(', ')}`, 'debug');
    
    if (Object.keys(moduleConfig).includes(moduleName)) {
      this.log(`Module ${moduleName} is valid`, 'debug');
      return moduleName;
    }
    
    this.log(`Module ${moduleName} not found, defaulting to 'content-types'`, 'debug');
    return 'content-types';
  }
  /**
   * The `run` function checks if a folder path exists, sets the schema based on the module name,
   * iterates over the schema and looks for references, and returns a list of missing references.
   * @returns the `missingRefs` object.
   */
  async run() {
    this.log(`Starting ${this.moduleName} field rules audit process`, 'debug');
    this.log(`Field rules folder path: ${this.folderPath}`, 'debug');
    this.log(`Fix mode: ${this.fix}`, 'debug');
    
    if (!existsSync(this.folderPath)) {
      this.log(`Skipping ${this.moduleName} audit - path does not exist`, 'debug');
      this.log(`Skipping ${this.moduleName} audit`, 'warn');
      this.log($t(auditMsg.NOT_VALID_PATH, { path: this.folderPath }), { color: 'yellow' });
      return {};
    }

    this.schema = this.moduleName === 'content-types' ? this.ctSchema : this.gfSchema;
    this.log(`Using ${this.moduleName} schema with ${this.schema?.length || 0} items`, 'debug');
    
    this.log(`Loading prerequisite data`, 'debug');
    await this.prerequisiteData();
    this.log(`Loaded ${this.extensions.length} extensions`, 'debug');
    
    this.log(`Preparing entry metadata`, 'debug');
    await this.prepareEntryMetaData();
    this.log(`Prepared metadata for ${this.entryMetaData.length} entries`, 'debug');
    
    this.log(`Processing ${this.schema?.length || 0} schemas for field rules`, 'debug');
    for (const schema of this.schema ?? []) {
      this.currentUid = schema.uid;
      this.currentTitle = schema.title;
      this.missingRefs[this.currentUid] = [];
      const { uid, title } = schema;
      
      this.log(`Processing schema: ${title} (${uid})`, 'debug');
      this.log(`Field rules count: ${Array.isArray(schema.field_rules) ? schema.field_rules.length : 0}`, 'debug');

      this.log(`Looking for references in schema: ${title}`, 'debug');
      await this.lookForReference([{ uid, name: title }], schema, null);
      this.log(`Schema map contains ${this.schemaMap.length} field references`, 'debug');

      this.missingRefs[this.currentUid] = [];

      if (this.fix) {
        this.log(`Fixing field rules for schema: ${title}`, 'debug');
        this.fixFieldRules(schema);
      } else {
        this.log(`Validating field rules for schema: ${title}`, 'debug');
        this.validateFieldRules(schema);
      }

      this.schemaMap = [];
      this.log(
        $t(auditMsg.SCAN_CT_SUCCESS_MSG, { title, module: this.config.moduleConfig[this.moduleName].name }),
        'info',
      );
    }

    if (this.fix) {
      this.log(`Fix mode enabled, writing fix content`, 'debug');
      await this.writeFixContent();
    }

    this.log(`Cleaning up empty missing references`, 'debug');
    for (let propName in this.missingRefs) {
      if (!this.missingRefs[propName].length) {
        this.log(`Removing empty missing references for: ${propName}`, 'debug');
        delete this.missingRefs[propName];
      }
    }

    this.log(`Field rules audit completed. Found ${Object.keys(this.missingRefs).length} schemas with issues`, 'debug');
    return this.missingRefs;
  }

  validateFieldRules(schema: Record<string, unknown>): void {
    this.log(`Validating field rules for schema: ${schema.uid}`, 'debug');
    
    if (Array.isArray(schema.field_rules)) {
      this.log(`Found ${schema.field_rules.length} field rules to validate`, 'debug');
      let count = 0;
      
      schema.field_rules.forEach((fr, index) => {
        this.log(`Validating field rule ${index + 1}`, 'debug');
        this.log(`Field rule actions count: ${fr.actions?.length || 0}`, 'debug');
        this.log(`Field rule conditions count: ${fr.conditions?.length || 0}`, 'debug');
        
        fr.actions.forEach((actions: { target_field: any }, actionIndex: number) => {
          this.log(`Validating action ${actionIndex + 1}: target_field=${actions.target_field}`, 'debug');
          
          if (!this.schemaMap.includes(actions.target_field)) {
            this.log(`Missing target field: ${actions.target_field}`, 'debug');
            this.log(
              $t(auditMsg.FIELD_RULE_TARGET_ABSENT, {
                target_field: actions.target_field,
                ctUid: schema.uid as string,
              }),
              'error',
            );

            this.addMissingReferences(actions);
          } else {
            this.log(`Target field ${actions.target_field} is valid`, 'debug');
          }
          this.log(
            $t(auditMsg.FIELD_RULE_TARGET_SCAN_MESSAGE, { num: count.toString(), ctUid: schema.uid as string }),
            'info',
          );
        });

        fr.conditions.forEach((actions: { operand_field: any }, conditionIndex: number) => {
          this.log(`Validating condition ${conditionIndex + 1}: operand_field=${actions.operand_field}`, 'debug');
          
          if (!this.schemaMap.includes(actions.operand_field)) {
            this.log(`Missing operand field: ${actions.operand_field}`, 'debug');
            this.addMissingReferences(actions);

            this.log($t(auditMsg.FIELD_RULE_CONDITION_ABSENT, { condition_field: actions.operand_field }), 'error');
          } else {
            this.log(`Operand field ${actions.operand_field} is valid`, 'debug');
          }
          this.log(
            $t(auditMsg.FIELD_RULE_CONDITION_SCAN_MESSAGE, { num: count.toString(), ctUid: schema.uid as string }),
            'info',
          );
        });
        count = count + 1;
      });
    } else {
      this.log(`No field rules found in schema: ${schema.uid}`, 'debug');
    }
    
    this.log(`Field rules validation completed for schema: ${schema.uid}`, 'debug');
  }

  fixFieldRules(schema: Record<string, unknown>): void {
    this.log(`Fixing field rules for schema: ${schema.uid}`, 'debug');
    
    if (!Array.isArray(schema.field_rules)) {
      this.log(`No field rules found in schema: ${schema.uid}`, 'debug');
      return;
    }
    
    this.log(`Found ${schema.field_rules.length} field rules to fix`, 'debug');
  
    schema.field_rules = schema.field_rules
      .map((fr: FieldRuleStruct, index: number) => {
        this.log(`Fixing field rule ${index + 1}`, 'debug');
        this.log(`Original actions count: ${fr.actions?.length || 0}`, 'debug');
        this.log(`Original conditions count: ${fr.conditions?.length || 0}`, 'debug');
        
        const validActions = fr.actions?.filter(action => {
          const isValid = this.schemaMap.includes(action.target_field);
          this.log(`Action target_field=${action.target_field}, valid=${isValid}`, 'debug');
          
          const logMsg = isValid 
            ? auditMsg.FIELD_RULE_TARGET_SCAN_MESSAGE
            : auditMsg.FIELD_RULE_TARGET_ABSENT;
          
          this.log(
            $t(logMsg, { 
              num: index.toString(), 
              ctUid: schema.uid as string,
              ...(action.target_field && { target_field: action.target_field })
            }),
            isValid ? 'info' : 'error'
          );
  
          if (!isValid) {
            this.log(`Fixing invalid action target_field: ${action.target_field}`, 'debug');
            this.addMissingReferences(action, 'Fixed');
            this.log(
              $t(auditFixMsg.FIELD_RULE_FIX_MESSAGE, { 
                num: index.toString(), 
                ctUid: schema.uid as string 
              }),
              'info'
            );
          }
          return isValid;
        }) ?? [];
        
        this.log(`Valid actions after filtering: ${validActions.length}`, 'debug');
  
        const validConditions = fr.conditions?.filter(condition => {
          const isValid = this.schemaMap.includes(condition.operand_field);
          this.log(`Condition operand_field=${condition.operand_field}, valid=${isValid}`, 'debug');
          
          const logMsg = isValid 
            ? auditMsg.FIELD_RULE_CONDITION_SCAN_MESSAGE
            : auditMsg.FIELD_RULE_CONDITION_ABSENT;
          
          this.log(
            $t(logMsg, { 
              num: index.toString(), 
              ctUid: schema.uid as string,
              ...(condition.operand_field && { condition_field: condition.operand_field })
            }),
            isValid ? 'info' : 'error'
          );
  
          if (!isValid) {
            this.log(`Fixing invalid condition operand_field: ${condition.operand_field}`, 'debug');
            this.addMissingReferences(condition, 'Fixed');
            this.log(
              $t(auditFixMsg.FIELD_RULE_FIX_MESSAGE, { 
                num: index.toString(), 
                ctUid: schema.uid as string 
              }),
              'info'
            );
          }
          return isValid;
        }) ?? [];
        
        this.log(`Valid conditions after filtering: ${validConditions.length}`, 'debug');
  
        const shouldKeepRule = validActions.length && validConditions.length;
        this.log(`Field rule ${index + 1} ${shouldKeepRule ? 'kept' : 'removed'} (actions: ${validActions.length}, conditions: ${validConditions.length})`, 'debug');
        
        return shouldKeepRule ? {
          ...fr,
          actions: validActions,
          conditions: validConditions
        } : null;
      })
      .filter(Boolean);
      
    this.log(`Field rules fix completed for schema: ${schema.uid}. ${(schema.field_rules as any[]).length} rules remaining`, 'debug');
  }


  addMissingReferences(actions: Record<string, unknown>, fixStatus?: string) {
    this.log(`Adding missing reference for schema: ${this.currentUid}`, 'debug');
    this.log(`Action data: ${JSON.stringify(actions)}`, 'debug');
    this.log(`Fix status: ${fixStatus || 'none'}`, 'debug');
    
    if (fixStatus) {
      this.log(`Recording fixed missing reference`, 'debug');
      this.missingRefs[this.currentUid].push({
        ctUid: this.currentUid,
        action: actions,
        fixStatus: 'Fixed',
      });
    } else {
      this.log(`Recording missing reference for validation`, 'debug');
      this.missingRefs[this.currentUid].push({ ctUid: this.currentUid, action: actions });
    }
    
    this.log(`Missing references count for ${this.currentUid}: ${this.missingRefs[this.currentUid].length}`, 'debug');
  }
  /**
   * @method prerequisiteData
   * The `prerequisiteData` function reads and parses JSON files to retrieve extension and marketplace
   * app data, and stores them in the `extensions` array.
   */
  async prerequisiteData(): Promise<void> {
    this.log(`Loading prerequisite data`, 'debug');
    
    const extensionPath = resolve(this.config.basePath, 'extensions', 'extensions.json');
    const marketplacePath = resolve(this.config.basePath, 'marketplace_apps', 'marketplace_apps.json');
    
    this.log(`Extensions path: ${extensionPath}`, 'debug');
    this.log(`Marketplace apps path: ${marketplacePath}`, 'debug');

    if (existsSync(extensionPath)) {
      this.log(`Loading extensions from file`, 'debug');
      try {
        this.extensions = Object.keys(JSON.parse(readFileSync(extensionPath, 'utf8')));
        this.log(`Loaded ${this.extensions.length} extensions`, 'debug');
      } catch (error) {
        this.log(`Error loading extensions: ${error}`, 'debug');
      }
    } else {
      this.log(`Extensions file not found`, 'debug');
    }

    if (existsSync(marketplacePath)) {
      this.log(`Loading marketplace apps from file`, 'debug');
      try {
        const marketplaceApps: MarketplaceAppsInstallationData[] = JSON.parse(readFileSync(marketplacePath, 'utf8'));
        this.log(`Found ${marketplaceApps.length} marketplace apps`, 'debug');

        for (const app of marketplaceApps) {
          this.log(`Processing marketplace app: ${app.uid}`, 'debug');
          const metaData = map(map(app?.ui_location?.locations, 'meta').flat(), 'extension_uid').filter(
            (val) => val,
          ) as string[];
          this.log(`Found ${metaData.length} extension UIDs in app`, 'debug');
          this.extensions.push(...metaData);
        }
      } catch (error) {
        this.log(`Error loading marketplace apps: ${error}`, 'debug');
      }
    } else {
      this.log(`Marketplace apps file not found`, 'debug');
    }
    
    this.log(`Prerequisite data loading completed. Total extensions: ${this.extensions.length}`, 'debug');
  }

  /**
   * The function checks if it can write the fix content to a file and if so, it writes the content as
   * JSON to the specified file path.
   */
  async writeFixContent(): Promise<void> {
    this.log(`Writing fix content`, 'debug');
    this.log(`Fix mode: ${this.fix}`, 'debug');
    this.log(`Copy directory flag: ${this.config.flags['copy-dir']}`, 'debug');
    this.log(`External config skip confirm: ${this.config.flags['external-config']?.skipConfirm}`, 'debug');
    this.log(`Yes flag: ${this.config.flags.yes}`, 'debug');
    
    let canWrite = true;

    if (this.fix) {
      if (!this.config.flags['copy-dir'] && !this.config.flags['external-config']?.skipConfirm) {
        this.log(`Asking user for confirmation to write fix content`, 'debug');
        canWrite = this.config.flags.yes ?? (await cliux.confirm(commonMsg.FIX_CONFIRMATION));
        this.log(`User confirmation: ${canWrite}`, 'debug');
      } else {
        this.log(`Skipping confirmation due to flags`, 'debug');
      }

      if (canWrite) {
        const outputPath = join(this.folderPath, this.config.moduleConfig[this.moduleName].fileName);
        this.log(`Writing fixed schema to: ${outputPath}`, 'debug');
        this.log(`Schema items to write: ${this.schema?.length || 0}`, 'debug');
        
        writeFileSync(outputPath, JSON.stringify(this.schema));
        this.log(`Successfully wrote fixed schema to file`, 'debug');
      } else {
        this.log(`Skipping file write - user declined confirmation`, 'debug');
      }
    } else {
      this.log(`Skipping file write - fix mode disabled`, 'debug');
    }
  }

  async lookForReference(
    tree: Record<string, unknown>[],
    field: ContentTypeStruct | GlobalFieldDataType | ModularBlockType | GroupFieldDataType,
    parent: string | null = null,
  ): Promise<void> {
    this.log(`Looking for references in field: ${(field as any).uid || (field as any).title || 'unknown'}`, 'debug');
    this.log(`Parent: ${parent || 'none'}`, 'debug');
    this.log(`Schema fields count: ${field.schema?.length || 0}`, 'debug');
    
    const fixTypes = this.config.flags['fix-only'] ?? this.config['fix-fields'];
    this.log(`Fix types: ${fixTypes.join(', ')}`, 'debug');

    for (let child of field.schema ?? []) {
      const fieldPath = parent !== null ? `${parent}.${child?.uid}` : child.uid;
      this.log(`Processing field: ${child.uid} (${child.data_type}) at path: ${fieldPath}`, 'debug');
      
      if (parent !== null) {
        this.schemaMap.push(`${parent}.${child?.uid}`);
      } else {
        this.schemaMap.push(child.uid);
      }

      if (!fixTypes.includes(child.data_type) && child.data_type !== 'json') {
        this.log(`Skipping field ${child.uid} - data type ${child.data_type} not in fix types`, 'debug');
        continue;
      }

      this.log(`Validating field ${child.uid} of type ${child.data_type}`, 'debug');
      switch (child.data_type) {
        case 'global_field':
          this.log(`Validating global field: ${child.uid}`, 'debug');
          await this.validateGlobalField(
            [...tree, { uid: child.uid, name: child.display_name }],
            child as GlobalFieldDataType,
            parent ? `${parent}.${child?.uid}` : child?.uid,
          );
          break;
        case 'blocks':
          this.log(`Validating modular blocks field: ${child.uid}`, 'debug');
          await this.validateModularBlocksField(
            [...tree, { uid: child.uid, name: child.display_name }],
            child as ModularBlocksDataType,
            parent ? `${parent}.${child?.uid}` : child?.uid,
          );
          break;
        case 'group':
          this.log(`Validating group field: ${child.uid}`, 'debug');
          await this.validateGroupField(
            [...tree, { uid: child.uid, name: child.display_name }],
            child as GroupFieldDataType,
            parent ?`${parent}.${child?.uid}` : child?.uid,
          );
          break;
      }
    }
    
    this.log(`Reference lookup completed for field: ${(field as any).uid || (field as any).title || 'unknown'}`, 'debug');
  }

  async validateGlobalField(
    tree: Record<string, unknown>[],
    field: GlobalFieldDataType,
    parent: string | null,
  ): Promise<void> {
    this.log(`Validating global field: ${field.uid} (${field.display_name})`, 'debug');
    this.log(`Tree depth: ${tree.length}`, 'debug');
    this.log(`Parent: ${parent || 'none'}`, 'debug');
    
    await this.lookForReference(tree, field, parent);
    this.log(`Global field validation completed: ${field.uid}`, 'debug');
  }

  async validateModularBlocksField(
    tree: Record<string, unknown>[],
    field: ModularBlocksDataType,
    parent: string | null,
  ): Promise<void> {
    this.log(`Validating modular blocks field: ${field.uid} (${field.display_name})`, 'debug');
    this.log(`Tree depth: ${tree.length}`, 'debug');
    this.log(`Parent: ${parent || 'none'}`, 'debug');
    
    const { blocks } = field;
    this.log(`Found ${blocks.length} blocks to validate`, 'debug');
    
    for (const block of blocks) {
      const { uid, title } = block;
      this.log(`Validating block: ${uid} (${title})`, 'debug');
      
      const updatedTree = [...tree, { uid, name: title }];
      const blockParent = parent + '.' + block.uid;
      this.log(`Updated tree depth: ${updatedTree.length}, block parent: ${blockParent}`, 'debug');

      await this.lookForReference(updatedTree, block, blockParent);
      this.log(`Block validation completed: ${uid}`, 'debug');
    }
    
    this.log(`Modular blocks field validation completed: ${field.uid}`, 'debug');
  }

  async validateGroupField(
    tree: Record<string, unknown>[],
    field: GroupFieldDataType,
    parent: string | null,
  ): Promise<void> {
    this.log(`Validating group field: ${field.uid} (${field.display_name})`, 'debug');
    this.log(`Tree depth: ${tree.length}`, 'debug');
    this.log(`Parent: ${parent || 'none'}`, 'debug');
    
    // NOTE Any Group Field related logic can be added here (Ex data serialization or picking any metadata for report etc.,)
    await this.lookForReference(tree, field, parent);
    this.log(`Group field validation completed: ${field.uid}`, 'debug');
  }

  async prepareEntryMetaData() {
    this.log(`Preparing entry metadata`, 'debug');
    this.log(auditMsg.PREPARING_ENTRY_METADATA, 'info');
    const localesFolderPath = resolve(this.config.basePath, this.config.moduleConfig.locales.dirName);
    const localesPath = join(localesFolderPath, this.config.moduleConfig.locales.fileName);
    const masterLocalesPath = join(localesFolderPath, 'master-locale.json');
    
    this.log(`Locales folder path: ${localesFolderPath}`, 'debug');
    this.log(`Locales path: ${localesPath}`, 'debug');
    this.log(`Master locales path: ${masterLocalesPath}`, 'debug');
    
    this.log(`Loading master locales`, 'debug');
    this.locales = existsSync(masterLocalesPath) ? values(JSON.parse(readFileSync(masterLocalesPath, 'utf8'))) : [];
    this.log(`Loaded ${this.locales.length} master locales`, 'debug');

    if (existsSync(localesPath)) {
      this.log(`Loading additional locales from file`, 'debug');
      this.locales.push(...values(JSON.parse(readFileSync(localesPath, 'utf8'))));
      this.log(`Total locales after loading: ${this.locales.length}`, 'debug');
    } else {
      this.log(`Additional locales file not found`, 'debug');
    }

    const entriesFolderPath = resolve(sanitizePath(this.config.basePath), 'entries');
    this.log(`Entries folder path: ${entriesFolderPath}`, 'debug');
    this.log(`Processing ${this.locales.length} locales and ${this.ctSchema?.length || 0} content types`, 'debug');
    
    for (const { code } of this.locales) {
      this.log(`Processing locale: ${code}`, 'debug');
      for (const { uid } of this.ctSchema??[]) {
        this.log(`Processing content type: ${uid}`, 'debug');
        let basePath = join(entriesFolderPath, uid, code);
        this.log(`Base path: ${basePath}`, 'debug');
        
        let fsUtility = new FsUtility({ basePath, indexFileName: 'index.json' });
        let indexer = fsUtility.indexFileContent;
        this.log(`Found ${Object.keys(indexer).length} entry files`, 'debug');

        for (const _ in indexer) {
          this.log(`Loading entries from file`, 'debug');
          const entries = (await fsUtility.readChunkFiles.next()) as Record<string, EntryStruct>;
          this.log(`Loaded ${Object.keys(entries).length} entries`, 'debug');
          
          for (const entryUid in entries) {
            let { title } = entries[entryUid];
            this.entryMetaData.push({ uid: entryUid, title, ctUid: uid });
          }
        }
      }
    }
    
    this.log(`Entry metadata preparation completed. Total entries: ${this.entryMetaData.length}`, 'debug');
  }
}
