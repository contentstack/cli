import * as path from 'path';
import { sanitizePath, log } from '@contentstack/cli-utilities';
import { ExportConfig, PersonalizeConfig } from '../types';
import { PersonalizationAdapter, fsUtil, } from '../utils';

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
      log.info(`Starting projects export`, this.exportConfig.context);
      await this.init();
      await fsUtil.makeDirectory(this.projectFolderPath);
      const project = await this.projects({ connectedStackApiKey: this.exportConfig.apiKey });
      if (!project || project?.length < 1) {
        log.info(`No Personalize Project connected with the given stack`, this.exportConfig.context);
        this.exportConfig.personalizationEnabled = false;
        return;
      }
      this.exportConfig.personalizationEnabled = true;
      this.exportConfig.project_id = project[0]?.uid;
      fsUtil.writeFile(path.resolve(sanitizePath(this.projectFolderPath), 'projects.json'), project);
      log.success(`Projects exported successfully!`, this.exportConfig.context);
    } catch (error) {
      if (error !== 'Forbidden') {
        log.error('Failed to export projects!', this.exportConfig.context);
      }
      throw error;
    }
  }
}
