import path, { join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { cloneDeep } from 'lodash';
import { ConfigType, ContentTypeStruct, CtConstructorParam, ModuleConstructorParam, Extension } from '../types';
import { sanitizePath, cliux, log } from '@contentstack/cli-utilities';

import auditConfig from '../config';
import { $t, auditMsg, commonMsg } from '../messages';
import { values } from 'lodash';

export default class Extensions {
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
    fix,
    config,
    moduleName,
    ctSchema,
  }: ModuleConstructorParam & Pick<CtConstructorParam, 'ctSchema'>) {
    this.config = config;
    this.fix = fix ?? false;
    this.ctSchema = ctSchema;
    this.extensionsSchema = [];
    
    log.debug(`Initializing Extensions module`, this.config.auditContext);
    log.debug(`Fix mode: ${this.fix}`, this.config.auditContext);
    log.debug(`Content types count: ${ctSchema.length}`, this.config.auditContext);
    log.debug(`Module name: ${moduleName}`, this.config.auditContext);
    
    this.moduleName = this.validateModules(moduleName!, this.config.moduleConfig);
    this.fileName = config.moduleConfig[this.moduleName].fileName;
    log.debug(`File name: ${this.fileName}`, this.config.auditContext);
    
    this.folderPath = resolve(
      sanitizePath(config.basePath),
      sanitizePath(config.moduleConfig[this.moduleName].dirName),
    );
    log.debug(`Folder path: ${this.folderPath}`, this.config.auditContext);
    
    this.ctUidSet = new Set(['$all']);
    this.missingCtInExtensions = [];
    this.missingCts = new Set();
    this.extensionsPath = '';
    
    log.debug(`Extensions module initialization completed`, this.config.auditContext);
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
    
    log.debug(`Module ${moduleName} not found, defaulting to 'extensions'`, this.config.auditContext);
    return 'extensions';
  }

  async run() {
    log.debug(`Starting ${this.moduleName} audit process`, this.config.auditContext);
    log.debug(`Extensions folder path: ${this.folderPath}`, this.config.auditContext);
    log.debug(`Fix mode: ${this.fix}`, this.config.auditContext);
    
    if (!existsSync(this.folderPath)) {
      log.debug(`Skipping ${this.moduleName} audit - path does not exist`, this.config.auditContext);
      log.warn(`Skipping ${this.moduleName} audit`, this.config.auditContext);
      cliux.print($t(auditMsg.NOT_VALID_PATH, { path: this.folderPath }), { color: 'yellow' });
      return {};
    }

    this.extensionsPath = path.join(this.folderPath, this.fileName);
    log.debug(`Extensions file path: ${this.extensionsPath}`, this.config.auditContext);

    log.debug(`Loading extensions schema from file`, this.config.auditContext);
    this.extensionsSchema = existsSync(this.extensionsPath)
      ? values(JSON.parse(readFileSync(this.extensionsPath, 'utf-8')) as Extension[])
      : [];
    log.debug(`Loaded ${this.extensionsSchema.length} extensions`, this.config.auditContext);

    log.debug(`Building content type UID set from ${this.ctSchema.length} content types`, this.config.auditContext);
    this.ctSchema.map((ct) => this.ctUidSet.add(ct.uid));
    log.debug(`Content type UID set contains: ${Array.from(this.ctUidSet).join(', ')}`, this.config.auditContext);

    log.debug(`Processing ${this.extensionsSchema.length} extensions`, this.config.auditContext);
    for (const ext of this.extensionsSchema) {
      const { title, uid, scope } = ext;
      log.debug(`Processing extension: ${title} (${uid})`, this.config.auditContext);
      log.debug(`Extension scope content types: ${scope?.content_types?.join(', ') || 'none'}`, this.config.auditContext);
      
      const ctNotPresent = scope?.content_types.filter((ct) => !this.ctUidSet.has(ct));
      log.debug(`Missing content types in extension: ${ctNotPresent?.join(', ') || 'none'}`, this.config.auditContext);

      if (ctNotPresent?.length && ext.scope) {
        log.debug(`Extension ${title} has ${ctNotPresent.length} missing content types`, this.config.auditContext);
        ext.content_types = ctNotPresent;
        ctNotPresent.forEach((ct) => {
          log.debug(`Adding missing content type: ${ct} to the Audit report.`, this.config.auditContext);
          this.missingCts?.add(ct);
        });
        this.missingCtInExtensions?.push(cloneDeep(ext));
      } else {
        log.debug(`Extension ${title} has no missing content types`, this.config.auditContext);
      }

      log.info(
        $t(auditMsg.SCAN_EXT_SUCCESS_MSG, {
          title,
          module: this.config.moduleConfig[this.moduleName].name,
          uid,
        }),
        this.config.auditContext
      );
    }

    log.debug(`Extensions audit completed. Found ${this.missingCtInExtensions.length} extensions with missing content types`, this.config.auditContext);
    log.debug(`Total missing content types: ${this.missingCts.size}`, this.config.auditContext);

    if (this.fix && this.missingCtInExtensions.length) {
      log.debug(`Fix mode enabled, fixing ${this.missingCtInExtensions.length} extensions`, this.config.auditContext);
      await this.fixExtensionsScope(cloneDeep(this.missingCtInExtensions));
      this.missingCtInExtensions.forEach((ext) => {
        log.debug(`Marking extension ${ext.title} as fixed`, this.config.auditContext);
        ext.fixStatus = 'Fixed';
      });
      log.debug(`Extensions fix completed`, this.config.auditContext);
      return this.missingCtInExtensions;
    }
    
    log.debug(`Extensions audit completed without fixes`, this.config.auditContext);
    return this.missingCtInExtensions;
  }

  async fixExtensionsScope(missingCtInExtensions: Extension[]) {
    log.debug(`Starting extensions scope fix for ${missingCtInExtensions.length} extensions`, this.config.auditContext);
    
    log.debug(`Loading current extensions schema from: ${this.extensionsPath}`, this.config.auditContext);
    let newExtensionSchema: Record<string, Extension> = existsSync(this.extensionsPath)
      ? JSON.parse(readFileSync(this.extensionsPath, 'utf8'))
      : {};
    log.debug(`Loaded ${Object.keys(newExtensionSchema).length} existing extensions`, this.config.auditContext);
    
    for (const ext of missingCtInExtensions) {
      const { uid, title } = ext;
      log.debug(`Fixing extension: ${title} (${uid})`, this.config.auditContext);
      log.debug(`Extension scope content types: ${ext?.scope?.content_types?.join(', ') || 'none'}`, this.config.auditContext);
      
      const fixedCts = ext?.scope?.content_types.filter((ct) => !this.missingCts.has(ct));
      log.debug(`Valid content types after filtering: ${fixedCts?.join(', ') || 'none'}`, this.config.auditContext);
      
      if (fixedCts?.length && newExtensionSchema[uid]?.scope) {
        log.debug(`Updating extension ${title} scope with ${fixedCts.length} valid content types`, this.config.auditContext);
        newExtensionSchema[uid].scope.content_types = fixedCts;
      } else {
        log.debug(`Extension ${title} has no valid content types or scope not found`, this.config.auditContext);
        cliux.print($t(commonMsg.EXTENSION_FIX_WARN, { title: title, uid }), { color: 'yellow' });
        const shouldDelete = this.config.flags.yes || (await cliux.confirm(commonMsg.EXTENSION_FIX_CONFIRMATION));
        if (shouldDelete) {
          log.debug(`Deleting extension: ${title} (${uid})`, this.config.auditContext);
          delete newExtensionSchema[uid];
        } else {
          log.debug(`Keeping extension: ${title} (${uid})`, this.config.auditContext);
        }
      }
    }
    
    log.debug(`Extensions scope fix completed, writing updated schema`, this.config.auditContext);
    await this.writeFixContent(newExtensionSchema);
  }

  async writeFixContent(fixedExtensions: Record<string, Extension>) {
    log.debug(`Writing fix content for ${Object.keys(fixedExtensions).length} extensions`, this.config.auditContext);
    log.debug(`Fix mode: ${this.fix}`, this.config.auditContext);
    log.debug(`Copy directory flag: ${this.config.flags['copy-dir']}`, this.config.auditContext);
    log.debug(`External config skip confirm: ${this.config.flags['external-config']?.skipConfirm}`, this.config.auditContext);
    log.debug(`Yes flag: ${this.config.flags.yes}`, this.config.auditContext);
    
    if (
      this.fix &&
      (this.config.flags['copy-dir'] ||
        this.config.flags['external-config']?.skipConfirm ||
        this.config.flags.yes ||
        (await cliux.confirm(commonMsg.FIX_CONFIRMATION)))
    ) {
      const outputPath = join(this.folderPath, this.config.moduleConfig[this.moduleName].fileName);
      log.debug(`Writing fixed extensions to: ${outputPath}`, this.config.auditContext);
      log.debug(`Extensions to write: ${Object.keys(fixedExtensions).join(', ')}`, this.config.auditContext);
      
      writeFileSync(outputPath, JSON.stringify(fixedExtensions));
      log.debug(`Successfully wrote fixed extensions to file`, this.config.auditContext);
    } else {
      log.debug(`Skipping file write - fix mode disabled or user declined confirmation`, this.config.auditContext);
    }
  }
}
