import path, { join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { cloneDeep } from 'lodash';
import { LogFn, ConfigType, ContentTypeStruct, CtConstructorParam, ModuleConstructorParam, Extension } from '../types';
import { ux } from '@contentstack/cli-utilities';

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
    this.moduleName = moduleName ?? 'extensions';
    this.fileName = config.moduleConfig[this.moduleName].fileName;
    this.folderPath = resolve(config.basePath, config.moduleConfig[this.moduleName].dirName);
    this.ctUidSet = new Set(['$all']);
    this.missingCtInExtensions = [];
    this.missingCts = new Set();
    this.extensionsPath = '';
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
    this.ctSchema = [];
    this.ctSchema.forEach((ct) => this.ctUidSet.add(ct.uid));

    this.extensionsSchema.forEach((ext: Extension) => {
      const { title, uid, scope } = ext;
      let ctNotPresent: string[] = [];
      scope?.content_types.forEach((ct) => {
        if (!this.ctUidSet.has(ct)) {
          ctNotPresent.push(ct);
          this.missingCts.add(ct);
        }
      });
      if (ctNotPresent.length) {
        ext.scope.content_types = ctNotPresent;
        this.missingCtInExtensions.push(cloneDeep(ext));
      }
      this.log(
        $t(auditMsg.SCAN_CT_SUCCESS_MSG, {
          name: title,
          module: this.config.moduleConfig[this.moduleName].name,
        }),
        'info',
      );
    });
    this.missingCtInExtensions.forEach((ext) => {
      console.log(ext.scope);
    });
    console.log(this.missingCtInExtensions);
    return this.missingCtInExtensions;
  }

  async fixExtensionsScope() {}

  async writeFixContent() {}
}
