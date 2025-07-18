import omit from 'lodash/omit';
import { resolve as pResolve } from 'node:path';
import { log, handleAndLogError } from '@contentstack/cli-utilities';

import { fsUtil, PersonalizationAdapter } from '../utils';
import { PersonalizeConfig, ExportConfig, AudienceStruct, AudiencesConfig } from '../types';

export default class ExportAudiences extends PersonalizationAdapter<ExportConfig> {
  private audiencesConfig: AudiencesConfig;
  private audiencesFolderPath: string;
  private audiences: Record<string, unknown>[];
  public personalizeConfig: PersonalizeConfig;

  constructor(readonly exportConfig: ExportConfig) {
    super({
      config: exportConfig,
      baseURL: exportConfig.modules.personalize.baseURL[exportConfig.region.name],
      headers: { 'X-Project-Uid': exportConfig.project_id },
    });
    this.personalizeConfig = exportConfig.modules.personalize;
    this.audiencesConfig = exportConfig.modules.audiences;
    this.audiencesFolderPath = pResolve(
      exportConfig.data,
      exportConfig.branchName || '',
      this.personalizeConfig.dirName,
      this.audiencesConfig.dirName,
    );
    this.audiences = [];
    this.exportConfig.context.module = 'audiences';
  }

  async start() {
    try {
      log.debug('Starting audiences export process...', this.exportConfig.context);
      log.info('Starting audiences export', this.exportConfig.context);
      
      log.debug('Initializing personalization adapter...', this.exportConfig.context);
      await this.init();
      log.debug('Personalization adapter initialized successfully', this.exportConfig.context);
      
      log.debug(`Creating audiences directory at: ${this.audiencesFolderPath}`, this.exportConfig.context);
      await fsUtil.makeDirectory(this.audiencesFolderPath);
      log.debug('Audiences directory created successfully', this.exportConfig.context);
      
      log.debug('Fetching audiences from personalization API...', this.exportConfig.context);
      this.audiences = (await this.getAudiences()) as AudienceStruct[];
      log.debug(`Fetched ${this.audiences?.length || 0} audiences`, this.exportConfig.context);

      if (!this.audiences?.length) {
        log.debug('No audiences found, completing export', this.exportConfig.context);
        log.info('No Audiences found with the given project!', this.exportConfig.context);
        return;
      } else {
        log.debug(`Processing ${this.audiences.length} audiences`, this.exportConfig.context);
        this.sanitizeAttribs();
        log.debug('Audiences sanitization completed', this.exportConfig.context);
        
        const audiencesFilePath = pResolve(this.audiencesFolderPath, this.audiencesConfig.fileName);
        log.debug(`Writing audiences to: ${audiencesFilePath}`, this.exportConfig.context);
        fsUtil.writeFile(audiencesFilePath, this.audiences);
        
        log.debug('Audiences export completed successfully', this.exportConfig.context);
        log.success(
          `Audiences exported successfully! Total audiences: ${this.audiences.length}`,
          this.exportConfig.context,
        );
        return;
      }
    } catch (error) {
      log.debug(`Error occurred during audiences export: ${error}`, this.exportConfig.context);
      handleAndLogError(error, { ...this.exportConfig.context });
    }
  }

  /**
   * function to remove invalid keys from audience object
   */
  sanitizeAttribs() {
    log.debug(`Sanitizing ${this.audiences?.length || 0} audiences`, this.exportConfig.context);
    log.debug(`Invalid keys to remove: ${JSON.stringify(this.audiencesConfig.invalidKeys)}`, this.exportConfig.context);
    
    this.audiences = this.audiences?.map((audience) => omit(audience, this.audiencesConfig.invalidKeys)) || [];
    
    log.debug(`Sanitization complete. Total audiences after sanitization: ${this.audiences.length}`, this.exportConfig.context);
  }
}
