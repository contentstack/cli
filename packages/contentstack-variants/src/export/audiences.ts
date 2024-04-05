import omit from 'lodash/omit';
import { resolve as pResolve } from 'node:path';

import { formatError, fsUtil, PersonalizationAdapter,log } from '../utils';
import { EclipseConfig, ExportConfig, AudienceStruct, AudiencesConfig } from '../types';

export default class ExportAudiences extends PersonalizationAdapter<ExportConfig> {
  private audiencesConfig: AudiencesConfig;
  private audiencesFolderPath: string;
  private audiences: Record<string, unknown>[];
  public eclipseConfig: EclipseConfig;

  constructor(readonly exportConfig: ExportConfig) {
    super({
      config: exportConfig,
      baseURL: exportConfig.modules.personalization.baseURL,
      headers: { authtoken: exportConfig.auth_token, project_id: exportConfig.project_id },
    });
    this.eclipseConfig = exportConfig.modules.personalization;
    this.audiencesConfig = exportConfig.modules.audiences;
    this.audiencesFolderPath = pResolve(
      exportConfig.data,
      exportConfig.branchName || '',
      this.eclipseConfig.dirName,
      this.audiencesConfig.dirName,
    );
    this.audiences = [];
  }

  async start() {
    try {
      log(this.exportConfig, 'Starting audiences export', 'info');
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
    } catch (error: any) {
      if (error?.errorMessage || error?.message || error?.error_message) {
        log(this.exportConfig, `Failed to export audiences! ${formatError(error)}`, 'error');
      } else {
        log(this.exportConfig, `Failed to export audiences! ${error}`, 'error');
      }
    }
  }

  /**
   * function to remove invalid keys from audience object
   */
  sanitizeAttribs() {
    this.audiences = this.audiences?.map((audience) => omit(audience, this.audiencesConfig.invalidKeys)) || [];
  }
}
