import * as path from 'path';
import { ContentstackClient } from '@contentstack/cli-utilities';

import { ExportConfig, EclipseConfig } from '../types';
import { PersonalizationAdapter, log, fsUtil, formatError } from '../utils';

export default class ExportProjects extends PersonalizationAdapter<ExportConfig> {
  public exportConfig: ExportConfig;
  public eclipseConfig: EclipseConfig;
  constructor(exportConfig: ExportConfig) {
    super({
      config: exportConfig,
      baseURL: exportConfig.personalizationHost,
      sharedConfig: {
        ...exportConfig,
        headers: { organization_uid: exportConfig.org_uid, authtoken: exportConfig.auth_token },
      },
      eclipseURL: exportConfig.modules.eclipse.baseURL,
    });
    this.exportConfig = exportConfig;
    this.eclipseConfig = exportConfig.modules.eclipse;
  }

  async start() {
    try {
      const project = await this.projects({ connectedStackApiKey: this.exportConfig.apiKey });
      if (!project || project?.length < 1) {
        log(this.exportConfig, 'No Personalization Project connected with the give stack', 'info');
        this.exportConfig.personalizationEnabled = false;
        return;
      }
      this.exportConfig.personalizationEnabled = true;
      return fsUtil.writeFile(path.join(this.eclipseConfig.dirName, 'projects', 'projects.json'), project);
    } catch (error) {
      log(this.exportConfig, `Failed to export projects  ${formatError(error)}`, 'error');
      log(this.exportConfig, error, 'error');
    }
  }
}
