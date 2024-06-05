import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

import { PersonalizationAdapter, askProjectName } from '../utils';
import { APIConfig, CreateProjectInput, ImportConfig, LogType } from '../types';

export default class Project extends PersonalizationAdapter<ImportConfig> {
  constructor(public readonly config: ImportConfig, private readonly log: LogType = console.log) {
    const conf: APIConfig = {
      config,
      baseURL: config.modules.personalization.baseURL[config.region.name],
      headers: { organization_uid: config.org_uid, authtoken: config.auth_token },
    };
    super(Object.assign(config, conf));
  }

  /**
   * The function asynchronously imports projects data from a file and creates projects based on the
   * data.
   */
  async import() {
    const personalization = this.config.modules.personalization;
    const { dirName, fileName } = personalization.projects;
    const projectPath = join(this.config.data, personalization.dirName, dirName, fileName);

    if (existsSync(projectPath)) {
      const projects = JSON.parse(readFileSync(projectPath, 'utf8')) as CreateProjectInput[];

      if (!projects || projects.length < 1) {
        this.config.modules.personalization.importData = false; // Stop personalization import if stack not connected to any project
        this.log(this.config, 'No project found!', 'info');
        return;
      }

      for (const project of projects) {
        let projectRes: any;
        const createProject = async (newName: void | string) => {
          projectRes = await this.createProject({
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

        await createProject();

        this.config.modules.personalization.project_id = projectRes.uid;
        this.config.modules.personalization.importData = true;
        this.log(this.config, `Project Created Successfully: ${projectRes.uid}`, 'info');
      }
    } else {
      this.config.modules.personalization.importData = false; // Stop personalization import if stack not connected to any project
      this.log(this.config, 'No project found!', 'info');
    }
  }
}
