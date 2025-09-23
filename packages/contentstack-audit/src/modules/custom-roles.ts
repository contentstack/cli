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
    this.log(`Initializing Custom Roles module`, 'debug');
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
    this.log(`Starting ${this.moduleName} audit process`, 'debug');
    this.log(`Data directory: ${this.folderPath}`, 'debug');
    this.log(`Fix mode: ${this.fix}`, 'debug');
    this.log(`Branch filter: ${this.config?.branch || 'none'}`, 'debug');

  }
  validateModules(
    moduleName: keyof typeof auditConfig.moduleConfig,
    moduleConfig: Record<string, unknown>,
  ): keyof typeof auditConfig.moduleConfig {
    this.log(`Validating module: ${moduleName}`, 'debug');
    this.log(`Available modules in config: ${Object.keys(moduleConfig).join(', ')}`, 'debug');
    
    if (Object.keys(moduleConfig).includes(moduleName)) {
      this.log(`Module ${moduleName} found in config, returning: ${moduleName}`, 'debug');
      return moduleName;
    }
    
    this.log(`Module ${moduleName} not found in config, defaulting to: custom-roles`, 'debug');
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
      this.log(`Skipping ${this.moduleName} audit - path does not exist`, 'debug');
      this.log(`Skipping ${this.moduleName} audit`, 'warn');
      this.log($t(auditMsg.NOT_VALID_PATH, { path: this.folderPath }), { color: 'yellow' });
      return {};
    }

    this.customRolePath = join(this.folderPath, this.fileName);
    this.log(`Custom roles file path: ${this.customRolePath}`, 'debug');
    
    this.customRoleSchema = existsSync(this.customRolePath)
      ? values(JSON.parse(readFileSync(this.customRolePath, 'utf8')) as CustomRole[])
      : [];
    
    this.log(`Found ${this.customRoleSchema.length} custom roles to audit`, 'debug');

    for (let index = 0; index < this.customRoleSchema?.length; index++) {
      const customRole = this.customRoleSchema[index];
      this.log(`Processing custom role: ${customRole.name} (${customRole.uid})`, 'debug');
      
      let branchesToBeRemoved: string[] = [];
      if (this.config?.branch) {
        this.log(`Config branch : ${this.config.branch}`, 'debug');
        this.log(`Checking branch rules for custom role: ${customRole.name}`, 'debug');
        customRole?.rules?.filter((rule) => {
          if (rule.module === 'branch') {
            this.log(`Found branch rule with branches: ${rule?.branches?.join(', ') || 'none'}`, 'debug');
            branchesToBeRemoved = rule?.branches?.filter((branch) => branch !== this.config?.branch) || [];
            this.log(`Branches to be removed: ${branchesToBeRemoved.join(', ') || 'none'}`, 'debug');
          }
        });
      } else {
        this.log(`No branch filter configured, skipping branch validation`, 'debug');
      }

      if (branchesToBeRemoved?.length) {
        this.log(`Custom role ${customRole.name} has branches to be removed: ${branchesToBeRemoved.join(', ')}`, 'debug');
        this.isBranchFixDone = true;
        const tempCR = cloneDeep(customRole);

        if (customRole?.rules && this.config?.branch) {
          this.log(`Applying branch fix to custom role: ${customRole.name}`, 'debug');
          tempCR.rules.forEach((rule: Rule) => {
            if (rule.module === 'branch') {
              this.log(`Updating branch rule branches from ${rule.branches?.join(', ')} to ${branchesToBeRemoved.join(', ')}`, 'debug');
              rule.branches = branchesToBeRemoved;
            }
          });
        }

        this.missingFieldsInCustomRoles.push(tempCR);
        this.log(`Added custom role ${customRole.name} to missing fields list`, 'debug');
      } else {
        this.log(`Custom role ${customRole.name} has no branch issues`, 'debug');
      }

      this.log(
        $t(auditMsg.SCAN_CR_SUCCESS_MSG, {
          name: customRole.name,
          uid: customRole.uid,
        }),
        'info',
      );
    }

    this.log(`Found ${this.missingFieldsInCustomRoles.length} custom roles with issues`, 'debug');
    this.log(`Branch fix done: ${this.isBranchFixDone}`, 'debug');

    if (this.fix && (this.missingFieldsInCustomRoles.length || this.isBranchFixDone)) {
      this.log('Fix mode enabled and issues found, applying fixes', 'debug');
      await this.fixCustomRoleSchema();
      this.missingFieldsInCustomRoles.forEach((cr) => (cr.fixStatus = 'Fixed'));
      this.log(`Applied fixes to ${this.missingFieldsInCustomRoles.length} custom roles`, 'debug');
    } else {
      this.log('No fixes needed or fix mode disabled', 'debug');
    }

    this.log(`${this.moduleName} audit completed. Found ${this.missingFieldsInCustomRoles.length} custom roles with issues`, 'debug');
    return this.missingFieldsInCustomRoles;
  }

  async fixCustomRoleSchema() {
    this.log('Starting custom role schema fix process', 'debug');
    const newCustomRoleSchema: Record<string, CustomRole> = existsSync(this.customRolePath)
      ? JSON.parse(readFileSync(this.customRolePath, 'utf8'))
      : {};

    this.log(`Loaded ${Object.keys(newCustomRoleSchema).length} custom roles from file`, 'debug');

    if (Object.keys(newCustomRoleSchema).length === 0 || !this.customRoleSchema?.length) {
      this.log('No custom roles to fix or empty schema, skipping fix process', 'debug');
      return;
    }

    this.log(`Processing ${this.customRoleSchema.length} custom roles for branch fixes`, 'debug');
    this.customRoleSchema.forEach((customRole) => {
      this.log(`Fixing custom role: ${customRole.name} (${customRole.uid})`, 'debug');
      
      if (!this.config.branch) {
        this.log(`No branch configured, skipping fix for ${customRole.name}`, 'debug');
        return;
      }

      this.log(`Looking for branch rules in custom role: ${customRole.name}`, 'debug');
      const fixedBranches = customRole.rules
        ?.filter((rule) => rule.module === 'branch' && rule.branches?.length)
        ?.reduce((acc: string[], rule) => {
          this.log(`Processing branch rule with branches: ${rule.branches?.join(', ')}`, 'debug');
          const relevantBranches =
            rule.branches?.filter((branch) => {
              if (branch !== this.config.branch) {
                this.log(`Removing branch ${branch} from custom role ${customRole.name}`, 'debug');
                this.log(
                  $t(commonMsg.CR_BRANCH_REMOVAL, {
                    uid: customRole.uid,
                    name: customRole.name,
                    branch,
                  }),
                  { color: 'yellow' },
                );
                return false;
              } else {
                this.log(`Keeping branch ${branch} for custom role ${customRole.name}`, 'debug');
              }
              return true;
            }) || [];
          this.log(`Relevant branches after filtering: ${relevantBranches.join(', ')}`, 'debug');
          return [...acc, ...relevantBranches];
        }, []);

      this.log(`Fixed branches for ${customRole.name}: ${fixedBranches?.join(', ') || 'none'}`, 'debug');

      if (fixedBranches?.length) {
        this.log(`Applying branch fix to custom role ${customRole.name}`, 'debug');
        newCustomRoleSchema[customRole.uid].rules
          ?.filter((rule: Rule) => rule.module === 'branch')
          ?.forEach((rule) => {
            this.log(`Updating branch rule from ${rule.branches?.join(', ')} to ${fixedBranches.join(', ')}`, 'debug');
            rule.branches = fixedBranches;
          });
      } else {
        this.log(`No branch fixes needed for custom role ${customRole.name}`, 'debug');
      }
    });

    this.log('Writing fixed custom role schema to file', 'debug');
    await this.writeFixContent(newCustomRoleSchema);
    this.log('Custom role schema fix process completed', 'debug');
  }

  async writeFixContent(newCustomRoleSchema: Record<string, CustomRole>) {
    this.log('Starting writeFixContent process for custom roles', 'debug');
    const filePath = join(this.folderPath, this.config.moduleConfig[this.moduleName].fileName);
    this.log(`Target file path: ${filePath}`, 'debug');
    this.log(`Custom roles to write: ${Object.keys(newCustomRoleSchema).length}`, 'debug');

    if (this.fix) {
      this.log('Fix mode enabled, checking write permissions', 'debug');
      
      const skipConfirm = this.config.flags['copy-dir'] || 
                         this.config.flags['external-config']?.skipConfirm || 
                         this.config.flags.yes;
      
      if (skipConfirm) {
        this.log('Skipping confirmation due to copy-dir, external-config, or yes flags', 'debug');
      } else {
        this.log('Asking user for confirmation to write fix content', 'debug');
      }

      const canWrite = skipConfirm || (await cliux.confirm(commonMsg.FIX_CONFIRMATION));
      
      if (canWrite) {
        this.log(`Writing fixed custom roles to: ${filePath}`, 'debug');
        writeFileSync(filePath, JSON.stringify(newCustomRoleSchema));
        this.log(`Successfully wrote ${Object.keys(newCustomRoleSchema).length} custom roles to file`, 'debug');
      } else {
        this.log('User declined to write fix content', 'debug');
      }
    } else {
      this.log('Skipping writeFixContent - not in fix mode', 'debug');
    }
  }
}
