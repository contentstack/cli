import omit from 'lodash/omit';
import { resolve as pResolve } from 'node:path';
import { sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';
import { PersonalizeConfig, ExportConfig, AudiencesConfig, AudienceStruct } from '../types';
import { fsUtil, PersonalizationAdapter } from '../utils';
import { PROCESS_NAMES, MODULE_CONTEXTS, EXPORT_PROCESS_STATUS } from '../utils/constants';

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
      sanitizePath(exportConfig.exportDir),
      sanitizePath(exportConfig.branchName || ''),
      sanitizePath(this.personalizeConfig.dirName),
      sanitizePath(this.audiencesConfig.dirName),
    );
    this.audiences = [];
    this.exportConfig.context.module = MODULE_CONTEXTS.AUDIENCES;
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
        log.info('No audiences found for the given project.', this.exportConfig.context);
        return;
      }

      let progress: any;

      if (this.parentProgressManager) {
        progress = this.parentProgressManager;
        this.progressManager = this.parentProgressManager;
        progress.updateProcessTotal(PROCESS_NAMES.AUDIENCES, this.audiences.length);
      } else {
        progress = this.createSimpleProgress(PROCESS_NAMES.AUDIENCES, this.audiences.length);
      }

      log.debug(`Processing ${this.audiences.length} audiences`, this.exportConfig.context);
      progress.updateStatus(EXPORT_PROCESS_STATUS[PROCESS_NAMES.AUDIENCES].EXPORTING, PROCESS_NAMES.AUDIENCES);

      this.sanitizeAttribs();
      log.debug('Audiences sanitization completed', this.exportConfig.context);

      // Write audiences to file
      progress.updateStatus(EXPORT_PROCESS_STATUS[PROCESS_NAMES.AUDIENCES].EXPORTING, PROCESS_NAMES.AUDIENCES);
      const audiencesFilePath = pResolve(
        sanitizePath(this.audiencesFolderPath),
        sanitizePath(this.audiencesConfig.fileName),
      );
      log.debug(`Writing audiences to: ${audiencesFilePath}`, this.exportConfig.context);
      fsUtil.writeFile(audiencesFilePath, this.audiences);

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

    this.audiences =
      this.audiences?.map((audience, index) => {
        const sanitizedAudience = omit(audience, this.audiencesConfig.invalidKeys);

        // Update progress for each processed audience
        if (this.progressManager) {
          const processName = this.parentProgressManager ? PROCESS_NAMES.AUDIENCES : undefined;
          this.updateProgress(
            true,
            `audience ${index + 1}/${this.audiences.length}: ${
              (audience as any).name || (audience as any).uid || 'unknown'
            }`,
            undefined,
            processName,
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
