import keys from 'lodash/keys';
import find from 'lodash/find';
import forEach from 'lodash/forEach';
import values from 'lodash/values';
import { resolve as pResolve } from 'node:path';
import { handleAndLogError, messageHandler, log } from '@contentstack/cli-utilities';

import BaseClass from './base-class';
import { fsUtil } from '../../utils';
import { CustomRoleConfig, ModuleClassParams } from '../../types';

export default class ExportCustomRoles extends BaseClass {
  private customRoles: Record<string, unknown>;
  private existingRoles: Record<string, number>;
  private customRolesConfig: CustomRoleConfig;
  private sourceLocalesMap: Record<string, unknown>;
  private localesMap: Record<string, unknown>;
  public rolesFolderPath: string;
  public customRolesLocalesFilepath: string;

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
    super({ exportConfig, stackAPIClient });
    this.customRoles = {};
    this.customRolesConfig = exportConfig.modules.customRoles;
    this.existingRoles = { Admin: 1, Developer: 1, 'Content Manager': 1 };
    this.localesMap = {};
    this.sourceLocalesMap = {};
    this.exportConfig.context.module = 'custom-roles';
  }

  async start(): Promise<void> {
    log.debug('Starting export process for custom roles...', this.exportConfig.context);

    this.rolesFolderPath = pResolve(
      this.exportConfig.data,
      this.exportConfig.branchName || '',
      this.customRolesConfig.dirName,
    );
    log.debug(`Custom roles folder path is: ${this.rolesFolderPath}`, this.exportConfig.context);
    
    await fsUtil.makeDirectory(this.rolesFolderPath);
    log.debug('Custom roles directory created.', this.exportConfig.context);
    
    this.customRolesLocalesFilepath = pResolve(this.rolesFolderPath, this.customRolesConfig.customRolesLocalesFileName);
    log.debug(`Custom roles locales file path is: ${this.customRolesLocalesFilepath}`, this.exportConfig.context);
    
    await this.getCustomRoles();
    await this.getLocales();
    await this.getCustomRolesLocales();
    
    log.debug(`Custom roles export completed. Total custom roles: ${Object.keys(this.customRoles).length}`, this.exportConfig.context);
  }

  async getCustomRoles(): Promise<void> {
    log.debug('Fetching all roles from the stack...', this.exportConfig.context);
    
    const roles = await this.stack
      .role()
      .fetchAll({ include_rules: true, include_permissions: true })
      .then((data: any) => {
        log.debug(`Fetched ${data.items?.length || 0} roles from the stack.`, this.exportConfig.context);
        return data;
      })
      .catch((err: any) => {
        log.debug('An error occurred while fetching roles.', this.exportConfig.context);
        return handleAndLogError(err, { ...this.exportConfig.context });
      });
    
    const customRoles = roles.items.filter((role: any) => !this.existingRoles[role.name]);
    log.debug(`Found ${customRoles.length} custom roles from ${roles.items?.length || 0} total roles.`, this.exportConfig.context);

    if (!customRoles.length) {
      log.info(messageHandler.parse('ROLES_NO_CUSTOM_ROLES'), this.exportConfig.context);
      return;
    }

    customRoles.forEach((role: any) => {
      log.debug(`Processing custom role: ${role?.name} (${role?.uid})`, this.exportConfig.context);
      log.info(messageHandler.parse('ROLES_EXPORTING_ROLE', role?.name), this.exportConfig.context);
      this.customRoles[role.uid] = role;
    });
    
    const customRolesFilePath = pResolve(this.rolesFolderPath, this.customRolesConfig.fileName);
    log.debug(`Writing custom roles to: ${customRolesFilePath}.`, this.exportConfig.context);
    fsUtil.writeFile(customRolesFilePath, this.customRoles);
  }

  async getLocales() {
    log.debug('Fetching locales for custom roles mapping...', this.exportConfig.context);
    
    const locales = await this.stack
      .locale()
      .query({})
      .find()
      .then((data: any) => {
        log.debug(`Fetched ${data?.items?.length || 0} locales.`, this.exportConfig.context);
        return data;
      })
      .catch((err: any) => {
        log.debug('An error occurred while fetching locales.', this.exportConfig.context);
        return handleAndLogError(err, { ...this.exportConfig.context });
      });
    
    for (const locale of locales.items) {
      log.debug(`Mapping locale: ${locale?.name} (${locale?.uid})`, this.exportConfig.context);
      this.sourceLocalesMap[locale.uid] = locale;
    }
    
    log.debug(`Mapped ${Object.keys(this.sourceLocalesMap).length} source locales.`, this.exportConfig.context);
  }

  async getCustomRolesLocales() {
    log.debug('Processing custom roles locales mapping...', this.exportConfig.context);
    
    for (const role of values(this.customRoles)) {
      const customRole = role as Record<string, any>;
      log.debug(`Processing locales for custom role: ${customRole?.name}`, this.exportConfig.context);
      
      const rulesLocales = find(customRole.rules, (rule: any) => rule.module === 'locale');
      if (rulesLocales?.locales?.length) {
        log.debug(`Found ${rulesLocales.locales.length} locales for the role: ${customRole?.name}.`, this.exportConfig.context);
        forEach(rulesLocales.locales, (locale: any) => {
          log.debug(`Adding locale ${locale} to the custom roles mapping.`, this.exportConfig.context);
          this.localesMap[locale] = 1;
        });
      }
    }

    if (keys(this.localesMap)?.length) {
      log.debug(`Processing ${Object.keys(this.localesMap).length} mapped locales.`, this.exportConfig.context);
      
      for (const locale in this.localesMap) {
        if (this.sourceLocalesMap[locale] !== undefined) {
          const sourceLocale = this.sourceLocalesMap[locale] as Record<string, any>;
          log.debug(`Mapping locale ${locale} (${sourceLocale.name})`, this.exportConfig.context);
          delete sourceLocale?.stackHeaders;
        }
        this.localesMap[locale] = this.sourceLocalesMap[locale];
      }
      
      log.debug(`Writing custom roles locales to: ${this.customRolesLocalesFilepath}.`, this.exportConfig.context);
      fsUtil.writeFile(this.customRolesLocalesFilepath, this.localesMap);
    } else {
      log.debug('No custom role locales found to process.', this.exportConfig.context);
    }
  }
}
