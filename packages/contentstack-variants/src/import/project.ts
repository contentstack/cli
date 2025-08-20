import { join, resolve as pResolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { sanitizePath, log } from '@contentstack/cli-utilities';
import { PersonalizationAdapter, askProjectName, fsUtil } from '../utils';
import { APIConfig, CreateProjectInput, ImportConfig, ProjectStruct } from '../types';

export default class Project extends PersonalizationAdapter<ImportConfig> {
  private projectMapperFolderPath: string;
  private projectsData: CreateProjectInput[];

  constructor(public readonly config: ImportConfig) {
    const conf: APIConfig = {
      config,
      baseURL: config.modules.personalize.baseURL[config.region.name],
      headers: { organization_uid: config.org_uid },
    };
    super(Object.assign(config, conf));

    this.projectMapperFolderPath = pResolve(
      sanitizePath(this.config.backupDir),
      'mapper',
      sanitizePath(this.config.modules.personalize.dirName),
      'projects',
    );
    this.config.context.module = 'project';
    this.projectsData = [];
  }

  /**
   * The function asynchronously imports projects data from a file and creates projects based on the
   * data.
   */
  async import() {
    try {
      log.debug('Starting personalize project import...', this.config.context);

      const [canImport, projectsCount] = await this.analyzeProjects();
      if (!canImport) {
        log.info('No projects found to import', this.config.context);
        return;
      }

      // If we have a parent progress manager, use it as a sub-module
      // Otherwise create our own simple progress manager
      let progress;
      if (this.parentProgressManager) {
        progress = this.parentProgressManager;
        log.debug('Using parent progress manager for projects import', this.config.context);
      } else {
        progress = this.createSimpleProgress('Projects', projectsCount);
        log.debug('Created standalone progress manager for projects import', this.config.context);
      }

      await this.init();

      for (const project of this.projectsData) {
        if (!this.parentProgressManager) {
          progress.updateStatus(`Creating project: ${project.name}...`);
        }
        log.debug(`Processing project: ${project.name}`, this.config.context);

        const createProject = async (newName: void | string): Promise<ProjectStruct> => {
          log.debug(`Creating project with name: ${newName || project.name}`, this.config.context);

          return await this.createProject({
            name: newName || project.name,
            description: project.description,
            connectedStackApiKey: this.config.apiKey,
          }).catch(async (error) => {
            if (
              error.includes('personalization.PROJECTS.DUPLICATE_NAME') ||
              error.includes('personalize.PROJECTS.DUPLICATE_NAME')
            ) {
              log.warn(`Project name already exists, generating new name`, this.config.context);
              const projectName = await askProjectName('Copy Of ' + (newName || project.name));
              return await createProject(projectName);
            }
            throw error;
          });
        };

        try {
          const projectRes = await createProject(this.config.personalizeProjectName);
          this.config.modules.personalize.project_id = projectRes.uid;
          this.config.modules.personalize.importData = true;

          await fsUtil.makeDirectory(this.projectMapperFolderPath);
          fsUtil.writeFile(pResolve(sanitizePath(this.projectMapperFolderPath), 'projects.json'), projectRes);

          this.updateProgress(true, `project: ${project.name}`, undefined, 'Projects');
          log.success(`Project created successfully: ${projectRes.uid}`, this.config.context);
        } catch (error) {
          this.updateProgress(false, `project: ${project.name}`, (error as any)?.message, 'Projects');
          throw error;
        }
      }

      // Only complete progress if we own the progress manager (no parent)
      if (!this.parentProgressManager) {
        this.completeProgress(true);
      }

      log.success(
        `Projects imported successfully! Total projects: ${projectsCount} - personalization enabled`,
        this.config.context,
      );
    } catch (error) {
      this.config.modules.personalize.importData = false; 
      if (!this.parentProgressManager) {
        this.completeProgress(false, (error as any)?.message || 'Project import failed');
      }
      throw error;
    }
  }

  private async analyzeProjects(): Promise<[boolean, number]> {
    return this.withLoadingSpinner('PROJECT: Analyzing import data...', async () => {
      const personalize = this.config.modules.personalize;
      const { dirName, fileName } = personalize.projects;
      const projectPath = join(
        sanitizePath(this.config.data),
        sanitizePath(personalize.dirName),
        sanitizePath(dirName),
        sanitizePath(fileName),
      );

      log.debug(`Checking for project file: ${projectPath}`, this.config.context);

      if (!existsSync(projectPath)) {
        this.config.modules.personalize.importData = false;
        log.warn(`Project file not found: ${projectPath}`, this.config.context);
        return [false, 0];
      }

      this.projectsData = JSON.parse(readFileSync(projectPath, 'utf8')) as CreateProjectInput[];
      const projectsCount = this.projectsData?.length || 0;

      if (projectsCount < 1) {
        this.config.modules.personalize.importData = false;
        log.warn('No projects found in file', this.config.context);
        return [false, 0];
      }

      log.debug(`Found ${projectsCount} projects to import`, this.config.context);
      return [true, projectsCount];
    });
  }
}
