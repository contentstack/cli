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

      if (ctNotPresent.length && ext.scope) {
        ext.scope.content_types = ctNotPresent;
        this.missingCtInExtensions.push(cloneDeep(ext));
      }

      this.log(
        $t(auditMsg.SCAN_EXT_SUCCESS_MSG, {
          title: title,
          module: this.config.moduleConfig[this.moduleName].name,
          uid: uid,
        }),
        'info',
      );
    });

    if (this.fix && this.missingCtInExtensions.length) {
      await this.fixExtensionsScope(cloneDeep(this.missingCtInExtensions));
    }

    return this.missingCtInExtensions;
  }

  async fixExtensionsScope(missingCtInExtensions: Extension[]) {
    for (let ext in missingCtInExtensions) {
      if (missingCtInExtensions[ext].scope) {
        missingCtInExtensions[ext].scope.content_types = missingCtInExtensions[ext].scope.content_types.filter((ct) => {
          !this.missingCts.has(ct);
        });
      }
    }

    let newExtensionSchema: Record<string, Extension> = existsSync(this.extensionsPath)
      ? JSON.parse(readFileSync(this.extensionsPath, 'utf8'))
      : {};

    if (Object.keys(newExtensionSchema).length !== 0) {
      for (let ext in missingCtInExtensions) {
        let fixedCts = missingCtInExtensions[ext].scope.content_types.filter((ct) => {
          !this.missingCts.has(ct);
        });
        if (fixedCts.length) {
          newExtensionSchema[missingCtInExtensions[ext].uid].scope.content_types = fixedCts;
        } else {
          this.log(
            $t(commonMsg.EXTENSION_FIX_WARN, {
              name: missingCtInExtensions[ext].title,
              uid: missingCtInExtensions[ext].uid,
            }),
            { color: 'yellow' },
          );
          if (this.config.flags.yes || (await ux.confirm(commonMsg.EXTENSION_FIX_CONFIRMATION))) {
            delete newExtensionSchema[missingCtInExtensions[ext].uid];
          }
        }
      }
    }
    this.writeFixContent(newExtensionSchema);
  }

  async writeFixContent(fixedExtensions: Record<string, Extension>) {
    let canWrite = true;

    if (this.fix) {
      if (!this.config.flags['copy-dir'] && !this.config.flags['external-config']?.skipConfirm) {
        canWrite = this.config.flags.yes ?? (await ux.confirm(commonMsg.FIX_CONFIRMATION));
      }
      if (canWrite) {
        writeFileSync(
          join(this.folderPath, this.config.moduleConfig[this.moduleName].fileName),
          JSON.stringify(fixedExtensions),
        );
      }
    }
  }
}
