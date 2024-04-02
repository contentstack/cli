import omit from 'lodash/omit';
import { resolve as pResolve } from 'node:path';

import { formatError, fsUtil, PersonalizationAdapter, log, VariantHttpClient } from '../utils';
import { EclipseConfig, ExportConfig, AudiencesStruct, AudiencesConfig, LogType } from '../types';

export default class ExportAudiences extends PersonalizationAdapter<VariantHttpClient<ExportConfig>> {
  private audiencesConfig: AudiencesConfig;
  private audiencesFolderPath: string;
  private audiences: Record<string, unknown>[];
  public exportConfig: ExportConfig;
  public eclipseConfig: EclipseConfig;

  constructor(exportConfig: ExportConfig) {
    super({
      config: {
        ...exportConfig,
      },
      baseURL: exportConfig.modules.eclipse.baseURL,
      headers: {
        organization_uid: exportConfig.org_uid,
        authtoken: exportConfig.auth_token,
        project_id: exportConfig.project_id,
      },
    });
    this.exportConfig = exportConfig;
    this.eclipseConfig = this.exportConfig.modules.eclipse;
    this.audiencesConfig = this.exportConfig.modules.audiences;
    this.audiencesFolderPath = pResolve(
      this.exportConfig.data,
      this.exportConfig.branchName || '',
      this.eclipseConfig.dirName,
      this.audiencesConfig.dirName,
    );
    this.audiences = [];
  }

  async start() {
    try {
      log(this.exportConfig, 'Starting audiences export', 'info');
      await fsUtil.makeDirectory(this.audiencesFolderPath);
      this.audiences = (await this.getAudiences()) as AudiencesStruct[];

      if (!this.audiences?.length) {
        log(this.exportConfig, 'No Audiences found with the given project!', 'info');
        return;
      } else {
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

  sanitizeAttribs() {
    this.audiences = this.audiences?.map((audience) => omit(audience, this.audiencesConfig.invalidKeys)) || [];
  }
}
