import path, { join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { cloneDeep } from 'lodash';
import { LogFn, ConfigType, ContentTypeStruct, CtConstructorParam, ModuleConstructorParam, Extension } from '../types';
import { ux, sanitizePath } from '@contentstack/cli-utilities';

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
    this.moduleName = this.validateModules(moduleName!, this.config.moduleConfig);
    this.fileName = config.moduleConfig[this.moduleName].fileName;
    this.folderPath = resolve(sanitizePath(config.basePath), sanitizePath(config.moduleConfig[this.moduleName].dirName));
    this.ctUidSet = new Set(['$all']);
    this.missingCtInExtensions = [];
    this.missingCts = new Set();
    this.extensionsPath = '';
  }
  validateModules(moduleName: keyof typeof auditConfig.moduleConfig, moduleConfig: Record<string, unknown>): keyof typeof auditConfig.moduleConfig {
    if (Object.keys(moduleConfig).includes(moduleName)) {
      return moduleName;
    }
    return 'extensions'
  }

  async run() {
    if (!existsSync(this.folderPath)) {
      this.log(`Skipping ${this.moduleName} audit`, 'warn');
      this.log($t(auditMsg.NOT_VALID_PATH, { path: this.folderPath }), { color: 'yellow' });
      return {};
    }

    this.extensionsPath = path.join(this.folderPath, this.fileName);

    this.extensionsSchema = existsSync(this.extensionsPath)
      ? values(JSON.parse(readFileSync(this.extensionsPath, 'utf-8')) as Extension[])
      : [];
    this.ctSchema.map((ct) => this.ctUidSet.add(ct.uid));
    for (const ext of this.extensionsSchema) {
      const { title, uid, scope } = ext;
      const ctNotPresent = scope?.content_types.filter((ct) => !this.ctUidSet.has(ct));

      if (ctNotPresent?.length && ext.scope) {
        ext.content_types = ctNotPresent;
        ctNotPresent.forEach((ct) => this.missingCts?.add(ct));
        this.missingCtInExtensions?.push(cloneDeep(ext));
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

    if (this.fix && this.missingCtInExtensions.length) {
      await this.fixExtensionsScope(cloneDeep(this.missingCtInExtensions));
      this.missingCtInExtensions.forEach((ext) => (ext.fixStatus = 'Fixed'));
      return this.missingCtInExtensions;
    }
    return this.missingCtInExtensions;
  }

  async fixExtensionsScope(missingCtInExtensions: Extension[]) {
    let newExtensionSchema: Record<string, Extension> = existsSync(this.extensionsPath)
      ? JSON.parse(readFileSync(this.extensionsPath, 'utf8'))
      : {};
    for (const ext of missingCtInExtensions) {
      const { uid, title } = ext;
      const fixedCts = ext?.scope?.content_types.filter((ct) => !this.missingCts.has(ct));
      if (fixedCts?.length && newExtensionSchema[uid]?.scope) {
        newExtensionSchema[uid].scope.content_types = fixedCts;
      } else {
        this.log($t(commonMsg.EXTENSION_FIX_WARN, { title: title, uid }), { color: 'yellow' });
        const shouldDelete = this.config.flags.yes || (await ux.confirm(commonMsg.EXTENSION_FIX_CONFIRMATION));
        if (shouldDelete) {
          delete newExtensionSchema[uid];
        }
      }
    }
    await this.writeFixContent(newExtensionSchema);
  }

  async writeFixContent(fixedExtensions: Record<string, Extension>) {
    if (
      this.fix &&
      (this.config.flags['copy-dir'] ||
        this.config.flags['external-config']?.skipConfirm ||
        this.config.flags.yes ||
        (await ux.confirm(commonMsg.FIX_CONFIRMATION)))
    ) {
      writeFileSync(
        join(this.folderPath, this.config.moduleConfig[this.moduleName].fileName),
        JSON.stringify(fixedExtensions),
      );
    }
  }
}
