import * as path from 'path';
import { EclipseConfig, ExportConfig } from '../types';
import { formatError, fsUtil, log, PersonalizationAdapter } from '../utils';

export default class ExportExperiences  extends PersonalizationAdapter{
  public exportConfig: ExportConfig;
  public eclipseConfig: EclipseConfig;
  constructor(exportConfig: ExportConfig) {
    super({sharedConfig: exportConfig})
    this.exportConfig = exportConfig
    super({sharedConfig: {...exportConfig, headers: { organization_uid:  exportConfig.org_uid, authtoken: exportConfig.auth_token}}, eclipseURL: exportConfig.modules.eclipse.baseURL})
    this.exportConfig = exportConfig;
    this.eclipseConfig = exportConfig.modules.eclipse;
  }

  async start() {

    try {

      // get all experiences
      // loop through experiences and get content types attached to it
      // write experiences in to a file
      const experiences = await this.getExperiences();
      if (!experiences || experiences?.length < 1) {
        log(this.exportConfig, "No Experiences found with the give project", "info");
        return;
      }
      return fsUtil.writeFile(path.join(this.eclipseConfig.dirName, "experiences", 'experiences.json'), experiences);
    } catch (error) {
      log(this.exportConfig, `Failed to export experiences  ${formatError(error)}`, 'error');
      log(this.exportConfig, error, 'error');
    }
  }
}
