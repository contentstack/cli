import * as path from 'path';
import { EclipseConfig, ExportConfig } from '../types';
import { formatError, fsUtil, log, PersonalizationAdapter } from '../utils';

export default class ExportExperiences extends PersonalizationAdapter<ExportConfig> {
  private experiencesFolderPath: string;
  public exportConfig: ExportConfig;
  public eclipseConfig: EclipseConfig;
  constructor(exportConfig: ExportConfig) {
    super({
      config: { ...exportConfig },
      baseURL: exportConfig.modules.eclipse.baseURL,
      headers: {
        organization_uid: exportConfig.org_uid,
        authtoken: exportConfig.auth_token,
        project_id: exportConfig.project_id,
      },
    });
    this.exportConfig = exportConfig;
    this.eclipseConfig = exportConfig.modules.eclipse;
    this.experiencesFolderPath = path.resolve(
      exportConfig.data,
      exportConfig.branchName || '',
      this.eclipseConfig.dirName,
      'experiences',
    );
  }

  async start() {
    try {
      // get all experiences
      // loop through experiences and get content types attached to it
      // write experiences in to a file
      log(this.exportConfig, 'Starting experiences export', 'info');
      await fsUtil.makeDirectory(this.experiencesFolderPath);
      const experiences = await this.getExperiences();
      if (!experiences || experiences?.length < 1) {
        log(this.exportConfig, 'No Experiences found with the give project', 'info');
        return;
      }
      return fsUtil.writeFile(path.resolve(this.experiencesFolderPath, 'experiences.json'), experiences);
    } catch (error) {
      log(this.exportConfig, `Failed to export experiences  ${formatError(error)}`, 'error');
      log(this.exportConfig, error, 'error');
    }
  }
}
