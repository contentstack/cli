import keys from 'lodash/keys';
import find from 'lodash/find';
import forEach from 'lodash/forEach';
import values from 'lodash/values';
import { resolve as pResolve } from 'node:path';

import BaseClass from './base-class';
import { log, formatError, fsUtil } from '../../utils';
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
  }

  async start(): Promise<void> {
    log(this.exportConfig, 'Starting custom roles export', 'info');

    this.rolesFolderPath = pResolve(
      this.exportConfig.data,
      this.exportConfig.branchName || '',
      this.customRolesConfig.dirName,
    );
    await fsUtil.makeDirectory(this.rolesFolderPath);
    this.customRolesLocalesFilepath = pResolve(this.rolesFolderPath, this.customRolesConfig.customRolesLocalesFileName);
    await this.getCustomRoles();
    await this.getLocales();
    await this.getCustomRolesLocales();
  }

  async getCustomRoles(): Promise<void> {
    const roles = await this.stack
      .role()
      .fetchAll({ include_rules: true, include_permissions: true })
      .then((data: any) => data)
      .catch((err: any) => log(this.exportConfig, `Failed to fetch roles. ${formatError(err)}`, 'error'));
    const customRoles = roles.items.filter((role: any) => !this.existingRoles[role.name]);

    if (!customRoles.length) {
      log(this.exportConfig, 'No custom roles were found in the Stack', 'info');
      return;
    }

    customRoles.forEach((role: any) => {
      log(this.exportConfig, `'${role?.name}' role was exported successfully`, 'info');
      this.customRoles[role.uid] = role;
    });
    fsUtil.writeFile(pResolve(this.rolesFolderPath, this.customRolesConfig.fileName), this.customRoles);
  }

  async getLocales() {
    const locales = await this.stack
      .locale()
      .query({})
      .find()
      .then((data: any) => data)
      .catch((err: any) => log(this.exportConfig, `Failed to fetch locales. ${formatError(err)}`, 'error'));
    for (const locale of locales.items) {
      this.sourceLocalesMap[locale.uid] = locale;
    }
  }

  async getCustomRolesLocales() {
    for (const role of values(this.customRoles)) {
      const customRole = role as Record<string, any>; 
      const rulesLocales = find(customRole.rules, (rule: any) => rule.module === 'locale');
      if (rulesLocales?.locales?.length) {
        forEach(rulesLocales.locales, (locale: any) => {
          this.localesMap[locale] = 1;
        })
      }
    }

    if (keys(this.localesMap)?.length) {
      for (const locale in this.localesMap) {
        if (this.sourceLocalesMap[locale] !== undefined) {
          const sourceLocale = this.sourceLocalesMap[locale] as Record<string, any>;
          delete sourceLocale?.stackHeaders;
        }
        this.localesMap[locale] = this.sourceLocalesMap[locale];
      }
      fsUtil.writeFile(this.customRolesLocalesFilepath, this.localesMap);
    }
  }
}
