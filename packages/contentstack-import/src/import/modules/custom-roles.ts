import isEmpty from 'lodash/isEmpty';
import values from 'lodash/values';
import { join } from 'node:path';
import { forEach, map } from 'lodash';
import { log, handleAndLogError } from '@contentstack/cli-utilities';

import { fsUtil, fileHelper } from '../../utils';
import BaseClass, { ApiOptions } from './base-class';
import { ModuleClassParams, CustomRoleConfig } from '../../types';

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
    this.importConfig.context.module = 'custom-roles';
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
    log.debug('Checking for custom roles folder existence...', this.importConfig.context);

    //Step1 check folder exists or not
    if (fileHelper.fileExistsSync(this.customRolesFolderPath)) {
      log.debug(`Found custom roles folder: ${this.customRolesFolderPath}`, this.importConfig.context);
      
      this.customRoles = fsUtil.readFile(join(this.customRolesFolderPath, this.customRolesConfig.fileName),true) as Record<string, unknown>;
      this.customRolesLocales = fsUtil.readFile(join(this.customRolesFolderPath, this.customRolesConfig.customRolesLocalesFileName),true) as Record<string, unknown>;
    } else {
      log.info(`No custom roles found in: ${this.customRolesFolderPath}`, this.importConfig.context);
      return;
    }

    //create webhooks in mapper directory
    log.debug('Creating custom roles mapper directory...', this.importConfig.context);
    await fsUtil.makeDirectory(this.customRolesMapperPath);
    
    log.debug('Loading existing custom roles UID data...', this.importConfig.context);
    this.customRolesUidMapper = fileHelper.fileExistsSync(this.customRolesUidMapperPath)
      ? (fsUtil.readFile(join(this.customRolesUidMapperPath), true) as Record<string, unknown>) || {}
      : {};
      
    log.debug('Loading environments UID data...', this.importConfig.context);
    this.environmentsUidMap = fileHelper.fileExistsSync(this.envUidMapperFolderPath)
      ? (fsUtil.readFile(join(this.envUidMapperFolderPath, 'uid-mapping.json'), true) as Record<string, unknown>) || {}
      : {};
      
    log.debug('Loading entries UID data...', this.importConfig.context);
    this.entriesUidMap = fileHelper.fileExistsSync(this.entriesUidMapperFolderPath)
      ? (fsUtil.readFile(join(this.entriesUidMapperFolderPath, 'uid-mapping.json'), true) as Record<string, unknown>) || {}
      : {};

    if (this.customRolesUidMapper && Object.keys(this.customRolesUidMapper || {}).length > 0) {
      const customRolesUidCount = Object.keys(this.customRolesUidMapper || {}).length;
      log.debug(`Loaded existing custom roles UID data: ${customRolesUidCount} items`, this.importConfig.context);
    } else {
      log.debug('No existing custom roles UID data found.', this.importConfig.context);
    }

    if (this.environmentsUidMap && Object.keys(this.environmentsUidMap || {})?.length > 0) {
      const envUidCount = Object.keys(this.environmentsUidMap || {}).length;
      log.debug(`Loaded environments UID data: ${envUidCount} items`, this.importConfig.context);
    } else {
      log.debug('No environments UID data found.', this.importConfig.context);
    }

    if (this.entriesUidMap && Object.keys(this.entriesUidMap || {}).length > 0) {
      const entriesUidCount = Object.keys(this.entriesUidMap || {}).length;
      log.debug(`Loaded entries UID data: ${entriesUidCount} items`, this.importConfig.context);
    } else {
      log.debug('No entries UID data found.', this.importConfig.context);
    }

    //source and target stack locale map
    log.debug('Getting locales UID mapping...', this.importConfig.context);
    await this.getLocalesUidMap();
    
    log.debug('Starting custom roles import...', this.importConfig.context);
    await this.importCustomRoles();

    log.debug('Processing custom roles import results...', this.importConfig.context);
    if (this.createdCustomRoles?.length) {
      fsUtil.writeFile(this.createdCustomRolesPath, this.createdCustomRoles);
      log.debug(`Written ${this.createdCustomRoles.length} successful custom roles to file`, this.importConfig.context);
    }

    if (this.failedCustomRoles?.length) {
      fsUtil.writeFile(this.customRolesFailsPath, this.failedCustomRoles);
      log.debug(`Written ${this.failedCustomRoles.length} failed custom roles to file`, this.importConfig.context);
    }

    log.success('Custom roles have been imported successfully!', this.importConfig.context);
  }

  async getLocalesUidMap(): Promise<void> {
    log.debug('Fetching target stack locales...', this.importConfig.context);
    const { items } = await this.stack
      .locale()
      .query()
      .find()
      .then((data: any) => {
        log.debug(`Found ${data.items?.length || 0} locales in target stack`, this.importConfig.context);
        return data;
      })
      .catch((error) => {
        log.debug('Error fetching target stack locales!', this.importConfig.context);
        handleAndLogError(error, { ...this.importConfig.context});
      });
      
    this.targetLocalesMap = {};
    this.sourceLocalesMap = {};

    log.debug('Building target locales mapping...', this.importConfig.context);
    forEach(items, (locale: any) => {
      this.targetLocalesMap[locale.code] = locale.uid;
    });

    log.debug('Building source locales mapping...', this.importConfig.context);
    for (const key in this.customRolesLocales) {
      const sourceLocales = this.customRolesLocales[key] as Record<string, any>;
      this.sourceLocalesMap[sourceLocales.code] = key;
    }

    log.debug('Creating locale UID mapping...', this.importConfig.context);
    for (const key in this.sourceLocalesMap) {
      const sourceLocaleKey = this.sourceLocalesMap[key] as string;
      this.localesUidMap[sourceLocaleKey] = this.targetLocalesMap[key];
    }
    
    const localesMappingCount = Object.keys(this.localesUidMap || {}).length;
    log.debug(`Created ${localesMappingCount} locale UID mappings`, this.importConfig.context);
  }

  async importCustomRoles() {
    log.debug('Starting custom roles import process...', this.importConfig.context);
    if (this.customRoles === undefined || isEmpty(this.customRoles)) {
      log.info('No custom roles found', this.importConfig.context);
      return;
    }

    const apiContent = values(this.customRoles);
    log.debug(`Importing ${apiContent.length} custom roles`, this.importConfig.context);

    const onSuccess = ({ response, apiData: { uid, name } = { uid: null, name: '' } }: any) => {
      this.createdCustomRoles.push(response);
      this.customRolesUidMapper[uid] = response.uid;
      log.success(`custom-role '${name}' imported successfully`, this.importConfig.context);
      log.debug(`Custom role import completed: ${name} (${uid})`, this.importConfig.context);
      fsUtil.writeFile(this.customRolesUidMapperPath, this.customRolesUidMapper);
    };

    const onReject = ({ error, apiData }: any) => {
      const err = error?.message ? JSON.parse(error.message) : error;
      const { name } = apiData;
      log.debug(`Custom role '${name}' import failed`, this.importConfig.context);

      if (err?.errors?.name) {
        log.info(`Custom role '${name}' already exists.`, this.importConfig.context);
      } else {
        this.failedCustomRoles.push(apiData);
        handleAndLogError(error, { ...this.importConfig.context, name }, `custom-role '${name}' failed to be import`);
      }
    };

    log.debug(`Using concurrency limit: ${this.importConfig.fetchConcurrency || 1}`, this.importConfig.context);
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
    
    log.debug('Custom roles import process completed.', this.importConfig.context);
  }

  /**
   * @method serializeWebhooks
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeWebhooks(apiOptions: ApiOptions): ApiOptions {
    const { apiData: customRole } = apiOptions;
    log.debug(`Serializing custom role: ${customRole.name} (${customRole.uid})`, this.importConfig.context);

    if (this.customRolesUidMapper.hasOwnProperty(customRole.uid)) {
      log.info(
        `custom-role '${customRole.name}' already exists. Skipping it to avoid duplicates!`,
        this.importConfig.context,
      );
      log.debug(`Skipping custom role serialization for: ${customRole.uid}`, this.importConfig.context);
      apiOptions.entity = undefined;
    } else {
      let branchRuleExists: boolean = false;
      log.debug(`Processing ${customRole.rules?.length || 0} rules for custom role: ${customRole.name}`, this.importConfig.context);
      
      forEach(customRole.rules, (rule: Record<string, any>) => {
        rule = this.getTransformUidsFactory(rule);
        // rules.branch is required to create custom roles.
        if (rule.module === 'branch') {
          branchRuleExists = true;
          log.debug(`Found branch rule in custom role: ${customRole.name}`, this.importConfig.context);
        }
      });
      
      if (!branchRuleExists) {
        log.debug(`Adding default branch rule to custom role: ${customRole.name}`, this.importConfig.context);
        customRole.rules.push({
          module: 'branch',
          branches: ['main'],
          acl: { read: true },
        });
      }
      
      log.debug(`Custom role serialization completed: ${customRole.name}`, this.importConfig.context);
      apiOptions.apiData = customRole;
    }
    return apiOptions;
  }

  getTransformUidsFactory = (rule: Record<string, any>) => {
    log.debug(`Transforming UIDs for rule module: ${rule.module}`, this.importConfig.context);
    
    if (rule.module === 'environment') {
      if(!isEmpty(this.environmentsUidMap)){
        const originalEnvs = rule.environments?.length || 0;
        rule.environments = map(rule.environments, (env: any) => this.environmentsUidMap[env]);
        log.debug(`Transformed ${originalEnvs} environment UIDs for rule`, this.importConfig.context);
      } else {
        log.debug('No environment UID mappings available for transformation.', this.importConfig.context);
      }
    } else if (rule.module === 'locale') {
      if(!isEmpty(this.localesUidMap)){
        const originalLocales = rule.locales?.length || 0;
        rule.locales = map(rule.locales, (locale: any) => this.localesUidMap[locale]);
        log.debug(`Transformed ${originalLocales} locale UIDs for rule`, this.importConfig.context);
      } else {
        log.debug('No locale UID mappings available for transformation.', this.importConfig.context);
      }
    } else if (rule.module === 'entry') {
      if(!isEmpty(this.entriesUidMap)){
        const originalEntries = rule.entries?.length || 0;
        rule.entries = map(rule.entries, (entry: any) => this.entriesUidMap[entry]);
        log.debug(`Transformed ${originalEntries} entry UIDs for rule`, this.importConfig.context);
      } else {
        log.debug('No entry UID mappings available for transformation.', this.importConfig.context);
      }
    }
    return rule;
  };
}
