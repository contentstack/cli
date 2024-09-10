import * as path from 'path';

import { ExportConfig, PersonalizationConfig } from '../types';
import { PersonalizationAdapter, log, fsUtil, formatError } from '../utils';

export default class ExportProjects extends PersonalizationAdapter<ExportConfig> {
  private projectFolderPath: string;
  public exportConfig: ExportConfig;
  public personalizationConfig: PersonalizationConfig;
  constructor(exportConfig: ExportConfig) {
    super({
      config: exportConfig,
      baseURL: exportConfig.modules.personalization.baseURL[exportConfig.region.name],
      headers: { authtoken: exportConfig.auth_token, organization_uid: exportConfig.org_uid },
    });
    this.exportConfig = exportConfig;
    this.personalizationConfig = exportConfig.modules.personalization;
    this.projectFolderPath = path.resolve(
      exportConfig.data,
      exportConfig.branchName || '',
      this.personalizationConfig.dirName,
      'projects',
    );
  }

  async start() {
    try {
      log(this.exportConfig, 'Starting projects export', 'info');
      await fsUtil.makeDirectory(this.projectFolderPath);
      const project = await this.projects({ connectedStackApiKey: this.exportConfig.apiKey });
      if (!project || project?.length < 1) {
        log(this.exportConfig, 'No Personalization Project connected with the given stack', 'info');
        this.exportConfig.personalizationEnabled = false;
        return;
      }
      this.exportConfig.personalizationEnabled = true;
      this.exportConfig.project_id = project[0]?.uid;
      fsUtil.writeFile(path.resolve(this.projectFolderPath, 'projects.json'), project);
      log(this.exportConfig, 'Project exported successfully!', 'success');
    } catch (error) {
      log(this.exportConfig, `Failed to export projects!`, 'error');
      throw error;
    }
  }
}
