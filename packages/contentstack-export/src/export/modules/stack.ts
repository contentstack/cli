import find from 'lodash/find';
import { resolve as pResolve } from 'node:path';
import { handleAndLogError, isAuthenticated, managementSDKClient, log } from '@contentstack/cli-utilities';

import BaseClass from './base-class';
import { fsUtil } from '../../utils';
import { StackConfig, ModuleClassParams } from '../../types';

export default class ExportStack extends BaseClass {
  private stackConfig: StackConfig;
  private stackFolderPath: string;
  private qs: {
    include_count: boolean;
    skip?: number;
  };

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
    super({ exportConfig, stackAPIClient });
    this.stackConfig = exportConfig.modules.stack;
    this.qs = { include_count: true };
    this.stackFolderPath = pResolve(
      this.exportConfig.data,
      this.exportConfig.branchName || '',
      this.stackConfig.dirName,
    );
    this.exportConfig.context.module = 'stack';
  }

  async start(): Promise<void> {
    log.debug('Starting stack export process...', this.exportConfig.context);

    if (isAuthenticated()) {
      log.debug('User authenticated.', this.exportConfig.context);
      const stackData = await this.getStack();
      if (stackData?.org_uid) {
        log.debug(`Found organization UID: '${stackData.org_uid}'.`, this.exportConfig.context);
        this.exportConfig.org_uid = stackData.org_uid;
        this.exportConfig.sourceStackName = stackData.name;
        log.debug(`Set source stack name: '${stackData.name}'.`, this.exportConfig.context);
      } else {
        log.debug('No stack data found or missing organization UID.', this.exportConfig.context);
      }
    } else {
      log.debug('User is not authenticated.', this.exportConfig.context);
    }

    if (this.exportConfig.management_token) {
      log.info(
        'Skipping stack settings export: Operation is not supported when using a management token.',
        this.exportConfig.context,
      );
    } else {
      await this.exportStackSettings();
    }
    if (!this.exportConfig.preserveStackVersion && !this.exportConfig.hasOwnProperty('master_locale')) {
      log.debug(
        'Preserve stack version is false and master locale not set, fetching locales...',
        this.exportConfig.context,
      );
      //fetch master locale details
      return this.getLocales();
    } else if (this.exportConfig.preserveStackVersion) {
      log.debug('Preserve stack version is set to true.', this.exportConfig.context);
      return this.exportStack();
    } else {
      log.debug('Master locale is already set.', this.exportConfig.context);
    }
  }

  async getStack(): Promise<any> {
    log.debug(`Fetching stack data for: '${this.exportConfig.source_stack}'...`, this.exportConfig.context);

    const tempAPIClient = await managementSDKClient({ host: this.exportConfig.host });
    log.debug(`Created Management SDK client with host: '${this.exportConfig.host}'.`, this.exportConfig.context);

    return await tempAPIClient
      .stack({ api_key: this.exportConfig.source_stack })
      .fetch()
      .then((data: any) => {
        log.debug(`Successfully fetched stack data for: '${this.exportConfig.source_stack}'.`, this.exportConfig.context);
        return data;
      })
      .catch((error: any) => {
        log.debug(`Failed to fetch stack data for: '${this.exportConfig.source_stack}'.`, this.exportConfig.context);
        return {};
      });
  }

  async getLocales(skip: number = 0) {
    if (skip) {
      this.qs.skip = skip;
      log.debug(`Fetching locales with skip: ${skip}.`, this.exportConfig.context);
    } else {
      log.debug('Fetching locales with initial query...', this.exportConfig.context);
    }

    log.debug(`Query parameters: ${JSON.stringify(this.qs)}.`, this.exportConfig.context);

    return await this.stack
      .locale()
      .query(this.qs)
      .find()
      .then(async (data: any) => {
        const { items, count } = data;
        log.debug(`Fetched ${items?.length || 0} locales out of ${count}.`, this.exportConfig.context);

        if (items?.length) {
          log.debug(`Processing ${items.length} locales to find the master locale...`, this.exportConfig.context);
          skip += this.stackConfig.limit || 100;
          const masterLocalObj = find(items, (locale: any) => {
            if (locale.fallback_locale === null) {
              log.debug(`Found master locale: '${locale.name}' (code: ${locale.code}).`, this.exportConfig.context);
              return locale;
            }
          });
          if (masterLocalObj) {
            log.debug(`Returning master locale: '${masterLocalObj.name}'.`, this.exportConfig.context);
            return masterLocalObj;
          } else if (skip >= count) {
            log.error(
              `Master locale not found in the stack ${this.exportConfig.source_stack}. Please ensure that the stack has a master locale.`,
              this.exportConfig.context,
            );
            log.debug('Completed search. Master locale not found.', this.exportConfig.context);
            return;
          } else {
            log.debug(
              `Master locale not found in current batch, continuing with skip: ${skip}`,
              this.exportConfig.context,
            );
            return await this.getLocales(skip);
          }
        } else {
          log.debug('No locales found to process.', this.exportConfig.context);
        }
      })
      .catch((error: any) => {
        log.debug(
          `Error occurred while fetching locales for stack: ${this.exportConfig.source_stack}`,
          this.exportConfig.context,
        );
        handleAndLogError(
          error,
          { ...this.exportConfig.context },
          `Failed to fetch locales for stack ${this.exportConfig.source_stack}`,
        );
        throw error;
      });
  }

  async exportStack(): Promise<any> {
    log.debug(`Starting stack export for: '${this.exportConfig.source_stack}'...`, this.exportConfig.context);

    await fsUtil.makeDirectory(this.stackFolderPath);
    log.debug(`Created stack directory at: '${this.stackFolderPath}'`, this.exportConfig.context);

    return this.stack
      .fetch()
      .then((resp: any) => {
        const stackFilePath = pResolve(this.stackFolderPath, this.stackConfig.fileName);
        log.debug(`Writing stack data to: '${stackFilePath}'`, this.exportConfig.context);
        fsUtil.writeFile(stackFilePath, resp);
        log.success(
          `Stack details exported successfully for stack ${this.exportConfig.source_stack}`,
          this.exportConfig.context,
        );
        log.debug('Stack export completed successfully.', this.exportConfig.context);
        return resp;
      })
      .catch((error: any) => {
        log.debug(`An error occurred while exporting stack: '${this.exportConfig.source_stack}'.`, this.exportConfig.context);
        handleAndLogError(error, { ...this.exportConfig.context });
      });
  }

  async exportStackSettings(): Promise<any> {
    log.info('Exporting stack settings...', this.exportConfig.context);
    await fsUtil.makeDirectory(this.stackFolderPath);
    return this.stack
      .settings()
      .then((resp: any) => {
        fsUtil.writeFile(pResolve(this.stackFolderPath, 'settings.json'), resp);
        log.success('Exported stack settings successfully!', this.exportConfig.context);
        return resp;
      })
      .catch((error: any) => {
        handleAndLogError(error, { ...this.exportConfig.context });
      });
  }
}
