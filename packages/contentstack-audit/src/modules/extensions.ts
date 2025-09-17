import path, { join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { cloneDeep } from 'lodash';
import { LogFn, ConfigType, ContentTypeStruct, CtConstructorParam, ModuleConstructorParam, Extension } from '../types';
import { sanitizePath, cliux } from '@contentstack/cli-utilities';

import auditConfig from '../config';
import { $t, auditMsg, commonMsg } from '../messages';
import { values } from 'lodash';

export default class Extensions {
  public log: LogFn;
  protected fix: boolean;
  public fileName: any;
  public config: ConfigType;
  public folderPath: string;
  public extensionsSchema: Extension[];
  public ctSchema: ContentTypeStruct[];
  public moduleName: keyof typeof auditConfig.moduleConfig;
  public ctUidSet: Set<string>;
  public missingCtInExtensions: Extension[];
  public missingCts: Set<string>;
  public extensionsPath: string;

  constructor({
    log,
    fix,
    config,
    moduleName,
    ctSchema,
  }: ModuleConstructorParam & Pick<CtConstructorParam, 'ctSchema'>) {
    this.log = log;
    this.config = config;
    this.fix = fix ?? false;
    this.ctSchema = ctSchema;
    this.extensionsSchema = [];
    
    this.log(`Initializing Extensions module`, 'debug');
    this.log(`Fix mode: ${this.fix}`, 'debug');
    this.log(`Content types count: ${ctSchema.length}`, 'debug');
    this.log(`Module name: ${moduleName}`, 'debug');
    
    this.moduleName = this.validateModules(moduleName!, this.config.moduleConfig);
    this.fileName = config.moduleConfig[this.moduleName].fileName;
    this.log(`File name: ${this.fileName}`, 'debug');
    
    this.folderPath = resolve(
      sanitizePath(config.basePath),
      sanitizePath(config.moduleConfig[this.moduleName].dirName),
    );
    this.log(`Folder path: ${this.folderPath}`, 'debug');
    
    this.ctUidSet = new Set(['$all']);
    this.missingCtInExtensions = [];
    this.missingCts = new Set();
    this.extensionsPath = '';
    
    this.log(`Extensions module initialization completed`, 'debug');
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
    
    this.log(`Module ${moduleName} not found, defaulting to 'extensions'`, 'debug');
    return 'extensions';
  }

  async run() {
    this.log(`Starting ${this.moduleName} audit process`, 'debug');
    this.log(`Extensions folder path: ${this.folderPath}`, 'debug');
    this.log(`Fix mode: ${this.fix}`, 'debug');
    
    if (!existsSync(this.folderPath)) {
      this.log(`Skipping ${this.moduleName} audit - path does not exist`, 'debug');
      this.log(`Skipping ${this.moduleName} audit`, 'warn');
      this.log($t(auditMsg.NOT_VALID_PATH, { path: this.folderPath }), { color: 'yellow' });
      return {};
    }

    this.extensionsPath = path.join(this.folderPath, this.fileName);
    this.log(`Extensions file path: ${this.extensionsPath}`, 'debug');

    this.log(`Loading extensions schema from file`, 'debug');
    this.extensionsSchema = existsSync(this.extensionsPath)
      ? values(JSON.parse(readFileSync(this.extensionsPath, 'utf-8')) as Extension[])
      : [];
    this.log(`Loaded ${this.extensionsSchema.length} extensions`, 'debug');

    this.log(`Building content type UID set from ${this.ctSchema.length} content types`, 'debug');
    this.ctSchema.map((ct) => this.ctUidSet.add(ct.uid));
    this.log(`Content type UID set contains: ${Array.from(this.ctUidSet).join(', ')}`, 'debug');

    this.log(`Processing ${this.extensionsSchema.length} extensions`, 'debug');
    for (const ext of this.extensionsSchema) {
      const { title, uid, scope } = ext;
      this.log(`Processing extension: ${title} (${uid})`, 'debug');
      this.log(`Extension scope content types: ${scope?.content_types?.join(', ') || 'none'}`, 'debug');
      
      const ctNotPresent = scope?.content_types.filter((ct) => !this.ctUidSet.has(ct));
      this.log(`Missing content types in extension: ${ctNotPresent?.join(', ') || 'none'}`, 'debug');

      if (ctNotPresent?.length && ext.scope) {
        this.log(`Extension ${title} has ${ctNotPresent.length} missing content types`, 'debug');
        ext.content_types = ctNotPresent;
        ctNotPresent.forEach((ct) => {
          this.log(`Adding missing content type: ${ct}`, 'debug');
          this.missingCts?.add(ct);
        });
        this.missingCtInExtensions?.push(cloneDeep(ext));
      } else {
        this.log(`Extension ${title} has no missing content types`, 'debug');
      }

      this.log(
        $t(auditMsg.SCAN_EXT_SUCCESS_MSG, {
          title,
          module: this.config.moduleConfig[this.moduleName].name,
          uid,
        }),
        'info',
      );
    }

    this.log(`Extensions audit completed. Found ${this.missingCtInExtensions.length} extensions with missing content types`, 'debug');
    this.log(`Total missing content types: ${this.missingCts.size}`, 'debug');

    if (this.fix && this.missingCtInExtensions.length) {
      this.log(`Fix mode enabled, fixing ${this.missingCtInExtensions.length} extensions`, 'debug');
      await this.fixExtensionsScope(cloneDeep(this.missingCtInExtensions));
      this.missingCtInExtensions.forEach((ext) => {
        this.log(`Marking extension ${ext.title} as fixed`, 'debug');
        ext.fixStatus = 'Fixed';
      });
      this.log(`Extensions fix completed`, 'debug');
      return this.missingCtInExtensions;
    }
    
    this.log(`Extensions audit completed without fixes`, 'debug');
    return this.missingCtInExtensions;
  }

  async fixExtensionsScope(missingCtInExtensions: Extension[]) {
    this.log(`Starting extensions scope fix for ${missingCtInExtensions.length} extensions`, 'debug');
    
    this.log(`Loading current extensions schema from: ${this.extensionsPath}`, 'debug');
    let newExtensionSchema: Record<string, Extension> = existsSync(this.extensionsPath)
      ? JSON.parse(readFileSync(this.extensionsPath, 'utf8'))
      : {};
    this.log(`Loaded ${Object.keys(newExtensionSchema).length} existing extensions`, 'debug');
    
    for (const ext of missingCtInExtensions) {
      const { uid, title } = ext;
      this.log(`Fixing extension: ${title} (${uid})`, 'debug');
      this.log(`Extension scope content types: ${ext?.scope?.content_types?.join(', ') || 'none'}`, 'debug');
      
      const fixedCts = ext?.scope?.content_types.filter((ct) => !this.missingCts.has(ct));
      this.log(`Valid content types after filtering: ${fixedCts?.join(', ') || 'none'}`, 'debug');
      
      if (fixedCts?.length && newExtensionSchema[uid]?.scope) {
        this.log(`Updating extension ${title} scope with ${fixedCts.length} valid content types`, 'debug');
        newExtensionSchema[uid].scope.content_types = fixedCts;
      } else {
        this.log(`Extension ${title} has no valid content types or scope not found`, 'debug');
        this.log($t(commonMsg.EXTENSION_FIX_WARN, { title: title, uid }), { color: 'yellow' });
        const shouldDelete = this.config.flags.yes || (await cliux.confirm(commonMsg.EXTENSION_FIX_CONFIRMATION));
        if (shouldDelete) {
          this.log(`Deleting extension: ${title} (${uid})`, 'debug');
          delete newExtensionSchema[uid];
        } else {
          this.log(`Keeping extension: ${title} (${uid})`, 'debug');
        }
      }
    }
    
    this.log(`Extensions scope fix completed, writing updated schema`, 'debug');
    await this.writeFixContent(newExtensionSchema);
  }

  async writeFixContent(fixedExtensions: Record<string, Extension>) {
    this.log(`Writing fix content for ${Object.keys(fixedExtensions).length} extensions`, 'debug');
    this.log(`Fix mode: ${this.fix}`, 'debug');
    this.log(`Copy directory flag: ${this.config.flags['copy-dir']}`, 'debug');
    this.log(`External config skip confirm: ${this.config.flags['external-config']?.skipConfirm}`, 'debug');
    this.log(`Yes flag: ${this.config.flags.yes}`, 'debug');
    
    if (
      this.fix &&
      (this.config.flags['copy-dir'] ||
        this.config.flags['external-config']?.skipConfirm ||
        this.config.flags.yes ||
        (await cliux.confirm(commonMsg.FIX_CONFIRMATION)))
    ) {
      const outputPath = join(this.folderPath, this.config.moduleConfig[this.moduleName].fileName);
      this.log(`Writing fixed extensions to: ${outputPath}`, 'debug');
      this.log(`Extensions to write: ${Object.keys(fixedExtensions).join(', ')}`, 'debug');
      
      writeFileSync(outputPath, JSON.stringify(fixedExtensions));
      this.log(`Successfully wrote fixed extensions to file`, 'debug');
    } else {
      this.log(`Skipping file write - fix mode disabled or user declined confirmation`, 'debug');
    }
  }
}
