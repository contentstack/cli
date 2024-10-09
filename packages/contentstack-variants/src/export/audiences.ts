import omit from 'lodash/omit';
import { resolve as pResolve } from 'node:path';

import { formatError, fsUtil, PersonalizationAdapter, log } from '../utils';
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
  }

  async start() {
    try {
      log(this.exportConfig, 'Starting audiences export', 'info');
      await this.init();
      await fsUtil.makeDirectory(this.audiencesFolderPath);
      this.audiences = (await this.getAudiences()) as AudienceStruct[];

      if (!this.audiences?.length) {
        log(this.exportConfig, 'No Audiences found with the given project!', 'info');
        return;
      } else {
        this.sanitizeAttribs();
        fsUtil.writeFile(pResolve(this.audiencesFolderPath, this.audiencesConfig.fileName), this.audiences);
        log(this.exportConfig, 'All the audiences have been exported successfully!', 'success');
        return;
      }
    } catch (error) {
      log(this.exportConfig, `Failed to export audiences!`, 'error');
      log(this.config, error, 'error');
    }
  }

  /**
   * function to remove invalid keys from audience object
   */
  sanitizeAttribs() {
    this.audiences = this.audiences?.map((audience) => omit(audience, this.audiencesConfig.invalidKeys)) || [];
  }
}
