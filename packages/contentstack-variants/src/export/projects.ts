import * as path from 'path';
import { sanitizePath } from '@contentstack/cli-utilities';
import { ExportConfig, PersonalizeConfig } from '../types';
import { PersonalizationAdapter, log, fsUtil, formatError } from '../utils';

export default class ExportProjects extends PersonalizationAdapter<ExportConfig> {
  private projectFolderPath: string;
  public exportConfig: ExportConfig;
  public personalizeConfig: PersonalizeConfig;
  constructor(exportConfig: ExportConfig) {
    super({
      config: exportConfig,
      baseURL: exportConfig.modules.personalize.baseURL[exportConfig.region.name],
      headers: { organization_uid: exportConfig.org_uid },
    });
    this.exportConfig = exportConfig;
    this.personalizeConfig = exportConfig.modules.personalize;
    this.projectFolderPath = path.resolve(
      sanitizePath(exportConfig.data),
      sanitizePath(exportConfig.branchName || ''),
      sanitizePath(this.personalizeConfig.dirName),
      'projects',
    );
  }

  async start() {
    try {
      log(this.exportConfig, 'Starting projects export', 'info');
      await this.init();
      await fsUtil.makeDirectory(this.projectFolderPath);
      const project = await this.projects({ connectedStackApiKey: this.exportConfig.apiKey });
      if (!project || project?.length < 1) {
        log(this.exportConfig, 'No Personalize Project connected with the given stack', 'info');
        this.exportConfig.personalizationEnabled = false;
        return;
      }
      this.exportConfig.personalizationEnabled = true;
      this.exportConfig.project_id = project[0]?.uid;
      fsUtil.writeFile(path.resolve(sanitizePath(this.projectFolderPath), 'projects.json'), project);
      log(this.exportConfig, 'Project exported successfully!', 'success');
    } catch (error) {
      if (error !== 'Forbidden') {
        log(this.exportConfig, `Failed to export projects!`, 'error');
      }
      throw error;
    }
  }
}
