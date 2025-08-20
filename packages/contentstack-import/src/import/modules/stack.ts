import { join } from 'node:path';
import { fileHelper, fsUtil } from '../../utils';
import BaseClass from './base-class';
import { ModuleClassParams } from '../../types';
import { log, handleAndLogError, messageHandler } from '@contentstack/cli-utilities';

export default class ImportStack extends BaseClass {
  private stackSettingsPath: string;
  private envUidMapperPath: string;
  private stackSettings: Record<string, any> | null = null;
  private envUidMapper: Record<string, string> = {};

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
    super({ importConfig, stackAPIClient });
    this.importConfig.context.module = 'stack';
    this.currentModuleName = 'Stack';
    this.stackSettingsPath = join(this.importConfig.backupDir, 'stack', 'settings.json');
    this.envUidMapperPath = join(this.importConfig.backupDir, 'mapper', 'environments', 'uid-mapping.json');
  }

  /**
   * @method start
   * @returns {Promise<void>} Promise<void>
   */
  async start(): Promise<void> {
    try {
      log.debug('Starting stack settings import process...', this.importConfig.context);

      if (this.importConfig.management_token) {
        log.info(
          'Skipping stack settings import: Operation is not supported when using a management token.',
          this.importConfig.context,
        );
        return;
      }

      const [canImport] = await this.analyzeStackSettings();

      if (!canImport) {
        log.info('Stack settings import skipped', this.importConfig.context);
        return;
      }

      const progress = this.createSimpleProgress(this.currentModuleName, 1);

      progress.updateStatus('Importing stack settings...');
      log.info('Starting stack settings import process', this.importConfig.context);
      await this.importStackSettings();

      this.completeProgress(true);
      log.success('Stack settings imported successfully!', this.importConfig.context);
    } catch (error) {
      this.completeProgress(false, 'Stack settings import failed');
      handleAndLogError(error, { ...this.importConfig.context });
    }
  }

  private async importStackSettings(): Promise<void> {
    log.debug('Processing stack settings for import', this.importConfig.context);

    // Update environment UID mapping if live preview is configured
    if (this.stackSettings?.live_preview && this.stackSettings?.live_preview['default-env']) {
      const oldEnvUid = this.stackSettings.live_preview['default-env'];
      const mappedEnvUid = this.envUidMapper[oldEnvUid];

      if (mappedEnvUid) {
        this.stackSettings.live_preview['default-env'] = mappedEnvUid;
        log.debug(`Updated live preview environment: ${oldEnvUid} → ${mappedEnvUid}`, this.importConfig.context);
      } else {
        log.debug(`No mapping found for live preview environment: ${oldEnvUid}`, this.importConfig.context);
      }
    }

    log.debug('Applying stack settings to target stack', this.importConfig.context);
    await this.stack.addSettings(this.stackSettings);

    this.progressManager?.tick(true, 'stack settings applied');
    log.debug('Stack settings applied successfully', this.importConfig.context);
  }

  private async analyzeStackSettings(): Promise<[boolean]> {
    return this.withLoadingSpinner('STACK SETTINGS: Analyzing import data...', async () => {
      log.debug('Checking for stack settings file existence', this.importConfig.context);

      if (!fileHelper.fileExistsSync(this.stackSettingsPath)) {
        log.info('No stack setting found!', this.importConfig.context);
        return [false];
      }

      log.debug(`Found stack settings file: ${this.stackSettingsPath}`, this.importConfig.context);

      this.stackSettings = fsUtil.readFile(this.stackSettingsPath, true) as Record<string, any>;

      if (!this.stackSettings) {
        log.info('Stack settings file is empty or invalid', this.importConfig.context);
        return [false];
      }

      log.debug('Loading environment UID mappings', this.importConfig.context);
      if (fileHelper.fileExistsSync(this.envUidMapperPath)) {
        this.envUidMapper = fsUtil.readFile(this.envUidMapperPath, true) as Record<string, string>;
        const envMappingCount = Object.keys(this.envUidMapper || {}).length;
        log.debug(`Loaded ${envMappingCount} environment UID mappings`, this.importConfig.context);
      } else {
        log.warn(
          'Skipping stack settings import. Please run the environments migration first.',
          this.importConfig.context,
        );
        return [false];
      }

      log.debug('Stack settings analysis completed successfully', this.importConfig.context);
      return [true];
    });
  }
}
