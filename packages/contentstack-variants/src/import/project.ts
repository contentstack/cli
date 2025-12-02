import { join, resolve as pResolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { sanitizePath, log } from '@contentstack/cli-utilities';
import { PersonalizationAdapter, askProjectName, fsUtil } from '../utils';
import { APIConfig, CreateProjectInput, ImportConfig, ProjectStruct } from '../types';

export default class Project extends PersonalizationAdapter<ImportConfig> {
  private projectMapperFolderPath: string;
  
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
  }

  /**
   * The function asynchronously imports projects data from a file and creates projects based on the
   * data.
   */
  async import() {    
    const personalize = this.config.modules.personalize;
    const { dirName, fileName } = personalize.projects;
    const projectPath = join(
      sanitizePath(this.config.data),
      sanitizePath(personalize.dirName),
      sanitizePath(dirName),
      sanitizePath(fileName),
    );

    log.debug(`Checking for project file: ${projectPath}`, this.config.context);
    
    if (existsSync(projectPath)) {
      const projects = JSON.parse(readFileSync(projectPath, 'utf8')) as CreateProjectInput[];
      log.debug(`Loaded ${projects?.length || 0} projects from file`, this.config.context);

      if (!projects || projects.length < 1) {
        this.config.modules.personalize.importData = false; // Stop personalize import if stack not connected to any project
        log.warn('No projects found in file', this.config.context);
        return;
      }
      
      await this.init();
      
      for (const project of projects) {
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
              log.warn(`Project name already exists.`, this.config.context);
              const projectName = await askProjectName('Copy Of ' + (newName || project.name));
              return await createProject(projectName);
            }
            throw error;
          });
        };

        const projectRes = await createProject(this.config.personalizeProjectName);
        this.config.modules.personalize.project_id = projectRes.uid;
        this.config.modules.personalize.importData = true;

        await fsUtil.makeDirectory(this.projectMapperFolderPath);
        fsUtil.writeFile(pResolve(sanitizePath(this.projectMapperFolderPath), 'projects.json'), projectRes);
        
        log.success(`Project created successfully: ${projectRes.uid}`, this.config.context);
        log.debug(`Project data saved to: ${this.projectMapperFolderPath}/projects.json`, this.config.context);
      }
    } else {
      this.config.modules.personalize.importData = false; // Stop personalize import if stack not connected to any project
      log.warn(`Project file not found: ${projectPath}`, this.config.context);
    }
  }
}
