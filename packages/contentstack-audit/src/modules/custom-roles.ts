import { join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { cloneDeep } from 'lodash';
import { LogFn, ConfigType, CtConstructorParam, ModuleConstructorParam, CustomRole, Rule } from '../types';
import { cliux, sanitizePath } from '@contentstack/cli-utilities';

import auditConfig from '../config';
import { $t, auditMsg, commonMsg } from '../messages';
import { values } from 'lodash';

export default class CustomRoles {
  public log: LogFn;
  protected fix: boolean;
  public fileName: any;
  public config: ConfigType;
  public folderPath: string;
  public customRoleSchema: CustomRole[];
  public moduleName: keyof typeof auditConfig.moduleConfig;
  public missingFieldsInCustomRoles: CustomRole[];
  public customRolePath: string;
  public isBranchFixDone: boolean;

  constructor({ log, fix, config, moduleName }: ModuleConstructorParam & Pick<CtConstructorParam, 'ctSchema'>) {
    this.log = log;
    this.config = config;
    this.fix = fix ?? false;
    this.customRoleSchema = [];
    this.moduleName = this.validateModules(moduleName!, this.config.moduleConfig);
    this.fileName = config.moduleConfig[this.moduleName].fileName;
    this.folderPath = resolve(
      sanitizePath(config.basePath),
      sanitizePath(config.moduleConfig[this.moduleName].dirName),
    );
    this.missingFieldsInCustomRoles = [];
    this.customRolePath = '';
    this.isBranchFixDone = false;
  }
  validateModules(
    moduleName: keyof typeof auditConfig.moduleConfig,
    moduleConfig: Record<string, unknown>,
  ): keyof typeof auditConfig.moduleConfig {
    if (Object.keys(moduleConfig).includes(moduleName)) {
      return moduleName;
    }
    return 'custom-roles';
  }

  /**
   * Check whether the given path for the custom role exists or not
   * If path exist read
   * From the ctSchema add all the content type UID into ctUidSet to check whether the content-type is present or not
   * @returns Array of object containing the custom role name, uid and content_types that are missing
   */
  async run() {
    if (!existsSync(this.folderPath)) {
      this.log(`Skipping ${this.moduleName} audit`, 'warn');
      this.log($t(auditMsg.NOT_VALID_PATH, { path: this.folderPath }), { color: 'yellow' });
      return {};
    }

    this.customRolePath = join(this.folderPath, this.fileName);
    this.customRoleSchema = existsSync(this.customRolePath)
      ? values(JSON.parse(readFileSync(this.customRolePath, 'utf8')) as CustomRole[])
      : [];

    for (let index = 0; index < this.customRoleSchema?.length; index++) {
      const customRole = this.customRoleSchema[index];
      let branchesToBeRemoved: string[] = [];
      if (this.config?.branch) {
        customRole?.rules?.filter((rule) => {
          if (rule.module === 'branch') {
            branchesToBeRemoved = rule?.branches?.filter((branch) => branch !== this.config?.branch) || [];
          }
        });
      }

      if (branchesToBeRemoved?.length) {
        this.isBranchFixDone = true;
        const tempCR = cloneDeep(customRole);

        if (customRole?.rules && this.config?.branch) {
          tempCR.rules.forEach((rule: Rule) => {
            if (rule.module === 'branch') {
              rule.branches = branchesToBeRemoved;
            }
          });
        }

        this.missingFieldsInCustomRoles.push(tempCR);
      }

      this.log(
        $t(auditMsg.SCAN_CR_SUCCESS_MSG, {
          name: customRole.name,
          uid: customRole.uid,
        }),
        'info',
      );
    }

    if (this.fix && (this.missingFieldsInCustomRoles.length || this.isBranchFixDone)) {
      await this.fixCustomRoleSchema();
      this.missingFieldsInCustomRoles.forEach((cr) => (cr.fixStatus = 'Fixed'));
    }

    return this.missingFieldsInCustomRoles;
  }

  async fixCustomRoleSchema() {
    const newCustomRoleSchema: Record<string, CustomRole> = existsSync(this.customRolePath)
      ? JSON.parse(readFileSync(this.customRolePath, 'utf8'))
      : {};

    if (Object.keys(newCustomRoleSchema).length === 0 || !this.customRoleSchema?.length) {
      return;
    }

    this.customRoleSchema.forEach((customRole) => {
      if (!this.config.branch) return;

      const fixedBranches = customRole.rules
        ?.filter((rule) => rule.module === 'branch' && rule.branches?.length)
        ?.reduce((acc: string[], rule) => {
          const relevantBranches =
            rule.branches?.filter((branch) => {
              if (branch !== this.config.branch) {
                this.log(
                  $t(commonMsg.CR_BRANCH_REMOVAL, {
                    uid: customRole.uid,
                    name: customRole.name,
                    branch,
                  }),
                  { color: 'yellow' },
                );
                return false;
              }
              return true;
            }) || [];
          return [...acc, ...relevantBranches];
        }, []);

      if (fixedBranches?.length) {
        newCustomRoleSchema[customRole.uid].rules
          ?.filter((rule: Rule) => rule.module === 'branch')
          ?.forEach((rule) => {
            rule.branches = fixedBranches;
          });
      }
    });

    await this.writeFixContent(newCustomRoleSchema);
  }

  async writeFixContent(newCustomRoleSchema: Record<string, CustomRole>) {
    if (
      this.fix &&
      (this.config.flags['copy-dir'] ||
        this.config.flags['external-config']?.skipConfirm ||
        this.config.flags.yes ||
        (await cliux.confirm(commonMsg.FIX_CONFIRMATION)))
    ) {
      writeFileSync(
        join(this.folderPath, this.config.moduleConfig[this.moduleName].fileName),
        JSON.stringify(newCustomRoleSchema),
      );
    }
  }
}
