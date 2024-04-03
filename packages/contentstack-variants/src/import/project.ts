import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

import { PersonalizationAdapter } from '../utils';
import { APIConfig, AnyProperty, CreateProjectInput, ImportConfig, LogType } from '../types';

export default class Project extends PersonalizationAdapter<ImportConfig> {
  constructor(public readonly config: ImportConfig, private readonly log: LogType = console.log) {
    const conf: APIConfig = {
      config,
      baseURL: config.personalizationHost,
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
          const { name, description, connectedStackApiKey } = project;
          await this.createProject({ name, description, connectedStackApiKey });
        }

        this.log(this.config, this.$t(this.messages.CREATE_SUCCESS, { module: 'Projects' }), 'info');
      } catch (error) {
        this.log(this.config, this.$t(this.messages.CREATE_FAILURE, { module: 'Projects' }), 'error');
        this.log(this.config, error, 'error');
      }
    }
  }
}
