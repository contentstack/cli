import * as path from 'path';
import { ContentstackClient } from '@contentstack/cli-utilities';

import { ExportConfig, EclipseConfig } from '../types';
import { PersonalizationAdapter, log, fsUtil, formatError } from '../utils';

export default class ExportProjects extends PersonalizationAdapter<ExportConfig> {
  private projectFolderPath: string;
  public exportConfig: ExportConfig;
  public eclipseConfig: EclipseConfig;
  constructor(exportConfig: ExportConfig) {
    super({
      config: {...exportConfig},
      baseURL: exportConfig.modules.eclipse.baseURL,
      headers: { organization_uid: exportConfig.org_uid, authtoken: exportConfig.auth_token },
    });
    this.exportConfig = exportConfig;
    this.eclipseConfig = exportConfig.modules.eclipse;
    this.projectFolderPath = path.resolve(
      exportConfig.data,
      exportConfig.branchName || '',
      this.eclipseConfig.dirName,
      'projects',
    );
  }

  async start() {
    try {
      log(this.exportConfig, 'Starting projects export', 'info');
      await fsUtil.makeDirectory(this.projectFolderPath);
      const project = await this.projects({ connectedStackApiKey: this.exportConfig.apiKey });
      if (!project || project?.length < 1) {
        log(this.exportConfig, 'No Personalization Project connected with the give stack', 'info');
        this.exportConfig.personalizationEnabled = false;
        return;
      }
      this.exportConfig.project_id = project[0].uid;
      this.exportConfig.personalizationEnabled = true;
      this.exportConfig.project_id = project[0]?.uid;
      fsUtil.writeFile(path.resolve(this.projectFolderPath, 'projects.json'), project);
    } catch (error) {
      log(this.exportConfig, `Failed to export projects  ${formatError(error)}`, 'error');
      log(this.exportConfig, error, 'error');
    }
  }
}
