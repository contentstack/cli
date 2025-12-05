import find from 'lodash/find';
import { resolve as pResolve } from 'node:path';
import { handleAndLogError, isAuthenticated, managementSDKClient, log } from '@contentstack/cli-utilities';

import BaseClass from './base-class';
import {
  fsUtil,
  PROCESS_NAMES,
  MODULE_CONTEXTS,
  PROCESS_STATUS,
  MODULE_NAMES,
} from '../../utils';
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
    this.exportConfig.context.module = MODULE_CONTEXTS.STACK;
    this.currentModuleName = MODULE_NAMES[MODULE_CONTEXTS.STACK];
  }

  async start(): Promise<void> {
    try {
      log.debug('Starting stack export process...', this.exportConfig.context);

      // Initial analysis with loading spinner
      const [stackData] = await this.withLoadingSpinner('STACK: Analyzing stack configuration...', async () => {
        const stackData = isAuthenticated() ? await this.getStack() : null;
        return [stackData];
      });

      // Create nested progress manager
      const progress = this.createNestedProgress(this.currentModuleName);

      // Add processes based on configuration
      let processCount = 0;

      if (stackData?.org_uid) {
        log.debug(`Found organization UID: '${stackData.org_uid}'.`, this.exportConfig.context);
        this.exportConfig.org_uid = stackData.org_uid;
        this.exportConfig.sourceStackName = stackData.name;
        log.debug(`Set source stack name: ${stackData.name}`, this.exportConfig.context);
      }

      if (!this.exportConfig.management_token) {
        progress.addProcess(PROCESS_NAMES.STACK_SETTINGS, 1);
        processCount++;
      }

      if (!this.exportConfig.preserveStackVersion && !this.exportConfig.hasOwnProperty('master_locale')) {
        progress.addProcess(PROCESS_NAMES.STACK_LOCALE, 1);
        processCount++;
      } else if (this.exportConfig.preserveStackVersion) {
        progress.addProcess(PROCESS_NAMES.STACK_DETAILS, 1);
        processCount++;
      }

      // Execute processes
      if (!this.exportConfig.management_token) {
        progress
          .startProcess(PROCESS_NAMES.STACK_SETTINGS)
          .updateStatus(
            PROCESS_STATUS[PROCESS_NAMES.STACK_SETTINGS].EXPORTING,
            PROCESS_NAMES.STACK_SETTINGS,
          );
        await this.exportStackSettings();
        progress.completeProcess(PROCESS_NAMES.STACK_SETTINGS, true);
      } else {
        log.info(
          'Skipping stack settings export: Operation is not supported when using a management token.',
          this.exportConfig.context,
        );
      }

      if (!this.exportConfig.preserveStackVersion && !this.exportConfig.hasOwnProperty('master_locale')) {
        progress
          .startProcess(PROCESS_NAMES.STACK_LOCALE)
          .updateStatus(
            PROCESS_STATUS[PROCESS_NAMES.STACK_LOCALE].FETCHING,
            PROCESS_NAMES.STACK_LOCALE,
          );
        const masterLocale = await this.getLocales();
        progress.completeProcess(PROCESS_NAMES.STACK_LOCALE, true);

        if (masterLocale?.code) {
          this.exportConfig.master_locale = { code: masterLocale.code };
          log.debug(`Set master locale: ${masterLocale.code}`, this.exportConfig.context);
        }

        this.completeProgress(true);
        return masterLocale;
      } else if (this.exportConfig.preserveStackVersion) {
        progress
          .startProcess(PROCESS_NAMES.STACK_DETAILS)
          .updateStatus(
            PROCESS_STATUS[PROCESS_NAMES.STACK_DETAILS].EXPORTING,
            PROCESS_NAMES.STACK_DETAILS,
          );
        const stackResult = await this.exportStack();
        progress.completeProcess(PROCESS_NAMES.STACK_DETAILS, true);

        this.completeProgress(true);
        return stackResult;
      } else {
        log.debug('Locale locale already set, skipping locale fetch', this.exportConfig.context);
      }

      this.completeProgress(true);
      log.success('Stack export completed successfully', this.exportConfig.context);
    } catch (error) {
      log.debug('Error occurred during stack export', this.exportConfig.context);
      handleAndLogError(error, { ...this.exportConfig.context });
      this.completeProgress(false, error?.message || 'Stack export failed');
      throw error;
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
<<<<<<< HEAD
          log.debug(`Processing ${items.length} locales to find master locale`, this.exportConfig.context);

          // Track progress for each locale processed
          this.progressManager?.tick(true, 'Fetch locale', null, PROCESS_NAMES.STACK_LOCALE);

=======
          log.debug(`Processing ${items.length} locales to find the master locale...`, this.exportConfig.context);
>>>>>>> development
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
              `Locale locale not found in the stack ${this.exportConfig.source_stack}. Please ensure that the stack has a master locale.`,
              this.exportConfig.context,
            );
            log.debug('Completed search. Master locale not found.', this.exportConfig.context);
            return;
          } else {
            log.debug(
              `Locale locale not found in current batch, continuing with skip: ${skip}`,
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
        this.progressManager?.tick(
          false,
          'locale fetch',
          error?.message || PROCESS_STATUS[PROCESS_NAMES.STACK_LOCALE].FAILED,
          PROCESS_NAMES.STACK_LOCALE,
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

        // Track progress for stack export completion
        this.progressManager?.tick(
          true,
          `stack: ${this.exportConfig.source_stack}`,
          null,
          PROCESS_NAMES.STACK_DETAILS,
        );

        log.success(
          `Stack details exported successfully for stack ${this.exportConfig.source_stack}`,
          this.exportConfig.context,
        );
        log.debug('Stack export completed successfully.', this.exportConfig.context);
        return resp;
      })
      .catch((error: any) => {
<<<<<<< HEAD
        log.debug(`Error occurred while exporting stack: ${this.exportConfig.source_stack}`, this.exportConfig.context);
        this.progressManager?.tick(
          false,
          'stack export',
          error?.message || PROCESS_STATUS[PROCESS_NAMES.STACK_DETAILS].FAILED,
          PROCESS_NAMES.STACK_DETAILS,
        );
=======
        log.debug(`An error occurred while exporting stack: '${this.exportConfig.source_stack}'.`, this.exportConfig.context);
>>>>>>> development
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

        // Track progress for stack settings completion
        this.progressManager?.tick(true, 'stack settings', null, PROCESS_NAMES.STACK_SETTINGS);

        log.success('Exported stack settings successfully!', this.exportConfig.context);
        return resp;
      })
      .catch((error: any) => {
        this.progressManager?.tick(
          false,
          'stack settings',
          error?.message || PROCESS_STATUS[PROCESS_NAMES.STACK_SETTINGS].FAILED,
          PROCESS_NAMES.STACK_SETTINGS,
        );
        handleAndLogError(error, { ...this.exportConfig.context });
      });
  }
}
