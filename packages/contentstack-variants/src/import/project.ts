import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

import { PersonalizationAdapter } from '../utils';
import { APIConfig, CreateProjectInput, ImportConfig, LogType } from '../types';

export namespace Import {
  export class Project extends PersonalizationAdapter<ImportConfig> {
    constructor(public readonly config: ImportConfig, private readonly log: LogType = console.log) {
      const conf: APIConfig = {
        config,
        baseURL: config.personalizationHost,
      };
      super(Object.assign(config, conf));
    }

    /**
     * The function `import` checks if a project path exists, creates a project if it does, and
     * logs the result.
     * @param {CreateProjectInput} input - The `input` parameter in the `import` function likely
     * represents the data or configuration needed to create a new project. It is of type
     * `CreateProjectInput`, which could be an object containing information such as project name,
     * description, settings, or any other details required for creating a project.
     */
    async import() {
      const personalization = this.config.modules.personalization;
      const { dirName, fileName } = personalization.projects;
      const projectPath = join(this.config.data, personalization.dirName, dirName, fileName);

      if (existsSync(projectPath)) {
        try {
          const projects = JSON.parse(readFileSync(projectPath, 'utf8')) as CreateProjectInput[];

          for (const project of projects) {
            await this.createProject(project).catch((error) => {
              this.log(this.config, error, 'error');
            });
          }

          this.log(this.config, this.messages.PROJECT_CREATE_SUCCESS, 'info');
        } catch (error) {
          this.log(this.config, error, 'error');
        }
      }
    }
  }
}
