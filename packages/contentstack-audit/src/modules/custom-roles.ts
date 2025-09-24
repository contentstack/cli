import { join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { cloneDeep } from 'lodash';
import { ConfigType, CtConstructorParam, ModuleConstructorParam, CustomRole, Rule } from '../types';
import { cliux, sanitizePath, log } from '@contentstack/cli-utilities';

import auditConfig from '../config';
import { $t, auditMsg, commonMsg } from '../messages';
import { values } from 'lodash';

export default class CustomRoles {
  protected fix: boolean;
  public fileName: any;
  public config: ConfigType;
  public folderPath: string;
  public customRoleSchema: CustomRole[];
  public moduleName: keyof typeof auditConfig.moduleConfig;
  public missingFieldsInCustomRoles: CustomRole[];
  public customRolePath: string;
  public isBranchFixDone: boolean;

  constructor({ fix, config, moduleName }: ModuleConstructorParam & Pick<CtConstructorParam, 'ctSchema'>) {
    log.debug(`Initializing Custom Roles module`);
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
    log.debug(`Starting ${this.moduleName} audit process`);
    log.debug(`Data directory: ${this.folderPath}`);
    log.debug(`Fix mode: ${this.fix}`);
    log.debug(`Branch filter: ${this.config?.branch || 'none'}`);

  }
  validateModules(
    moduleName: keyof typeof auditConfig.moduleConfig,
    moduleConfig: Record<string, unknown>,
  ): keyof typeof auditConfig.moduleConfig {
    log.debug(`Validating module: ${moduleName}`);
    log.debug(`Available modules in config: ${Object.keys(moduleConfig).join(', ')}`);
    
    if (Object.keys(moduleConfig).includes(moduleName)) {
      log.debug(`Module ${moduleName} found in config, returning: ${moduleName}`);
      return moduleName;
    }
    
    log.debug(`Module ${moduleName} not found in config, defaulting to: custom-roles`);
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
      log.debug(`Skipping ${this.moduleName} audit - path does not exist`);
      log.warn(`Skipping ${this.moduleName} audit`);
      cliux.print($t(auditMsg.NOT_VALID_PATH, { path: this.folderPath }), { color: 'yellow' });
      return {};
    }

    this.customRolePath = join(this.folderPath, this.fileName);
    log.debug(`Custom roles file path: ${this.customRolePath}`);
    
    this.customRoleSchema = existsSync(this.customRolePath)
      ? values(JSON.parse(readFileSync(this.customRolePath, 'utf8')) as CustomRole[])
      : [];
    
    log.debug(`Found ${this.customRoleSchema.length} custom roles to audit`);

    for (let index = 0; index < this.customRoleSchema?.length; index++) {
      const customRole = this.customRoleSchema[index];
      log.debug(`Processing custom role: ${customRole.name} (${customRole.uid})`);
      
      let branchesToBeRemoved: string[] = [];
      if (this.config?.branch) {
        log.debug(`Config branch : ${this.config.branch}`);
        log.debug(`Checking branch rules for custom role: ${customRole.name}`);
        customRole?.rules?.filter((rule) => {
          if (rule.module === 'branch') {
            log.debug(`Found branch rule with branches: ${rule?.branches?.join(', ') || 'none'}`);
            branchesToBeRemoved = rule?.branches?.filter((branch) => branch !== this.config?.branch) || [];
            log.debug(`Branches to be removed: ${branchesToBeRemoved.join(', ') || 'none'}`);
          }
        });
      } else {
        log.debug(`No branch filter configured, skipping branch validation`);
      }

      if (branchesToBeRemoved?.length) {
        log.debug(`Custom role ${customRole.name} has branches to be removed: ${branchesToBeRemoved.join(', ')}`);
        this.isBranchFixDone = true;
        const tempCR = cloneDeep(customRole);

        if (customRole?.rules && this.config?.branch) {
          log.debug(`Applying branch fix to custom role: ${customRole.name}`);
          tempCR.rules.forEach((rule: Rule) => {
            if (rule.module === 'branch') {
              log.debug(`Updating branch rule branches from ${rule.branches?.join(', ')} to ${branchesToBeRemoved.join(', ')}`);
              rule.branches = branchesToBeRemoved;
            }
          });
        }

        this.missingFieldsInCustomRoles.push(tempCR);
        log.debug(`Added custom role ${customRole.name} to missing fields list`);
      } else {
        log.debug(`Custom role ${customRole.name} has no branch issues`);
      }

      log.info(
        $t(auditMsg.SCAN_CR_SUCCESS_MSG, {
          name: customRole.name,
          uid: customRole.uid,
        })
      );
    }

    log.debug(`Found ${this.missingFieldsInCustomRoles.length} custom roles with issues`);
    log.debug(`Branch fix done: ${this.isBranchFixDone}`);

    if (this.fix && (this.missingFieldsInCustomRoles.length || this.isBranchFixDone)) {
      log.debug('Fix mode enabled and issues found, applying fixes');
      await this.fixCustomRoleSchema();
      this.missingFieldsInCustomRoles.forEach((cr) => (cr.fixStatus = 'Fixed'));
      log.debug(`Applied fixes to ${this.missingFieldsInCustomRoles.length} custom roles`);
    } else {
      log.debug('No fixes needed or fix mode disabled');
    }

    log.debug(`${this.moduleName} audit completed. Found ${this.missingFieldsInCustomRoles.length} custom roles with issues`);
    return this.missingFieldsInCustomRoles;
  }

  async fixCustomRoleSchema() {
    log.debug('Starting custom role schema fix process');
    const newCustomRoleSchema: Record<string, CustomRole> = existsSync(this.customRolePath)
      ? JSON.parse(readFileSync(this.customRolePath, 'utf8'))
      : {};

    log.debug(`Loaded ${Object.keys(newCustomRoleSchema).length} custom roles from file`);

    if (Object.keys(newCustomRoleSchema).length === 0 || !this.customRoleSchema?.length) {
      log.debug('No custom roles to fix or empty schema, skipping fix process');
      return;
    }

    log.debug(`Processing ${this.customRoleSchema.length} custom roles for branch fixes`);
    this.customRoleSchema.forEach((customRole) => {
      log.debug(`Fixing custom role: ${customRole.name} (${customRole.uid})`);
      
      if (!this.config.branch) {
        log.debug(`No branch configured, skipping fix for ${customRole.name}`);
        return;
      }

      log.debug(`Looking for branch rules in custom role: ${customRole.name}`);
      const fixedBranches = customRole.rules
        ?.filter((rule) => rule.module === 'branch' && rule.branches?.length)
        ?.reduce((acc: string[], rule) => {
          log.debug(`Processing branch rule with branches: ${rule.branches?.join(', ')}`);
          const relevantBranches =
            rule.branches?.filter((branch) => {
              if (branch !== this.config.branch) {
                log.debug(`Removing branch ${branch} from custom role ${customRole.name}`);
                log.debug(
                  $t(commonMsg.CR_BRANCH_REMOVAL, {
                    uid: customRole.uid,
                    name: customRole.name,
                    branch,
                  }),
                  { color: 'yellow' },
                );
                return false;
              } else {
                log.debug(`Keeping branch ${branch} for custom role ${customRole.name}`);
              }
              return true;
            }) || [];
          log.debug(`Relevant branches after filtering: ${relevantBranches.join(', ')}`);
          return [...acc, ...relevantBranches];
        }, []);

      log.debug(`Fixed branches for ${customRole.name}: ${fixedBranches?.join(', ') || 'none'}`);

      if (fixedBranches?.length) {
        log.debug(`Applying branch fix to custom role ${customRole.name}`);
        newCustomRoleSchema[customRole.uid].rules
          ?.filter((rule: Rule) => rule.module === 'branch')
          ?.forEach((rule) => {
            log.debug(`Updating branch rule from ${rule.branches?.join(', ')} to ${fixedBranches.join(', ')}`);
            rule.branches = fixedBranches;
          });
      } else {
        log.debug(`No branch fixes needed for custom role ${customRole.name}`);
      }
    });

    log.debug('Writing fixed custom role schema to file');
    await this.writeFixContent(newCustomRoleSchema);
    log.debug('Custom role schema fix process completed');
  }

  async writeFixContent(newCustomRoleSchema: Record<string, CustomRole>) {
    log.debug('Starting writeFixContent process for custom roles');
    const filePath = join(this.folderPath, this.config.moduleConfig[this.moduleName].fileName);
    log.debug(`Target file path: ${filePath}`);
    log.debug(`Custom roles to write: ${Object.keys(newCustomRoleSchema).length}`);

    if (this.fix) {
      log.debug('Fix mode enabled, checking write permissions');
      
      const skipConfirm = this.config.flags['copy-dir'] || 
                         this.config.flags['external-config']?.skipConfirm || 
                         this.config.flags.yes;
      
      if (skipConfirm) {
        log.debug('Skipping confirmation due to copy-dir, external-config, or yes flags');
      } else {
        log.debug('Asking user for confirmation to write fix content');
      }

      const canWrite = skipConfirm || (await cliux.confirm(commonMsg.FIX_CONFIRMATION));
      
      if (canWrite) {
        log.debug(`Writing fixed custom roles to: ${filePath}`);
        writeFileSync(filePath, JSON.stringify(newCustomRoleSchema));
        log.debug(`Successfully wrote ${Object.keys(newCustomRoleSchema).length} custom roles to file`);
      } else {
        log.debug('User declined to write fix content');
      }
    } else {
      log.debug('Skipping writeFixContent - not in fix mode');
    }
  }
}
