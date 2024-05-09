import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

import { PersonalizationAdapter } from '../utils';
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
      try {
        const projects = JSON.parse(readFileSync(projectPath, 'utf8')) as CreateProjectInput[];

        for (const project of projects) {
          const { name, description } = project;
          const projectRes = await this.createProject({
            name: `Copy of ${name}`,
            description,
            connectedStackApiKey: this.config.apiKey,
          });
          this.config.modules.personalization.project_id = projectRes?.uid;
        }

        this.log(this.config, this.$t(this.messages.CREATE_SUCCESS, { module: 'Projects' }), 'info');
      } catch (error) {
        this.log(this.config, this.$t(this.messages.CREATE_FAILURE, { module: 'Projects' }), 'error');
        throw error;
      }
    }
  }
}
