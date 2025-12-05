import { resolve as pResolve } from 'node:path';
import { sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';
import { PersonalizeConfig, ExportConfig, ProjectStruct } from '../types';
import { fsUtil, PersonalizationAdapter } from '../utils';
import { PROCESS_NAMES, MODULE_CONTEXTS, EXPORT_PROCESS_STATUS } from '../utils/constants';

export default class ExportProjects extends PersonalizationAdapter<ExportConfig> {
  private projectsFolderPath: string;
  private projectsData: ProjectStruct[];
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
    this.projectsFolderPath = pResolve(
      sanitizePath(exportConfig.data),
      sanitizePath(exportConfig.branchName || ''),
      sanitizePath(this.personalizeConfig.dirName),
      'projects',
    );
    this.projectsData = [];
    this.exportConfig.context.module = MODULE_CONTEXTS.PROJECTS;
  }

  async start() {
    try {
      log.debug('Starting projects export process...', this.exportConfig.context);
      log.info('Starting projects export', this.exportConfig.context);

      // Initial setup with loading spinner
      await this.withLoadingSpinner('PROJECTS: Initializing export and fetching data...', async () => {
        log.debug('Initializing personalization adapter...', this.exportConfig.context);
        await this.init();
        log.debug('Personalization adapter initialized successfully', this.exportConfig.context);

        log.debug(`Creating projects directory at: ${this.projectsFolderPath}`, this.exportConfig.context);
        await fsUtil.makeDirectory(this.projectsFolderPath);
        log.debug('Projects directory created successfully', this.exportConfig.context);

        log.debug('Fetching projects from personalization API...', this.exportConfig.context);
        // talisman-ignore-line
        this.projectsData = (await this.projects({ connectedStackApiKey: this.exportConfig.apiKey })) || [];
        log.debug(`Fetched ${this.projectsData?.length || 0} projects`, this.exportConfig.context);
      });

      if (!this.projectsData?.length) {
        log.debug('No projects found, disabling personalization', this.exportConfig.context);
        log.info(`No Personalize project connected with the given stack.`, this.exportConfig.context);
        this.exportConfig.personalizationEnabled = false;
        return;
      }

      // Enable personalization and set project config
      log.debug(`Found ${this.projectsData.length} projects, enabling personalization`, this.exportConfig.context);
      this.exportConfig.personalizationEnabled = true;
      this.exportConfig.project_id = this.projectsData[0]?.uid;
      log.debug(`Set project ID: ${this.projectsData[0]?.uid}`, this.exportConfig.context);

      let progress: any;
      if (this.parentProgressManager) {
        progress = this.parentProgressManager;
        this.progressManager = this.parentProgressManager;
        // Parent already has correct count, just update status
        progress.updateStatus(EXPORT_PROCESS_STATUS[PROCESS_NAMES.PROJECTS].EXPORTING, PROCESS_NAMES.PROJECTS);
      } else {
        progress = this.createNestedProgress(PROCESS_NAMES.PROJECTS);
        progress.addProcess(PROCESS_NAMES.PROJECTS, this.projectsData?.length);
        progress
          .startProcess(PROCESS_NAMES.PROJECTS)
          .updateStatus(EXPORT_PROCESS_STATUS[PROCESS_NAMES.PROJECTS].EXPORTING, PROCESS_NAMES.PROJECTS);
      }

      const projectsFilePath = pResolve(sanitizePath(this.projectsFolderPath), 'projects.json');
      log.debug(`Writing projects to: ${projectsFilePath}`, this.exportConfig.context);
      fsUtil.writeFile(projectsFilePath, this.projectsData);
      log.debug('Projects export completed successfully', this.exportConfig.context);

      const processName = PROCESS_NAMES.PROJECTS;
      this.updateProgress(true, 'project export', undefined, processName);

      // Complete process only if we're managing our own progress
      if (!this.parentProgressManager) {
        progress.completeProcess(PROCESS_NAMES.PROJECTS, true);
        this.completeProgress(true);
      }

      log.success(
        `Projects exported successfully! Total projects: ${this.projectsData.length} - personalization enabled`,
        this.exportConfig.context,
      );
    } catch (error: any) {
      log.debug(`Error occurred during projects export: ${error}`, this.exportConfig.context);
      this.completeProgress(false, error?.message || 'Projects export failed');
      handleAndLogError(error, { ...this.exportConfig.context });
      throw error;
    }
  }
}
