import { join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { cloneDeep } from 'lodash';
import { CtConstructorParam, ModuleConstructorParam, CustomRole, Rule } from '../types';
import { cliux, sanitizePath, log } from '@contentstack/cli-utilities';

import auditConfig from '../config';
import { $t, auditMsg, commonMsg } from '../messages';
import { values } from 'lodash';
import BaseClass from './base-class';

export default class CustomRoles extends BaseClass {
  protected fix: boolean;
  public fileName: any;
  public folderPath: string;
  public customRoleSchema: CustomRole[];
  public moduleName: keyof typeof auditConfig.moduleConfig;
  public missingFieldsInCustomRoles: CustomRole[];
  public customRolePath: string;
  public isBranchFixDone: boolean;

  constructor({ fix, config, moduleName }: ModuleConstructorParam & Pick<CtConstructorParam, 'ctSchema'>) {
    super({ config });
    log.debug(`Initializing Custom Roles module`, this.config.auditContext);
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
    log.debug(`Starting ${this.moduleName} audit process`, this.config.auditContext);
    log.debug(`Data directory: ${this.folderPath}`, this.config.auditContext);
    log.debug(`Fix mode: ${this.fix}`, this.config.auditContext);
    log.debug(`Branch filter: ${this.config?.branch || 'none'}`, this.config.auditContext);

  }
  validateModules(
    moduleName: keyof typeof auditConfig.moduleConfig,
    moduleConfig: Record<string, unknown>,
  ): keyof typeof auditConfig.moduleConfig {
    log.debug(`Validating module: ${moduleName}`, this.config.auditContext);
    log.debug(`Available modules in config: ${Object.keys(moduleConfig).join(', ')}`, this.config.auditContext);
    
    if (Object.keys(moduleConfig).includes(moduleName)) {
      log.debug(`Module ${moduleName} found in config, returning: ${moduleName}`, this.config.auditContext);
      return moduleName;
    }
    
    log.debug(`Module ${moduleName} not found in config, defaulting to: custom-roles`, this.config.auditContext);
    return 'custom-roles';
  }

  /**
   * Check whether the given path for the custom role exists or not
   * If path exist read
   * From the ctSchema add all the content type UID into ctUidSet to check whether the content-type is present or not
   * @returns Array of object containing the custom role name, uid and content_types that are missing
   */
  async run(totalCount?: number) {
    try {
      if (!existsSync(this.folderPath)) {
        log.debug(`Skipping ${this.moduleName} audit - path does not exist`, this.config.auditContext);
        log.warn(`Skipping ${this.moduleName} audit`, this.config.auditContext);
        cliux.print($t(auditMsg.NOT_VALID_PATH, { path: this.folderPath }), { color: 'yellow' });
        return {};
      }

      this.customRolePath = join(this.folderPath, this.fileName);
      log.debug(`Custom roles file path: ${this.customRolePath}`, this.config.auditContext);
      
      // Load custom roles schema with loading spinner
      await this.withLoadingSpinner('CUSTOM-ROLES: Loading custom roles schema...', async () => {
        this.customRoleSchema = existsSync(this.customRolePath)
          ? values(JSON.parse(readFileSync(this.customRolePath, 'utf8')) as CustomRole[])
          : [];
      });
      
      log.debug(`Found ${this.customRoleSchema.length} custom roles to audit`, this.config.auditContext);

      // Create progress manager if we have a total count
      if (totalCount && totalCount > 0) {
        const progress = this.createSimpleProgress(this.moduleName, totalCount);
        progress.updateStatus('Validating custom roles...');
      }

      for (let index = 0; index < this.customRoleSchema?.length; index++) {
      const customRole = this.customRoleSchema[index];
      log.debug(`Processing custom role: ${customRole.name} (${customRole.uid})`, this.config.auditContext);
      
      let branchesToBeRemoved: string[] = [];
      if (this.config?.branch) {
        log.debug(`Config branch : ${this.config.branch}`, this.config.auditContext);
        log.debug(`Checking branch rules for custom role: ${customRole.name}`, this.config.auditContext);
        customRole?.rules?.filter((rule) => {
          if (rule.module === 'branch') {
            log.debug(`Found branch rule with branches: ${rule?.branches?.join(', ') || 'none'}`, this.config.auditContext);
            branchesToBeRemoved = rule?.branches?.filter((branch) => branch !== this.config?.branch) || [];
            log.debug(`Branches to be removed: ${branchesToBeRemoved.join(', ') || 'none'}`, this.config.auditContext);
          }
        });
      } else {
        log.debug(`No branch filter configured, skipping branch validation`, this.config.auditContext);
      }

      if (branchesToBeRemoved?.length) {
        log.debug(`Custom role ${customRole.name} has branches to be removed: ${branchesToBeRemoved.join(', ')}`, this.config.auditContext);
        this.isBranchFixDone = true;
        const tempCR = cloneDeep(customRole);

        if (customRole?.rules && this.config?.branch) {
          log.debug(`Applying branch fix to custom role: ${customRole.name}`, this.config.auditContext);
          tempCR.rules.forEach((rule: Rule) => {
            if (rule.module === 'branch') {
              log.debug(`Updating branch rule branches from ${rule.branches?.join(', ')} to ${branchesToBeRemoved.join(', ')}`, this.config.auditContext);
              rule.branches = branchesToBeRemoved;
            }
          });
        }

        this.missingFieldsInCustomRoles.push(tempCR);
        log.debug(`Added custom role ${customRole.name} to missing fields list`, this.config.auditContext);
      } else {
        log.debug(`Custom role ${customRole.name} has no branch issues`, this.config.auditContext);
      }

      log.info(
        $t(auditMsg.SCAN_CR_SUCCESS_MSG, {
          name: customRole.name,
          uid: customRole.uid,
        }),
        this.config.auditContext
      );
      
      // Track progress for each custom role processed
      if (this.progressManager) {
        this.progressManager.tick(true, `custom-role: ${customRole.name}`, null);
      }
    }

    log.debug(`Found ${this.missingFieldsInCustomRoles.length} custom roles with issues`, this.config.auditContext);
    log.debug(`Branch fix done: ${this.isBranchFixDone}`, this.config.auditContext);

    if (this.fix && (this.missingFieldsInCustomRoles.length || this.isBranchFixDone)) {
      log.debug('Fix mode enabled and issues found, applying fixes', this.config.auditContext);
      await this.fixCustomRoleSchema();
      this.missingFieldsInCustomRoles.forEach((cr) => (cr.fixStatus = 'Fixed'));
      log.debug(`Applied fixes to ${this.missingFieldsInCustomRoles.length} custom roles`, this.config.auditContext);
    } else {
      log.debug('No fixes needed or fix mode disabled', this.config.auditContext);
    }

    log.debug(`${this.moduleName} audit completed. Found ${this.missingFieldsInCustomRoles.length} custom roles with issues`, this.config.auditContext);
      this.completeProgress(true);
      return this.missingFieldsInCustomRoles;
    } catch (error: any) {
      this.completeProgress(false, error?.message || 'Custom roles audit failed');
      throw error;
    }
  }

  async fixCustomRoleSchema() {
    log.debug('Starting custom role schema fix process', this.config.auditContext);
    const newCustomRoleSchema: Record<string, CustomRole> = existsSync(this.customRolePath)
      ? JSON.parse(readFileSync(this.customRolePath, 'utf8'))
      : {};

    log.debug(`Loaded ${Object.keys(newCustomRoleSchema).length} custom roles from file`, this.config.auditContext);

    if (Object.keys(newCustomRoleSchema).length === 0 || !this.customRoleSchema?.length) {
      log.debug('No custom roles to fix or empty schema, skipping fix process', this.config.auditContext);
      return;
    }

    log.debug(`Processing ${this.customRoleSchema.length} custom roles for branch fixes`, this.config.auditContext);
    this.customRoleSchema.forEach((customRole) => {
      log.debug(`Fixing custom role: ${customRole.name} (${customRole.uid})`, this.config.auditContext);
      
      if (!this.config.branch) {
        log.debug(`No branch configured, skipping fix for ${customRole.name}`, this.config.auditContext);
        return;
      }

      log.debug(`Looking for branch rules in custom role: ${customRole.name}`, this.config.auditContext);
      const fixedBranches = customRole.rules
        ?.filter((rule) => rule.module === 'branch' && rule.branches?.length)
        ?.reduce((acc: string[], rule) => {
          log.debug(`Processing branch rule with branches: ${rule.branches?.join(', ')}`, this.config.auditContext);
          const relevantBranches =
            rule.branches?.filter((branch) => {
              if (branch !== this.config.branch) {
                log.debug(`Removing branch ${branch} from custom role ${customRole.name}`, this.config.auditContext);
                log.debug(
                  $t(commonMsg.CR_BRANCH_REMOVAL, {
                    uid: customRole.uid,
                    name: customRole.name,
                    branch,
                  }),
                  this.config.auditContext
                );
                return false;
              } else {
                log.debug(`Keeping branch ${branch} for custom role ${customRole.name}`, this.config.auditContext);
              }
              return true;
            }) || [];
          log.debug(`Relevant branches after filtering: ${relevantBranches.join(', ')}`, this.config.auditContext);
          return [...acc, ...relevantBranches];
        }, []);

      log.debug(`Fixed branches for ${customRole.name}: ${fixedBranches?.join(', ') || 'none'}`, this.config.auditContext);

      if (fixedBranches?.length) {
        log.debug(`Applying branch fix to custom role ${customRole.name}`, this.config.auditContext);
        newCustomRoleSchema[customRole.uid].rules
          ?.filter((rule: Rule) => rule.module === 'branch')
          ?.forEach((rule) => {
            log.debug(`Updating branch rule from ${rule.branches?.join(', ')} to ${fixedBranches.join(', ')}`, this.config.auditContext);
            rule.branches = fixedBranches;
          });
      } else {
        log.debug(`No branch fixes needed for custom role ${customRole.name}`, this.config.auditContext);
      }
    });

    log.debug('Writing fixed custom role schema to file', this.config.auditContext);
    await this.writeFixContent(newCustomRoleSchema);
    log.debug('Custom role schema fix process completed', this.config.auditContext);
  }

  async writeFixContent(newCustomRoleSchema: Record<string, CustomRole>) {
    log.debug('Starting writeFixContent process for custom roles', this.config.auditContext);
    const filePath = join(this.folderPath, this.config.moduleConfig[this.moduleName].fileName);
    log.debug(`Target file path: ${filePath}`, this.config.auditContext);
    log.debug(`Custom roles to write: ${Object.keys(newCustomRoleSchema).length}`, this.config.auditContext);

    if (this.fix) {
      log.debug('Fix mode enabled, checking write permissions', this.config.auditContext);
      
      const skipConfirm = this.config.flags['copy-dir'] || 
                         this.config.flags['external-config']?.skipConfirm || 
                         this.config.flags.yes;
      
      if (skipConfirm) {
        log.debug('Skipping confirmation due to copy-dir, external-config, or yes flags', this.config.auditContext);
      } else {
        log.debug('Asking user for confirmation to write fix content', this.config.auditContext);
      }

      const canWrite = skipConfirm || (await cliux.confirm(commonMsg.FIX_CONFIRMATION));
      
      if (canWrite) {
        log.debug(`Writing fixed custom roles to: ${filePath}`, this.config.auditContext);
        writeFileSync(filePath, JSON.stringify(newCustomRoleSchema));
        log.debug(`Successfully wrote ${Object.keys(newCustomRoleSchema).length} custom roles to file`, this.config.auditContext);
      } else {
        log.debug('User declined to write fix content', this.config.auditContext);
      }
    } else {
      log.debug('Skipping writeFixContent - not in fix mode', this.config.auditContext);
    }
  }
}
