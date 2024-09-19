import { join, resolve as pResolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { sanitizePath } from '@contentstack/cli-utilities';
import { PersonalizationAdapter, askProjectName, fsUtil } from '../utils';
import { APIConfig, CreateProjectInput, ImportConfig, LogType, ProjectStruct } from '../types';

export default class Project extends PersonalizationAdapter<ImportConfig> {
  private projectMapperFolderPath: string;
  constructor(public readonly config: ImportConfig, private readonly log: LogType = console.log) {
    const conf: APIConfig = {
      config,
      baseURL: config.modules.personalization.baseURL[config.region.name],
      headers: { organization_uid: config.org_uid, authtoken: config.auth_token },
    };
    super(Object.assign(config, conf));
    this.projectMapperFolderPath = pResolve(
      sanitizePath(this.config.backupDir),
      'mapper',
      sanitizePath(this.config.modules.personalization.dirName),
      'projects',
    );
  }

  /**
   * The function asynchronously imports projects data from a file and creates projects based on the
   * data.
   */
  async import() {
    const personalization = this.config.modules.personalization;
    const { dirName, fileName } = personalization.projects;
    const projectPath = join(sanitizePath(this.config.data), sanitizePath(personalization.dirName), sanitizePath(dirName), sanitizePath(fileName));

    if (existsSync(projectPath)) {
      const projects = JSON.parse(readFileSync(projectPath, 'utf8')) as CreateProjectInput[];

      if (!projects || projects.length < 1) {
        this.config.modules.personalization.importData = false; // Stop personalization import if stack not connected to any project
        this.log(this.config, 'No project found!', 'info');
        return;
      }

      for (const project of projects) {
        const createProject = async (newName: void | string): Promise<ProjectStruct> => {
          return await this.createProject({
            name: newName || project.name,
            description: project.description,
            connectedStackApiKey: this.config.apiKey,
          }).catch(async (error) => {
            if (error === 'personalization.PROJECTS.DUPLICATE_NAME') {
              const projectName = await askProjectName('Copy Of ' + (newName || project.name));
              return await createProject(projectName);
            }
            this.log(this.config, this.$t(this.messages.CREATE_FAILURE, { module: 'Projects' }), 'error');
            throw error;
          });
        };

        const projectRes = await createProject(this.config.personalizeProjectName);
        this.config.modules.personalization.project_id = projectRes.uid;
        this.config.modules.personalization.importData = true;

        await fsUtil.makeDirectory(this.projectMapperFolderPath);
        fsUtil.writeFile(pResolve(sanitizePath(this.projectMapperFolderPath), 'projects.json'), projectRes);
        this.log(this.config, `Project Created Successfully: ${projectRes.uid}`, 'info');
      }
    } else {
      this.config.modules.personalization.importData = false; // Stop personalization import if stack not connected to any project
      this.log(this.config, 'No project found!', 'info');
    }
  }
}
