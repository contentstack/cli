import omit from 'lodash/omit';
import { resolve as pResolve } from 'node:path';
import { sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';
import { PersonalizeConfig, ExportConfig, AudiencesConfig, AudienceStruct } from '../types';
import { fsUtil, PersonalizationAdapter } from '../utils';

export default class ExportAudiences extends PersonalizationAdapter<ExportConfig> {
  private audiencesConfig: AudiencesConfig;
  private audiencesFolderPath: string;
  private audiences: Record<string, unknown>[];
  public exportConfig: ExportConfig;
  public personalizeConfig: PersonalizeConfig;

  constructor(exportConfig: ExportConfig) {
    super({
      config: exportConfig,
      baseURL: exportConfig.modules.personalize.baseURL[exportConfig.region.name],
      headers: { 'X-Project-Uid': exportConfig.project_id },
    });
    this.exportConfig = exportConfig;
    this.personalizeConfig = exportConfig.modules.personalize;
    this.audiencesConfig = exportConfig.modules.audiences;
    this.audiencesFolderPath = pResolve(
      sanitizePath(exportConfig.data),
      sanitizePath(exportConfig.branchName || ''),
      sanitizePath(this.personalizeConfig.dirName),
      sanitizePath(this.audiencesConfig.dirName),
    );
    this.audiences = [];
    this.exportConfig.context.module = 'audiences';
  }

  async start() {
    try {
      log.debug('Starting audiences export process...', this.exportConfig.context);
      log.info('Starting audiences export', this.exportConfig.context);

      await this.withLoadingSpinner('AUDIENCES: Initializing export and fetching data...', async () => {
        log.debug('Initializing personalization adapter...', this.exportConfig.context);
        await this.init();
        log.debug('Personalization adapter initialized successfully', this.exportConfig.context);

        log.debug(`Creating audiences directory at: ${this.audiencesFolderPath}`, this.exportConfig.context);
        await fsUtil.makeDirectory(this.audiencesFolderPath);
        log.debug('Audiences directory created successfully', this.exportConfig.context);

        log.debug('Fetching audiences from personalization API...', this.exportConfig.context);
        this.audiences = (await this.getAudiences()) as AudienceStruct[];
        log.debug(`Fetched ${this.audiences?.length || 0} audiences`, this.exportConfig.context);
      });

      if (!this.audiences?.length) {
        log.debug('No audiences found, completing export', this.exportConfig.context);
        log.info('No Audiences found with the given project!', this.exportConfig.context);
        return;
      }

      // Create progress manager - use parent if available, otherwise create simple
      let progress: any;
      if (this.parentProgressManager) {
        // Use parent progress manager - we're part of the personalize modules process
        progress = this.parentProgressManager;
        this.progressManager = this.parentProgressManager;
      } else {
        // Create our own progress for standalone execution
        progress = this.createSimpleProgress('Audiences', this.audiences.length + 1);
      }

      // Process audiences with progress tracking
      log.debug(`Processing ${this.audiences.length} audiences`, this.exportConfig.context);
      
      // Update progress with process name
      const processName = 'Audiences';
      progress.updateStatus('Sanitizing audiences data...', processName);
      
      this.sanitizeAttribs();
      log.debug('Audiences sanitization completed', this.exportConfig.context);

      // Write audiences to file
      progress.updateStatus('Writing audiences data...', processName);
      const audiencesFilePath = pResolve(
        sanitizePath(this.audiencesFolderPath),
        sanitizePath(this.audiencesConfig.fileName),
      );
      log.debug(`Writing audiences to: ${audiencesFilePath}`, this.exportConfig.context);
      fsUtil.writeFile(audiencesFilePath, this.audiences);

      // Final progress update
      if (this.progressManager) {
        this.updateProgress(true, `${this.audiences.length} audiences exported`, undefined, processName);
      }

      // Complete progress only if we're managing our own progress
      if (!this.parentProgressManager) {
        this.completeProgress(true);
      }

      log.debug('Audiences export completed successfully', this.exportConfig.context);
      log.success(
        `Audiences exported successfully! Total audiences: ${this.audiences.length}`,
        this.exportConfig.context,
      );
    } catch (error: any) {
      log.debug(`Error occurred during audiences export: ${error}`, this.exportConfig.context);
      this.completeProgress(false, error?.message || 'Audiences export failed');
      handleAndLogError(error, { ...this.exportConfig.context });
    }
  }

  /**
   * function to remove invalid keys from audience object
   */
  sanitizeAttribs() {
    log.debug(`Sanitizing ${this.audiences?.length || 0} audiences`, this.exportConfig.context);
    log.debug(`Invalid keys to remove: ${JSON.stringify(this.audiencesConfig.invalidKeys)}`, this.exportConfig.context);

    this.audiences =
      this.audiences?.map((audience, index) => {
        const sanitizedAudience = omit(audience, this.audiencesConfig.invalidKeys);

        // Update progress for each processed audience 
        if (this.progressManager) {
          const processName = this.parentProgressManager ? 'Audiences' : undefined;
          this.updateProgress(
            true,
            `audience ${index + 1}/${this.audiences.length}: ${
              (audience as any).name || (audience as any).uid || 'unknown'
            }`,
            undefined,
            processName
          );
        }

        return sanitizedAudience;
      }) || [];

    log.debug(
      `Sanitization complete. Total audiences after sanitization: ${this.audiences.length}`,
      this.exportConfig.context,
    );
  }
}
