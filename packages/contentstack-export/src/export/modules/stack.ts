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
    this.currentModuleName = 'Stack';
  }

  async start(): Promise<void> {
    try {
      log.debug('Starting stack export process...', this.exportConfig.context);

      // Initial analysis with loading spinner
      const [stackData, localesCount] = await this.withLoadingSpinner(
        'STACK: Analyzing stack configuration...',
        async () => {
          const stackData = isAuthenticated() ? await this.getStack() : null;
          const localesCount =
            !this.exportConfig.preserveStackVersion && !this.exportConfig.hasOwnProperty('master_locale')
              ? await this.getLocalesCount()
              : 0;
          return [stackData, localesCount];
        },
      );

      // Create nested progress manager
      const progress = this.createNestedProgress(this.currentModuleName);

      // Add processes based on configuration
      let processCount = 0;

      if (stackData?.org_uid) {
        log.debug(`Found organization UID: ${stackData.org_uid}`, this.exportConfig.context);
        this.exportConfig.org_uid = stackData.org_uid;
        this.exportConfig.sourceStackName = stackData.name;
        log.debug(`Set source stack name: ${stackData.name}`, this.exportConfig.context);
      }

      if (!this.exportConfig.management_token) {
        progress.addProcess('Settings', 1);
        processCount++;
      }

      if (
        !this.exportConfig.preserveStackVersion &&
        !this.exportConfig.hasOwnProperty('master_locale') &&
        localesCount > 0
      ) {
        progress.addProcess('Locale', localesCount);
        processCount++;
      } else if (this.exportConfig.preserveStackVersion) {
        progress.addProcess('Details', 1);
        processCount++;
      }

      // Execute processes
      if (!this.exportConfig.management_token) {
        progress.startProcess('Settings').updateStatus('Exporting stack settings...', 'Settings');
        await this.exportStackSettings();
        progress.completeProcess('Settings', true);
      } else {
        log.info(
          'Skipping stack settings export: Operation is not supported when using a management token.',
          this.exportConfig.context,
        );
      }

      if (
        !this.exportConfig.preserveStackVersion &&
        !this.exportConfig.hasOwnProperty('master_locale') &&
        localesCount > 0
      ) {
        progress.startProcess('Locale').updateStatus('Fetching master locale...', 'Locale');
        const masterLocale = await this.getLocales();
        progress.completeProcess('Locale', true);

        if (masterLocale?.code) {
          this.exportConfig.master_locale = { code: masterLocale.code };
          log.debug(`Set master locale: ${masterLocale.code}`, this.exportConfig.context);
        }

        this.completeProgress(true);
        return masterLocale;
      } else if (this.exportConfig.preserveStackVersion) {
        progress.startProcess('Details').updateStatus('Exporting stack data...', 'Details');
        const stackResult = await this.exportStack();
        progress.completeProcess('Details', true);

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
    log.debug(`Fetching stack data for stack: ${this.exportConfig.source_stack}`, this.exportConfig.context);

    const tempAPIClient = await managementSDKClient({ host: this.exportConfig.host });
    log.debug(`Created management SDK client with host: ${this.exportConfig.host}`, this.exportConfig.context);

    return await tempAPIClient
      .stack({ api_key: this.exportConfig.source_stack })
      .fetch()
      .then((data: any) => {
        log.debug(`Successfully fetched stack data for: ${this.exportConfig.source_stack}`, this.exportConfig.context);
        return data;
      })
      .catch((error: any) => {
        log.debug(`Failed to fetch stack data for: ${this.exportConfig.source_stack}`, this.exportConfig.context);
        return {};
      });
  }

  async getLocalesCount(): Promise<number> {
    log.debug('Fetching locales count...', this.exportConfig.context);

    try {
      const countQuery = {
        ...this.qs,
        limit: 1,
      };

      const data = await this.stack.locale().query(countQuery).find();

      const count = data.count || 0;
      log.debug(`Total locales count: ${count}`, this.exportConfig.context);
      return count;
    } catch (error) {
      log.debug('Failed to fetch locales count', this.exportConfig.context);
      return 0;
    }
  }

  async getLocales(skip: number = 0) {
    if (skip) {
      this.qs.skip = skip;
      log.debug(`Fetching locales with skip: ${skip}`, this.exportConfig.context);
    } else {
      log.debug('Fetching locales with initial query', this.exportConfig.context);
    }

    log.debug(`Query parameters: ${JSON.stringify(this.qs)}`, this.exportConfig.context);

    return await this.stack
      .locale()
      .query(this.qs)
      .find()
      .then(async (data: any) => {
        const { items, count } = data;
        log.debug(`Fetched ${items?.length || 0} locales out of total ${count}`, this.exportConfig.context);

        if (items?.length) {
          log.debug(`Processing ${items.length} locales to find master locale`, this.exportConfig.context);

          // Track progress for each locale processed
          items.forEach((locale: any) => {
            this.progressManager?.tick(true, `locale: ${locale.name || locale.code}`, null, 'Locale');
          });

          skip += this.stackConfig.limit || 100;
          const masterLocalObj = find(items, (locale: any) => {
            if (locale.fallback_locale === null) {
              log.debug(`Found master locale: ${locale.name} (${locale.code})`, this.exportConfig.context);
              return locale;
            }
          });
          if (masterLocalObj) {
            log.debug(`Returning master locale: ${masterLocalObj.name}`, this.exportConfig.context);
            return masterLocalObj;
          } else if (skip >= count) {
            log.error(
              `Locale locale not found in the stack ${this.exportConfig.source_stack}. Please ensure that the stack has a master locale.`,
              this.exportConfig.context,
            );
            log.debug('Completed searching all locales without finding master locale', this.exportConfig.context);
            return;
          } else {
            log.debug(
              `Locale locale not found in current batch, continuing with skip: ${skip}`,
              this.exportConfig.context,
            );
            return await this.getLocales(skip);
          }
        } else {
          log.debug('No locales found to process', this.exportConfig.context);
        }
      })
      .catch((error: any) => {
        log.debug(
          `Error occurred while fetching locales for stack: ${this.exportConfig.source_stack}`,
          this.exportConfig.context,
        );
        this.progressManager?.tick(false, 'locale fetch', error?.message || 'Failed to fetch locales', 'Locale');
        handleAndLogError(
          error,
          { ...this.exportConfig.context },
          `Failed to fetch locales for stack ${this.exportConfig.source_stack}`,
        );
        throw error;
      });
  }

  async exportStack(): Promise<any> {
    log.debug(`Starting stack export for: ${this.exportConfig.source_stack}`, this.exportConfig.context);

    await fsUtil.makeDirectory(this.stackFolderPath);
    log.debug(`Created stack directory at: ${this.stackFolderPath}`, this.exportConfig.context);

    return this.stack
      .fetch()
      .then((resp: any) => {
        const stackFilePath = pResolve(this.stackFolderPath, this.stackConfig.fileName);
        log.debug(`Writing stack data to: ${stackFilePath}`, this.exportConfig.context);
        fsUtil.writeFile(stackFilePath, resp);

        // Track progress for stack export completion
        this.progressManager?.tick(true, `stack: ${this.exportConfig.source_stack}`, null, 'Details');

        log.success(
          `Stack details exported successfully for stack ${this.exportConfig.source_stack}`,
          this.exportConfig.context,
        );
        log.debug('Stack export completed successfully', this.exportConfig.context);
        return resp;
      })
      .catch((error: any) => {
        log.debug(`Error occurred while exporting stack: ${this.exportConfig.source_stack}`, this.exportConfig.context);
        this.progressManager?.tick(false, 'stack export', error?.message || 'Failed to export stack', 'Details');
        handleAndLogError(error, { ...this.exportConfig.context });
      });
  }

  async exportStackSettings(): Promise<any> {
    log.info('Exporting stack settings', this.exportConfig.context);
    await fsUtil.makeDirectory(this.stackFolderPath);
    return this.stack
      .settings()
      .then((resp: any) => {
        fsUtil.writeFile(pResolve(this.stackFolderPath, 'settings.json'), resp);

        // Track progress for stack settings completion
        this.progressManager?.tick(true, 'stack settings', null, 'Settings');

        log.success('Exported stack settings successfully!', this.exportConfig.context);
        return resp;
      })
      .catch((error: any) => {
        this.progressManager?.tick(
          false,
          'stack settings',
          error?.message || 'Failed to export stack settings',
          'Settings',
        );
        handleAndLogError(error, { ...this.exportConfig.context });
      });
  }
}
