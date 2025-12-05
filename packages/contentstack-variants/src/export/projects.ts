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
    this.exportConfig.context.module = 'projects';
  }

  async start() {
    try {
      log.debug('Starting projects export process...', this.exportConfig.context);
      log.info(`Starting projects export`, this.exportConfig.context);
      
      log.debug('Initializing personalization adapter...', this.exportConfig.context);
      await this.init();
      log.debug('Personalization adapter initialized successfully', this.exportConfig.context);
      
      log.debug(`Creating projects directory at: ${this.projectFolderPath}`, this.exportConfig.context);
      await fsUtil.makeDirectory(this.projectFolderPath);
      log.debug('Projects directory created successfully', this.exportConfig.context);
      
      log.debug(`Fetching projects for stack API key: ${this.exportConfig.apiKey}`, this.exportConfig.context);
      const project = await this.projects({ connectedStackApiKey: this.exportConfig.apiKey });
      log.debug(`Fetched ${project?.length || 0} projects`, this.exportConfig.context);
      
      if (!project || project?.length < 1) {
        log.debug('No projects found, disabling personalization', this.exportConfig.context);
        log.info(`No Personalize project connected with the given stack.`, this.exportConfig.context);
        this.exportConfig.personalizationEnabled = false;
        return;
      }
      
      log.debug(`Found ${project.length} projects`, this.exportConfig.context);
      this.exportConfig.personalizationEnabled = true;
      this.exportConfig.project_id = project[0]?.uid;
      log.debug(`Set project ID: ${project[0]?.uid}`, this.exportConfig.context);
      
      const projectsFilePath = path.resolve(sanitizePath(this.projectFolderPath), 'projects.json');
      log.debug(`Writing projects data to: ${projectsFilePath}`, this.exportConfig.context);
      fsUtil.writeFile(projectsFilePath, project);
      
      log.debug('Projects export completed successfully', this.exportConfig.context);
      log.success(`Projects exported successfully!`, this.exportConfig.context);
    } catch (error) {
      if (error !== 'Forbidden') {
        log.debug(`Error occurred during projects export: ${error}`, this.exportConfig.context);
        log.error('Failed to export projects.', this.exportConfig.context);
      } else {
        log.debug('Projects export forbidden, likely due to permissions', this.exportConfig.context);
      }
      throw error;
    }
  }
}
