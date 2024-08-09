import isEmpty from 'lodash/isEmpty';
import values from 'lodash/values';
import { join } from 'node:path';

import { log, formatError, fsUtil, fileHelper } from '../../utils';
import BaseClass, { ApiOptions } from './base-class';
import { ModuleClassParams, CustomRoleConfig } from '../../types';
import { forEach, map } from 'lodash';

export default class ImportCustomRoles extends BaseClass {
  private customRolesMapperPath: string;
  private customRolesFolderPath: string;
  private customRolesUidMapperPath: string;
  private envUidMapperFolderPath: string;
  private entriesUidMapperFolderPath: string;
  private createdCustomRolesPath: string;
  private customRolesFailsPath: string;
  private customRolesConfig: CustomRoleConfig;
  private customRoles: Record<string, unknown>;
  private customRolesLocales: Record<string, unknown>;
  private customRolesUidMapper: Record<string, unknown>;
  private createdCustomRoles: Record<string, unknown>[];
  private failedCustomRoles: Record<string, unknown>[];
  private environmentsUidMap: Record<string, unknown>;
  private entriesUidMap: Record<string, unknown>;
  private localesUidMap: Record<string, unknown>;
  public targetLocalesMap: Record<string, unknown>;
  public sourceLocalesMap: Record<string, unknown>;

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
    super({ importConfig, stackAPIClient });
    this.customRolesConfig = importConfig.modules.customRoles;
    this.customRolesMapperPath = join(this.importConfig.backupDir, 'mapper', 'custom-roles');
    this.customRolesFolderPath = join(this.importConfig.backupDir, this.customRolesConfig.dirName);
    this.customRolesUidMapperPath = join(this.customRolesMapperPath, 'uid-mapping.json');
    this.envUidMapperFolderPath = join(this.importConfig.backupDir, 'mapper', 'environments');
    this.entriesUidMapperFolderPath = join(this.importConfig.backupDir, 'mapper', 'entries');
    this.createdCustomRolesPath = join(this.customRolesMapperPath, 'success.json');
    this.customRolesFailsPath = join(this.customRolesMapperPath, 'fails.json');
    this.customRoles = {};
    this.failedCustomRoles = [];
    this.createdCustomRoles = [];
    this.customRolesUidMapper = {};
    this.customRolesLocales = {};
    this.environmentsUidMap = {};
    this.entriesUidMap = {};
    this.localesUidMap = {};
  }

  /**
   * @method start
   * @returns {Promise<void>} Promise<void>
   */
  async start(): Promise<void> {
    log(this.importConfig, 'Migrating custom-roles', 'info');

    //Step1 check folder exists or not
    if (fileHelper.fileExistsSync(this.customRolesFolderPath)) {
      this.customRoles = fsUtil.readFile(join(this.customRolesFolderPath, this.customRolesConfig.fileName),true) as Record<string, unknown>;
      this.customRolesLocales = fsUtil.readFile(join(this.customRolesFolderPath, this.customRolesConfig.customRolesLocalesFileName),true) as Record<string, unknown>;
    } else {
      log(this.importConfig, `No custom-rules are found - '${this.customRolesFolderPath}'`, 'info');
      return;
    }

    //create webhooks in mapper directory
    await fsUtil.makeDirectory(this.customRolesMapperPath);
    this.customRolesUidMapper = fileHelper.fileExistsSync(this.customRolesUidMapperPath)
      ? (fsUtil.readFile(join(this.customRolesUidMapperPath), true) as Record<string, unknown>)
      : {};
    this.environmentsUidMap = fileHelper.fileExistsSync(this.envUidMapperFolderPath)
      ? (fsUtil.readFile(join(this.envUidMapperFolderPath, 'uid-mapping.json'), true) as Record<string, unknown>)
      : {};
    this.entriesUidMap = fileHelper.fileExistsSync(this.entriesUidMapperFolderPath)
      ? (fsUtil.readFile(join(this.entriesUidMapperFolderPath, 'uid-mapping.json'), true) as Record<string, unknown>)
      : {};

    //source and target stack locale map
    await this.getLocalesUidMap();
    await this.importCustomRoles();

    if (this.createdCustomRoles?.length) {
      fsUtil.writeFile(this.createdCustomRolesPath, this.createdCustomRoles);
    }

    if (this.failedCustomRoles?.length) {
      fsUtil.writeFile(this.customRolesFailsPath, this.failedCustomRoles);
    }

    log(this.importConfig, 'Custom roles have been imported successfully!', 'success');
  }

  async getLocalesUidMap(): Promise<void> {
    const { items } = await this.stack
      .locale()
      .query()
      .find()
      .then((data: any) => data)
      .catch((error) => log(this.importConfig, `Failed to fetch locale.${formatError(error)}`, 'error'));
    this.targetLocalesMap = {};
    this.sourceLocalesMap = {};

    forEach(items, (locale: any) => {
      this.targetLocalesMap[locale.code] = locale.uid;
    });

    for (const key in this.customRolesLocales) {
      const sourceLocales = this.customRolesLocales[key] as Record<string, any>;
      this.sourceLocalesMap[sourceLocales.code] = key;
    }

    for (const key in this.sourceLocalesMap) {
      const sourceLocaleKey = this.sourceLocalesMap[key] as string;
      this.localesUidMap[sourceLocaleKey] = this.targetLocalesMap[key];
    }
  }

  async importCustomRoles() {
    if (this.customRoles === undefined || isEmpty(this.customRoles)) {
      log(this.importConfig, 'No custom-roles found', 'info');
      return;
    }

    const apiContent = values(this.customRoles);

    const onSuccess = ({ response, apiData: { uid, name } = { uid: null, name: '' } }: any) => {
      this.createdCustomRoles.push(response);
      this.customRolesUidMapper[uid] = response.uid;
      log(this.importConfig, `custom-role '${name}' imported successfully`, 'success');
      fsUtil.writeFile(this.customRolesUidMapperPath, this.customRolesUidMapper);
    };

    const onReject = ({ error, apiData }: any) => {
      const err = error?.message ? JSON.parse(error.message) : error;
      const { name } = apiData;

      if (err?.errors?.name) {
        log(this.importConfig, `custom-role '${name}' already exists`, 'info');
      } else {
        this.failedCustomRoles.push(apiData);
        log(this.importConfig, `custom-role '${name}' failed to be import.${formatError(error)}`, 'error');
        log(this.importConfig, formatError(error), 'error');
      }
    };

    await this.makeConcurrentCall(
      {
        apiContent,
        processName: 'create custom role',
        apiParams: {
          serializeData: this.serializeWebhooks.bind(this),
          reject: onReject.bind(this),
          resolve: onSuccess.bind(this),
          entity: 'create-custom-role',
          includeParamOnCompletion: true,
        },
        concurrencyLimit: this.importConfig.fetchConcurrency || 1,
      },
      undefined,
      false,
    );
  }

  /**
   * @method serializeWebhooks
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeWebhooks(apiOptions: ApiOptions): ApiOptions {
    const { apiData: customRole } = apiOptions;

    if (this.customRolesUidMapper.hasOwnProperty(customRole.uid)) {
      log(
        this.importConfig,
        `custom-role '${customRole.name}' already exists. Skipping it to avoid duplicates!`,
        'info',
      );
      apiOptions.entity = undefined;
    } else {
      let branchRuleExists: boolean = false;
      forEach(customRole.rules, (rule: Record<string, any>) => {
        rule = this.getTransformUidsFactory(rule);
        // rules.branch is required to create custom roles.
        if (rule.module === 'branch') branchRuleExists = true;
      });
      if (!branchRuleExists) {
        customRole.rules.push({
          module: 'branch',
          branches: ['main'],
          acl: { read: true },
        });
      }
      apiOptions.apiData = customRole;
    }
    return apiOptions;
  }

  getTransformUidsFactory = (rule: Record<string, any>) => {
    if (rule.module === 'environment') {
      if(!isEmpty(this.environmentsUidMap)){
        rule.environments = map(rule.environments, (env: any) => this.environmentsUidMap[env]);
      }
    } else if (rule.module === 'locale') {
      if(!isEmpty(this.localesUidMap)){
        rule.locales = map(rule.locales, (locale: any) => this.localesUidMap[locale]);
      }
    } else if (rule.module === 'entry') {
      if(!isEmpty(this.entriesUidMap)){
        rule.entries = map(rule.entries, (entry: any) => this.entriesUidMap[entry]);
      }
    }
    return rule;
  };
}
